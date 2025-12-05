// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your Firebase configuration
// Get this from: https://console.firebase.google.com/u/1/project/routemate-carpooling-app/settings/general
const firebaseConfig = {
  apiKey: "AIzaSyBBFa79b9c61WjG6Fa5ua1Sbqt6vsBkAKU",
  authDomain: "routemate-carpooling-app.firebaseapp.com",
  projectId: "routemate-carpooling-app",
  storageBucket: "routemate-carpooling-app.firebasestorage.app",
  messagingSenderId: "210751096380",
  appId: "1:210751096380:web:3e447f97211fbd185ca539",
  measurementId: "G-FEWC0PF0V5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;