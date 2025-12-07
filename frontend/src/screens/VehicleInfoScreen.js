// src/screens/VehicleInfoScreen.js
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function VehicleInfoScreen({ navigation }) {
  const [vehicleImage, setVehicleImage] = useState(null);
  const [modelName, setModelName] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

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
    if (!vehicleImage) {
      Alert.alert('Missing Photo', 'Please upload a photo of your vehicle');
      return;
    }

    if (!modelName.trim()) {
      Alert.alert('Missing Information', 'Please enter your vehicle model name');
      return;
    }

    if (!numberPlate.trim()) {
      Alert.alert('Missing Information', 'Please enter your vehicle number plate');
      return;
    }

    setLoading(true);

    try {
      const vehicleData = {
        vehicleModel: modelName.trim(),
        vehicleNumberPlate: numberPlate.trim().toUpperCase(),
        vehicleVerified: false,
        vehicleInfoSubmitted: true,
        vehicleSubmittedAt: new Date().toISOString(),
        isDriver: true,
      };

      await updateDoc(doc(db, 'users', user.uid), vehicleData);

      navigation.navigate('DriverMode');

    } catch (error) {
      console.error('Error submitting vehicle info:', error);
      Alert.alert('Submission Failed', error.message);
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
        <Text style={styles.headerTitle}>Vehicle Info</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vehicle Information</Text>

        {/* Vehicle Image Upload */}
        <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
          {vehicleImage ? (
            <Image source={{ uri: vehicleImage }} style={styles.vehicleImage} />
          ) : (
            <>
              <Ionicons name="camera" size={60} color="#5B9FAD" />
              <Text style={styles.uploadText}>Upload vehicle image</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Model Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Model Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="car-sport-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., Toyota Camry 2020"
              placeholderTextColor="#7F8C8D"
              value={modelName}
              onChangeText={setModelName}
            />
          </View>
        </View>

        {/* Number Plate */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Number Plate</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="newspaper-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 123456"
              placeholderTextColor="#7F8C8D"
              value={numberPlate}
              onChangeText={setNumberPlate}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.infoText}>
            Make sure the vehicle information matches your registration documents.
          </Text>
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  nextButton: {
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});