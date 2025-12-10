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
  const [myBookings, setMyBookings] = useState([]); // NEW: Track rider's bookings
  const [myRequests, setMyRequests] = useState([]); // NEW: Track pending requests
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
      subscribeToMyBookings(); // NEW: Subscribe to rider's bookings
      subscribeToMyRequests(); // NEW: Subscribe to pending requests
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

    return onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const rideData = snapshot.docs[0].data();
        const rideId = snapshot.docs[0].id;
        
        // Count accepted/in-progress bookings for this ride
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('rideId', '==', rideId),
          where('status', 'in', ['confirmed', 'in_progress'])
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        setActiveRide({ 
          id: rideId, 
          ...rideData,
          currentRiders: bookingsSnapshot.size 
        });
      } else {
        setActiveRide(null);
      }
    });
  };

  // NEW: Subscribe to bookings as rider (shows accepted rides)
  const subscribeToMyBookings = () => {
    const q = query(
      collection(db, 'bookings'),
      where('riderId', '==', user.uid),
      where('status', 'in', ['confirmed', 'scheduled', 'in_progress'])
    );

    return onSnapshot(q, async (snapshot) => {
      const bookingsData = [];
      
      for (const docSnapshot of snapshot.docs) {
        const booking = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Fetch the ride details
        try {
          const rideDoc = await getDoc(doc(db, 'rides', booking.rideId));
          if (rideDoc.exists()) {
            booking.rideDetails = { id: rideDoc.id, ...rideDoc.data() };
          }
        } catch (error) {
          console.error('Error fetching ride details:', error);
        }
        
        bookingsData.push(booking);
      }
      
      setMyBookings(bookingsData);
    });
  };

  // NEW: Subscribe to ride requests as rider (shows pending requests)
