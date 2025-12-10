// src/screens/RideCompletedScreen.js - NEW FILE
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';

export default function RideCompletedScreen({ navigation, route }) {
  const { ride, booking } = route.params;
  const [rating, setRating] = useState(0);

  const handleRate = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please rate your ride');
      return;
    }
    navigation.navigate('Rating', { booking });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={80} color="#2ECC71" />
        
        <Text style={styles.title}>Ride Ended</Text>
        <Text style={styles.subtitle}>Please pay your driver</Text>

        <View style={styles.paymentCard}>
          <Text style={styles.driverLabel}>Pay</Text>
          <Text style={styles.driverName}>{ride.driverName}</Text>
          <Text style={styles.amount}>{booking.estimatedCost || ride.estimatedCost} BHD</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate your ride</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#FFD700' : '#3A3A4E'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.rateButton} onPress={handleRate}>
          <Text style={styles.rateButtonText}>Submit Rating</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.skipText}>Skip for now</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 8,
    fontFamily: 'System',
  },
  paymentCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 30,
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  driverLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    fontFamily: 'System',
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  ratingSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 40,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  skipText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 20,
    fontFamily: 'System',
  },
});