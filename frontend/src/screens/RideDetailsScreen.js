// src/screens/RideDetailsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function RideDetailsScreen({ navigation, route }) {
  const { ride } = route.params;
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const handleBookSeat = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to book a ride');
      return;
    }

    if (ride.driverId === user.uid) {
      Alert.alert('Cannot Book', 'You cannot book your own ride');
      return;
    }

    setLoading(true);

    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Use Firestore transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, 'rides', ride.id);
        const rideDoc = await transaction.get(rideRef);

        if (!rideDoc.exists()) {
          throw new Error('Ride not found');
        }

        const rideData = rideDoc.data();

        if (rideData.availableSeats <= 0) {
          throw new Error('No seats available');
        }

        // Check if user already booked this ride
        const bookingsSnapshot = await getDocs(
          query(
            collection(db, 'bookings'),
            where('rideId', '==', ride.id),
            where('riderId', '==', user.uid)
          )
        );

        if (!bookingsSnapshot.empty) {
          throw new Error('You have already booked this ride');
        }

        // Create booking
        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, {
          rideId: ride.id,
          riderId: user.uid,
          riderName: userData.name || user.displayName || 'User',
          driverId: ride.driverId,
          driverName: ride.driverName,
          pickupLocation: ride.pickupLocation,
          destination: ride.destination,
          departureTime: ride.departureTime,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          rated: false,
        });

        // Update ride
        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats - 1,
        });
      });

      Alert.alert(
        'Booking Confirmed!',
        'Your seat has been booked successfully. The driver will contact you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Booking Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Driver Info */}
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
              <Text style={styles.driverRating}>
                ⭐ {ride.driverRating?.toFixed(1) || 'New Driver'} ({ride.totalRides || 0} rides)
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {new Date(ride.departureTime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(ride.departureTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#5B9FAD" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Pickup Location</Text>
              <Text style={styles.detailValue}>{ride.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={20} color="#E74C3C" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{ride.destination}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#F39C12" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Available Seats</Text>
              <Text style={styles.detailValue}>{ride.availableSeats} seats</Text>
            </View>
          </View>

          {ride.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={20} color="#7F8C8D" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Additional Notes</Text>
                <Text style={styles.detailValue}>{ride.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price per Person</Text>
            <Text style={styles.priceValue}>{ride.estimatedCost || 0} BHD</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookSeat}
          disabled={loading || ride.availableSeats === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bookButtonText}>
              {ride.availableSeats === 0 ? 'Fully Booked' : 'Confirm Booking'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#5B9FAD',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
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
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  driverRating: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5B9FAD',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bookButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});