// src/screens/RideRequestsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RideRequestsScreen({ navigation, route }) {
  const { rideId } = route.params;
  const [requests, setRequests] = useState([]);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load ride details
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      if (rideDoc.exists()) {
        setRide({ id: rideDoc.id, ...rideDoc.data() });
      }

      // Load requests
      const requestsQuery = query(
        collection(db, 'rideRequests'),
        where('rideId', '==', rideId),
        where('driverId', '==', user.uid)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort: pending first, then by date
      requestsData.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requestedAt) - new Date(a.requestedAt);
      });

      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load ride requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request) => {
    if (!ride || ride.availableSeats <= 0) {
      Alert.alert('No Seats Available', 'This ride is already full');
      return;
    }

    setProcessingRequest(request.id);

    try {
      await runTransaction(db, async (transaction) => {
        // Get latest ride data
        const rideRef = doc(db, 'rides', rideId);
        const rideDoc = await transaction.get(rideRef);
        const rideData = rideDoc.data();

        if (rideData.availableSeats <= 0) {
          throw new Error('No seats available');
        }

        // Update request status
        const requestRef = doc(db, 'rideRequests', request.id);
        transaction.update(requestRef, {
          status: 'accepted',
          respondedAt: new Date().toISOString(),
        });

        // Create booking
        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, {
          rideId: rideId,
          riderId: request.riderId,
          riderName: request.riderName,
          riderPhone: request.riderPhone,
          driverId: user.uid,
          driverName: ride.driverName,
          driverPhone: ride.driverPhone,
          pickupLocation: request.riderPickupLocation,
          destination: ride.destination,
          departureTime: ride.departureTime,
          price: ride.price,
          status: 'confirmed',
          paymentStatus: ride.isFree ? 'paid' : 'unpaid',
          requestStatus: 'accepted',
          createdAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
          completedAt: null,
          rated: false,
        });

        // Update available seats
        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats - 1,
        });
      });

      // Send notification to rider
      await addDoc(collection(db, 'notifications'), {
        userId: request.riderId,
        type: 'ride_accepted',
        title: 'Ride Request Accepted! 🎉',
        message: `${ride.driverName} accepted your request to join the ride to ${ride.destination}`,
        rideId: rideId,
        isRead: false,
        createdAt: new Date().toISOString(),
        data: {
          rideId: rideId,
          driverId: user.uid,
          driverName: ride.driverName,
          driverPhone: ride.driverPhone,
        },
      });

      Alert.alert(
        '✅ Request Accepted',
        `${request.riderName} has been added to your ride. You can contact them at ${request.riderPhone}`,
        [
          {
            text: 'Call Rider',
            onPress: () => Linking.openURL(`tel:${request.riderPhone}`),
          },
          {
            text: 'OK',
            onPress: () => loadData(),
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (request) => {
    Alert.prompt(
      'Decline Request',
      'Please provide a reason (optional):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          onPress: async (reason) => {
            setProcessingRequest(request.id);
            try {
              // Update request status
              await updateDoc(doc(db, 'rideRequests', request.id), {
                status: 'declined',
                declineReason: reason || 'Driver declined',
                respondedAt: new Date().toISOString(),
              });

              // Send notification to rider
              await addDoc(collection(db, 'notifications'), {
                userId: request.riderId,
                type: 'ride_declined',
                title: 'Ride Request Declined',
                message: `${ride.driverName} declined your request to join the ride${reason ? `: ${reason}` : ''}`,
                rideId: rideId,
                isRead: false,
                createdAt: new Date().toISOString(),
                data: {
                  rideId: rideId,
                  reason: reason || 'Driver declined',
                },
              });

              Alert.alert('Request Declined', 'The rider has been notified');
              loadData();
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            } finally {
              setProcessingRequest(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return '#2ECC71';
      case 'declined':
        return '#E74C3C';
      default:
        return '#F39C12';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Requests</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Ride Info Summary */}
      {ride && (
        <View style={styles.rideSummary}>
          <View style={styles.summaryRow}>
            <Ionicons name="navigate" size={18} color="#5B9FAD" />
            <Text style={styles.summaryText} numberOfLines={1}>
              {ride.pickupLocation} → {ride.destination}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="people" size={18} color="#5B9FAD" />
            <Text style={styles.summaryText}>
              {ride.availableSeats} seats available
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B9FAD"
            colors={['#5B9FAD']}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#3A3A4E" />
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubtext}>
              Riders will see your ride and send requests to join
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(request.status)}20` },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                  {request.status.toUpperCase()}
                </Text>
                <Text style={styles.timeText}>{formatTime(request.requestedAt)}</Text>
              </View>

              {/* Rider Info */}
              <View style={styles.riderSection}>
                <View style={styles.riderAvatar}>
                  <Text style={styles.riderInitial}>
                    {request.riderName?.charAt(0).toUpperCase() || 'R'}
                  </Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{request.riderName}</Text>
                  {request.status === 'accepted' && (
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${request.riderPhone}`)}
                    >
                      <Ionicons name="call" size={16} color="#5B9FAD" />
                      <Text style={styles.phoneText}>{request.riderPhone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Pickup Location */}
              <View style={styles.detailBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={18} color="#5B9FAD" />
                  <Text style={styles.detailLabel}>Pickup:</Text>
                </View>
                <Text style={styles.detailValue}>{request.riderPickupLocation}</Text>
              </View>

              {/* Message */}
              {request.message && (
                <View style={styles.messageBox}>
                  <Ionicons name="chatbubble" size={16} color="#7F8C8D" />
                  <Text style={styles.messageText}>{request.message}</Text>
                </View>
              )}

              {/* Decline Reason */}
              {request.status === 'declined' && request.declineReason && (
                <View style={styles.declineReasonBox}>
                  <Text style={styles.declineReasonLabel}>Decline reason:</Text>
                  <Text style={styles.declineReasonText}>{request.declineReason}</Text>
                </View>
              )}

              {/* Action Buttons (only for pending) */}
              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(request)}
                    disabled={processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <ActivityIndicator size="small" color="#E74C3C" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#E74C3C" />
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request)}
                    disabled={processingRequest === request.id || ride?.availableSeats <= 0}
                  >
                    {processingRequest === request.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  rideSummary: {
    backgroundColor: '#2C2C3E',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  requestCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  statusBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  timeText: {
    fontSize: 11,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  riderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  riderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  detailBox: {
    backgroundColor: '#1A1A2E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#5B9FAD',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  declineReasonBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  declineReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E74C3C',
    marginBottom: 4,
    fontFamily: 'System',
  },
  declineReasonText: {
    fontSize: 13,
    color: '#E74C3C',
    fontFamily: 'System',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  declineButtonText: {
    color: '#E74C3C',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B9FAD',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
});