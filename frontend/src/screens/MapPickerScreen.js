// src/screens/MapPickerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function MapPickerScreen({ navigation, route }) {
  const { onLocationSelect, initialLocation } = route.params;
  const [region, setRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        setLoading(false);
        setRegion({
          latitude: 26.2235,
          longitude: 50.5876,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      
      if (!selectedLocation) {
        setSelectedLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        reverseGeocode(location.coords.latitude, location.coords.longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
      setRegion({
        latitude: 26.2235,
        longitude: 50.5876,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result && result[0]) {
        const location = result[0];
        const addressStr = `${location.street || ''} ${location.city || ''} ${location.region || ''}`.trim();
        setAddress(addressStr || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
    reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a location on the map');
      return;
    }

    onLocationSelect({
      coordinates: selectedLocation,
      address: address,
    });
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B9FAD" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: 28 }} />
      </View>

      {region && (
        <MapView
          style={styles.map}
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              pinColor="#5B9FAD"
            />
          )}
        </MapView>
      )}

      <View style={styles.addressContainer}>
        <View style={styles.addressCard}>
          <Ionicons name="location" size={24} color="#5B9FAD" />
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>Selected Location</Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Tap on the map to select a location'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedLocation}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  map: {
    flex: 1,
  },
  addressContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#2C2C3E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#5B9FAD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  addressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  footer: {
    padding: 20,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  confirmButton: {
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
  confirmButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
});