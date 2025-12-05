// src/screens/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>ROUTE</Text>
        <Text style={styles.logoText}>MATE</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  logoText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#5B9FAD',
    letterSpacing: 8,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    gap: 20,
  },
  button: {
    backgroundColor: '#E8F0F2',
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2C3E50',
  },
});