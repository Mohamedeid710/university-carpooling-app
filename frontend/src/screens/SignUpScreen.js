// src/screens/SignUpScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing } from 'react-native';

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone || !gender) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (phone.length < 8) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name with first name only
      await updateProfile(user, {
        displayName: firstName
      });

      // Create user document with split name
      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email,
        phone: `+973${phone}`,
        gender: gender,
        profilePictureUrl: '',
        createdAt: new Date().toISOString(),
        averageRating: 0,
        totalRatings: 0,
        hasRegisteredVehicle: false,
        isDriver: false,
      });

      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
  colors={['#0F2027', '#203A43', '#2C5364']}
  style={styles.gradient}
    >
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.container}
  >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join RouteMate today</Text>

          <View style={styles.formContainer}>
            {/* First Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#5B9FAD" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                placeholderTextColor="#7F8C8D"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#5B9FAD" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Last Name *"
                placeholderTextColor="#7F8C8D"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#5B9FAD" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="#7F8C8D"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.flagEmoji}>🇧🇭</Text>
              <Text style={styles.phoneCode}>+973</Text>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Phone Number *"
                placeholderTextColor="#7F8C8D"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={8}
              />
            </View>

            {/* Gender */}
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Gender *</Text>
              <View style={styles.genderButtons}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'male' && styles.genderButtonSelected
                  ]}
                  onPress={() => setGender('male')}
                >
                  <Ionicons 
                    name="male" 
                    size={24} 
                    color={gender === 'male' ? '#FFFFFF' : '#5B9FAD'} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    gender === 'male' && styles.genderButtonTextSelected
                  ]}>
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'female' && styles.genderButtonSelected
                  ]}
                  onPress={() => setGender('female')}
                >
                  <Ionicons 
                    name="female" 
                    size={24} 
                    color={gender === 'female' ? '#FFFFFF' : '#5B9FAD'} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    gender === 'female' && styles.genderButtonTextSelected
                  ]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#5B9FAD" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor="#7F8C8D"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#5B9FAD" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password *"
                placeholderTextColor="#7F8C8D"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.signUpButton}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 120,
    paddingBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 40,
    fontFamily: 'System',
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  flagEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  phoneCode: {
    fontSize: 16,
    color: '#5B9FAD',
    marginRight: 10,
    fontWeight: '600',
    fontFamily: 'System',
  },
  phoneInput: {
    marginLeft: 0,
  },
  genderContainer: {
    marginVertical: 10,
  },
  genderLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C3E',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3A3A4E',
    gap: 8,
  },
  genderButtonSelected: {
    backgroundColor: '#5B9FAD',
    borderColor: '#5B9FAD',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#5B9FAD',
    fontWeight: '600',
    fontFamily: 'System',
  },
  genderButtonTextSelected: {
    color: '#FFFFFF',
  },
  signUpButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  linkText: {
    textAlign: 'center',
    color: '#7F8C8D',
    fontSize: 14,
    marginTop: 20,
    fontFamily: 'System',
  },
  linkBold: {
    color: '#5B9FAD',
    fontWeight: 'bold',
  },
  gradient: {
  flex: 1,
},
container: {
  flex: 1,
  backgroundColor: 'transparent',
},
});