// src/screens/HomeScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Animated, Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [stats, setStats] = useState({
    ridesOffered: 0,
    ridesTaken: 0,
    rating: 0,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    if (user) {
      subscribeToNotifications();
      subscribeToActiveRides();
      subscribeToPendingRequests();
      loadStats();
    }
  }, [user]);

  const subscribeToNotifications = () => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
  };

  const subscribeToActiveRides = () => {
    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['active', 'scheduled'])
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rideData = snapshot.docs[0].data();
        setActiveRide({ id: snapshot.docs[0].id, ...rideData });
      } else {
        setActiveRide(null);
      }
    });
  };

  const subscribeToPendingRequests = () => {
    const q = query(
      collection(db, 'rideRequests'),
      where('riderId', '==', user.uid),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const requestData = snapshot.docs[0].data();
        const rideDoc = await getDoc(doc(db, 'rides', requestData.rideId));
        if (rideDoc.exists()) {
          setPendingRequest({
            id: snapshot.docs[0].id,
            ...requestData,
            ride: { id: rideDoc.id, ...rideDoc.data() }
          });
        }
      } else {
        setPendingRequest(null);
      }
    });
  };

  const loadStats = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const offeredQuery = query(
        collection(db, 'rides'),
        where('driverId', '==', user.uid),
        where('status', '==', 'completed')
      );
      const offeredSnapshot = await getDocs(offeredQuery);

      const takenQuery = query(
        collection(db, 'bookings'),
        where('riderId', '==', user.uid),
        where('status', '==', 'completed')
      );
      const takenSnapshot = await getDocs(takenQuery);

      setStats({
        ridesOffered: offeredSnapshot.size,
        ridesTaken: takenSnapshot.size,
        rating: userData?.averageRating || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFindRide = async () => {
    if (activeRide) {
      Alert.alert(
        'Active Ride',
        'You currently have an active/scheduled ride. Please complete or cancel it before searching for a ride.',
        [{ text: 'OK' }]
      );
      return;
    }

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('riderId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (!bookingsSnapshot.empty) {
      Alert.alert(
        'Active Booking',
        'You already have an active booking. Please complete or cancel it before searching for a new ride.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('FindRide');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      {/* Header - Simple with Logo and Notification */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('NotificationsTab')}
        >
          <Ionicons name="notifications-outline" size={26} color="#5B9FAD" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Welcome Message */}
      <Animated.View 
        style={[
          styles.welcomeSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.displayName || 'User'}!</Text>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('PostRide')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="car" size={32} color="#5B9FAD" />
              </View>
              <Text style={styles.actionTitle}>Offer Ride</Text>
              <Text style={styles.actionSubtitle}>Share your trip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleFindRide}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="search" size={32} color="#5B9FAD" />
              </View>
              <Text style={styles.actionTitle}>Find Ride</Text>
              <Text style={styles.actionSubtitle}>Search rides</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* My Rides Section */}
        <Text style={styles.sectionTitle}>My Rides</Text>
        
        {/* Active/Scheduled Ride as Driver */}
        {activeRide && (
          <TouchableOpacity
            style={styles.rideCard}
            onPress={() => navigation.navigate('ActiveRide', { rideId: activeRide.id })}
            activeOpacity={0.8}
          >
            <View style={styles.rideHeader}>
              <View style={[
                styles.statusBadge,
                activeRide.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeScheduled
              ]}>
                {activeRide.status === 'active' && <View style={styles.pulseDot} />}
                <Text style={[
                  styles.statusText,
                  activeRide.status === 'active' ? styles.statusTextActive : styles.statusTextScheduled
                ]}>
                  {activeRide.status === 'active' ? 'ACTIVE' : 'SCHEDULED'}
                </Text>
              </View>
              <Text style={styles.rideRole}>Driver</Text>
            </View>

            <View style={styles.rideRoute}>
              <View style={styles.routePoint}>
                <Ionicons name="ellipse" size={12} color="#5B9FAD" />
                <Text style={styles.routeText} numberOfLines={1}>{activeRide.pickupLocation}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color="#5B9FAD" />
                <Text style={styles.routeText} numberOfLines={1}>{activeRide.destination}</Text>
              </View>
            </View>

            <View style={styles.rideFooter}>
              <View style={styles.rideDetail}>
                <Ionicons name="time-outline" size={16} color="#7F8C8D" />
                <Text style={styles.rideDetailText}>
                  {activeRide.status === 'active' ? 'In Progress' : formatTime(activeRide.departureTime)}
                </Text>
              </View>
              <View style={styles.rideDetail}>
                <Ionicons name="people-outline" size={16} color="#7F8C8D" />
                <Text style={styles.rideDetailText}>
                  {activeRide.totalSeats - activeRide.availableSeats}/{activeRide.totalSeats} riders
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Pending Request as Rider */}
        {pendingRequest && (
          <View style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <View style={styles.statusBadgePending}>
                <Ionicons name="time-outline" size={14} color="#F39C12" />
                <Text style={styles.statusTextPending}>PENDING APPROVAL</Text>
              </View>
              <Text style={styles.rideRole}>Rider</Text>
            </View>

            <View style={styles.rideRoute}>
              <View style={styles.routePoint}>
                <Ionicons name="ellipse" size={12} color="#5B9FAD" />
                <Text style={styles.routeText} numberOfLines={1}>{pendingRequest.ride?.pickupLocation}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color="#5B9FAD" />
                <Text style={styles.routeText} numberOfLines={1}>{pendingRequest.ride?.destination}</Text>
              </View>
            </View>

            <View style={styles.rideFooter}>
              <View style={styles.rideDetail}>
                <Ionicons name="person-outline" size={16} color="#7F8C8D" />
                <Text style={styles.rideDetailText}>Driver: {pendingRequest.ride?.driverName}</Text>
              </View>
              <View style={styles.rideDetail}>
                <Ionicons name="time-outline" size={16} color="#7F8C8D" />
                <Text style={styles.rideDetailText}>
                  {formatTime(pendingRequest.ride?.departureTime)}
                </Text>
              </View>
            </View>

            <Text style={styles.pendingNote}>
              Waiting for driver to accept your request...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!activeRide && !pendingRequest && (
          <View style={styles.ridesContainer}>
            <Ionicons name="calendar-outline" size={48} color="#5B9FAD" />
            <Text style={styles.emptyText}>No upcoming rides</Text>
            <Text style={styles.emptySubtext}>Start by offering or finding a ride</Text>
          </View>
        )}

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="car-sport" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>{stats.ridesOffered}</Text>
            <Text style={styles.statLabel}>Rides Offered</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>{stats.ridesTaken}</Text>
            <Text style={styles.statLabel}>Rides Taken</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>
              {stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  logo: {
    width: 180,
    height: 40,
    flex: 1,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2C2C3E',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 30,
    marginBottom: 16,
    fontFamily: 'System',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  statusBadgeScheduled: {
    backgroundColor: 'rgba(91, 159, 173, 0.2)',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  statusTextActive: {
    color: '#2ECC71',
  },
  statusTextScheduled: {
    color: '#5B9FAD',
  },
  statusTextPending: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F39C12',
    fontFamily: 'System',
  },
  rideRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  rideRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 14,
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
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideDetailText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  pendingNote: {
    fontSize: 12,
    color: '#F39C12',
    fontStyle: 'italic',
    marginTop: 12,
    fontFamily: 'System',
  },
  ridesContainer: {
    backgroundColor: '#2C2C3E',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
    fontFamily: 'System',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5B9FAD',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
});