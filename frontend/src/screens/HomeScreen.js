// src/screens/HomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Animated } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#5B9FAD" />
        </TouchableOpacity>
      </View>

      {/* Welcome Message */}
      <Animated.View 
        style={[
          styles.welcomeSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.displayName || 'User'}!</Text>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionColumn}>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('PostRide')}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="car" size={32} color="#5B9FAD" />
                </View>
                <Text style={styles.actionTitle}>Offer Ride</Text>
                <Text style={styles.actionSubtitle}>Share your trip</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('FindRide')}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="search" size={32} color="#5B9FAD" />
                </View>
                <Text style={styles.actionTitle}>Find Ride</Text>
                <Text style={styles.actionSubtitle}>Search rides</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigation.navigate('DriverDocuments')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={32} color="#5B9FAD" />
              </View>
              <Text style={styles.actionTitle}>Verify License</Text>
              <Text style={styles.actionSubtitle}>Submit driver documents</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCardWide}
              onPress={() => navigation.navigate('RideHistory')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={32} color="#5B9FAD" />
              </View>
              <Text style={styles.actionTitle}>Ride History</Text>
              <Text style={styles.actionSubtitle}>View past rides</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* My Rides Section */}
        <Text style={styles.sectionTitle}>My Rides</Text>
        <View style={styles.ridesContainer}>
          <Ionicons name="calendar-outline" size={48} color="#5B9FAD" />
          <Text style={styles.emptyText}>No upcoming rides</Text>
          <Text style={styles.emptySubtext}>Start by offering or finding a ride</Text>
        </View>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="car-sport" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Rides Offered</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Rides Taken</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#5B9FAD" />
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 140,
    height: 40,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2C2C3E',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 30,
    marginBottom: 16,
    fontFamily: 'System',
  },
  actionColumn: {
    gap: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  actionCardWide: {
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  ridesContainer: {
    backgroundColor: '#2C2C3E',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
    fontFamily: 'System',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5B9FAD',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
});