// src/screens/VehicleRegistrationScreen.js
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function VehicleRegistrationScreen({ navigation, route }) {
  const [vehicleName, setVehicleName] = useState('');
  const [model, setModel] = useState('');
  const [size, setSize] = useState(''); // sedan, suv, compact
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats] = useState('4');
  const [vehicleImage, setVehicleImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;
  const isEditing = route.params?.vehicle || false;

  useEffect(() => {
    if (isEditing) {
      const vehicle = route.params.vehicle;
      setVehicleName(vehicle.vehicleName);
      setModel(vehicle.model);
      setSize(vehicle.size);
      setColor(vehicle.color);
      setPlateNumber(vehicle.plateNumber);
      setSeats(vehicle.seats.toString());
      setVehicleImage(vehicle.imageUrl || null);
    }
  }, []);

  const vehicleSizes = [
    { id: 'sedan', name: 'Sedan', icon: 'car' },
    { id: 'suv', name: 'SUV', icon: 'car-sport' },
    { id: 'compact', name: 'Compact', icon: 'bicycle' },
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload vehicle photo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setVehicleImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!vehicleName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for your vehicle');
      return;
    }

    if (!model.trim()) {
      Alert.alert('Missing Information', 'Please enter vehicle model');
      return;
    }

    if (!size) {
      Alert.alert('Missing Information', 'Please select vehicle size');
      return;
    }

    if (!color.trim()) {
      Alert.alert('Missing Information', 'Please enter vehicle color');
      return;
    }

    if (!plateNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter plate number');
      return;
    }

    if (!seats || parseInt(seats) <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid number of seats');
      return;
    }

    setLoading(true);

    try {
      // Check if this is user's first vehicle
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('userId', '==', user.uid)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const isFirstVehicle = vehiclesSnapshot.empty;

      const vehicleData = {
        userId: user.uid,
        vehicleName: vehicleName.trim(),
        model: model.trim(),
        size: size,
        color: color.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        seats: parseInt(seats),
        isVerified: false,
        imageUrl: '', // In production, upload to Firebase Storage
        createdAt: new Date().toISOString(),
        isDefault: isFirstVehicle, // First vehicle is default
      };

      if (isEditing) {
        // Update existing vehicle
        await updateDoc(doc(db, 'vehicles', route.params.vehicle.id), vehicleData);
        Alert.alert('Success', 'Vehicle updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Add new vehicle
        await addDoc(collection(db, 'vehicles'), vehicleData);

        // Update user document to mark they have registered a vehicle
        if (isFirstVehicle) {
          await updateDoc(doc(db, 'users', user.uid), {
            hasRegisteredVehicle: true,
          });
        }

        Alert.alert(
          '🎉 Vehicle Registered!',
          'Your vehicle has been registered successfully. You can now post rides!',
          [
            {
              text: 'Register Another',
              onPress: () => {
                // Reset form
                setVehicleName('');
                setModel('');
                setSize('');
                setColor('');
                setPlateNumber('');
                setSeats('4');
                setVehicleImage(null);
              }
            },
            {
              text: 'Done',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error registering vehicle:', error);
      Alert.alert('Registration Failed', error.message);
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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Vehicle' : 'Register Vehicle'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vehicle Information</Text>

        {/* Vehicle Image */}
        <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
          {vehicleImage ? (
            <Image source={{ uri: vehicleImage }} style={styles.vehicleImage} />
          ) : (
            <>
              <Ionicons name="camera" size={60} color="#5B9FAD" />
              <Text style={styles.uploadText}>Upload vehicle photo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Vehicle Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Vehicle Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pricetag-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., My Red Camry"
              placeholderTextColor="#7F8C8D"
              value={vehicleName}
              onChangeText={setVehicleName}
            />
          </View>
        </View>

        {/* Model */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Model</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="car-sport-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., Toyota Camry 2020"
              placeholderTextColor="#7F8C8D"
              value={model}
              onChangeText={setModel}
            />
          </View>
        </View>

        {/* Vehicle Size */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Vehicle Size</Text>
          <View style={styles.sizeContainer}>
            {vehicleSizes.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.sizeButton,
                  size === item.id && styles.sizeButtonSelected,
                ]}
                onPress={() => setSize(item.id)}
              >
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={size === item.id ? '#FFFFFF' : '#5B9FAD'}
                />
                <Text
                  style={[
                    styles.sizeText,
                    size === item.id && styles.sizeTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="color-palette-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., Red"
              placeholderTextColor="#7F8C8D"
              value={color}
              onChangeText={setColor}
            />
          </View>
        </View>

        {/* Plate Number */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Plate Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="newspaper-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 123456"
              placeholderTextColor="#7F8C8D"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Number of Seats */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Available Seats</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="people-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 4"
              placeholderTextColor="#7F8C8D"
              value={seats}
              onChangeText={setSeats}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.infoText}>
            You can register multiple vehicles and select which one to use when posting a ride.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Vehicle' : 'Register Vehicle'}
              </Text>
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
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 30,
    fontFamily: 'System',
  },
  imageUploadBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#5B9FAD',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadText: {
    fontSize: 15,
    color: '#5B9FAD',
    marginTop: 10,
    fontFamily: 'System',
  },
  inputSection: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  sizeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeButton: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3A3A4E',
    gap: 8,
  },
  sizeButtonSelected: {
    backgroundColor: '#5B9FAD',
    borderColor: '#5B9FAD',
  },
  sizeText: {
    fontSize: 14,
    color: '#5B9FAD',
    fontWeight: '600',
    fontFamily: 'System',
  },
  sizeTextSelected: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 15,
    borderRadius: 12,
    gap: 10,
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  submitButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});