// src/screens/DriverDocumentsScreen.js
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth } from '../config/firebase';

export default function DriverDocumentsScreen({ navigation }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [cprNumber, setCprNumber] = useState('');
  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [cprFront, setCprFront] = useState(null);
  const [cprBack, setCprBack] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

  const pickImage = async (type) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Set the image based on type
        switch (type) {
          case 'licenseFront':
            setLicenseFront(imageUri);
            break;
          case 'licenseBack':
            setLicenseBack(imageUri);
            break;
          case 'cprFront':
            setCprFront(imageUri);
            break;
          case 'cprBack':
            setCprBack(imageUri);
            break;
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!licenseNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your license number');
      return;
    }

    if (!cprNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your CPR number');
      return;
    }

    if (!licenseFront || !licenseBack) {
      Alert.alert('Missing Documents', 'Please upload both front and back of your license');
      return;
    }

    if (!cprFront || !cprBack) {
      Alert.alert('Missing Documents', 'Please upload both front and back of your CPR');
      return;
    }

    setLoading(true);

    try {
      // In a real app, you would upload images to Firebase Storage
      // For now, we'll just save the data to Firestore
      
      const driverData = {
        licenseNumber: licenseNumber.trim(),
        cprNumber: cprNumber.trim(),
        licenseVerified: false, // Admin needs to verify
        documentsSubmitted: true,
        submittedAt: new Date().toISOString(),
        // In production, you'd store image URLs here after uploading to Firebase Storage
        // licenseFrontUrl: uploadedUrl1,
        // licenseBackUrl: uploadedUrl2,
        // cprFrontUrl: uploadedUrl3,
        // cprBackUrl: uploadedUrl4,
      };

      await updateDoc(doc(db, 'users', user.uid), driverData);

      Alert.alert(
        'Documents Submitted!',
        'Your documents have been submitted for verification. You will be notified once verified.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting documents:', error);
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
        <Text style={styles.title}>Supporting Documents</Text>

        {/* License Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload your license photo</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter license number"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholderTextColor="#999"
          />

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('licenseFront')}
            >
              {licenseFront ? (
                <Image source={{ uri: licenseFront }} style={styles.previewImage} />
              ) : (
                <Ionicons name="add" size={40} color="#2C3E50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('licenseBack')}
            >
              {licenseBack ? (
                <Image source={{ uri: licenseBack }} style={styles.previewImage} />
              ) : (
                <Ionicons name="add" size={40} color="#2C3E50" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.uploadLabel}>Front</Text>
            <Text style={styles.uploadLabel}>Back</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* CPR Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload your CPR</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter CPR number"
            value={cprNumber}
            onChangeText={setCprNumber}
            keyboardType="number-pad"
            placeholderTextColor="#999"
          />

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('cprFront')}
            >
              {cprFront ? (
                <Image source={{ uri: cprFront }} style={styles.previewImage} />
              ) : (
                <Ionicons name="add" size={40} color="#2C3E50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('cprBack')}
            >
              {cprBack ? (
                <Image source={{ uri: cprBack }} style={styles.previewImage} />
              ) : (
                <Ionicons name="add" size={40} color="#2C3E50" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.uploadLabel}>Front</Text>
            <Text style={styles.uploadLabel}>Back</Text>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.infoText}>
            Your documents will be reviewed by our team. You'll be notified once verified.
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 15,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  uploadBox: {
    flex: 1,
    aspectRatio: 1.3,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  labelRow: {
    flexDirection: 'row',
    gap: 15,
  },
  uploadLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 25,
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