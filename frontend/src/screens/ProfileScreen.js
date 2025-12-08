// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      // In production, upload to Firebase Storage and get URL
      // For now, just save the local URI
      await updateDoc(doc(db, 'users', user.uid), {
        profilePictureUrl: uri,
      });

      setUserData({ ...userData, profilePictureUrl: uri });
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploading}
          >
            {userData?.profilePictureUrl ? (
              <Image 
                source={{ uri: userData.profilePictureUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userData?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {userData?.firstName} {userData?.lastName}
          </Text>
          <Text style={styles.userEmail}>{userData?.email}</Text>

          {userData?.averageRating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>
                {userData.averageRating.toFixed(1)} ({userData.totalRatings} ratings)
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#5B9FAD" />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userData?.phone || 'Not set'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#5B9FAD" />
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>
                {userData?.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : 'Not set'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#5B9FAD" />
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Driver Status */}
        {userData?.hasRegisteredVehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Status</Text>

            <View style={styles.driverCard}>
              <Ionicons name="checkmark-circle" size={40} color="#2ECC71" />
              <Text style={styles.driverText}>Verified Driver</Text>
              <Text style={styles.driverSubtext}>Vehicle registered</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('RegisteredVehicles')}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="car-outline" size={24} color="#5B9FAD" />
              <Text style={styles.actionText}>My Vehicles</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('RideHistory')}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="time-outline" size={24} color="#5B9FAD" />
              <Text style={styles.actionText}>Ride History</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
              <Text style={[styles.actionText, { color: '#E74C3C' }]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  profileCard: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  avatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2C2C3E',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  userEmail: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  infoCard: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#7F8C8D',
    flex: 1,
    fontFamily: 'System',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3A4E',
    marginVertical: 16,
  },
  driverCard: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  driverText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ECC71',
    marginTop: 12,
    fontFamily: 'System',
  },
  driverSubtext: {
    fontSize: 14,
    color: '#2ECC71',
    marginTop: 4,
    fontFamily: 'System',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C3E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 30,
    borderColor: '#E74C3C',
  },
});