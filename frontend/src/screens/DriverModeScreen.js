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
      icon: '🚗',
      description: 'Women-only rides',
      priceLevel: 2,
    },
    {
      id: 'comfort',
      name: 'Comfort $$',
      icon: '🚙',
      description: 'Standard comfortable rides',
      priceLevel: 2,
    },
    {
      id: 'shared',
      name: 'Shared $',
      icon: '🚗',
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
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
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
            >
              <View style={styles.carIconContainer}>
                <Text style={styles.carIcon}>{type.icon}</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{type.name}</Text>
                {type.description && (
                  <Text style={styles.optionDescription}>{type.description}</Text>
                )}
              </View>
              <View style={styles.radioButton}>
                {selectedMode === type.id && (
                  <View style={styles.radioButtonInner} />
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
    fontSize: 22,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionCardSelected: {
    backgroundColor: '#E8F5F7',
    borderColor: '#5B9FAD',
  },
  carIconContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  carIcon: {
    fontSize: 40,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5B9FAD',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5F7',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginTop: 20,
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
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});