// src/screens/PostRideScreen.js
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function PostRideScreen({ navigation }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableSeats, setAvailableSeats] = useState('3');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [userDriverMode, setUserDriverMode] = useState(null);

  const user = auth.currentUser;

  React.useEffect(() => {
    loadUserDriverMode();
  }, []);

  const loadUserDriverMode = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setUserDriverMode(userData?.driverModeName || 'Shared $');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDepartureDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setDepartureTime(selectedTime);
    }
  };

  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const handlePostRide = async () => {
    // Validation
    if (!pickupLocation.trim()) {
      Alert.alert('Missing Information', 'Please enter pickup location');
      return;
    }

    if (!destination.trim()) {
      Alert.alert('Missing Information', 'Please enter destination');
      return;
    }

    if (!availableSeats || parseInt(availableSeats) <= 0) {
      Alert.alert('Invalid Seats', 'Please enter a valid number of available seats');
      return;
    }

    if (!estimatedCost) {
      Alert.alert('Missing Information', 'Please enter estimated cost per person');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const departureDateTime = new Date(
        departureDate.getFullYear(),
        departureDate.getMonth(),
        departureDate.getDate(),
        departureTime.getHours(),
        departureTime.getMinutes()
      );

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Create ride document
      const rideData = {
        driverId: user.uid,
        driverName: userData?.name || user.displayName || 'Driver',
        pickupLocation: pickupLocation.trim(),
        destination: destination.trim(),
        departureTime: departureDateTime.toISOString(),
        availableSeats: parseInt(availableSeats),
        totalSeats: parseInt(availableSeats),
        estimatedCost: parseFloat(estimatedCost),
        rideType: userData?.driverMode || 'shared',
        rideTypeName: userData?.driverModeName || 'Shared $',
        vehicleModel: userData?.vehicleModel || '',
        vehicleNumberPlate: userData?.vehicleNumberPlate || '',
        notes: notes.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        riders: [],
        driverRating: userData?.averageRating || 0,
        totalRides: userData?.totalRatings || 0,
      };

      await addDoc(collection(db, 'rides'), rideData);

      Alert.alert(
        '🎉 Ride Posted!',
        'Your ride has been posted successfully. Riders can now find and book your ride.',
        [
          {
            text: 'View My Rides',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error posting ride:', error);
      Alert.alert('Post Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="menu" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Welcome, Driver!</Text>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={36} color="#5B9FAD" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Location Display */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={24} color="#2C3E50" />
            <Text style={styles.locationLabel}>Your current location</Text>
          </View>
          <TouchableOpacity style={styles.locationDropdown}>
            <Text style={styles.locationText}>Bahrain, Manama</Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={60} color="#5B9FAD" />
            <Text style={styles.mapText}>Map View</Text>
          </View>
        </View>

        {/* Pickup Location Input */}
        <View style={styles.inputSection}>
          <Ionicons name="navigate" size={24} color="#2C3E50" />
          <TextInput
            style={styles.input}
            placeholder="Where is your pickup point?"
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholderTextColor="#999"
          />
        </View>

        {/* Destination Input */}
        <View style={styles.inputSection}>
          <Ionicons name="location" size={24} color="#E74C3C" />
          <TextInput
            style={styles.input}
            placeholder="Where is your destination?"
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor="#999"
          />
        </View>

        {/* Departure Time */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="star" size={20} color="#2C3E50" />
            <Text style={styles.optionLabel}>Departure time</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.optionValue}>
              {formatDate(departureDate)} {formatTime(departureTime)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showDatePicker === false && (
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeButtonText}>Set Time</Text>
          </TouchableOpacity>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={departureTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Available Seats */}
        <View style={styles.inputSection}>
          <Ionicons name="people" size={24} color="#2C3E50" />
          <TextInput
            style={styles.input}
            placeholder="Available seats"
            value={availableSeats}
            onChangeText={setAvailableSeats}
            keyboardType="number-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* Estimated Cost */}
        <View style={styles.inputSection}>
          <Ionicons name="cash" size={24} color="#2C3E50" />
          <TextInput
            style={styles.input}
            placeholder="Estimated cost per person (BHD)"
            value={estimatedCost}
            onChangeText={setEstimatedCost}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* Notes */}
        <View style={styles.inputSection}>
          <Ionicons name="document-text" size={24} color="#2C3E50" />
          <TextInput
            style={styles.input}
            placeholder="Additional notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor="#999"
          />
        </View>

        {/* Type of Ride Display */}
        <View style={styles.rideTypeSection}>
          <View style={styles.rideTypeHeader}>
            <Ionicons name="location" size={20} color="#7F8C8D" />
            <Text style={styles.rideTypeLabel}>Type of ride</Text>
          </View>
          <View style={styles.rideTypeCard}>
            <View style={styles.carIconContainer}>
              <Text style={styles.carEmoji}>🚗</Text>
            </View>
            <Text style={styles.rideTypeName}>{userDriverMode || 'Shared $'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Post Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.postButton}
          onPress={handlePostRide}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.postButtonText}>Post</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home" size={24} color="#2C3E50" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>Account</Text>
        </TouchableOpacity>
      </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
  },
  locationSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  mapContainer: {
    height: 200,
    backgroundColor: '#E8F5F7',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#5B9FAD',
    marginTop: 10,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    paddingVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    fontSize: 15,
    color: '#2C3E50',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionValue: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  timeButton: {
    backgroundColor: '#5B9FAD',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rideTypeSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  rideTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  rideTypeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  rideTypeCard: {
    alignItems: 'center',
  },
  carIconContainer: {
    width: 100,
    height: 70,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  carEmoji: {
    fontSize: 50,
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  postButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
});