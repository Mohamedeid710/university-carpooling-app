// src/screens/RouteMapScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export default function RouteMapScreen({ navigation, route }) {
  const { ride } = route.params;
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (ride.pickupCoordinates && ride.destinationCoordinates) {
      fetchRoute();
    }
  }, []);

  const fetchRoute = async () => {
    try {
      const origin = `${ride.pickupCoordinates.latitude},${ride.pickupCoordinates.longitude}`;
      const destination = `${ride.destinationCoordinates.latitude},${ride.destinationCoordinates.longitude}`;
      
      const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoordinates(points);
        
        const leg = data.routes[0].legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);
      } else {
        setRouteCoordinates([ride.pickupCoordinates, ride.destinationCoordinates]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setRouteCoordinates([ride.pickupCoordinates, ride.destinationCoordinates]);
    } finally {
      setLoading(false);
    }
  };

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      </View>
    );
  }

  const region = {
    latitude: (ride.pickupCoordinates.latitude + ride.destinationCoordinates.latitude) / 2,
    longitude: (ride.pickupCoordinates.longitude + ride.destinationCoordinates.longitude) / 2,
    latitudeDelta: Math.abs(ride.pickupCoordinates.latitude - ride.destinationCoordinates.latitude) * 2,
    longitudeDelta: Math.abs(ride.pickupCoordinates.longitude - ride.destinationCoordinates.longitude) * 2,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Map</Text>
        <View style={{ width: 24 }} />
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
      >
        <Marker
          coordinate={ride.pickupCoordinates}
          title="Pickup"
          description={ride.pickupLocation}
          pinColor="#5B9FAD"
        >
          <View style={styles.markerContainer}>
            <Ionicons name="ellipse" size={24} color="#5B9FAD" />
          </View>
        </Marker>

        <Marker
          coordinate={ride.destinationCoordinates}
          title="Destination"
          description={ride.destination}
          pinColor="#E74C3C"
        >
          <View style={styles.markerContainer}>
            <Ionicons name="location" size={28} color="#E74C3C" />
          </View>
        </Marker>

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#5B9FAD"
            strokeWidth={4}
          />
        )}

        {ride.status === 'active' && ride.driverLocation && (
          <Marker
            coordinate={ride.driverLocation}
            title="Driver Location"
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="navigate" size={20} color="#5B9FAD" />
            <View>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>{distance || 'Calculating...'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#5B9FAD" />
            <View>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>{duration || 'Calculating...'}</Text>
            </View>
          </View>
        </View>
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#5B9FAD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#3A3A4E',
  },
  infoLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});