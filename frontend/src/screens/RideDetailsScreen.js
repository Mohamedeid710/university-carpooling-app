// src/screens/RideDetailsScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function RideDetailsScreen({ navigation, route }) {
  const { ride } = route.params;
  const user = auth.currentUser;

  const handleBookSeat = () => {
    navigation.navigate('RideConfirmation', { ride });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
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
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.driverRating}>
                  {ride.driverRating?.toFixed(1) || 'New Driver'} ({ride.totalRides || 0} rides)
                </Text>
              </View>
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
              <Text style={styles.detailValue}>{ride.availableSeats} seats</Text>
            </View>
          </View>

          {ride.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={20} color="#5B9FAD" />
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
          style={[styles.bookButton, ride.availableSeats === 0 && styles.bookButtonDisabled]}
          onPress={handleBookSeat}
          disabled={ride.availableSeats === 0}
        >
          <Text style={styles.bookButtonText}>
            {ride.availableSeats === 0 ? 'Fully Booked' : 'Confirm Booking'}
          </Text>
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
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  bookButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
});