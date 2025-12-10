// src/screens/RideDetailsScreen.js - FIXED
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
import { collection, addDoc, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Linking } from 'react-native';
import { Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { deleteDoc } from 'firebase/firestore';

export default function RideDetailsScreen({ navigation, route }) {
  const { ride } = route.params;
  const [message, setMessage] = useState('');
  const [pickupDetails, setPickupDetails] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null); // pending, accepted, active
  const [booking, setBooking] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);

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

  useEffect(() => {
    checkBookingStatus();
  }, []);
  const checkBookingStatus = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('rideId', '==', ride.id),
        where('riderId', '==', user.uid)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      if (!bookingsSnapshot.empty) {
        const bookingData = { id: bookingsSnapshot.docs[0].id, ...bookingsSnapshot.docs[0].data() };
        setBooking(bookingData);

        if (bookingData.status === 'in_progress') {
          setBookingStatus('active');
        } else if (bookingData.status === 'scheduled' || bookingData.status === 'confirmed') {
          setBookingStatus('accepted');
        }

        // Load vehicle data
        if (ride.vehicleId) {
          const vehicleDoc = await getDoc(doc(db, 'vehicles', ride.vehicleId));
          if (vehicleDoc.exists()) {
            setVehicle(vehicleDoc.data());
          }
        }
      }
    } catch (error) {
      console.error('Error checking booking:', error);
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
        pickupLocation: pickupDetails.trim() || 'Pickup location',
        pickupCoordinates: pickupCoordinates || null,
        driverId: ride.driverId,
        status: 'pending',
        createdAt: new Date().toISOString(),
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

const handleCancelRide = async () => {
  Alert.alert(
    'Cancel Ride',
    'Are you sure you want to cancel this ride?',
    [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        onPress: async () => {
          try {
            // Update ride status
            await updateDoc(doc(db, 'rides', ride.id), {
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
            });

            // Cancel all bookings for this ride
            const bookingsQuery = query(
              collection(db, 'bookings'),
              where('rideId', '==', ride.id),
              where('status', 'in', ['confirmed', 'scheduled', 'pending'])
            );
            
            const bookingsSnapshot = await getDocs(bookingsQuery);
            for (const bookingDoc of bookingsSnapshot.docs) {
              await updateDoc(doc(db, 'bookings', bookingDoc.id), {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
              });

              // Send notification to rider
              await addDoc(collection(db, 'notifications'), {
                userId: bookingDoc.data().riderId,
                type: 'ride_cancelled',
                title: 'Ride Cancelled',
                message: `Your ride to ${ride.destination} has been cancelled by the driver`,
                rideId: ride.id,
                isRead: false,
                createdAt: new Date().toISOString(),
              });
            }

            Alert.alert('Ride Cancelled', 'The ride has been cancelled successfully');
            navigation.navigate('Home');
          } catch (error) {
            console.error('Error cancelling ride:', error);
            Alert.alert('Error', 'Failed to cancel ride');
          }
        },
      },
    ]
  );
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

  // Update the vehicle image loading logic (around line 60-80):
useEffect(() => {
  loadVehicleDetails();
}, [ride.vehicleId]);

const loadVehicleDetails = async () => {
  try {
    if (ride.vehicleId) {
      const vehicleDoc = await getDoc(doc(db, 'vehicles', ride.vehicleId));
      if (vehicleDoc.exists()) {
        setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });
      }
    }
  } catch (error) {
    console.error('Error loading vehicle:', error);
  }
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

       {/* SHOW VEHICLE IMAGE FOR ALL USERS (not just when booking accepted) */}
{vehicle?.imageUrl && (
  <View style={styles.vehicleImageContainer}>
    <Image 
      source={{ uri: vehicle.imageUrl }} 
      style={styles.vehicleImageLarge} 
      resizeMode="cover"
    />
    <View style={styles.vehicleOverlay}>
      <Text style={styles.vehicleOverlayText}>
        {vehicle.vehicleName || vehicle.model || 'Vehicle'}
      </Text>
    </View>
  </View>
)}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <View style={styles.driverSection}>
            {ride.driverProfilePicture ? (
  <Image
    source={{ uri: ride.driverProfilePicture }}
    style={styles.driverAvatarImage}
  />
) : (
  <View style={styles.driverAvatar}>
    <Text style={styles.driverInitial}>
      {ride.driverName?.charAt(0).toUpperCase() || 'D'}
    </Text>
  </View>
)}
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

          {/* SHOW PHONE NUMBER BIG when booking accepted */}
          {bookingStatus === 'accepted' && ride.driverPhone && (
            <TouchableOpacity
              style={styles.phoneButtonLarge}
              onPress={() => Linking.openURL(`tel:${ride.driverPhone}`)}
            >
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.phoneNumberLarge}>{ride.driverPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* VEHICLE DETAILS when accepted */}
        {bookingStatus === 'accepted' && vehicle && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.vehicleDetailRow}>
              <Ionicons name="car" size={24} color="#5B9FAD" />
              <View style={styles.vehicleDetailContent}>
                <Text style={styles.vehicleDetailLabel}>Model</Text>
                <Text style={styles.vehicleDetailValue}>{vehicle.model}</Text>
              </View>
            </View>
            <View style={styles.vehicleDetailRow}>
              <Ionicons name="color-palette" size={24} color="#5B9FAD" />
              <View style={styles.vehicleDetailContent}>
                <Text style={styles.vehicleDetailLabel}>Color</Text>
                <Text style={styles.vehicleDetailValue}>{vehicle.color}</Text>
              </View>
            </View>
            <View style={styles.vehicleDetailRow}>
              <Ionicons name="newspaper" size={24} color="#5B9FAD" />
              <View style={styles.vehicleDetailContent}>
                <Text style={styles.vehicleDetailLabel}>Plate Number</Text>
                <Text style={styles.vehicleDetailValue}>{vehicle.plateNumber}</Text>
              </View>
            </View>
            <View style={styles.vehicleDetailRow}>
              <Ionicons name="people" size={24} color="#5B9FAD" />
              <View style={styles.vehicleDetailContent}>
                <Text style={styles.vehicleDetailLabel}>Seats</Text>
                <Text style={styles.vehicleDetailValue}>{vehicle.seats} seats</Text>
              </View>
            </View>
          </View>
        )}

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

        {ride.isFemaleOnly && (
  <View style={styles.femaleOnlyBanner}>
    <Ionicons name="woman" size={24} color="#FF69B4" />
    <Text style={styles.femaleOnlyBannerText}>Female Only Ride</Text>
  </View>
)}

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



       {/* REQUEST FORM OR REQUEST SENT */}
        {!bookingStatus && !hasExistingRequest && (
          <>
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
                <Ionicons name="information-circle" size={20} color="#5B9FAD" />
                <Text style={styles.infoText}>
                  The driver will see your pickup location and message. They'll accept or decline your request.
                </Text>
              </View>
            </View>
          </>
        )}

        {hasExistingRequest && requestDetails && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Request Sent</Text>
            <View style={styles.requestSentBox}>
              <Ionicons name="checkmark-circle" size={48} color="#2ECC71" />
              <Text style={styles.requestSentText}>
                Your ride request has been sent to the driver
              </Text>
            </View>

            {requestDetails.pickupLocation && (
              <>
                <Text style={styles.inputLabel}>Your Pickup Location</Text>
                <Text style={styles.requestSentDetail}>{requestDetails.pickupLocation}</Text>
                
                {requestDetails.pickupCoordinates && (
                  <View style={styles.miniMapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.miniMap}
                      initialRegion={{
                        ...requestDetails.pickupCoordinates,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                    >
                      <Marker coordinate={requestDetails.pickupCoordinates} pinColor="#5B9FAD" />
                    </MapView>
                  </View>
                )}
              </>
            )}

            {requestDetails.message && (
              <>
                <Text style={styles.inputLabel}>Your Message</Text>
                <View style={styles.messageDisplayBox}>
                  <Text style={styles.messageDisplayText}>{requestDetails.message}</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelRequestButton}
              onPress={async () => {
                await deleteDoc(doc(db, 'rideRequests', requestDetails.id));
                setHasExistingRequest(false);
                setRequestDetails(null);
              }}
            >
              <Text style={styles.cancelRequestButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PAYMENT REMINDER when active */}
        {bookingStatus === 'active' && (
          <View style={styles.paymentReminderCard}>
            <Ionicons name="cash" size={32} color="#2ECC71" />
            <Text style={styles.paymentReminderTitle}>Payment Reminder</Text>
            <Text style={styles.paymentReminderAmount}>
              {ride.estimatedCost || ride.price} BHD
            </Text>
            <Text style={styles.paymentReminderText}>
              Please pay the driver at the end of your trip
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price</Text>
            {ride.estimatedCost || ride.price ? (
              <Text style={styles.priceValue}>{ride.estimatedCost || ride.price} BHD</Text>
            ) : (
              <Text style={styles.priceValue}>Free</Text>
            )}
          </View>
          {(!ride.estimatedCost && !ride.price) && (
            <Text style={styles.freeRideNote}>
              This is a free carpooling ride. Please be courteous to your driver.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
  {!bookingStatus ? (
    <TouchableOpacity
      style={[
        styles.requestButton,
        (loading || hasExistingRequest || !pickupCoordinates) && styles.requestButtonDisabled
      ]}
      onPress={handleRequestRide}
      disabled={loading || hasExistingRequest || !pickupCoordinates}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="send" size={20} color="#FFFFFF" />
          <Text style={styles.requestButtonText}>
            {hasExistingRequest ? 'Request Pending' : 'Send Request'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  ) : bookingStatus === 'accepted' ? (
    <View style={styles.acceptedActions}>
      <View style={styles.acceptedButton}>
        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        <Text style={styles.acceptedButtonText}>REQUEST ACCEPTED</Text>
      </View>
      {/* ADD CANCEL BUTTON FOR ACCEPTED REQUESTS */}
      <TouchableOpacity
        style={styles.cancelRideButton}
        onPress={handleCancelRide}
      >
        <Ionicons name="close-circle" size={20} color="#FFFFFF" />
        <Text style={styles.cancelRideButtonText}>Cancel Ride</Text>
      </TouchableOpacity>
    </View>
  ) : null}
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
  vehicleImageContainer: {
    width: '100%',
    height: 250,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vehicleImageLarge: {
    width: '100%',
    height: '100%',
  },
  vehicleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  vehicleOverlayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  phoneButtonLarge: {
    backgroundColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneNumberLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  vehicleDetailContent: {
    flex: 1,
  },
  vehicleDetailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  vehicleDetailValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  paymentReminderCard: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  paymentReminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ECC71',
    marginTop: 12,
    fontFamily: 'System',
  },
  paymentReminderAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginTop: 8,
    fontFamily: 'System',
  },
  paymentReminderText: {
    fontSize: 14,
    color: '#2ECC71',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'System',
  },
  acceptedButton: {
    backgroundColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  driverAvatarImage: {
  width: 70,
  height: 70,
  borderRadius: 35,
  marginRight: 16,
},
femaleOnlyBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 105, 180, 0.15)',
  padding: 16,
  borderRadius: 12,
  gap: 12,
  marginTop: 16,
  borderWidth: 2,
  borderColor: '#FF69B4',
},
femaleOnlyBannerText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FF69B4',
  fontFamily: 'System',
},
requestSentBox: {
  alignItems: 'center',
  padding: 24,
  backgroundColor: 'rgba(46, 204, 113, 0.1)',
  borderRadius: 12,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#2ECC71',
},
requestSentText: {
  fontSize: 15,
  color: '#2ECC71',
  textAlign: 'center',
  marginTop: 12,
  fontFamily: 'System',
},
requestSentDetail: {
  fontSize: 15,
  color: '#FFFFFF',
  marginBottom: 12,
  fontFamily: 'System',
},
miniMapContainer: {
  height: 200,
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#3A3A4E',
},
miniMap: {
  flex: 1,
},
messageDisplayBox: {
  backgroundColor: 'rgba(91, 159, 173, 0.1)',
  padding: 16,
  borderRadius: 12,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#5B9FAD',
},
messageDisplayText: {
  fontSize: 15,
  color: '#FFFFFF',
  lineHeight: 22,
  fontFamily: 'System',
},
cancelRequestButton: {
  backgroundColor: '#E74C3C',
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: 'center',
},
cancelRequestButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
  fontFamily: 'System',
},
acceptedActions: {
  gap: 12,
},
cancelRideButton: {
  backgroundColor: '#E74C3C',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  borderRadius: 12,
  gap: 8,
  shadowColor: '#E74C3C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
},
cancelRideButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
  fontFamily: 'System',
},
});