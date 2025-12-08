// src/screens/RegisteredVehiclesScreen.js
import React, { useState, useEffect } from 'react';
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
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RegisteredVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    loadVehicles();
  }, []);

  // Reload vehicles when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadVehicles();
    });
    return unsubscribe;
  }, [navigation]);

  const loadVehicles = async () => {
    setLoading(true);
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
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (vehicleId) => {
    try {
      // Remove default from all vehicles
      for (const vehicle of vehicles) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
          isDefault: vehicle.id === vehicleId,
        });
      }
      Alert.alert('Success', 'Default vehicle updated');
      loadVehicles();
    } catch (error) {
      console.error('Error setting default:', error);
      Alert.alert('Error', 'Failed to set default vehicle');
    }
  };

  const handleDelete = async (vehicleId, isDefault) => {
    if (isDefault && vehicles.length > 1) {
      Alert.alert(
        'Cannot Delete',
        'Please set another vehicle as default before deleting this one.'
      );
      return;
    }

    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'vehicles', vehicleId));
              Alert.alert('Success', 'Vehicle deleted successfully');
              loadVehicles();
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VehicleRegistration')}>
          <Ionicons name="add-circle" size={28} color="#5B9FAD" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {vehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={60} color="#3A3A4E" />
              <Text style={styles.emptyText}>No vehicles registered</Text>
              <Text style={styles.emptySubtext}>
                Register a vehicle to start offering rides
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('VehicleRegistration')}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Register Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.vehicleCard}>
                {vehicle.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}

                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIconContainer}>
                    <Ionicons name={getVehicleIcon(vehicle.size)} size={40} color="#5B9FAD" />
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>{vehicle.vehicleName}</Text>
                    <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                  </View>
                </View>

                <View style={styles.vehicleDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="resize-outline" size={18} color="#7F8C8D" />
                    <Text style={styles.detailText}>
                      {vehicle.size.charAt(0).toUpperCase() + vehicle.size.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="color-palette-outline" size={18} color="#7F8C8D" />
                    <Text style={styles.detailText}>{vehicle.color}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="newspaper-outline" size={18} color="#7F8C8D" />
                    <Text style={styles.detailText}>{vehicle.plateNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={18} color="#7F8C8D" />
                    <Text style={styles.detailText}>{vehicle.seats} seats</Text>
                  </View>
                </View>

                <View style={styles.vehicleActions}>
                  {!vehicle.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(vehicle.id)}
                    >
                      <Ionicons name="star-outline" size={20} color="#5B9FAD" />
                      <Text style={styles.actionText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('VehicleRegistration', { vehicle })}
                  >
                    <Ionicons name="create-outline" size={20} color="#5B9FAD" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(vehicle.id, vehicle.isDefault)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    <Text style={[styles.actionText, { color: '#E74C3C' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'System',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#5B9FAD',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  vehicleCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#5B9FAD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  defaultText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  vehicleIconContainer: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  vehicleModel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A3A4E',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A3A4E',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#5B9FAD',
    fontWeight: '500',
    fontFamily: 'System',
  },
});