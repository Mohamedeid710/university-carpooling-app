// src/screens/RatingScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RatingScreen({ navigation, route }) {
  const { booking } = route.params; // Pass booking data from previous screen
  const [rating, setRating] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [otherComment, setOtherComment] = useState('');
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

  const issues = [
    'Poor Route',
    'Too many Pickups',
    'Co-rider behavior',
    'Navigation',
    'Driving',
    'Other',
  ];

  const handleStarPress = (star) => {
    setRating(star);
  };

  const toggleIssue = (issue) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter((i) => i !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (rating < 4 && selectedIssues.length === 0) {
      Alert.alert('Feedback Required', 'Please select at least one issue or provide feedback');
      return;
    }

    setLoading(true);

    try {
      // Check if already rated
      const existingRating = await getDocs(
        query(
          collection(db, 'ratings'),
          where('bookingId', '==', booking.id),
          where('raterId', '==', user.uid)
        )
      );

      if (!existingRating.empty) {
        Alert.alert('Already Rated', 'You have already rated this ride');
        setLoading(false);
        return;
      }

      // Combine issues and other comment
      const feedbackComment = selectedIssues.length > 0 
        ? `Issues: ${selectedIssues.join(', ')}${otherComment ? `. Other: ${otherComment}` : ''}`
        : otherComment || 'Good ride';

      // Add rating to Firestore
      await addDoc(collection(db, 'ratings'), {
        bookingId: booking.id,
        raterId: user.uid,
        ratedUserId: booking.driverId, // Rating the driver
        rating: rating,
        comment: feedbackComment,
        createdAt: new Date().toISOString(),
      });

      // Get all ratings for this driver to calculate average
      const driverRatings = await getDocs(
        query(collection(db, 'ratings'), where('ratedUserId', '==', booking.driverId))
      );

      let totalRating = 0;
      let count = 0;

      driverRatings.forEach((doc) => {
        totalRating += doc.data().rating;
        count++;
      });

      const averageRating = totalRating / count;

      // Update driver's average rating
      await updateDoc(doc(db, 'users', booking.driverId), {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalRatings: count,
      });

      // Mark booking as rated
      await updateDoc(doc(db, 'bookings', booking.id), {
        rated: true,
      });

      Alert.alert('Thank You!', 'Your rating has been submitted successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rating</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>
            {rating === 0 ? 'Tap to rate' : 
             rating === 5 ? 'Excellent' :
             rating === 4 ? 'Good' :
             rating === 3 ? 'Okay' :
             rating === 2 ? 'Poor' : 'Very Poor'}
          </Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={50}
                  color={star <= rating ? '#000000' : '#D1D1D1'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Issues Section (show only if rating < 4) */}
        {rating > 0 && rating < 4 && (
          <View style={styles.issuesSection}>
            <Text style={styles.sectionTitle}>What went wrong?</Text>
            <Text style={styles.sectionSubtitle}>Please select one or more issues.</Text>

            <View style={styles.issuesGrid}>
              {issues.map((issue) => (
                <TouchableOpacity
                  key={issue}
                  style={[
                    styles.issueButton,
                    selectedIssues.includes(issue) && styles.issueButtonSelected,
                  ]}
                  onPress={() => toggleIssue(issue)}
                >
                  <Text
                    style={[
                      styles.issueButtonText,
                      selectedIssues.includes(issue) && styles.issueButtonTextSelected,
                    ]}
                  >
                    {issue}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Other Comment */}
            <View style={styles.otherSection}>
              <Text style={styles.otherLabel}>other:</Text>
              <TextInput
                style={styles.otherInput}
                placeholder="Type here..."
                value={otherComment}
                onChangeText={setOtherComment}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
          </View>
        )}

        {/* Optional comment for good ratings */}
        {rating >= 4 && (
          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              value={otherComment}
              onChangeText={setOtherComment}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home" size={24} color="#2C3E50" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#7F8C8D" />
          <Text style={[styles.navText, { color: '#7F8C8D' }]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
  },
  ratingLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 30,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  starButton: {
    padding: 5,
  },
  issuesSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    textAlign: 'center',
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  issueButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  issueButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  issueButtonText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  issueButtonTextSelected: {
    color: '#FFFFFF',
  },
  otherSection: {
    marginTop: 10,
  },
  otherLabel: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 10,
  },
  otherInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  commentInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
});
