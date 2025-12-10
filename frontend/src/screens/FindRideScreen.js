// src/screens/FindRideScreen.js - COMPLETE UPDATED
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function FindRideScreen({ navigation }) {
  const [destination, setDestination] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadRides();
  }, [destination, selectedDate]);

  const loadRides = async () => {
    try {
      setLoading(true);
      let ridesQuery = query(
        collection(db, 'rides'),
        where('status', 'in', ['active', 'scheduled']),
        where('driverId', '!=', user.uid)
      );

      const ridesSnapshot = await getDocs(ridesQuery);
      let ridesData = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // FUZZY SEARCH - Filter by destination
      if (destination.trim()) {
        const searchTerm = destination.trim().toLowerCase();
        ridesData = ridesData.filter(ride => {
          const rideDestination = (ride.destination || '').toLowerCase();
          const ridePickup = (ride.pickupLocation || '').toLowerCase();
          return rideDestination.includes(searchTerm) || ridePickup.includes(searchTerm);
        });
      }

      // Filter by date if selected
      if (selectedDate) {
        ridesData = ridesData.filter(ride => {
          const rideDate = new Date(ride.departureTime);
          return rideDate.toDateString() === selectedDate.toDateString();
        });
      }

      setRides(ridesData);
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStaticMapUrl = (ride) => {
  if (!ride.pickupCoordinates || !ride.destinationCoordinates) return null;
  
  const apiKey = 'AIzaSyDfdostSE5FbdXxXJ-2MUEpnGO7YKspK4k';
  const pickup = `${ride.pickupCoordinates.latitude},${ride.pickupCoordinates.longitude}`;
  const destination = `${ride.destinationCoordinates.latitude},${ride.destinationCoordinates.longitude}`;
  
  // Use encoded polyline if available, otherwise straight line
  let pathParam = '';
  if (ride.routePolyline) {
    try {
      const coords = JSON.parse(ride.routePolyline);
      if (coords && coords.length > 0) {
        // Create polyline path
        const path = coords.map(c => `${c.latitude},${c.longitude}`).join('|');
        pathParam = `&path=color:0x5B9FADFF%7Cweight:3%7C${path}`;
      } else {
        // Fallback to straight line
        pathParam = `&path=color:0x5B9FADFF%7Cweight:3%7C${pickup}%7C${destination}`;
      }
    } catch (e) {
      // Fallback to straight line
      pathParam = `&path=color:0x5B9FADFF%7Cweight:3%7C${pickup}%7C${destination}`;
    }
  } else {
    // No route data, use straight line
    pathParam = `&path=color:0x5B9FADFF%7Cweight:3%7C${pickup}%7C${destination}`;
  }
  
  return `https://maps.googleapis.com/maps/api/staticmap?size=400x200&markers=color:blue%7Clabel:A%7C${pickup}&markers=color:red%7Clabel:B%7C${destination}${pathParam}&key=${apiKey}`;
};

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

      {/* Search Section */}
      <View style={styles.searchSection}>
      <TouchableOpacity
  style={styles.searchInputContainer}
  onPress={() => navigation.navigate('MapPicker', {
    onLocationSelect: (location) => {
      setDestination(location.address);
      setDestinationCoordinates(location.coordinates);
    },
  })}
>
  <Ionicons name="location" size={24} color="#5B9FAD" />
  <Text style={destination ? styles.searchInputFilled : styles.searchInputPlaceholder}>
    {destination || 'Tap to select destination on map'}
  </Text>
  <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
</TouchableOpacity>
</View>

      {/* Rides List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5B9FAD" />
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color="#3A3A4E" />
            <Text style={styles.emptyText}>No rides found</Text>
            <Text style={styles.emptySubtext}>
              Try searching for a different destination
            </Text>
          </View>
        ) : (
          rides.map((ride) => (
            <TouchableOpacity
              key={ride.id}
              style={styles.rideCard}
              onPress={() => navigation.navigate('RideDetails', { ride })}
              activeOpacity={0.7}
            >
              {/* Route Preview Image */}
              {generateStaticMapUrl(ride) && (
                <Image
                  source={{ uri: generateStaticMapUrl(ride) }}
                  style={styles.routePreviewImage}
                />
              )}

              <View style={styles.rideCardContent}>
                {/* Driver Info */}
                <View style={styles.driverSection}>
                  {ride.driverProfilePicture ? (
                  <Image
                    source={{ uri: ride.driverProfilePicture }}
                    style={styles.driverAvatarImage}
                  />
                ) : (
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>
                      {ride.driverName?.charAt(0).toUpperCase() || 'D'}
                    </Text>
                  </View>
                )}
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{ride.driverName}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {ride.driverRating?.toFixed(1) || 'New'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Route Info */}
                <View style={styles.routeSection}>
                  <View style={styles.routeRow}>
                    <Ionicons name="ellipse" size={12} color="#5B9FAD" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ride.pickupLocation}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={12} color="#E74C3C" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ride.destination}
                    </Text>
                  </View>
                </View>
                {/* Female Only Badge */}
{ride.isFemaleOnly && (
  <View style={styles.femaleOnlyBadge}>
    <Ionicons name="woman" size={16} color="#FF69B4" />
    <Text style={styles.femaleOnlyText}>Female Only</Text>
  </View>
)}

                {/* Ride Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailText}>{formatDate(ride.departureTime)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailText}>
                      {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailText}>
                      {ride.estimatedCost || ride.price} BHD
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  searchInputContainer: {
   flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#2C2C3E',
  borderRadius: 12,
  paddingHorizontal: 15,
  paddingVertical: 18,
  borderWidth: 2,
  borderColor: '#5B9FAD',
  gap: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  mapIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
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
  rideCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    overflow: 'hidden',
  },
  routePreviewImage: {
    width: '100%',
    height: 140,
  },
  rideCardContent: {
    padding: 16,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  routeSection: {
    gap: 12,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    fontFamily: 'System',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A3A4E',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  searchInputPlaceholder: {
  flex: 1,
  fontSize: 15,
  color: '#7F8C8D',
  fontFamily: 'System',
},
searchInputFilled: {
  flex: 1,
  fontSize: 15,
  color: '#FFFFFF',
  fontFamily: 'System',
},
femaleOnlyBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 105, 180, 0.15)',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  gap: 6,
  marginTop: 8,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#FF69B4',
  alignSelf: 'flex-start',
  shadowColor: '#FF69B4',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 4,
},
femaleOnlyText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#FF69B4',
  fontFamily: 'System',
  textShadowColor: 'rgba(255, 105, 180, 0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
searchSection: {
  paddingHorizontal: 20,
  paddingVertical: 20,
  paddingBottom: 24,
},
driverAvatarImage: {
  width: 45,
  height: 45,
  borderRadius: 22.5,
  marginRight: 12,
},
});