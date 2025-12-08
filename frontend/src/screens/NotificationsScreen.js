// src/screens/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Real-time listener for notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadNotifs = notifications.filter(n => !n.isRead);
      
      unreadNotifs.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'ride_request':
        navigation.navigate('RideRequests', { rideId: notification.rideId });
        break;
      case 'ride_accepted':
      case 'ride_started':
        navigation.navigate('RideDetails', { ride: { id: notification.rideId } });
        break;
      case 'ride_completed':
        // Navigate to rating if not rated
        if (notification.data?.bookingId) {
          navigation.navigate('Rating', { 
            booking: { 
              id: notification.data.bookingId,
              ...notification.data 
            } 
          });
        }
        break;
      default:
        break;
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B9FAD" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 24 }} />}
      </View>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B9FAD"
            colors={['#5B9FAD']}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#3A3A4E" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see updates about your rides here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${getNotificationColor(notification.type)}20` },
                ]}
              >
                <Ionicons
                  name={getNotificationIcon(notification.type)}
                  size={24}
                  color={getNotificationColor(notification.type)}
                />
              </View>

              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </Text>
              </View>

              {!notification.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  markAllText: {
    fontSize: 14,
    color: '#5B9FAD',
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBanner: {
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#5B9FAD',
  },
  unreadText: {
    fontSize: 14,
    color: '#5B9FAD',
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A4E',
    gap: 12,
  },
  notificationCardUnread: {
    borderColor: '#5B9FAD',
    backgroundColor: 'rgba(91, 159, 173, 0.05)',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 6,
    fontFamily: 'System',
  },
  notificationTime: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5B9FAD',
  },
});