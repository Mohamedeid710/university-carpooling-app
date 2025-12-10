// src/screens/RideCompletionScreenDriver.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RideCompletionScreenDriver({ navigation, route }) {
  const { riders, totalCost } = route.params;

  return (
    <LinearGradient
      colors={['#0F2027', '#203A43', '#2C5364']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={100} color="#2ECC71" />
        <Text style={styles.title}>Ride Complete!</Text>
        
        <View style={styles.ridersCard}>
          <Text style={styles.ridersTitle}>Riders Share</Text>
          {riders.map((rider, index) => (
            <View key={index} style={styles.riderRow}>
              <Text style={styles.riderName}>{rider.name}</Text>
              <Text style={styles.riderCost}>{rider.cost} BHD</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{totalCost} BHD</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.closeButtonText}>Done</Text>
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
    marginBottom: 40,
    fontFamily: 'System',
  },
  ridersCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  ridersTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2ECC71',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  riderName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  riderCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ECC71',
    fontFamily: 'System',
  },
  closeButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginTop: 40,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});