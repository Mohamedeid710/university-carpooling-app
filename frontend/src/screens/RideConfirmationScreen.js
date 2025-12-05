// src/screens/RideConfirmationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
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
      // Get user data
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', user.uid))
      );
      const userData = userDoc.docs[0]?.data();

      // Use Firestore transaction
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

        // Check if already booked
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
          riderName: userData?.name || user.displayName || 'User',
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
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Welcome, Rider!</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={36} color="#5B9FAD" />
        </TouchableOpacity>
      </View>

      {/* Location Info */}
      <View style={styles.locationSection}>
        <View style={styles.locationHeader}>
          <Ionicons name="location" size={24} color="#2C3E50" />
          <Text style={styles.locationTitle}>Your current location</Text>
        </View>
        <TouchableOpacity style={styles.locationDropdown}>
          <Text style={styles.locationText}>{ride.pickupLocation}</Text>
          <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
        </TouchableOpacity>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={60} color="#5B9FAD" />
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>
            From: {ride.pickupLocation}
          </Text>
        </View>
      </View>

      {/* Destination */}
      <View style={styles.destinationSection}>
        <Ionicons name="navigate" size={24} color="#2C3E50" />
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationLabel}>Where do you wanna go?</Text>
          <Text style={styles.destinationText}>{ride.destination}</Text>
        </View>
      </View>

      {/* Ride Type Section */}
      <View style={styles.rideTypeSection}>
        <Text style={styles.sectionTitle}>chosen ride type:</Text>
        
        <View style={styles.rideTypeCard}>
          <View style={styles.carImageContainer}>
            <Text style={styles.carEmoji}>🚗</Text>
          </View>
          <Text style={styles.rideTypeName}>Comfort $$</Text>
        </View>

        <View style={styles.rideInfoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={18} color="#7F8C8D" />
            <Text style={styles.infoText}>
              {new Date(ride.departureTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={18} color="#7F8C8D" />
            <Text style={styles.infoText}>{ride.availableSeats} seats available</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={18} color="#7F8C8D" />
            <Text style={styles.infoText}>{ride.estimatedCost || 0} BHD</Text>
          </View>
        </View>
      </View>

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
            <Text style={styles.confirmButtonText}>Confirm pick-up</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home" size={24} color="#2C3E50" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>Account</Text>
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
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  profileButton: {
    padding: 5,
  },
  locationSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  mapContainer: {
    height: 250,
    backgroundColor: '#E8F5F7',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5F7',
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5B9FAD',
    marginTop: 10,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
  destinationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  rideTypeSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  rideTypeCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  carImageContainer: {
    width: 120,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  carEmoji: {
    fontSize: 60,
  },
  rideTypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  confirmButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
});