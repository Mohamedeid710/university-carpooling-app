// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import FindRideScreen from './src/screens/FindRideScreen';
import RideDetailsScreen from './src/screens/RideDetailsScreen';
import RideConfirmationScreen from './src/screens/RideConfirmationScreen';
import RatingScreen from './src/screens/RatingScreen';
import DriverDocumentsScreen from './src/screens/DriverDocumentsScreen';
import VehicleInfoScreen from './src/screens/VehicleInfoScreen';
import DriverModeScreen from './src/screens/DriverModeScreen';
import PostRideScreen from './src/screens/PostRideScreen';




const Stack = createNativeStackNavigator();

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
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="FindRide" component={FindRideScreen} />
    <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
    <Stack.Screen name="RideConfirmation" component={RideConfirmationScreen} />
    <Stack.Screen name="Rating" component={RatingScreen} />
    <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} />
    <Stack.Screen name="VehicleInfo" component={VehicleInfoScreen} />
    <Stack.Screen name="DriverMode" component={DriverModeScreen} />
    <Stack.Screen name="PostRide" component={PostRideScreen} />
  </>
) : (
          // User is not signed in
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