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
  const { booking } = route.params;
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

  // Replace the handleSubmit function (around line 70-120) with:

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
    // Check if booking exists and has required data
    if (!booking || !booking.id) {
      throw new Error('Booking information is missing');
    }

    // Get driver ID - check multiple possible locations
    const driverId = booking.driverId || booking.data?.driverId || booking.rideDetails?.driverId;
    if (!driverId) {
      throw new Error('Driver information is missing');
    }

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

    const feedbackComment = selectedIssues.length > 0 
      ? `Issues: ${selectedIssues.join(', ')}${otherComment ? `. Other: ${otherComment}` : ''}`
      : otherComment || 'Good ride';

    // Save the rating
    await addDoc(collection(db, 'ratings'), {
      bookingId: booking.id,
      raterId: user.uid,
      ratedUserId: driverId,
      rating: rating,
      comment: feedbackComment,
      rideId: booking.rideId, // Add rideId for reference
      createdAt: new Date().toISOString(),
    });

    // Calculate new average rating for driver
    const driverRatings = await getDocs(
      query(collection(db, 'ratings'), where('ratedUserId', '==', driverId))
    );

    let totalRating = 0;
    let count = 0;

    driverRatings.forEach((doc) => {
      totalRating += doc.data().rating;
      count++;
    });

    const averageRating = count > 0 ? totalRating / count : 0;

    // Update driver's rating
    await updateDoc(doc(db, 'users', driverId), {
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
    Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Ride</Text>
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
                  color={star <= rating ? '#FFD700' : '#3A3A4E'}
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
              <Text style={styles.otherLabel}>Additional comments:</Text>
              <TextInput
                style={styles.otherInput}
                placeholder="Type here..."
                placeholderTextColor="#7F8C8D"
                value={otherComment}
                onChangeText={setOtherComment}
                multiline
                numberOfLines={3}
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
              placeholderTextColor="#7F8C8D"
              value={otherComment}
              onChangeText={setOtherComment}
              multiline
              numberOfLines={4}
            />
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#2C2C3E',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  ratingLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 30,
    fontFamily: 'System',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    fontFamily: 'System',
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  issueButton: {
    backgroundColor: '#2C2C3E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#3A3A4E',
  },
  issueButtonSelected: {
    backgroundColor: '#5B9FAD',
    borderColor: '#5B9FAD',
  },
  issueButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'System',
  },
  issueButtonTextSelected: {
    color: '#FFFFFF',
  },
  otherSection: {
    marginTop: 10,
  },
  otherLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
    fontFamily: 'System',
  },
  otherInput: {
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3A3A4E',
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
  commentSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  commentInput: {
    backgroundColor: '#2C2C3E',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3A3A4E',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 10,
    fontFamily: 'System',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  submitButton: {
    backgroundColor: '#5B9FAD',
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5B9FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});