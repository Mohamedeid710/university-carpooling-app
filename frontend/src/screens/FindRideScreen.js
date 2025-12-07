// src/screens/FindRideScreen.js
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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function FindRideScreen({ navigation }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userGender, setUserGender] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    loadUserGender();
  }, []);

  const loadUserGender = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setUserGender(userData?.gender || '');
    } catch (error) {
      console.error('Error loading user gender:', error);
    }
  };

  const handleSearch = async () => {
    if (!pickupLocation || !destination) {
      Alert.alert('Missing Information', 'Please enter pickup location and destination');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const ridesRef = collection(db, 'rides');
      const q = query(
        ridesRef,
        where('status', '==', 'active'),
        where('availableSeats', '>', 0)
      );

      const querySnapshot = await getDocs(q);
      const rides = [];

      querySnapshot.forEach((docSnap) => {
        const rideData = docSnap.data();
        
        // Check if ride is female-only and user is not female
        if (rideData.rideType === 'female-only' && userGender !== 'female') {
          return; // Skip this ride
        }

        // Simple matching logic
        const pickupMatch = 
          rideData.pickupLocation.toLowerCase().includes(pickupLocation.toLowerCase()) ||
          pickupLocation.toLowerCase().includes(rideData.pickupLocation.toLowerCase());
        
        const destMatch = 
          rideData.destination.toLowerCase().includes(destination.toLowerCase()) ||
          destination.toLowerCase().includes(rideData.destination.toLowerCase());

        if (pickupMatch && destMatch) {
          rides.push({
            id: docSnap.id,
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

  const getRideTypeIcon = (rideType) => {
    if (rideType === 'female-only') return 'female';
    if (rideType === 'comfort') return 'car-sport';
    return 'car';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Form */}
        <View style={styles.searchCard}>
          <View style={styles.inputContainer}>
            <Ionicons name="location" size={24} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="Pickup location"
              placeholderTextColor="#7F8C8D"
              value={pickupLocation}
              onChangeText={setPickupLocation}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate" size={24} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="Destination"
              placeholderTextColor="#7F8C8D"
              value={destination}
              onChangeText={setDestination}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="time" size={24} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="Departure time (optional)"
              placeholderTextColor="#7F8C8D"
              value={departureTime}
              onChangeText={setDepartureTime}
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
                activeOpacity={0.8}
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
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.driverRating}>
                          {ride.driverRating?.toFixed(1) || 'New'} • {ride.totalRides || 0} rides
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{ride.estimatedCost || 0} BHD</Text>
                  </View>
                </View>

                {/* Ride Type Badge */}
                {ride.rideType === 'female-only' && (
                  <View style={styles.femaleOnlyBadge}>
                    <Ionicons name="female" size={14} color="#FF69B4" />
                    <Text style={styles.femaleOnlyText}>Female Only</Text>
                  </View>
                )}

                <View style={styles.routeInfo}>
                  <View style={styles.routeItem}>
                    <Ionicons name="ellipse" size={12} color="#5B9FAD" />
                    <Text style={styles.routeText}>{ride.pickupLocation}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeItem}>
                    <Ionicons name="location" size={12} color="#5B9FAD" />
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
                  <View style={styles.infoItem}>
                    <Ionicons name={getRideTypeIcon(ride.rideType)} size={16} color="#7F8C8D" />
                    <Text style={styles.infoText}>{ride.rideTypeName || 'Standard'}</Text>
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
  searchCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
    fontFamily: 'System',
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
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  resultsSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  rideCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
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
    fontFamily: 'System',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  driverRating: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  priceTag: {
    backgroundColor: 'rgba(91, 159, 173, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  femaleOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  femaleOnlyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF69B4',
    fontFamily: 'System',
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
    backgroundColor: '#3A3A4E',
    marginLeft: 5,
    marginVertical: 4,
  },
  routeText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
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
    color: '#7F8C8D',
    fontFamily: 'System',
  },
});