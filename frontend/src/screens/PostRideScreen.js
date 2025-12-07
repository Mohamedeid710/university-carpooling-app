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
      const departureDateTime = new Date(
        departureDate.getFullYear(),
        departureDate.getMonth(),
        departureDate.getDate(),
        departureTime.getHours(),
        departureTime.getMinutes()
      );

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

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
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pickup Location Input */}
        <View style={styles.inputSection}>
          <Ionicons name="navigate" size={24} color="#5B9FAD" />
          <TextInput
            style={styles.input}
            placeholder="Pickup point"
            placeholderTextColor="#7F8C8D"
            value={pickupLocation}
            onChangeText={setPickupLocation}
          />
        </View>

        {/* Destination Input */}
        <View style={styles.inputSection}>
          <Ionicons name="location" size={24} color="#5B9FAD" />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            placeholderTextColor="#7F8C8D"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        {/* Departure Time */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="calendar" size={20} color="#5B9FAD" />
            <Text style={styles.optionLabel}>Departure date & time</Text>
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
            <Ionicons name="time" size={20} color="#FFFFFF" />
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
          <Ionicons name="people" size={24} color="#5B9FAD" />
          <TextInput
            style={styles.input}
            placeholder="Available seats"
            placeholderTextColor="#7F8C8D"
            value={availableSeats}
            onChangeText={setAvailableSeats}
            keyboardType="number-pad"
          />
        </View>

        {/* Estimated Cost */}
        <View style={styles.inputSection}>
          <Ionicons name="cash" size={24} color="#5B9FAD" />
          <TextInput
            style={styles.input}
            placeholder="Cost per person (BHD)"
            placeholderTextColor="#7F8C8D"
            value={estimatedCost}
            onChangeText={setEstimatedCost}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Notes */}
        <View style={styles.inputSection}>
          <Ionicons name="document-text" size={24} color="#5B9FAD" />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes (optional)"
            placeholderTextColor="#7F8C8D"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Type of Ride Display */}
        <View style={styles.rideTypeSection}>
          <View style={styles.rideTypeHeader}>
            <Ionicons name="information-circle" size={20} color="#5B9FAD" />
            <Text style={styles.rideTypeLabel}>Ride Type</Text>
          </View>
          <View style={styles.rideTypeCard}>
            <View style={styles.carIconContainer}>
              <Ionicons name="car-sport" size={40} color="#5B9FAD" />
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
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.postButtonText}>Post Ride</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingTop: 20,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 12,
    fontFamily: 'System',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionValue: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  timeButton: {
    backgroundColor: '#5B9FAD',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  timeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  rideTypeSection: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
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
    fontFamily: 'System',
  },
  rideTypeCard: {
    alignItems: 'center',
  },
  carIconContainer: {
    width: 100,
    height: 70,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  postButton: {
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
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});