const subscribeToMyRequests = () => {
  const q = query(
    collection(db, 'rideRequests'),
    where('riderId', '==', user.uid),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, async (snapshot) => {
    const requestsData = [];
    
    for (const docSnapshot of snapshot.docs) {
      const request = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Fetch the ride details
      try {
        const rideDoc = await getDoc(doc(db, 'rides', request.rideId));
        if (rideDoc.exists()) {
          request.rideDetails = { id: rideDoc.id, ...rideDoc.data() };
        }
      } catch (error) {
        console.error('Error fetching ride details:', error);
      }
      
      requestsData.push(request);
    }
    
    setMyRequests(requestsData);
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
      where('status', 'in', ['pending', 'confirmed', 'in_progress'])
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
  
  // ADD this helper function at the top with other functions:
const getStatusInfo = (status) => {
  switch (status) {
    case 'scheduled':
      return { 
        text: 'SCHEDULED', 
        color: '#3498DB', 
        bg: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498DB',
        shadowColor: '#3498DB'
      };
    case 'in_progress':
      return { 
        text: 'IN PROGRESS', 
        color: '#2ECC71', 
        bg: 'rgba(46, 204, 113, 0.2)',
        borderColor: '#2ECC71',
        shadowColor: '#2ECC71'
      };
    case 'confirmed':
      return { 
        text: 'CONFIRMED', 
        color: '#3498DB', 
        bg: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498DB',
        shadowColor: '#3498DB'
      };
    default:
      return { 
        text: status?.toUpperCase(), 
        color: '#7F8C8D', 
        bg: 'rgba(127, 140, 141, 0.2)',
        borderColor: '#7F8C8D',
        shadowColor: '#7F8C8D'
      };
  }
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
{(activeRide || myBookings.length > 0 || myRequests.length > 0) && (
  <View style={styles.myRidesSection}>
    <Text style={styles.sectionTitle}>My Rides</Text>
    
    {/* Driver's Active/Scheduled Ride */}
    {activeRide && (
      <TouchableOpacity
        style={[
          styles.activeRideCard,
          activeRide.status === 'scheduled' ? styles.scheduledRideCard : styles.activeRideCardLive
        ]}
        onPress={() => navigation.navigate('ActiveRide', { rideId: activeRide.id })}
      >

       <View style={styles.activeRideHeader}>
          <View style={[
            styles.statusBadgeCompact,
            activeRide.status === 'active' 
              ? { backgroundColor: 'rgba(46, 204, 113, 0.15)', borderColor: '#2ECC71' }
              : { backgroundColor: 'rgba(52, 152, 219, 0.15)', borderColor: '#3498DB' }
          ]}>
            <Text style={[
              styles.statusBadgeText,
              activeRide.status === 'active' 
                ? { color: '#2ECC71' }
                : { color: '#3498DB' }
            ]}>
              {activeRide.status === 'active' ? 'ACTIVE' : 'SCHEDULED'}
            </Text>
          </View>
        </View>
        
        {/* Route Info */}
        <View style={styles.activeRideRoute}>
          <View style={styles.routeItemRow}>
            <Ionicons name="ellipse" size={12} color="#5B9FAD" />
            <Text style={styles.activeRideLocation} numberOfLines={1}>
              {activeRide.pickupLocation}
            </Text>
          </View>
          <View style={styles.routeItemRow}>
            <Ionicons name="location" size={12} color="#E74C3C" />
            <Text style={styles.activeRideLocation} numberOfLines={1}>
              {activeRide.destination}
            </Text>
          </View>
        </View>
        
       

{/* New Details Section */}
        <View style={styles.rideDetailsSection}>
          <View style={styles.rideDetailItem}>
            <Ionicons name="people" size={16} color="#5B9FAD" />
            <Text style={styles.rideDetailText}>
              {activeRide.acceptedRiders?.length || activeRide.currentRiders || 0}/{activeRide.totalSeats} riders
            </Text>
          </View>
          <View style={styles.rideDetailItem}>
            <Ionicons name="car" size={16} color="#5B9FAD" />
            <Text style={styles.rideDetailText}>{activeRide.vehicleName}</Text>
          </View>
          {activeRide.status === 'scheduled' && activeRide.departureTime && (
            <View style={styles.rideDetailItem}>
              <Ionicons name="time" size={16} color="#5B9FAD" />
              <Text style={styles.rideDetailText}>
                {new Date(activeRide.departureTime).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          )}
        </View>
        
        {activeRide.status === 'active' && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            
          </View>
        )}
      </TouchableOpacity>
    )}

    {/* Rider's Pending Requests */}
    {myRequests.map((request) => (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => navigation.navigate('RideDetails', { 
          ride: request.rideDetails 
        })}
      >
        <View style={styles.requestCardHeader}>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>PENDING</Text>
          </View>
          <Text style={styles.requestCardTime}>
            {new Date(request.createdAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.requestCardContent}>
          <View style={styles.requestLocationRow}>
            <Ionicons name="ellipse" size={12} color="#5B9FAD" />
            <Text style={styles.requestLocationText} numberOfLines={1}>
              {request.pickupLocation}
            </Text>
          </View>
          <View style={styles.requestLocationRow}>
            <Ionicons name="location" size={12} color="#E74C3C" />
            <Text style={styles.requestLocationText} numberOfLines={1}>
              {request.rideDetails?.destination}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ))}

    {/* Rider's Accepted Bookings */}
    {myBookings.map((booking) => {
      const statusInfo = getStatusInfo(booking.status);
      return (
        <TouchableOpacity
  key={booking.id}
  style={[
    styles.bookingCard,
    {
      borderColor: statusInfo.borderColor,
      shadowColor: statusInfo.shadowColor,
    }
  ]}
          onPress={() => navigation.navigate('RiderBookingDetails', { 
            bookingId: booking.id 
          })}
        >
          <View style={styles.bookingCardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
            {booking.status === 'in_progress' && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                
              </View>
            )}
          </View>
          <View style={styles.bookingCardContent}>
            <View style={styles.bookingLocationRow}>
              <Ionicons name="ellipse" size={12} color="#5B9FAD" />
              <Text style={styles.bookingLocationText} numberOfLines={1}>
                {booking.pickupLocation}
              </Text>
            </View>
            <View style={styles.bookingLocationRow}>
              <Ionicons name="location" size={12} color="#E74C3C" />
              <Text style={styles.bookingLocationText} numberOfLines={1}>
                {booking.destination}
              </Text>
            </View>
            <View style={styles.bookingDriverRow}>
              <Ionicons name="person" size={14} color="#7F8C8D" />
              <Text style={styles.bookingDriverText}>
                Driver: {booking.driverName}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
)}

        {/* Empty State */}
        {!activeRide && myBookings.length === 0 && (
          <View style={styles.ridesContainer}>
            <Ionicons name="car-outline" size={60} color="#3A3A4E" />
            <Text style={styles.emptyText}>No active rides</Text>
            <Text style={styles.emptySubtext}>
              Offer or find a ride to get started
            </Text>
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
  requestCard: {
  backgroundColor: 'rgba(243, 156, 18, 0.2)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 3,
  borderColor: '#F39C12',
  shadowColor: '#F39C12',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.7,
  shadowRadius: 20,
  elevation: 15,
},
requestCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
pendingBadge: {
  backgroundColor: '#F39C12',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
},
pendingBadgeText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#FFFFFF',
  fontFamily: 'System',
},
requestCardTime: {
  fontSize: 11,
  color: '#F39C12',
  fontFamily: 'System',
},
requestCardContent: {
  gap: 8,
},
requestLocationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
requestLocationText: {
  fontSize: 14,
  color: '#FFFFFF',
  flex: 1,
  fontFamily: 'System',
},
bookingCard: {
  backgroundColor: '#2C2C3E',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 3,
  borderColor: '#3A3A4E',
  shadowColor: '#3498DB',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 16,
  elevation: 12,
},
bookingCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
statusBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
},
statusBadgeText: {
  fontSize: 12,
  fontWeight: '600',
  fontFamily: 'System',
},
bookingCardContent: {
  gap: 8,
},
bookingLocationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
bookingLocationText: {
  fontSize: 14,
  color: '#FFFFFF',
  flex: 1,
  fontFamily: 'System',
},
bookingDriverRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: '#3A3A4E',
},
bookingDriverText: {
  fontSize: 13,
  color: '#7F8C8D',
  fontFamily: 'System',
},
activeRideCard: {
  backgroundColor: '#2C2C3E',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 3,
  borderColor: '#5B9FAD',
  shadowColor: '#5B9FAD',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 16,
  elevation: 12,
},
activeRideRoute: {
  marginTop: 12,
  marginBottom: 4,
},
activeRideLocation: {
  fontSize: 14,
  color: '#FFFFFF',
  fontWeight: '500',
  fontFamily: 'System',
  flex: 1,
},
rideDetailsSection: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#3A3A4E',
},
rideDetailItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
rideDetailText: {
  fontSize: 13,
  color: '#FFFFFF',
  fontFamily: 'System',
},
scheduledRideCard: {
  borderColor: '#3498DB',
  shadowColor: '#3498DB',
  shadowOpacity: 0.6,
  shadowRadius: 16,
  elevation: 12,
},
activeRideCardLive: {
  borderColor: '#2ECC71',
  shadowColor: '#2ECC71',
  shadowOpacity: 0.6,
  shadowRadius: 16,
  elevation: 12,
},
routeItemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 8,
},
statusBadgeCompact: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  alignSelf: 'flex-start',
},
activeRideHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},
});