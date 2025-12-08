// src/screens/PostRideScreen.js
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function PostRideScreen({ navigation }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [departureDate, setDepartureDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableSeats, setAvailableSeats] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isFemaleOnly, setIsFemaleOnly] = useState(false);
  const [isScheduled, setIsScheduled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [userGender, setUserGender] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    loadUserData();
    loadVehicles();
  }, []);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setUserGender(userData?.gender || '');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('userId', '==', user.uid)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (vehiclesData.length === 0) {
        Alert.alert(
          'No Vehicle Registered',
          'You need to register a vehicle before posting a ride.',
          [
            {
              text: 'Register Vehicle',
              onPress: () => navigation.navigate('VehicleRegistration'),
            },
            {
              text: 'Cancel',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      setVehicles(vehiclesData);
      
      const defaultVehicle = vehiclesData.find(v => v.isDefault) || vehiclesData[0];
      setSelectedVehicle(defaultVehicle);
      setAvailableSeats(defaultVehicle.seats.toString());
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
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

  const calculateRecommendedPrice = () => {
    return 3.0;
  };

  const handlePostRide = async () => {
    if (!selectedVehicle) {
      Alert.alert('No Vehicle Selected', 'Please select a vehicle');
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      Alert.alert('Missing Locations', 'Please select pickup and destination on the map');
      return;
    }

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

    if (parseInt(availableSeats) > selectedVehicle.seats) {
      Alert.alert('Too Many Seats', `Your vehicle only has ${selectedVehicle.seats} seats available`);
      return;
    }

    if (!isFree && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid price or select "Free Ride"');
      return;
    }

    if (isFemaleOnly && userGender !== 'female') {
      Alert.alert('Invalid Selection', 'Only female drivers can offer female-only rides');
      setIsFemaleOnly(false);
      return;
    }

    try {
      const existingRidesQuery = query(
        collection(db, 'rides'),
        where('driverId', '==', user.uid),
        where('status', 'in', ['active', 'scheduled'])
      );
      const existingRides = await getDocs(existingRidesQuery);

      if (!existingRides.empty) {
        Alert.alert(
          'Active Ride Exists',
          'You already have an active ride. Please cancel or complete it before posting a new one.',
          [
            {
              text: 'View My Rides',
              onPress: () => navigation.navigate('Home', { screen: 'HomeDrawer' }),
            },
            { text: 'OK' },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking existing rides:', error);
    }

    setLoading(true);

    try {
      const departureDateTime = isScheduled
        ? new Date(
            departureDate.getFullYear(),
            departureDate.getMonth(),
            departureDate.getDate(),
            departureTime.getHours(),
            departureTime.getMinutes()
          )
        : new Date();

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const rideData = {
        driverId: user.uid,
        driverName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
        driverPhone: userData?.phone || '',
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.vehicleName,
        vehicleModel: selectedVehicle.model,
        vehiclePlate: selectedVehicle.plateNumber,
        pickupLocation: pickupLocation.trim(),
        pickupCoordinates: pickupCoordinates,
        destination: destination.trim(),
        destinationCoordinates: destinationCoordinates,
        routeCoordinates: [pickupCoordinates, destinationCoordinates],
        isScheduled: isScheduled,
        scheduledTime: isScheduled ? departureDateTime.toISOString() : null,
        departureTime: departureDateTime.toISOString(),
        status: isScheduled ? 'scheduled' : 'active',
        isFemaleOnly: isFemaleOnly,
        availableSeats: parseInt(availableSeats),
        totalSeats: parseInt(availableSeats),
        isFree: isFree,
        price: isFree ? 0 : parseFloat(price),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        startedAt: isScheduled ? null : new Date().toISOString(),
        completedAt: null,
        driverLocation: pickupCoordinates,
        lastLocationUpdate: null,
        driverRating: userData?.averageRating || 0,
        totalRides: userData?.totalRatings || 0,
      };

      await addDoc(collection(db, 'rides'), rideData);

      Alert.alert(
        '🎉 Ride Posted!',
        isScheduled
          ? 'Your ride has been scheduled successfully. Riders can now request to join.'
          : 'Your ride is now active! Riders can see your location and request to join.',
        [
          {
            text: 'View My Rides',
            onPress: () => navigation.navigate('Home', { 
              screen: 'HomeDrawer'
            }),
          },
          {
            text: 'OK',
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

  const getVehicleIcon = (size) => {
    switch (size) {
      case 'suv':
        return 'car-sport';
      case 'compact':
        return 'bicycle';
      default:
        return 'car';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.vehicleSelector}
          onPress={() => setShowVehicleModal(true)}
        >
          <View style={styles.vehicleSelectorContent}>
            <View style={styles.vehicleIconContainer}>
              <Ionicons
                name={selectedVehicle ? getVehicleIcon(selectedVehicle.size) : 'car'}
                size={32}
                color="#5B9FAD"
              />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleSelectorLabel}>Selected Vehicle</Text>
              <Text style={styles.vehicleSelectorValue}>
                {selectedVehicle ? selectedVehicle.vehicleName : 'Select a vehicle'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7F8C8D" />
          </View>
        </TouchableOpacity>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !isScheduled && styles.toggleButtonActive]}
            onPress={() => setIsScheduled(false)}
          >
            <Ionicons
              name="flash"
              size={20}
              color={!isScheduled ? '#FFFFFF' : '#5B9FAD'}
            />
            <Text style={[styles.toggleText, !isScheduled && styles.toggleTextActive]}>
              Start Now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isScheduled && styles.toggleButtonActive]}
            onPress={() => setIsScheduled(true)}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={isScheduled ? '#FFFFFF' : '#5B9FAD'}
            />
            <Text style={[styles.toggleText, isScheduled && styles.toggleTextActive]}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.mapInputSection}
          onPress={() => navigation.navigate('MapPicker', {
            onLocationSelect: (location) => {
              setPickupLocation(location.address);
              setPickupCoordinates(location.coordinates);
            },
            initialLocation: pickupCoordinates,
          })}
        >
          <Ionicons name="navigate" size={24} color="#5B9FAD" />
          <View style={styles.mapInputContent}>
            <Text style={styles.mapInputLabel}>Pickup Location</Text>
            <Text style={styles.mapInputValue} numberOfLines={1}>
              {pickupLocation || 'Tap to select on map'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapInputSection}
          onPress={() => navigation.navigate('MapPicker', {
            onLocationSelect: (location) => {
              setDestination(location.address);
              setDestinationCoordinates(location.coordinates);
            },
            initialLocation: destinationCoordinates,
          })}
        >
          <Ionicons name="location" size={24} color="#5B9FAD" />
          <View style={styles.mapInputContent}>
            <Text style={styles.mapInputLabel}>Destination</Text>
            <Text style={styles.mapInputValue} numberOfLines={1}>
              {destination || 'Tap to select on map'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        {isScheduled && (
          <>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="calendar" size={20} color="#5B9FAD" />
                <Text style={styles.optionLabel}>Departure date</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>{formatDate(departureDate)}</Text>
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

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="time" size={20} color="#5B9FAD" />
                <Text style={styles.optionLabel}>Departure time</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>{formatTime(departureTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
              </View>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={departureTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}
          </>
        )}

        <View style={styles.inputSection}>
          <Ionicons name="people" size={24} color="#5B9FAD" />
          <TextInput
            style={styles.input}
            placeholder={`Available seats (max ${selectedVehicle?.seats || 0})`}
            placeholderTextColor="#7F8C8D"
            value={availableSeats}
            onChangeText={setAvailableSeats}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceSectionHeader}>
            <Text style={styles.sectionTitle}>Ride Price</Text>
            <TouchableOpacity
              style={styles.freeRideToggle}
              onPress={() => setIsFree(!isFree)}
            >
              <Ionicons
                name={isFree ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isFree ? '#5B9FAD' : '#7F8C8D'}
              />
              <Text style={[styles.freeRideText, isFree && styles.freeRideTextActive]}>
                Free Ride
              </Text>
            </TouchableOpacity>
          </View>

          {!isFree && (
            <View style={styles.priceInputContainer}>
              <View style={styles.inputSection}>
                <Ionicons name="cash" size={24} color="#5B9FAD" />
                <TextInput
                  style={styles.input}
                  placeholder="Price per person (BHD)"
                  placeholderTextColor="#7F8C8D"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.recommendedPrice}>
                💡 Recommended: {calculateRecommendedPrice().toFixed(2)} BHD
              </Text>
            </View>
          )}
        </View>

        {userGender === 'female' && (
          <TouchableOpacity
            style={styles.femaleOnlyContainer}
            onPress={() => setIsFemaleOnly(!isFemaleOnly)}
          >
            <View style={styles.femaleOnlyLeft}>
              <Ionicons name="female" size={24} color="#FF69B4" />
              <View>
                <Text style={styles.femaleOnlyTitle}>Female Only Ride</Text>
                <Text style={styles.femaleOnlySubtitle}>Only female riders can join</Text>
              </View>
            </View>
            <View
              style={[
                styles.switch,
                isFemaleOnly && styles.switchActive,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  isFemaleOnly && styles.switchThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        )}

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

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.infoText}>
            {isScheduled
              ? 'Your ride will be visible to riders at the scheduled time. You can start it early from your ride history.'
              : 'Your ride is starting now! Your live location will be visible to riders who join.'}
          </Text>
        </View>
      </ScrollView>

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
              <Ionicons
                name={isScheduled ? 'calendar' : 'flash'}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.postButtonText}>
                {isScheduled ? 'Schedule Ride' : 'Start Ride Now'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showVehicleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.vehicleOption,
                    selectedVehicle?.id === vehicle.id && styles.vehicleOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedVehicle(vehicle);
                    setAvailableSeats(vehicle.seats.toString());
                    setShowVehicleModal(false);
                  }}
                >
                  <View style={styles.vehicleOptionIcon}>
                    <Ionicons
                      name={getVehicleIcon(vehicle.size)}
                      size={32}
                      color={selectedVehicle?.id === vehicle.id ? '#FFFFFF' : '#5B9FAD'}
                    />
                  </View>
                  <View style={styles.vehicleOptionInfo}>
                    <Text
                      style={[
                        styles.vehicleOptionName,
                        selectedVehicle?.id === vehicle.id && styles.vehicleOptionNameSelected,
                      ]}
                    >
                      {vehicle.vehicleName}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleOptionModel,
                        selectedVehicle?.id === vehicle.id && styles.vehicleOptionModelSelected,
                      ]}
                    >
                      {vehicle.model} • {vehicle.seats} seats
                    </Text>
                  </View>
                  {selectedVehicle?.id === vehicle.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.addVehicleButton}
                onPress={() => {
                  setShowVehicleModal(false);
                  navigation.navigate('VehicleRegistration');
                }}
              >
                <Ionicons name="add-circle" size={24} color="#5B9FAD" />
                <Text style={styles.addVehicleText}>Register New Vehicle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  vehicleSelector: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  vehicleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleSelectorLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  vehicleSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#5B9FAD',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  mapInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  mapInputContent: {
    flex: 1,
  },
  mapInputLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  mapInputValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
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
  priceSection: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  priceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  freeRideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeRideText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  freeRideTextActive: {
    color: '#5B9FAD',
    fontWeight: '600',
  },
  priceInputContainer: {
    gap: 8,
  },
  recommendedPrice: {
    fontSize: 12,
    color: '#5B9FAD',
    marginTop: 4,
    marginLeft: 12,
    fontFamily: 'System',
  },
  femaleOnlyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  femaleOnlyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  femaleOnlyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  femaleOnlySubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
    fontFamily: 'System',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3A3A4E',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#FF69B4',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5B9FAD',
    lineHeight: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3A3A4E',
    gap: 12,
  },
  vehicleOptionSelected: {
    backgroundColor: '#5B9FAD',
    borderColor: '#5B9FAD',
  },
  vehicleOptionIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleOptionInfo: {
    flex: 1,
  },
  vehicleOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  vehicleOptionNameSelected: {
    color: '#FFFFFF',
  },
  vehicleOptionModel: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  vehicleOptionModelSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C3E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#5B9FAD',
    borderStyle: 'dashed',
  },
  addVehicleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
});