// src/screens/RideDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RideDetailsScreen({ navigation, route }) {
  const { ride } = route.params;
  const [message, setMessage] = useState('');
  const [pickupDetails, setPickupDetails] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    try {
      const q = query(
        collection(db, 'rideRequests'),
        where('rideId', '==', ride.id),
        where('riderId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      setHasExistingRequest(!snapshot.empty);
    } catch (error) {
      console.error('Error checking existing request:', error);
    }
  };

  const handleRequestRide = async () => {
    if (hasExistingRequest) {
      Alert.alert(
        'Request Already Sent',
        'You have already sent a request for this ride. Please wait for the driver to respond.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!pickupCoordinates) {
      Alert.alert('Missing Information', 'Please select your pickup location on the map');
      return;
    }

    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const requestData = {
        rideId: ride.id,
        riderId: user.uid,
        riderName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
        riderPhone: userData?.phone || '',
        riderPickupLocation: pickupDetails.trim(),
        driverId: ride.driverId,
        status: 'pending',
        declineReason: '',
        requestedAt: new Date().toISOString(),
        respondedAt: null,
        message: message.trim() || '',
      };

      await addDoc(collection(db, 'rideRequests'), requestData);

      await addDoc(collection(db, 'notifications'), {
        userId: ride.driverId,
        type: 'ride_request',
        title: 'New Ride Request',
        message: `${requestData.riderName} wants to join your ride to ${ride.destination}`,
        rideId: ride.id,
        isRead: false,
        createdAt: new Date().toISOString(),
        data: {
          rideId: ride.id,
          riderId: user.uid,
          riderName: requestData.riderName,
        },
      });

      Alert.alert(
        '✅ Request Sent!',
        `Your ride request has been sent to ${ride.driverName}. You'll be notified when they respond.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Request error:', error);
      Alert.alert('Request Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr;
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dateStr = `${months[date.getMonth()]} ${date.getDate()}`;
    }

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    return `${dateStr} at ${timeStr}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ride.status === 'active' && (
          <View style={styles.statusBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>Driver is on the road</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <View style={styles.driverSection}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitial}>
                {ride.driverName?.charAt(0).toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{ride.driverName || 'Driver'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.driverRating}>
                  {ride.driverRating?.toFixed(1) || 'New Driver'} ({ride.totalRides || 0} rides)
                </Text>
              </View>
              <View style={styles.vehicleRow}>
                <Ionicons name="car-sport" size={16} color="#5B9FAD" />
                <Text style={styles.vehicleText}>{ride.vehicleModel} • {ride.vehiclePlate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                {ride.isScheduled ? 'Scheduled Time' : 'Started'}
              </Text>
              <Text style={styles.detailValue}>
                {formatDateTime(ride.departureTime)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Pickup Area</Text>
              <Text style={styles.detailValue}>{ride.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{ride.destination}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Available Seats</Text>
              <Text style={styles.detailValue}>{ride.availableSeats} seats left</Text>
            </View>
          </View>

          {ride.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={20} color="#5B9FAD" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Driver's Notes</Text>
                <Text style={styles.detailValue}>{ride.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {ride.pickupCoordinates && ride.destinationCoordinates && (
          <TouchableOpacity
            style={styles.viewRouteButton}
            onPress={() => navigation.navigate('RouteMap', { ride })}
          >
            <Ionicons name="map-outline" size={20} color="#5B9FAD" />
            <Text style={styles.viewRouteText}>View Route on Map</Text>
            <Ionicons name="chevron-forward" size={20} color="#5B9FAD" />
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request to Join</Text>

          <Text style={styles.inputLabel}>Your Exact Pickup Location *</Text>
          <TouchableOpacity
            style={styles.mapPickerButton}
            onPress={() => navigation.navigate('MapPicker', {
              onLocationSelect: (location) => {
                setPickupDetails(location.address);
                setPickupCoordinates(location.coordinates);
              },
              initialLocation: pickupCoordinates,
            })}
          >
            <View style={styles.mapPickerContent}>
              <Ionicons name="location" size={24} color="#5B9FAD" />
              <View style={styles.mapPickerText}>
                <Text style={styles.mapPickerLabel}>Pickup Location</Text>
                <Text style={styles.mapPickerValue} numberOfLines={2}>
                  {pickupDetails || 'Tap to select on map'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          {hasExistingRequest && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#F39C12" />
              <Text style={styles.warningText}>
                You have already requested this ride. The driver will respond soon.
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Message (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Add a message for the driver..."
              placeholderTextColor="#7F8C8D"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#5B9FAD" />
            <Text style={styles.infoText}>
              The driver will review your request and contact you if accepted. Their phone number will be shared once accepted.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price per Person</Text>
            <Text style={styles.priceValue}>
              {ride.isFree ? 'FREE' : `${ride.price} BHD`}
            </Text>
          </View>
          {ride.isFree && (
            <Text style={styles.freeRideNote}>
              🎉 This is a free ride! The driver is offering this ride at no cost.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.requestButton, 
            (loading || ride.availableSeats === 0 || hasExistingRequest) && styles.requestButtonDisabled
          ]}
          onPress={handleRequestRide}
          disabled={loading || ride.availableSeats === 0 || hasExistingRequest}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
              <Text style={styles.requestButtonText}>
                {ride.availableSeats === 0 
                  ? 'Ride Full' 
                  : hasExistingRequest 
                  ? 'Request Already Sent'
                  : 'Send Request'}
              </Text>
            </>
          )}
        </TouchableOpacity>
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
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ECC71',
  },
  statusText: {
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  card: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  driverAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  driverRating: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  vehicleText: {
    fontSize: 13,
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
    alignItems: 'flex-start',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  viewRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  viewRouteText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 8,
    fontFamily: 'System',
  },
  mapPickerButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mapPickerText: {
    flex: 1,
  },
  mapPickerLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  mapPickerValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F39C12',
    lineHeight: 16,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  messageInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#5B9FAD',
    lineHeight: 16,
    fontFamily: 'System',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  freeRideNote: {
    fontSize: 13,
    color: '#2ECC71',
    marginTop: 12,
    fontFamily: 'System',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  requestButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  requestButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
});