// src/screens/ActiveRideScreen.js - COMPLETE UPDATED
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function ActiveRideScreen({ navigation, route }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [riders, setRiders] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadRideDetails();
    subscribeToRiders();
  }, []);

  const loadRideDetails = async () => {
    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      if (rideDoc.exists()) {
        const rideData = { id: rideDoc.id, ...rideDoc.data() };
        setRide(rideData);

        if (rideData.routePolyline) {
          try {
            setRouteCoordinates(JSON.parse(rideData.routePolyline));
          } catch (e) {
            console.error('Error parsing route:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRiders = () => {
    const q = query(
      collection(db, 'bookings'),
      where('rideId', '==', rideId),
      where('status', 'in', ['confirmed', 'in_progress', 'scheduled'])
    );

    return onSnapshot(q, async (snapshot) => {
      const ridersData = [];
      for (const docSnapshot of snapshot.docs) {
        const booking = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Load rider info
        try {
          const riderDoc = await getDoc(doc(db, 'users', booking.riderId));
          if (riderDoc.exists()) {
            booking.riderInfo = riderDoc.data();
          }
        } catch (error) {
          console.error('Error loading rider info:', error);
        }
        
        ridersData.push(booking);
      }
      setRiders(ridersData);
    });
  };

  const handleStartRide = async () => {
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'active',
      });

      // Update all bookings to in_progress
      riders.forEach(async (rider) => {
        await updateDoc(doc(db, 'bookings', rider.id), {
          status: 'in_progress',
        });

        // Send notification
        await addDoc(collection(db, 'notifications'), {
          userId: rider.riderId,
          type: 'ride_started',
          title: 'Ride Started',
          message: 'Your ride has started',
          rideId: rideId,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });

      Alert.alert('Success', 'Ride started!');
      loadRideDetails();
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride');
    }
  };

  const handleCompleteRide = async () => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to end this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setCompleting(true);
            const ridersData = [];
            try {
              await updateDoc(doc(db, 'rides', rideId), {
                status: 'completed',
                completedAt: new Date().toISOString(),
              });

              // Complete all bookings and navigate riders to payment screen
              for (const rider of riders) {
                await updateDoc(doc(db, 'bookings', rider.id), {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });

                // Send notification with booking data
               // Collect rider data for completion screen
                ridersData.push({
                  name: rider.riderName,
                  cost: rider.estimatedCost || ride.estimatedCost || 0,
                });

                // Send notification with booking data
                await addDoc(collection(db, 'notifications'), {
                  userId: rider.riderId,
                  type: 'ride_completed',
                  title: 'Ride Completed',
                  message: `Your ride to ${ride.destination} has been completed`,
                  rideId: rideId,
                  data: {
                    bookingId: rider.id,
                    driverName: user.displayName || ride.driverName,
                    driverId: user.uid,
                    cost: rider.estimatedCost || ride.estimatedCost || 0,
                  },
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });
              }

              const totalCost = ridersData.reduce((sum, r) => sum + r.cost, 0);

              // Navigate to completion screen for driver
              navigation.replace('RideCompletionDriver', {
                riders: ridersData,
                totalCost: totalCost,
              });
            } catch (error) {
              console.error('Error completing ride:', error);
              Alert.alert('Error', 'Failed to complete ride');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCallRider = (phone) => {
    if (!phone) {
      Alert.alert('Not Available', 'Rider phone number is not available');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const openRiderLocation = (coords) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
    Linking.openURL(url);
  };

  const generateStaticMapUrl = (coords) => {
    const apiKey = 'AIzaSyDfdostSE5FbdXxXJ-2MUEpnGO7YKspK4k';
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coords.latitude},${coords.longitude}&zoom=15&size=150x150&markers=color:red%7C${coords.latitude},${coords.longitude}&key=${apiKey}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {ride?.status === 'scheduled' ? 'Scheduled Ride' : 
            ride?.status === 'active' ? 'Active Ride' : 'Ride'}
         </Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Ride</Text>
       {ride && ride.pickupCoordinates && ride.destinationCoordinates && (
          <TouchableOpacity
            onPress={() => navigation.navigate('RouteMap', { ride })}
          >
            <Ionicons name="map" size={24} color="#5B9FAD" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        {ride?.pickupCoordinates && ride?.destinationCoordinates && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: (ride.pickupCoordinates.latitude + ride.destinationCoordinates.latitude) / 2,
              longitude: (ride.pickupCoordinates.longitude + ride.destinationCoordinates.longitude) / 2,
              latitudeDelta: Math.abs(ride.pickupCoordinates.latitude - ride.destinationCoordinates.latitude) * 2,
              longitudeDelta: Math.abs(ride.pickupCoordinates.longitude - ride.destinationCoordinates.longitude) * 2,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={ride.pickupCoordinates} pinColor="#5B9FAD" />
            <Marker coordinate={ride.destinationCoordinates} pinColor="#E74C3C" />
            {routeCoordinates.length > 0 && (
              <Polyline coordinates={routeCoordinates} strokeColor="#5B9FAD" strokeWidth={3} />
            )}
          </MapView>
        )}

        {/* Ride Info Card */}
        <View style={styles.rideInfoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="ellipse" size={12} color="#5B9FAD" />
            <Text style={styles.infoText}>{ride?.pickupLocation}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={12} color="#E74C3C" />
            <Text style={styles.infoText}>{ride?.destination}</Text>
          </View>
          {ride?.distance && (
            <View style={styles.infoRow}>
              <Ionicons name="navigate" size={12} color="#7F8C8D" />
              <Text style={styles.infoText}>{ride.distance}</Text>
            </View>
          )}
        </View>

        {/* Riders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Riders ({riders.length}/{ride?.totalSeats - ride?.availableSeats || 0})
          </Text>

          {riders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={50} color="#3A3A4E" />
              <Text style={styles.emptyText}>No riders yet</Text>
            </View>
          ) : (
            riders.map((rider) => (
              <View key={rider.id} style={styles.riderCard}>
                {/* Rider Info */}
                <View style={styles.riderHeader}>
                  <View style={styles.riderAvatar}>
                    {rider.riderInfo?.profilePictureUrl ? (
                      <Image
                        source={{ uri: rider.riderInfo.profilePictureUrl }}
                        style={styles.riderAvatarImage}
                      />
                    ) : (
                      <Text style={styles.riderInitial}>
                        {rider.riderName?.charAt(0).toUpperCase() || 'R'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.riderInfo}>
                    <Text style={styles.riderName}>{rider.riderName}</Text>
                    {rider.riderInfo?.averageRating > 0 && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>
                          {rider.riderInfo.averageRating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {rider.riderInfo?.phone && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallRider(rider.riderInfo.phone)}
                    >
                      <Ionicons name="call" size={20} color="#5B9FAD" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Pickup Location */}
                <View style={styles.pickupSection}>
  <Text style={styles.pickupLabel}>Pickup Location:</Text>
  <Text style={styles.pickupText}>{rider.pickupLocation}</Text>
  
  {/* Show pickup message if exists */}
  {rider.message && (
    <View style={styles.messageBox}>
      <Ionicons name="chatbubble" size={16} color="#5B9FAD" />
      <Text style={styles.messageText}>
        Message: {rider.message}
      </Text>
    </View>
  )}

                  {/* Map Preview */}
                  {rider.pickupCoordinates && (
                    <TouchableOpacity
                      style={styles.mapPreviewContainer}
                      onPress={() => openRiderLocation(rider.pickupCoordinates)}
                    >
                      <Image
                        source={{ uri: generateStaticMapUrl(rider.pickupCoordinates) }}
                        style={styles.mapPreview}
                      />
                      <View style={styles.mapOverlay}>
                        <Ionicons name="navigate" size={16} color="#5B9FAD" />
                        <Text style={styles.mapOverlayText}>Open in Maps</Text>
                      </View>
                    </TouchableOpacity>
                    )}
                    {/* Pickup Notes */}
                  {rider.pickupLocation && (
                    <View style={styles.pickupNoteBox}>
                      <Ionicons name="location" size={16} color="#5B9FAD" />
                      <Text style={styles.pickupNoteText}>{rider.pickupLocation}</Text>
                    </View>
                  )}
                  {rider.message && (
                    <View style={styles.pickupNoteBox}>
                      <Ionicons name="chatbubble" size={16} color="#5B9FAD" />
                      <Text style={styles.pickupNoteText}>{rider.message}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {ride?.status === 'scheduled' ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStartRide}>
            <Ionicons name="play-circle" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Ride</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteRide}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Complete Ride</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    flex: 1,
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: 250,
  },
  rideInfoCard: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 12,
    fontFamily: 'System',
  },
  riderCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A4E',
  },
  riderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  riderAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  riderInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 159, 173, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupSection: {
    gap: 8,
  },
  pickupLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  pickupText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'System',
  },
  mapPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  startButton: {
    backgroundColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  completeButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  pickupNoteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  pickupNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  messageBox: {
  flexDirection: 'row',
  backgroundColor: 'rgba(91, 159, 173, 0.1)',
  padding: 12,
  borderRadius: 10,
  gap: 10,
  marginTop: 10,
  borderWidth: 1,
  borderColor: '#5B9FAD',
  alignItems: 'flex-start',
},
messageText: {
  flex: 1,
  fontSize: 14,
  color: '#5B9FAD',
  fontFamily: 'System',
  lineHeight: 20,
},
});