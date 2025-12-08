// src/screens/ActiveRideScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function ActiveRideScreen({ navigation, route }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endingRide, setEndingRide] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {
    loadRideData();
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, []);

  const loadRideData = async () => {
    try {
      // Load ride details
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      if (rideDoc.exists()) {
        const rideData = { id: rideDoc.id, ...rideDoc.data() };
        setRide(rideData);

        // If ride is active, start location updates
        if (rideData.status === 'active') {
          startLocationTracking();
        }
      }

      // Load accepted riders
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('rideId', '==', rideId),
        where('status', '==', 'confirmed')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const ridersData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRiders(ridersData);
    } catch (error) {
      console.error('Error loading ride data:', error);
      Alert.alert('Error', 'Failed to load ride data');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    // Simulate location updates every 10 seconds
    const interval = setInterval(() => {
      updateSimulatedLocation();
    }, 10000);
    setLocationInterval(interval);
  };

  const updateSimulatedLocation = async () => {
    try {
      // Simulate movement by adding small random changes
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      const currentRide = rideDoc.data();
      
      const currentLat = currentRide.driverLocation?.latitude || currentRide.pickupCoordinates.latitude;
      const currentLng = currentRide.driverLocation?.longitude || currentRide.pickupCoordinates.longitude;

      // Small random movement towards destination
      const destLat = currentRide.destinationCoordinates.latitude;
      const destLng = currentRide.destinationCoordinates.longitude;

      const latDiff = (destLat - currentLat) * 0.05; // Move 5% closer
      const lngDiff = (destLng - currentLng) * 0.05;

      const newLocation = {
        latitude: currentLat + latDiff + (Math.random() - 0.5) * 0.001,
        longitude: currentLng + lngDiff + (Math.random() - 0.5) * 0.001,
      };

      // Update location in rides collection
      await updateDoc(doc(db, 'rides', rideId), {
        driverLocation: newLocation,
        lastLocationUpdate: new Date().toISOString(),
      });

      // Update location in activeRides collection
      await setDoc(
        doc(db, 'activeRides', rideId),
        {
          rideId: rideId,
          driverId: user.uid,
          driverName: currentRide.driverName,
          driverPhone: currentRide.driverPhone,
          vehicleModel: currentRide.vehicleModel,
          vehiclePlate: currentRide.vehiclePlate,
          status: 'en-route',
          currentLocation: newLocation,
          pickupLocation: currentRide.pickupLocation,
          destination: currentRide.destination,
          riders: riders.map(r => ({
            riderId: r.riderId,
            riderName: r.riderName,
            status: 'confirmed',
          })),
          startedAt: currentRide.startedAt,
          lastUpdate: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log('Location updated:', newLocation);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleStartRide = async () => {
    if (riders.length === 0) {
      Alert.alert(
        'No Riders Yet',
        'You can start the ride now, but no riders have joined yet. Riders can still request to join once you start.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Anyway', onPress: () => confirmStartRide() },
        ]
      );
      return;
    }

    confirmStartRide();
  };

  const confirmStartRide = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Update ride status
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'active',
        startedAt: now,
        driverLocation: ride.pickupCoordinates,
        lastLocationUpdate: now,
      });

      // Create activeRide document
      await setDoc(doc(db, 'activeRides', rideId), {
        rideId: rideId,
        driverId: user.uid,
        driverName: ride.driverName,
        driverPhone: ride.driverPhone,
        vehicleModel: ride.vehicleModel,
        vehiclePlate: ride.vehiclePlate,
        status: 'en-route',
        currentLocation: ride.pickupCoordinates,
        pickupLocation: ride.pickupLocation,
        destination: ride.destination,
        riders: riders.map(r => ({
          riderId: r.riderId,
          riderName: r.riderName,
          status: 'confirmed',
        })),
        startedAt: now,
        lastUpdate: now,
      });

      // Send notifications to all riders
      for (const rider of riders) {
        await addDoc(collection(db, 'notifications'), {
          userId: rider.riderId,
          type: 'ride_started',
          title: 'Your Ride Has Started! 🚗',
          message: `${ride.driverName} has started the ride to ${ride.destination}`,
          rideId: rideId,
          isRead: false,
          createdAt: now,
          data: {
            rideId: rideId,
            driverId: user.uid,
            driverName: ride.driverName,
          },
        });
      }

      Alert.alert('Ride Started!', 'Your ride is now active. Safe travels!');
      
      // Reload data and start tracking
      await loadRideData();
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride');
    } finally {
      setLoading(false);
    }
  };

  const handleEndRide = async () => {
    Alert.alert(
      'End Ride',
      'Are you sure you want to end this ride? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: confirmEndRide,
        },
      ]
    );
  };

  const confirmEndRide = async () => {
    setEndingRide(true);
    try {
      const now = new Date().toISOString();

      // Stop location tracking
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }

      // Update ride status
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'completed',
        completedAt: now,
      });

      // Update all bookings
      for (const rider of riders) {
        await updateDoc(doc(db, 'bookings', rider.id), {
          status: 'completed',
          completedAt: now,
        });

        // Send notification to rider
        await addDoc(collection(db, 'notifications'), {
          userId: rider.riderId,
          type: 'ride_completed',
          title: 'Ride Completed! 🎉',
          message: `Your ride with ${ride.driverName} has been completed. Please rate your experience.`,
          rideId: rideId,
          isRead: false,
          createdAt: now,
          data: {
            rideId: rideId,
            bookingId: rider.id,
          },
        });
      }

      // Delete from activeRides
      await updateDoc(doc(db, 'activeRides', rideId), {
        status: 'completed',
      });

      Alert.alert(
        'Ride Completed! 🎉',
        `Great job! Your ride to ${ride.destination} has been completed.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error ending ride:', error);
      Alert.alert('Error', 'Failed to end ride');
    } finally {
      setEndingRide(false);
    }
  };

  const handleCancelRide = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? All riders will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancelRide,
        },
      ]
    );
  };

  const confirmCancelRide = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Stop location tracking
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }

      // Update ride status
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'cancelled',
        completedAt: now,
      });

      // Cancel all bookings
      for (const rider of riders) {
        await updateDoc(doc(db, 'bookings', rider.id), {
          status: 'cancelled',
        });

        // Notify rider
        await addDoc(collection(db, 'notifications'), {
          userId: rider.riderId,
          type: 'ride_cancelled',
          title: 'Ride Cancelled',
          message: `${ride.driverName} has cancelled the ride to ${ride.destination}`,
          rideId: rideId,
          isRead: false,
          createdAt: now,
          data: {
            rideId: rideId,
          },
        });
      }

      // Delete from activeRides
      if (ride.status === 'active') {
        await updateDoc(doc(db, 'activeRides', rideId), {
          status: 'cancelled',
        });
      }

      Alert.alert('Ride Cancelled', 'The ride has been cancelled and all riders have been notified.');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel ride');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>Ride not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isActive = ride.status === 'active';
  const isScheduled = ride.status === 'scheduled';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isActive ? 'Active Ride' : 'Scheduled Ride'}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('RideRequests', { rideId })}>
          <View style={styles.notificationBadge}>
            <Ionicons name="people" size={24} color="#5B9FAD" />
            {riders.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{riders.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      {isActive && (
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>RIDE IN PROGRESS</Text>
          </View>
          <Text style={styles.statusTime}>
            {new Date(ride.startedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Ionicons name="ellipse" size={16} color="#5B9FAD" />
              <Text style={styles.routeText}>{ride.pickupLocation}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={16} color="#5B9FAD" />
              <Text style={styles.routeText}>{ride.destination}</Text>
            </View>
          </View>
        </View>

        {/* Riders List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Riders ({riders.length}/{ride.totalSeats})
          </Text>
          {riders.length === 0 ? (
            <View style={styles.emptyRiders}>
              <Ionicons name="people-outline" size={40} color="#3A3A4E" />
              <Text style={styles.emptyRidersText}>No riders yet</Text>
            </View>
          ) : (
            riders.map((rider) => (
              <View key={rider.id} style={styles.riderCard}>
                <View style={styles.riderAvatar}>
                  <Text style={styles.riderInitial}>
                    {rider.riderName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{rider.riderName}</Text>
                  <View style={styles.riderDetail}>
                    <Ionicons name="location" size={14} color="#7F8C8D" />
                    <Text style={styles.riderDetailText} numberOfLines={1}>
                      {rider.pickupLocation}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => {
                    const phone = rider.riderPhone;
                    Alert.alert('Call Rider', `Call ${rider.riderName}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call', onPress: () => console.log('Call:', phone) },
                    ]);
                  }}
                >
                  <Ionicons name="call" size={20} color="#5B9FAD" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Ride Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Ionicons name="car-sport" size={20} color="#7F8C8D" />
            <Text style={styles.detailText}>{ride.vehicleModel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="newspaper" size={20} color="#7F8C8D" />
            <Text style={styles.detailText}>{ride.vehiclePlate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={20} color="#7F8C8D" />
            <Text style={styles.detailText}>
              {ride.isFree ? 'FREE' : `${ride.price} BHD per person`}
            </Text>
          </View>
        </View>

        {/* Warning for cancel */}
        {(isScheduled || isActive) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRide}
          >
            <Ionicons name="close-circle" size={20} color="#E74C3C" />
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Action Button */}
      {isScheduled && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartRide}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Start Ride Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isActive && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndRide}
            disabled={endingRide}
          >
            {endingRide ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.endButtonText}>End Ride</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2ECC71',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ECC71',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
    fontFamily: 'System',
  },
  statusTime: {
    fontSize: 14,
    color: '#2ECC71',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E74C3C',
    marginTop: 20,
    marginBottom: 20,
    fontFamily: 'System',
  },
  backButton: {
    backgroundColor: '#5B9FAD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  routeContainer: {
    gap: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#3A3A4E',
    marginLeft: 7,
  },
  routeText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  emptyRiders: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyRidersText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    fontFamily: 'System',
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  riderAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  riderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  riderDetailText: {
    flex: 1,
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 159, 173, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  startButton: {
    backgroundColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  endButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
});