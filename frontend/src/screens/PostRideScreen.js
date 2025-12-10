// src/screens/PostRideScreen.js - COMPLETE UPDATED VERSION
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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { fetchRoute, calculateRecommendedPrice } from '../utils/routeHelpers';

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
  
  // NEW: Route preview states
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadUserData();
    loadVehicles();
  }, []);

  // NEW: Calculate route when both locations are selected
  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      calculateRouteAndPrice();
    }
  }, [pickupCoordinates, destinationCoordinates]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setUserGender(userData?.gender || '');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
  checkExistingRide();
}, []);

const checkExistingRide = async () => {
  const ridesQuery = query(
    collection(db, 'rides'),
    where('driverId', '==', user.uid),
    where('status', 'in', ['active', 'scheduled'])
  );
  const snapshot = await getDocs(ridesQuery);
  
  if (!snapshot.empty) {
    Alert.alert(
      'Active Ride Exists',
      'You can only post 1 ride at a time. Please complete or cancel your current ride before posting another.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
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

  // NEW: Calculate route and price
  const calculateRouteAndPrice = async () => {
    if (!pickupCoordinates || !destinationCoordinates) return;
    
    setCalculatingRoute(true);
    try {
      const routeData = await fetchRoute(pickupCoordinates, destinationCoordinates);
      
      if (routeData.success) {
        setRouteCoordinates(routeData.coordinates);
        setDistance(routeData.distance);
        setDuration(routeData.duration);
        
        // Calculate recommended price if not free
        if (!isFree && routeData.distanceValue) {
          const recommendedPrice = calculateRecommendedPrice(routeData.distanceValue);
          setPrice(recommendedPrice.toString());
        }
      } else {
        setRouteCoordinates([pickupCoordinates, destinationCoordinates]);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteCoordinates([pickupCoordinates, destinationCoordinates]);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const calculateRecommendedPrice = () => {
  if (!distance || distance === 0) return 0;
  // 0.3 BHD per km as base rate
  const basePrice = distance * 0.3;
  return Math.max(1, Math.round(basePrice * 2) / 2); // Round to nearest 0.5
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
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking existing rides:', error);
    }

    setLoading(true);

    try {
      const finalDepartureTime = departureTime 
        ? new Date(departureTime) 
        : new Date();

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const rideData = {
        driverId: user.uid,
        driverName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
        driverPhone: userData?.phone || '',
        driverProfilePicture: userData?.profilePictureUrl || null,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.vehicleName,
        vehicleModel: selectedVehicle.model,
        vehicleColor: selectedVehicle.color,
        vehiclePlate: selectedVehicle.plateNumber,
        pickupLocation: pickupLocation.trim(),
        pickupCoordinates: pickupCoordinates,
        destination: destination.trim(),
        destinationCoordinates: destinationCoordinates,
        // NEW: Add route data
        routePolyline: JSON.stringify(routeCoordinates),
        distance: distance,
        duration: duration,
        isScheduled: isScheduled,
       scheduledTime: isScheduled ? finalDepartureTime.toISOString() : null,
        departureTime: finalDepartureTime.toISOString(),
        status: isScheduled ? 'scheduled' : 'active',
        isFemaleOnly: isFemaleOnly,
        availableSeats: parseInt(availableSeats),
        totalSeats: parseInt(availableSeats),
        isFree: isFree,
        estimatedCost: isFree ? 0 : parseFloat(price),
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

        
<View style={styles.toggleContainerLarge}>
  <TouchableOpacity
    style={[
      styles.toggleButtonLarge,
      !isScheduled && styles.toggleButtonLargeActive
    ]}
    onPress={() => setIsScheduled(false)}
  >
    <View style={styles.toggleButtonContent}>
      <Ionicons name="flash" size={28} color={!isScheduled ? '#FFFFFF' : '#5B9FAD'} />
      <Text style={[styles.toggleTextLarge, !isScheduled && styles.toggleTextLargeActive]}>
        Start Now
      </Text>
    </View>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[
      styles.toggleButtonLarge,
      isScheduled && styles.toggleButtonLargeActive
    ]}
    onPress={() => setIsScheduled(true)}
  >
    <View style={styles.toggleButtonContent}>
      <Ionicons name="calendar" size={28} color={isScheduled ? '#FFFFFF' : '#5B9FAD'} />
      <Text style={[styles.toggleTextLarge, isScheduled && styles.toggleTextLargeActive]}>
        Schedule
      </Text>
    </View>
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

        {/* NEW: Route Preview Section */}
        {pickupCoordinates && destinationCoordinates && (
          <View style={styles.routePreviewSection}>
            <Text style={styles.sectionTitle}>Route Preview</Text>
            
            {calculatingRoute ? (
              <View style={styles.calculatingContainer}>
                <ActivityIndicator size="small" color="#5B9FAD" />
                <Text style={styles.calculatingText}>Calculating route...</Text>
              </View>
            ) : (
              <>
                {routeCoordinates.length > 0 && (
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.miniMap}
                    initialRegion={{
                      latitude: (pickupCoordinates.latitude + destinationCoordinates.latitude) / 2,
                      longitude: (pickupCoordinates.longitude + destinationCoordinates.longitude) / 2,
                      latitudeDelta: Math.abs(pickupCoordinates.latitude - destinationCoordinates.latitude) * 2,
                      longitudeDelta: Math.abs(pickupCoordinates.longitude - destinationCoordinates.longitude) * 2,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker coordinate={pickupCoordinates} pinColor="#5B9FAD" />
                    <Marker coordinate={destinationCoordinates} pinColor="#E74C3C" />
                    <Polyline
                      coordinates={routeCoordinates}
                      strokeColor="#5B9FAD"
                      strokeWidth={3}
                    />
                  </MapView>
                )}

                <View style={styles.routeInfoCard}>
                  <View style={styles.routeInfoItem}>
                    <Ionicons name="navigate" size={18} color="#5B9FAD" />
                    <Text style={styles.routeInfoLabel}>Distance</Text>
                    <Text style={styles.routeInfoValue}>{distance || 'N/A'}</Text>
                  </View>
                  <View style={styles.routeInfoDivider} />
                  <View style={styles.routeInfoItem}>
                    <Ionicons name="time" size={18} color="#5B9FAD" />
                    <Text style={styles.routeInfoLabel}>Duration</Text>
                    <Text style={styles.routeInfoValue}>{duration || 'N/A'}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {isScheduled && (
          <>
            
<Text style={styles.helperText}>Select when your ride will start</Text>
<TouchableOpacity
  style={styles.datePickerButton}
  onPress={() => setShowDatePicker(true)}
>
  <Ionicons name="calendar" size={24} color="#5B9FAD" />
  <Text style={styles.datePickerText}>
    {departureTime ? new Date(departureTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Select date and time'}
  </Text>
  <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
</TouchableOpacity>
{showDatePicker && (
  <DateTimePicker
    value={departureTime ? new Date(departureTime) : new Date()}
    mode="datetime"
    display="default"
    minimumDate={new Date()}
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);
      if (selectedDate) {
        setDepartureTime(selectedDate.toISOString());
      }
    }}
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

        <View style={styles.freeRideSection}>
          <View style={styles.freeRideHeader}>
            <Ionicons name="gift" size={20} color="#2ECC71" />
            <View style={styles.freeRideTextContainer}>
              <Text style={styles.freeRideTitle}>Free Ride</Text>
              <Text style={styles.freeRideDescription}>
                No cost for riders
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.compactToggle,
                styles.compactToggleGreen,
                isFree && styles.compactToggleGreenActive
              ]}
              onPress={() => setIsFree(!isFree)}
            >
              <View style={[
                styles.compactToggleCircle,
                isFree && styles.compactToggleCircleActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {distance > 0 && (
  <View style={styles.priceRecommendationBox}>
    <Ionicons name="lightbulb" size={24} color="#F39C12" />
    <View style={styles.priceRecommendationText}>
      <Text style={styles.priceRecommendationLabel}>Recommended Price</Text>
      <Text style={styles.priceRecommendationAmount}>
        Based on {distance.toFixed(1)} km distance
      </Text>
      <Text style={styles.priceRecommendationPrice}>
        {calculateRecommendedPrice()} BHD
      </Text>
    </View>
  </View>
)}

<View style={styles.suggestedPriceHeader}>
  <Text style={styles.inputLabelYellow}>Price Per Seat (BHD)</Text>
  {distance > 0 && !isFree && (
    <Text style={styles.suggestedPriceText}>
      Suggested: {calculateRecommendedPrice()} BHD
    </Text>
  )}
</View>
        {!isFree && (
          <View style={[styles.inputSection, { opacity: isFree ? 0.5 : 1 }]}>
          <Ionicons name="cash" size={24} color="#2ECC71" />
            <TextInput
              style={styles.input}
              placeholder={distance ? `Suggested: ${price} BHD` : "Price per seat (BHD)"}
              placeholderTextColor="#7F8C8D"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        )}

        <View style={styles.femaleOnlySection}>
          <View style={styles.femaleOnlyHeader}>
            <Ionicons name="woman" size={20} color={userGender === 'female' ? '#FF69B4' : '#3A3A4E'} />
            <View style={styles.femaleOnlyTextContainer}>
              <Text style={styles.femaleOnlyTitle}>Female Only Ride</Text>
              <Text style={styles.femaleOnlyDescription}>
                {userGender === 'female' 
                  ? 'Only female riders can join'
                  : 'Only female drivers can enable this'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.compactToggle,
                userGender !== 'female' && styles.compactToggleDisabled,
                isFemaleOnly && styles.compactTogglePink,
              ]}
              onPress={() => setIsFemaleOnly(!isFemaleOnly)}
              disabled={userGender !== 'female'}
            >
              <View style={[
                styles.compactToggleCircle,
                isFemaleOnly && styles.compactToggleCircleActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Ionicons name="document-text" size={24} color="#5B9FAD" />
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add ride notes (optional)"
            placeholderTextColor="#7F8C8D"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.postButton, loading && styles.postButtonDisabled]}
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

      {/* Vehicle Selection Modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={28} color="#5B9FAD" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                  <Ionicons
                    name={getVehicleIcon(vehicle.size)}
                    size={32}
                    color="#5B9FAD"
                  />
                  <View style={styles.vehicleOptionInfo}>
                    <Text style={styles.vehicleOptionName}>{vehicle.vehicleName}</Text>
                    <Text style={styles.vehicleOptionDetails}>
                      {vehicle.model} • {vehicle.seats} seats
                    </Text>
                  </View>
                  {selectedVehicle?.id === vehicle.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#5B9FAD" />
                  )}
                </TouchableOpacity>
              ))}
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
    paddingHorizontal: 20,
  },
  vehicleSelector: {
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  vehicleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
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
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 8,
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
    fontSize: 14,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    gap: 12,
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
    fontWeight: '500',
    fontFamily: 'System',
  },
  routePreviewSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'System',
  },
  miniMap: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    gap: 12,
  },
  calculatingText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  routeInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routeInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#3A3A4E',
  },
  routeInfoLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  routeInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
    marginLeft: 'auto',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#5B9FAD',
    fontFamily: 'System',
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxSection: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  checkboxDisabled: {
    color: '#3A3A4E',
  },
  footer: {
    padding: 20,
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
  postButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  modalBody: {
    padding: 20,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    gap: 12,
  },
  vehicleOptionSelected: {
    borderColor: '#5B9FAD',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
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
  vehicleOptionDetails: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  priceHint: {
  fontSize: 13,
  color: '#2ECC71',
  marginTop: -4,
  marginBottom: 8,
  fontStyle: 'italic',
  fontFamily: 'System',
},
toggleButtonActivePink: {
  backgroundColor: '#FF69B4',
  borderColor: '#FF69B4',
},
datePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#2C2C3E',
  borderRadius: 12,
  padding: 18,
  borderWidth: 2,
  borderColor: '#5B9FAD',
  gap: 12,
  marginBottom: 16,
},
datePickerText: {
  flex: 1,
  fontSize: 16,
  color: '#FFFFFF',
  fontWeight: '500',
  fontFamily: 'System',
},
helperText: {
  fontSize: 13,
  color: '#7F8C8D',
  marginBottom: 8,
  fontStyle: 'italic',
  fontFamily: 'System',
},
priceRecommendationBox: {
  flexDirection: 'row',
  backgroundColor: 'rgba(243, 156, 18, 0.15)',
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  gap: 16,
  borderWidth: 2,
  borderColor: '#F39C12',
  shadowColor: '#F39C12',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
},
priceRecommendationText: {
  flex: 1,
},
priceRecommendationLabel: {
  fontSize: 14,
  color: '#F39C12',
  fontWeight: '600',
  marginBottom: 4,
  fontFamily: 'System',
},
priceRecommendationAmount: {
  fontSize: 12,
  color: '#7F8C8D',
  marginBottom: 8,
  fontFamily: 'System',
},
priceRecommendationPrice: {
  fontSize: 28,
  fontWeight: 'bold',
  color: '#F39C12',
  fontFamily: 'System',
},
femaleOnlySection: {
  backgroundColor: 'rgba(255, 105, 180, 0.1)',
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  borderWidth: 2,
  borderColor: '#FF69B4',
},
femaleOnlyHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 8,
},
femaleOnlyTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#FFFFFF',
  fontFamily: 'System',
},
femaleOnlyDescription: {
  fontSize: 14,
  color: '#7F8C8D',
  marginBottom: 16,
  lineHeight: 20,
  fontFamily: 'System',
},
toggleButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#2C2C3E',
  borderRadius: 30,
  padding: 4,
  gap: 12,
  borderWidth: 2,
  borderColor: '#3A3A4E',
},
toggleButtonActivePink: {
  backgroundColor: '#FF69B4',
  borderColor: '#FF69B4',
},
toggleButtonDisabled: {
  opacity: 0.5,
},
toggleIndicator: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#3A3A4E',
  alignItems: 'center',
  justifyContent: 'center',
},
toggleIndicatorActive: {
  backgroundColor: '#FFFFFF',
},
toggleLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#7F8C8D',
  paddingRight: 16,
  fontFamily: 'System',
},
toggleLabelActive: {
  color: '#FFFFFF',
},
toggleLabelDisabled: {
  color: '#3A3A4E',
},
inputLabelLarge: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFFFFF',
  marginBottom: 8,
  fontFamily: 'System',
},
helperTextBold: {
  fontSize: 14,
  color: '#5B9FAD',
  marginBottom: 12,
  fontWeight: '600',
  fontFamily: 'System',
},
inputLabelYellow: {
  fontSize: 18,
  fontWeight: '700',
  color: '#F39C12',
  marginBottom: 12,
  fontFamily: 'System',
},
femaleOnlySection: {
  backgroundColor: 'rgba(255, 105, 180, 0.08)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#FF69B4',
},
femaleOnlyHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
femaleOnlyTextContainer: {
  flex: 1,
},
femaleOnlyTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
  marginBottom: 2,
  fontFamily: 'System',
},
femaleOnlyDescription: {
  fontSize: 12,
  color: '#7F8C8D',
  fontFamily: 'System',
},
freeRideSection: {
  backgroundColor: 'rgba(46, 204, 113, 0.08)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#2ECC71',
},
freeRideHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
freeRideTextContainer: {
  flex: 1,
},
freeRideTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
  marginBottom: 2,
  fontFamily: 'System',
},
freeRideDescription: {
  fontSize: 12,
  color: '#7F8C8D',
  fontFamily: 'System',
},
compactToggle: {
  width: 50,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#3A3A4E',
  padding: 2,
  justifyContent: 'center',
},
compactTogglePink: {
  backgroundColor: '#FF69B4',
},
compactToggleGreen: {
  backgroundColor: '#3A3A4E',
},
compactToggleGreenActive: {
  backgroundColor: '#2ECC71',
},
compactToggleDisabled: {
  opacity: 0.3,
},
compactToggleCircle: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#7F8C8D',
  transform: [{ translateX: 0 }],
},
compactToggleCircleActive: {
  backgroundColor: '#FFFFFF',
  transform: [{ translateX: 22 }],
},
toggleContainerLarge: {
  flexDirection: 'row',
  backgroundColor: '#2C2C3E',
  borderRadius: 20,
  padding: 8,
  marginBottom: 25,
  gap: 10,
  borderWidth: 2,
  borderColor: '#3A3A4E',
  height: 80,
},
toggleButtonLarge: {
  flex: 1,
  borderRadius: 15,
  justifyContent: 'center',
  alignItems: 'center',
},
toggleButtonLargeActive: {
  backgroundColor: '#5B9FAD',
  shadowColor: '#5B9FAD',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 5,
},
toggleButtonContent: {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
toggleTextLarge: {
  fontSize: 18,
  fontWeight: '700',
  color: '#5B9FAD',
  fontFamily: 'System',
},
toggleTextLargeActive: {
  color: '#FFFFFF',
  fontWeight: '800',
},
});