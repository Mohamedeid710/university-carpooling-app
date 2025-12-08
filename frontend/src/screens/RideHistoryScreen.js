// src/screens/RideHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RideHistoryScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('offered');

  const user = auth.currentUser;

  useEffect(() => {
    loadRideHistory();
  }, []);

  const loadRideHistory = async () => {
    setLoading(true);
    try {
      const ridesQuery = query(
        collection(db, 'rides'),
        where('driverId', '==', user.uid),
        orderBy('departureTime', 'desc')
      );
      const ridesSnapshot = await getDocs(ridesQuery);
      const ridesData = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('riderId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRides(ridesData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading ride history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
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

  const RideCard = ({ ride, isBooking = false }) => {
    const departureDate = isBooking ? ride.departureTime : ride.departureTime;
    const cost = isBooking ? ride.estimatedCost : ride.estimatedCost;

    const handlePress = () => {
    if (!isBooking && (ride.status === 'active' || ride.status === 'scheduled')) {
      // Driver viewing their own ride
      navigation.navigate('ActiveRide', { rideId: ride.id });
    }
  };

    return (
      <TouchableOpacity 
      style={styles.rideCard}
      onPress={handlePress}
      disabled={isBooking || (ride.status !== 'active' && ride.status !== 'scheduled')}
    >
        <View style={styles.rideCardContent}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color="#5B9FAD" />
            <Text style={styles.locationText}>{ride.pickupLocation}</Text>
            <Text style={styles.priceText}>{cost || 0} BHD</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="navigate" size={20} color="#5B9FAD" />
            <Text style={styles.locationText}>{ride.destination}</Text>
          </View>

          <View style={styles.dateTimeRow}>
            <Ionicons name="calendar-outline" size={16} color="#7F8C8D" />
            <Text style={styles.dateTimeText}>
              {formatDate(departureDate)} - {formatTime(departureDate)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              ride.status === 'completed' ? styles.statusCompleted :
              ride.status === 'cancelled' ? styles.statusCancelled :
              styles.statusActive
            ]}>
              <Text style={styles.statusText}>
                {ride.status === 'completed' ? 'Completed' :
                 ride.status === 'cancelled' ? 'Cancelled' :
                 'Active'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offered' && styles.tabActive]}
          onPress={() => setActiveTab('offered')}
        >
          <Text style={[styles.tabText, activeTab === 'offered' && styles.tabTextActive]}>
            Offered Rides
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'taken' && styles.tabActive]}
          onPress={() => setActiveTab('taken')}
        >
          <Text style={[styles.tabText, activeTab === 'taken' && styles.tabTextActive]}>
            Taken Rides
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'offered' ? (
            rides.length > 0 ? (
              rides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={60} color="#3A3A4E" />
                <Text style={styles.emptyText}>No rides offered yet</Text>
                <Text style={styles.emptySubtext}>
                  Start offering rides to build your history
                </Text>
              </View>
            )
          ) : (
            bookings.length > 0 ? (
              bookings.map((booking) => (
                <RideCard key={booking.id} ride={booking} isBooking={true} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={60} color="#3A3A4E" />
                <Text style={styles.emptyText}>No rides taken yet</Text>
                <Text style={styles.emptySubtext}>
                  Book a ride to see your history here
                </Text>
              </View>
            )
          )}
        </ScrollView>
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C3E',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#5B9FAD',
  },
  tabText: {
    fontSize: 15,
    color: '#7F8C8D',
    fontWeight: '500',
    fontFamily: 'System',
  },
  tabTextActive: {
    color: '#5B9FAD',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 15,
  },
  rideCard: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  rideCardContent: {
    padding: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(91, 159, 173, 0.2)',
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  statusCompleted: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  statusCancelled: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
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
});