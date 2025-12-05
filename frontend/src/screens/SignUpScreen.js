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

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
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

    setLoading(true);
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, {
        displayName: name
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        phone: phone || '',
        createdAt: new Date().toISOString(),
        averageRating: 0,
        totalRatings: 0
      });

      Alert.alert('Success', 'Account created successfully!');
      // Navigation to Home will happen automatically via auth state listener
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join RouteMate today</Text>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 40,
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  signUpButton: {
    backgroundColor: '#5B9FAD',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    color: '#7F8C8D',
    fontSize: 14,
    marginTop: 20,
  },
  linkBold: {
    color: '#5B9FAD',
    fontWeight: 'bold',
  },
});