// src/screens/RideCompletionScreenRider.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RideCompletionScreenRider({ navigation, route }) {
  const { driverName, cost } = route.params;

  return (
    <LinearGradient
      colors={['#0F2027', '#203A43', '#2C5364']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={100} color="#2ECC71" />
        <Text style={styles.title}>Ride is Over!</Text>
        <Text style={styles.subtitle}>Thank your RouteMate: {driverName}</Text>
        
        <View style={styles.paymentCard}>
          <Text style={styles.paymentLabel}>Amount to pay to</Text>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.amount}>{cost === 0 || !cost ? 'FREE' : `${cost} BHD`}</Text>
        </View>

       <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => navigation.navigate('Rating', {
            booking: {
              id: route.params.bookingId,
              driverId: route.params.driverId || route.params.booking?.driverId,
              rideId: route.params.rideId || route.params.booking?.rideId,
            }
          })}
        >
          <Ionicons name="star" size={24} color="#FFFFFF" />
          <Text style={styles.reviewButtonText}>Rate Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 18,
    color: '#7F8C8D',
    marginTop: 10,
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'System',
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  paymentLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 12,
    fontFamily: 'System',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    fontFamily: 'System',
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2ECC71',
    fontFamily: 'System',
  },
  closeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  reviewButton: {
  flexDirection: 'row',
  backgroundColor: '#F39C12',
  paddingVertical: 16,
  paddingHorizontal: 32,
  borderRadius: 30,
  alignItems: 'center',
  gap: 12,
  marginTop: 30,
  shadowColor: '#F39C12',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 8,
},
reviewButtonText: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFFFFF',
  fontFamily: 'System',
},
});