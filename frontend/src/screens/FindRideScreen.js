// src/screens/FindRideScreen.js
import React, { useState } from 'react';
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function FindRideScreen({ navigation }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!pickupLocation || !destination) {
      Alert.alert('Missing Information', 'Please enter pickup location and destination');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // Query available rides from Firestore
      const ridesRef = collection(db, 'rides');
      const q = query(
        ridesRef,
        where('status', '==', 'active'),
        where('availableSeats', '>', 0)
      );

      const querySnapshot = await getDocs(q);
      const rides = [];

      querySnapshot.forEach((doc) => {
        const rideData = doc.data();
        
        // Simple matching logic - check if pickup/destination contain search terms
        const pickupMatch = 
          rideData.pickupLocation.toLowerCase().includes(pickupLocation.toLowerCase()) ||
          pickupLocation.toLowerCase().includes(rideData.pickupLocation.toLowerCase());
        
        const destMatch = 
          rideData.destination.toLowerCase().includes(destination.toLowerCase()) ||
          destination.toLowerCase().includes(rideData.destination.toLowerCase());

        if (pickupMatch && destMatch) {
          rides.push({
            id: doc.id,
            ...rideData,
          });
        }
      });

      setSearchResults(rides);

      if (rides.length === 0) {
        Alert.alert('No Rides Found', 'No rides match your search criteria. Try different locations.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = (ride) => {
    navigation.navigate('RideDetails', { ride });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Form */}
        <View style={styles.searchCard}>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={24} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="Pickup location (e.g., Downtown, Adliya)"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-outline" size={24} color="#E74C3C" />
            <TextInput
              style={styles.input}
              placeholder="Destination (e.g., AUBH, City Center)"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="time-outline" size={24} color="#F39C12" />
            <TextInput
              style={styles.input}
              placeholder="Departure time (optional, e.g., 08:00 AM)"
              value={departureTime}
              onChangeText={setDepartureTime}
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Search Rides</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {searched && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {searchResults.length} Ride{searchResults.length !== 1 ? 's' : ''} Available
            </Text>

            {searchResults.map((ride) => (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideCard}
                onPress={() => handleBookRide(ride)}
              >
                <View style={styles.rideHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverInitial}>
                        {ride.driverName?.charAt(0).toUpperCase() || 'D'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.driverName}>{ride.driverName || 'Driver'}</Text>
                      <Text style={styles.driverRating}>
                        ⭐ {ride.driverRating?.toFixed(1) || 'New'} • {ride.totalRides || 0} rides
                      </Text>
                    </View>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{ride.estimatedCost || 0} BHD</Text>
                  </View>
                </View>

                <View style={styles.routeInfo}>
                  <View style={styles.routeItem}>
                    <Ionicons name="ellipse" size={12} color="#5B9FAD" />
                    <Text style={styles.routeText}>{ride.pickupLocation}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeItem}>
                    <Ionicons name="location" size={12} color="#E74C3C" />
                    <Text style={styles.routeText}>{ride.destination}</Text>
                  </View>
                </View>

                <View style={styles.rideFooter}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.infoText}>
                      {new Date(ride.departureTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="people-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.infoText}>{ride.availableSeats} seats left</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchCard: {
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2C3E50',
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  driverRating: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: '#E8F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B9FAD',
  },
  routeInfo: {
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
    marginVertical: 4,
  },
  routeText: {
    fontSize: 15,
    color: '#2C3E50',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});