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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
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
      const driverData = {
        licenseNumber: licenseNumber.trim(),
        cprNumber: cprNumber.trim(),
        licenseVerified: false,
        documentsSubmitted: true,
        submittedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'users', user.uid), driverData);

      navigation.navigate('VehicleInfo');
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
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Documents</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Supporting Documents</Text>

        {/* License Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver's License</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="License number"
              placeholderTextColor="#7F8C8D"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />
          </View>

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('licenseFront')}
            >
              {licenseFront ? (
                <Image source={{ uri: licenseFront }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={40} color="#5B9FAD" />
                  <Text style={styles.uploadText}>Front</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('licenseBack')}
            >
              {licenseBack ? (
                <Image source={{ uri: licenseBack }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={40} color="#5B9FAD" />
                  <Text style={styles.uploadText}>Back</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* CPR Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CPR (ID Card)</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#5B9FAD" />
            <TextInput
              style={styles.input}
              placeholder="CPR number"
              placeholderTextColor="#7F8C8D"
              value={cprNumber}
              onChangeText={setCprNumber}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('cprFront')}
            >
              {cprFront ? (
                <Image source={{ uri: cprFront }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={40} color="#5B9FAD" />
                  <Text style={styles.uploadText}>Front</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage('cprBack')}
            >
              {cprBack ? (
                <Image source={{ uri: cprBack }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={40} color="#5B9FAD" />
                  <Text style={styles.uploadText}>Back</Text>
                </>
              )}
            </TouchableOpacity>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
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
  uploadRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  uploadBox: {
    flex: 1,
    aspectRatio: 1.3,
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5B9FAD',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadText: {
    fontSize: 14,
    color: '#5B9FAD',
    marginTop: 8,
    fontFamily: 'System',
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3A4E',
    marginVertical: 25,
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