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
  RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function FindRideScreen({ navigation }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [activeRides, setActiveRides] = useState([]);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
    if (!pickupLocation.trim() || !destination.trim()) {
      Alert.alert('Missing Information', 'Please enter both pickup location and destination');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // Query for active rides
      const activeRidesQuery = query(
        collection(db, 'rides'),
        where('status', '==', 'active')
      );

      // Query for scheduled rides
      const scheduledRidesQuery = query(
        collection(db, 'rides'),
        where('status', '==', 'scheduled')
      );

      const [activeSnapshot, scheduledSnapshot] = await Promise.all([
        getDocs(activeRidesQuery),
        getDocs(scheduledRidesQuery),
      ]);

      const processRides = (snapshot) => {
        const rides = [];
        snapshot.forEach((docSnap) => {
          const rideData = docSnap.data();

          // Skip if female-only and user is not female
          if (rideData.isFemaleOnly && userGender !== 'female') {
            return;
          }

          // Skip if user is the driver
          if (rideData.driverId === user.uid) {
            return;
          }

          // Skip if no seats available
          if (rideData.availableSeats <= 0) {
            return;
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
        return rides;
      };

      const active = processRides(activeSnapshot);
      const scheduled = processRides(scheduledSnapshot);

      setActiveRides(active);
      setScheduledRides(scheduled);

      if (active.length === 0 && scheduled.length === 0) {
        Alert.alert(
          'No Rides Found',
          'No rides match your search criteria. Try different locations or check back later.'
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searched) {
      await handleSearch();
    }
    setRefreshing(false);
  };

  const calculateDistance = (ride) => {
    // Simple distance calculation based on coordinates
    // In production, use Google Maps Distance Matrix API
    const lat1 = ride.pickupCoordinates?.latitude || 0;
    const lon1 = ride.pickupCoordinates?.longitude || 0;
    const lat2 = ride.destinationCoordinates?.latitude || 0;
    const lon2 = ride.destinationCoordinates?.longitude || 0;

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance.toFixed(1);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
  };

  const handleRequestRide = (ride) => {
    navigation.navigate('RideDetails', { ride });
  };

  const getVehicleIcon = (vehicleModel) => {
    const model = vehicleModel?.toLowerCase() || '';
    if (model.includes('suv')) return 'car-sport';
    if (model.includes('compact')) return 'bicycle';
    return 'car';
  };

  const RideCard = ({ ride, isActive = false }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => handleRequestRide(ride)}
      activeOpacity={0.8}
    >
      {/* Active Badge */}
      {isActive && (
        <View style={styles.activeBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.activeText}>LIVE</Text>
        </View>
      )}

      {/* Driver Header */}
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
          <Text style={styles.priceText}>
            {ride.isFree ? 'FREE' : `${ride.price} BHD`}
          </Text>
        </View>
      </View>

      {/* Badges Row */}
      <View style={styles.badgesRow}>
        {ride.isFemaleOnly && (
          <View style={styles.femaleOnlyBadge}>
            <Ionicons name="female" size={12} color="#FF69B4" />
            <Text style={styles.femaleOnlyText}>Female Only</Text>
          </View>
        )}
        {isActive && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#5B9FAD" />
            <Text style={styles.distanceText}>{calculateDistance(ride)} km away</Text>
          </View>
        )}
      </View>

      {/* Route Info */}
      <View style={styles.routeInfo}>
        <View style={styles.routeItem}>
          <Ionicons name="ellipse" size={12} color="#5B9FAD" />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.pickupLocation}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeItem}>
          <Ionicons name="location" size={12} color="#5B9FAD" />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.destination}
          </Text>
        </View>
      </View>


{/* View Route Button */}
{ride.pickupCoordinates && ride.destinationCoordinates && (
  <TouchableOpacity
    style={styles.viewRouteButton}
    onPress={(e) => {
      e.stopPropagation();
      navigation.navigate('RouteMap', { ride });
    }}
  >
    <Ionicons name="map-outline" size={18} color="#5B9FAD" />
    <Text style={styles.viewRouteText}>View Route</Text>
  </TouchableOpacity>
)}

      {/* Footer */}
      <View style={styles.rideFooter}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={16} color="#7F8C8D" />
          <Text style={styles.infoText}>
            {isActive ? 'Now' : `${formatDate(ride.departureTime)} ${formatTime(ride.departureTime)}`}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={16} color="#7F8C8D" />
          <Text style={styles.infoText}>{ride.availableSeats} seats</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="car-sport-outline" size={16} color="#7F8C8D" />
          <Text style={styles.infoText} numberOfLines={1}>
            {ride.vehicleName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B9FAD"
            colors={['#5B9FAD']}
          />
        }
      >
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
          <>
            {/* Active Rides Section */}
            {activeRides.length > 0 && (
              <View style={styles.resultsSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.sectionTitle}>Active Rides</Text>
                  </View>
                  <Text style={styles.sectionCount}>{activeRides.length}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Drivers are on the road now
                </Text>

                {activeRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} isActive={true} />
                ))}
              </View>
            )}

            {/* Scheduled Rides Section */}
            {scheduledRides.length > 0 && (
              <View style={styles.resultsSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="calendar-outline" size={20} color="#5B9FAD" />
                    <Text style={styles.sectionTitle}>Scheduled Rides</Text>
                  </View>
                  <Text style={styles.sectionCount}>{scheduledRides.length}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Upcoming rides you can book
                </Text>

                {scheduledRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} isActive={false} />
                ))}
              </View>
            )}

            {/* Empty State */}
            {activeRides.length === 0 && scheduledRides.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={60} color="#3A3A4E" />
                <Text style={styles.emptyText}>No rides found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching for different locations or check back later
                </Text>
              </View>
            )}
          </>
        )}

        {/* Initial State */}
        {!searched && (
          <View style={styles.initialContainer}>
            <Ionicons name="search-outline" size={80} color="#3A3A4E" />
            <Text style={styles.initialText}>Find Your Ride</Text>
            <Text style={styles.initialSubtext}>
              Enter your pickup and destination to see available rides
            </Text>
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    fontFamily: 'System',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ECC71',
  },
  rideCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  activeText: {
    color: '#2ECC71',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  femaleOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  femaleOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF69B4',
    fontFamily: 'System',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  routeInfo: {
    marginBottom: 12,
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
    flex: 1,
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
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  initialText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'System',
  },
  initialSubtext: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'System',
  },
  viewRouteButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(91, 159, 173, 0.1)',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  gap: 6,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#5B9FAD',
},
viewRouteText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#5B9FAD',
  fontFamily: 'System',
},
});