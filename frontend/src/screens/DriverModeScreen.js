// src/screens/DriverModeScreen.js
import React, { useState } from 'react';
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
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DriverModeScreen({ navigation }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

  const rideTypes = [
    {
      id: 'female-only',
      name: 'Female only $$',
      icon: 'female',
      description: 'Women-only rides',
      priceLevel: 2,
    },
    {
      id: 'comfort',
      name: 'Comfort $$',
      icon: 'car-sport',
      description: 'Standard comfortable rides',
      priceLevel: 2,
    },
    {
      id: 'shared',
      name: 'Shared $',
      icon: 'car',
      description: 'Shared rides with multiple passengers',
      priceLevel: 1,
    },
  ];

  const handleSubmit = async () => {
    if (!selectedMode) {
      Alert.alert('Selection Required', 'Please select a ride type');
      return;
    }

    setLoading(true);

    try {
      const selectedRideType = rideTypes.find(type => type.id === selectedMode);

      await updateDoc(doc(db, 'users', user.uid), {
        driverMode: selectedMode,
        driverModeName: selectedRideType.name,
        priceLevel: selectedRideType.priceLevel,
        registrationComplete: true,
        registrationCompletedAt: new Date().toISOString(),
      });

      Alert.alert(
        '🎉 Registration Complete!',
        'Your driver registration has been submitted successfully. You will be notified once your documents are verified.',
        [
          {
            text: 'Start Driving',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting driver mode:', error);
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
        <Text style={styles.headerTitle}>Driver Mode</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Register your driver mode as:</Text>

        {/* Ride Type Options */}
        <View style={styles.optionsContainer}>
          {rideTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionCard,
                selectedMode === type.id && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedMode(type.id)}
              activeOpacity={0.8}
            >
              <View style={styles.carIconContainer}>
                <Ionicons name={type.icon} size={40} color={selectedMode === type.id ? '#FFFFFF' : '#5B9FAD'} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[
                  styles.optionName,
                  selectedMode === type.id && styles.optionNameSelected
                ]}>
                  {type.name}
                </Text>
                {type.description && (
                  <Text style={[
                    styles.optionDescription,
                    selectedMode === type.id && styles.optionDescriptionSelected
                  ]}>
                    {type.description}
                  </Text>
                )}
              </View>
              <View style={styles.radioButton}>
                {selectedMode === type.id && (
                  <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#5B9FAD" />
          <Text style={styles.infoText}>
            You can change your driver mode later in settings. The price level indicates the fare range for your rides.
          </Text>
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedMode && styles.nextButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedMode}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Complete Registration</Text>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
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
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 30,
    fontFamily: 'System',
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3A3A4E',
  },
  optionCardSelected: {
    backgroundColor: '#5B9FAD',
    borderColor: '#5B9FAD',
  },
  carIconContainer: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  optionNameSelected: {
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  optionDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  radioButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginTop: 20,
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
  nextButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});