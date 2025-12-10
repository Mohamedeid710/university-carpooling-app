// src/components/NotificationBanner.js - COMPLETE NEW FILE
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const { width } = Dimensions.get('window');

export default function NotificationBanner({ navigation }) {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestNotif = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
        
        // Only show if it's a new notification (within last 10 seconds)
        const notifTime = new Date(latestNotif.createdAt);
        const now = new Date();
        const diffSeconds = (now - notifTime) / 1000;
        
        if (diffSeconds < 10) {
          setNotification(latestNotif);
          showBanner();
        }
      }
    });

    return unsubscribe;
  }, [user]);

  const showBanner = () => {
    setVisible(true);
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(4000),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setNotification(null);
    });
  };

  const handlePress = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setNotification(null);
      
      // Navigate to notifications
      if (navigation) {
        navigation.navigate('Notifications');
      }
    });
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'ride_request':
        return '#5B9FAD';
      case 'ride_accepted':
        return '#2ECC71';
      case 'ride_declined':
      case 'ride_cancelled':
        return '#E74C3C';
      case 'ride_started':
        return '#3498DB';
      case 'ride_completed':
        return '#F39C12';
      default:
        return '#7F8C8D';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ride_request':
        return 'notifications';
      case 'ride_accepted':
        return 'checkmark-circle';
      case 'ride_declined':
        return 'close-circle';
      case 'ride_started':
        return 'car';
      case 'ride_completed':
        return 'flag';
      case 'ride_cancelled':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  if (!visible || !notification) return null;

  const color = getNotificationColor(notification.type);
  const icon = getNotificationIcon(notification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          borderColor: color,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
   position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  paddingTop: 55,
  paddingHorizontal: 12,
  paddingBottom: 20,
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  borderBottomWidth: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 15,
  backgroundColor: '#313156ff', // Solid dark background
  borderColor: '#5B9FAD',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 50,
  height: 50,
  borderRadius: 25,
  alignItems: 'center',
  justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  message: {
    fontSize: 14,
  color: '#FFFFFF',
  opacity: 1, // Changed from 0.9 to 1 for better visibility
  fontFamily: 'System',
  },
});