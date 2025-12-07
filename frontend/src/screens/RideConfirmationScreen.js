// src/screens/RideConfirmationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RideConfirmationScreen({ navigation, route }) {
  const { ride } = route.params;
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const handleConfirmPickup = async () => {
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
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', user.uid))
      );
      const userData = userDoc.docs[0]?.data();

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

        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, {
          rideId: ride.id,
          riderId: user.uid,
          riderName: userData?.name || user.displayName || 'User',
          driverId: ride.driverId,
          driverName: ride.driverName,
          pickupLocation: ride.pickupLocation,
          destination: ride.destination,
          departureTime: ride.departureTime,
          estimatedCost: ride.estimatedCost,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          rated: false,
        });

        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats - 1,
        });
      });

      Alert.alert(
        '🎉 Booking Confirmed!',
        `Your ride from ${ride.pickupLocation} to ${ride.destination} has been booked. The driver will contact you soon.`,
        [
          {
            text: 'View My Rides',
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
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#5B9FAD" />
            <Text style={styles.cardTitle}>Trip Details</Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="ellipse" size={12} color="#5B9FAD" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText}>{ride.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.locationRow}>
            <Ionicons name="location" size={12} color="#5B9FAD" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationText}>{ride.destination}</Text>
            </View>
          </View>
        </View>

        {/* Ride Type Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ride Information</Text>
          
          <View style={styles.rideTypeCard}>
            <View style={styles.carIconContainer}>
              <Ionicons name="car-sport" size={40} color="#5B9FAD" />
            </View>
            <Text style={styles.rideTypeName}>{ride.rideTypeName || 'Standard Ride'}</Text>
          </View>

          <View style={styles.rideInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color="#5B9FAD" />
              <Text style={styles.infoText}>
                {new Date(ride.departureTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={18} color="#5B9FAD" />
              <Text style={styles.infoText}>{ride.availableSeats} seats available</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={18} color="#5B9FAD" />
              <Text style={styles.infoText}>{ride.estimatedCost || 0} BHD</Text>
            </View>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Driver</Text>
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
                  {ride.driverRating?.toFixed(1) || 'New'} • {ride.totalRides || 0} rides
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Price</Text>
            <Text style={styles.priceValue}>{ride.estimatedCost || 0} BHD</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmPickup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#3A3A4E',
    marginLeft: 5,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  rideTypeCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  carIconContainer: {
    width: 100,
    height: 70,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#3A3A4E',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
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
  priceCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#5B9FAD',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  confirmButton: {
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});