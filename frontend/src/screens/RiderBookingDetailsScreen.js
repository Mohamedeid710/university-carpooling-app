// src/screens/RiderBookingDetailsScreen.js - NEW FILE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RiderBookingDetailsScreen({ navigation, route }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [ride, setRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadBookingDetails();
  }, []);

  const loadBookingDetails = async () => {
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingDoc.exists()) {
        Alert.alert('Error', 'Booking not found');
        navigation.goBack();
        return;
      }
      const bookingData = { id: bookingDoc.id, ...bookingDoc.data() };
      setBooking(bookingData);

      const rideDoc = await getDoc(doc(db, 'rides', bookingData.rideId));
      if (rideDoc.exists()) {
        const rideData = { id: rideDoc.id, ...rideDoc.data() };
        setRide(rideData);

        if (rideData.routePolyline) {
          setRouteCoordinates(JSON.parse(rideData.routePolyline));
        }

        const driverDoc = await getDoc(doc(db, 'users', rideData.driverId));
        if (driverDoc.exists()) {
          setDriver(driverDoc.data());
        }

        if (rideData.vehicleId) {
          const vehicleDoc = await getDoc(doc(db, 'vehicles', rideData.vehicleId));
          if (vehicleDoc.exists()) {
            setVehicle(vehicleDoc.data());
          }
        }
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCallDriver = () => {
    if (!ride?.driverPhone) {
      Alert.alert('Not Available', 'Driver phone number is not available');
      return;
    }
    Linking.openURL(`tel:${ride.driverPhone}`);
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: user.uid,
              });

              await updateDoc(doc(db, 'rides', ride.id), {
                availableSeats: increment(1),
              });

              await addDoc(collection(db, 'notifications'), {
                userId: ride.driverId,
                type: 'booking_cancelled',
                title: 'Booking Cancelled',
                message: `${user.displayName} cancelled their booking`,
                rideId: ride.id,
                bookingId: bookingId,
                isRead: false,
                createdAt: new Date().toISOString(),
              });

              Alert.alert('Success', 'Booking cancelled', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
        return { text: 'SCHEDULED', color: '#5B9FAD', bg: 'rgba(91, 159, 173, 0.2)' };
      case 'in_progress':
        return { text: 'IN PROGRESS', color: '#2ECC71', bg: 'rgba(46, 204, 113, 0.2)' };
      case 'confirmed':
        return { text: 'CONFIRMED', color: '#3498DB', bg: 'rgba(52, 152, 219, 0.2)' };
      default:
        return { text: status?.toUpperCase(), color: '#7F8C8D', bg: 'rgba(127, 140, 141, 0.2)' };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(booking?.status);
  const canCancel = ['confirmed', 'scheduled'].includes(booking?.status);

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
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>

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

        {/* Request Accepted Message */}
        {booking?.status === 'confirmed' && (
          <View style={styles.acceptedCard}>
            <Ionicons name="checkmark-circle" size={32} color="#2ECC71" />
            <View style={styles.acceptedTextContainer}>
              <Text style={styles.acceptedTitle}>Request Accepted!</Text>
              <Text style={styles.acceptedText}>
                {ride?.driverName} accepted your ride request
              </Text>
            </View>
          </View>
        )}

        <View style={styles.hintCard}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.hintText}>
            Coordinate with your driver so they can pick you up!
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Driver</Text>
          <View style={styles.driverSection}>
            <View style={styles.driverAvatar}>
              {driver?.profilePictureUrl ? (
                <Image source={{ uri: driver.profilePictureUrl }} style={styles.driverAvatarImage} />
              ) : (
                <Text style={styles.driverInitial}>
                  {ride?.driverName?.charAt(0).toUpperCase() || 'D'}
                </Text>
              )}
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{ride?.driverName}</Text>
              {driver?.averageRating > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {driver.averageRating.toFixed(1)} • {driver.totalRatings || 0} rides
                  </Text>
                </View>
              )}
            </View>
          </View>

          {ride?.driverPhone && (
            <TouchableOpacity style={styles.phoneButton} onPress={handleCallDriver}>
              <Ionicons name="call" size={24} color="#FFFFFF" />
              <Text style={styles.phoneButtonText}>{ride.driverPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {vehicle && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vehicle</Text>
            {vehicle.imageUrl && (
              <Image source={{ uri: vehicle.imageUrl }} style={styles.vehicleImage} />
            )}
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>{vehicle.vehicleName}</Text>
              <Text style={styles.vehicleModel}>{vehicle.model}</Text>
              <View style={styles.vehicleSpecs}>
                <View style={styles.specItem}>
                  <Ionicons name="color-palette" size={16} color="#7F8C8D" />
                  <Text style={styles.specText}>{vehicle.color}</Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="newspaper" size={16} color="#7F8C8D" />
                  <Text style={styles.specText}>{vehicle.plateNumber}</Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="people" size={16} color="#7F8C8D" />
                  <Text style={styles.specText}>{vehicle.seats} seats</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.tripDetail}>
            <Ionicons name="ellipse" size={12} color="#5B9FAD" />
            <Text style={styles.tripDetailText}>{ride?.pickupLocation}</Text>
          </View>
          <View style={styles.tripDetail}>
            <Ionicons name="location" size={12} color="#E74C3C" />
            <Text style={styles.tripDetailText}>{ride?.destination}</Text>
          </View>
          <View style={styles.tripDetail}>
            <Ionicons name="time" size={12} color="#7F8C8D" />
            <Text style={styles.tripDetailText}>
              {ride?.departureTime && new Date(ride.departureTime).toLocaleString()}
            </Text>
          </View>
          <View style={styles.tripDetail}>
            <Ionicons name="cash" size={12} color="#7F8C8D" />
            <Text style={styles.tripDetailText}>{booking?.estimatedCost || 0} BHD</Text>
          </View>
        </View>

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelBooking}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statusBadge: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  map: {
    width: '100%',
    height: 250,
    marginTop: 20,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: '#5B9FAD',
    fontWeight: '500',
    fontFamily: 'System',
  },
  acceptedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 2,
    borderColor: '#2ECC71',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptedTextContainer: {
    flex: 1,
  },
  acceptedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ECC71',
    marginBottom: 4,
    fontFamily: 'System',
  },
  acceptedText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  card: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
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
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  phoneButton: {
     backgroundColor: 'rgba(46, 204, 113, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: '#2ECC71',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2ECC71',
    fontFamily: 'System',
  },
  vehicleImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  vehicleDetails: {
    gap: 8,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  vehicleModel: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 8,
    fontFamily: 'System',
  },
  vehicleSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tripDetailText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});