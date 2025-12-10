// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade + slide for logo / buttons
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle, slow gradient animation between darker teal tones
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Darker, less dramatic teal gradient
  const color1 = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#050B18', '#071320'], // deep navy → very dark teal
  });

  const color2 = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#071320', '#0B2030'], // subtle shift
  });

  const color3 = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0B2030', '#113447'], // dark teal → muted blue-teal
  });

  return (
    <AnimatedLinearGradient
      colors={[color1, color2, color3]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Logo + Tagline */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Soft glow behind logo */}
          <View style={styles.logoGlow} />

          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>
            Right Route, Right Mate - Everytime.
          </Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Primary: Sign in */}
          <TouchableOpacity
            style={styles.buttonPrimaryWrapper}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2B6C81', '#56B5C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonPrimary}
            >
              <Text style={styles.buttonPrimaryText}>Sign in</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary: Sign up */}
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonSecondaryText}>Sign up</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </AnimatedLinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    // slightly lower on the screen
    marginTop: 120,
  },
  logoGlow: {
  position: 'absolute',
  width: 390,     // match the logo width
  height: 230,    // match the logo height
  borderRadius: 90, // rounded rectangle ends
  backgroundColor: 'rgba(12, 58, 55, 0.18)', 
  shadowColor: '#6FE2E9',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 18,
},
  logo: {
    width: 340,
    height: 150,
  },
  tagline: {
    marginTop: 18,
    fontSize: 15,
    // iOS will use this nicer system font, others fall back gracefully
    fontFamily: 'AvenirNext-DemiBold',
    color: '#46c7d59b', // teal-ish to match logo accents
    textAlign: 'center',
    letterSpacing: 0.7,
    textTransform: 'none',
  },
  buttonContainer: {
    paddingHorizontal: 40,
    gap: 18,
    marginBottom: 40,
  },
  buttonPrimaryWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#56B5C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonPrimary: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonSecondary: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4F7F93',
    backgroundColor: 'rgba(4, 20, 32, 0.8)',
  },
  buttonSecondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#C8E5EC',
    letterSpacing: 0.3,
  },
});