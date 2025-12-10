// src/screens/ReviewsScreen.js - COMPLETE NEW FILE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { getDoc, doc } from 'firebase/firestore';

export default function ReviewsScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
  try {
    const reviewsQuery = query(
      collection(db, 'ratings'),
      where('ratedUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(reviewsQuery);
    const reviewsData = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const review = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Get reviewer details
        try {
          const reviewerDoc = await getDoc(doc(db, 'users', review.raterId));
          if (reviewerDoc.exists()) {
            review.reviewerData = reviewerDoc.data();
          }
        } catch (err) {
          console.error('Error loading reviewer:', err);
        }

        // Get ride details if rideId exists
        if (review.rideId) {
          try {
            const rideDoc = await getDoc(doc(db, 'rides', review.rideId));
            if (rideDoc.exists()) {
              review.rideData = rideDoc.data();
            }
          } catch (err) {
            console.error('Error loading ride:', err);
          }
        }

        return review;
      })
    );

    setReviews(reviewsData);
  } catch (error) {
    console.error('Error loading reviews:', error);
  } finally {
    setLoading(false);
  }
};

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reviews</Text>
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
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Reviews List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={80} color="#3A3A4E" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              Reviews from riders and drivers will appear here
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Reviewer Info */}
              <View style={styles.reviewerSection}>
                <View style={styles.reviewerInfo}>
                  {review.reviewerData?.profilePictureUrl ? (
                    <Image
                      source={{ uri: review.reviewerData.profilePictureUrl }}
                      style={styles.reviewerAvatar}
                    />
                  ) : (
                    <View style={styles.reviewerAvatarPlaceholder}>
                      <Text style={styles.reviewerInitial}>
                        {review.reviewerData?.firstName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewerName}>
                      {review.reviewerData?.firstName} {review.reviewerData?.lastName}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                </View>
                {renderStars(review.rating)}
              </View>

              {/* Review Text */}
              {review.comment && (
                <Text style={styles.reviewText}>{review.comment}</Text>
              )}

              {/* Ride Info */}
              {review.rideData && (
                <View style={styles.rideInfo}>
                  <View style={styles.rideInfoRow}>
                    <Ionicons name="location" size={14} color="#5B9FAD" />
                    <Text style={styles.rideInfoText} numberOfLines={1}>
                      {review.rideData.pickupLocation}
                    </Text>
                  </View>
                  <View style={styles.rideInfoRow}>
                    <Ionicons name="navigate" size={14} color="#5B9FAD" />
                    <Text style={styles.rideInfoText} numberOfLines={1}>
                      {review.rideData.destination}
                    </Text>
                  </View>
                </View>
              )}
            </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
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
  reviewCard: {
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  reviewerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  reviewerAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5B9FAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  reviewDate: {
    fontSize: 13,
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'System',
  },
  rideInfo: {
    backgroundColor: 'rgba(91, 159, 173, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#5B9FAD',
  },
  rideInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rideInfoText: {
    fontSize: 13,
    color: '#5B9FAD',
    flex: 1,
    fontFamily: 'System',
  },
});