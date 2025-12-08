// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./src/config/firebase";
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import FindRideScreen from './src/screens/FindRideScreen';
import RideDetailsScreen from './src/screens/RideDetailsScreen';
import RideConfirmationScreen from './src/screens/RideConfirmationScreen';
import RatingScreen from './src/screens/RatingScreen';
import PostRideScreen from './src/screens/PostRideScreen';
import RideHistoryScreen from './src/screens/RideHistoryScreen';
import VehicleRegistrationScreen from './src/screens/VehicleRegistrationScreen';
import RegisteredVehiclesScreen from './src/screens/RegisteredVehiclesScreen';
import RideRequestsScreen from './src/screens/RideRequestsScreen';
import ActiveRideScreen from './src/screens/ActiveRideScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapPickerScreen from './src/screens/MapPickerScreen';
import RouteMapScreen from './src/screens/RouteMapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Notification Badge Component
function NotificationBadge({ count }) {
  if (count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// Bottom Tab Navigator
function TabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return unsubscribe;
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A2E',
          borderTopColor: '#2C2C3E',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#5B9FAD',
        tabBarInactiveTintColor: '#7F8C8D',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'System',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="VehiclesTab"
        component={RegisteredVehiclesScreen}
        options={{
          tabBarLabel: 'Vehicles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Ionicons 
                name={focused ? "notifications" : "notifications-outline"} 
                size={size} 
                color={color} 
              />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="HistoryTab"
        component={RideHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={TabNavigator} />
            <Stack.Screen name="FindRide" component={FindRideScreen} />
            <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
            <Stack.Screen name="RideConfirmation" component={RideConfirmationScreen} />
            <Stack.Screen name="Rating" component={RatingScreen} />
            <Stack.Screen name="PostRide" component={PostRideScreen} />
            <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />
            <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
            <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
            <Stack.Screen name="MapPicker" component={MapPickerScreen} />
            <Stack.Screen name="RouteMap" component={RouteMapScreen} />
            <Stack.Screen name="RegisteredVehicles" component={RegisteredVehiclesScreen} />
            <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});