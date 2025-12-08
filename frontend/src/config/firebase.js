// src/config/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBFa79b9c61WjG6Fa5ua1Sbqt6vsBkAKU",
  authDomain: "routemate-carpooling-app.firebaseapp.com",
  projectId: "routemate-carpooling-app",
  storageBucket: "routemate-carpooling-app.firebasestorage.app",
  messagingSenderId: "210751096380",
  appId: "1:210751096380:web:3e447f97211fbd185ca539",
  measurementId: "G-FEWC0PF0V5",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db };