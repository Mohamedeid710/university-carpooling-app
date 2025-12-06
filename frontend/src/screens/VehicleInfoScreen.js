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
    // Validation
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
        // In production, you'd upload the image to Firebase Storage and store the URL
        // vehicleImageUrl: uploadedUrl,
      };

      await updateDoc(doc(db, 'users', user.uid), vehicleData);

      Alert.alert(
        'Registration Complete!',
        'Your driver registration is complete. Your documents will be reviewed within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
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
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vehicle Information</Text>

        {/* Vehicle Image Upload */}
        <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
          {vehicleImage ? (
            <Image source={{ uri: vehicleImage }} style={styles.vehicleImage} />
          ) : (
            <>
              <Ionicons name="add" size={60} color="#2C3E50" />
              <Text style={styles.uploadText}>upload vehicle image</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Model Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Model name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your vehicles model name"
            value={modelName}
            onChangeText={setModelName}
            placeholderTextColor="#999"
          />
        </View>

        {/* Number Plate */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Number plate</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your vehicles number plate"
            value={numberPlate}
            onChangeText={setNumberPlate}
            autoCapitalize="characters"
            placeholderTextColor="#999"
          />
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
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 30,
  },
  imageUploadBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#E0E0E0',
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
    color: '#7F8C8D',
    marginTop: 10,
  },
  inputSection: {
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#2C3E50',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5F7',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5B9FAD',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});