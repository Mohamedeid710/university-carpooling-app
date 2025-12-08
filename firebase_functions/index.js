// Firebase Cloud Functions for University Carpooling App
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// FUNCTION 1: Match Riders with Available Rides
exports.matchRides = functions.https.onCall(async (data, context) => {
  try {
    const { pickupLocation, destination, departureTime, userId } = data;
    
    const ridesSnapshot = await db.collection('rides')
      .where('availableSeats', '>', 0)
      .where('status', '==', 'active')
      .get();
    
    const matchedRides = [];
    
    ridesSnapshot.forEach(doc => {
      const ride = doc.data();
      
      const pickupMatch = ride.pickupLocation.toLowerCase().includes(pickupLocation.toLowerCase()) ||
                         pickupLocation.toLowerCase().includes(ride.pickupLocation.toLowerCase());
      
      const destinationMatch = ride.destination.toLowerCase().includes(destination.toLowerCase()) ||
                              destination.toLowerCase().includes(ride.destination.toLowerCase());
      
      const rideTime = new Date(ride.departureTime);
      const searchTime = new Date(departureTime);
      const timeDiff = Math.abs(rideTime - searchTime) / (1000 * 60 * 60);
      
      if (pickupMatch && destinationMatch && timeDiff <= 2) {
        matchedRides.push({
          id: doc.id,
          ...ride,
          matchScore: timeDiff
        });
      }
    });
    
    matchedRides.sort((a, b) => a.matchScore - b.matchScore);
    
    return { success: true, rides: matchedRides };
    
  } catch (error) {
    console.error('Error matching rides:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 2: Book a Seat
exports.bookSeat = functions.https.onCall(async (data, context) => {
  try {
    const { rideId, riderId, riderName } = data;
    
    const result = await db.runTransaction(async (transaction) => {
      const rideRef = db.collection('rides').doc(rideId);
      const rideDoc = await transaction.get(rideRef);
      
      if (!rideDoc.exists) {
        throw new Error('Ride not found');
      }
      
      const ride = rideDoc.data();
      
      if (ride.availableSeats <= 0) {
        throw new Error('No seats available');
      }
      
      const existingBooking = await db.collection('bookings')
        .where('rideId', '==', rideId)
        .where('riderId', '==', riderId)
        .get();
      
      if (!existingBooking.empty) {
        throw new Error('You have already booked this ride');
      }
      
      const bookingRef = db.collection('bookings').doc();
      transaction.set(bookingRef, {
        rideId: rideId,
        riderId: riderId,
        riderName: riderName,
        driverId: ride.driverId,
        driverName: ride.driverName,
        pickupLocation: ride.pickupLocation,
        destination: ride.destination,
        departureTime: ride.departureTime,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        rated: false
      });
      
      transaction.update(rideRef, {
        availableSeats: ride.availableSeats - 1,
        riders: admin.firestore.FieldValue.arrayUnion({
          riderId: riderId,
          riderName: riderName,
          bookingId: bookingRef.id
        })
      });
      
      return { bookingId: bookingRef.id };
    });
    
    return { success: true, bookingId: result.bookingId };
    
  } catch (error) {
    console.error('Error booking seat:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 3: Cancel Booking
exports.cancelBooking = functions.https.onCall(async (data, context) => {
  try {
    const { bookingId, userId } = data;
    
    const result = await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      
      if (!bookingDoc.exists) {
        throw new Error('Booking not found');
      }
      
      const booking = bookingDoc.data();
      
      if (booking.riderId !== userId && booking.driverId !== userId) {
        throw new Error('Unauthorized to cancel this booking');
      }
      
      const rideRef = db.collection('rides').doc(booking.rideId);
      const rideDoc = await transaction.get(rideRef);
      
      if (rideDoc.exists) {
        const ride = rideDoc.data();
        transaction.update(rideRef, {
          availableSeats: ride.availableSeats + 1,
          riders: admin.firestore.FieldValue.arrayRemove({
            riderId: booking.riderId,
            riderName: booking.riderName,
            bookingId: bookingId
          })
        });
      }
      
      transaction.update(bookingRef, {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    return { success: true, message: 'Booking cancelled successfully' };
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 4: Submit Rating
exports.submitRating = functions.https.onCall(async (data, context) => {
  try {
    const { bookingId, raterId, ratedUserId, rating, comment } = data;
    
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const existingRating = await db.collection('ratings')
      .where('bookingId', '==', bookingId)
      .where('raterId', '==', raterId)
      .get();
    
    if (!existingRating.empty) {
      throw new Error('You have already rated this ride');
    }
    
    await db.collection('ratings').add({
      bookingId: bookingId,
      raterId: raterId,
      ratedUserId: ratedUserId,
      rating: rating,
      comment: comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const ratingsSnapshot = await db.collection('ratings')
      .where('ratedUserId', '==', ratedUserId)
      .get();
    
    let totalRating = 0;
    let count = 0;
    
    ratingsSnapshot.forEach(doc => {
      totalRating += doc.data().rating;
      count++;
    });
    
    const averageRating = totalRating / count;
    
    await db.collection('users').doc(ratedUserId).update({
      averageRating: averageRating,
      totalRatings: count
    });
    
    await db.collection('bookings').doc(bookingId).update({
      rated: true
    });
    
    return { success: true, averageRating: averageRating };
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 5: Calculate Cost Split
exports.calculateCostSplit = functions.https.onCall(async (data, context) => {
  try {
    const { rideId } = data;
    
    const rideDoc = await db.collection('rides').doc(rideId).get();
    
    if (!rideDoc.exists) {
      throw new Error('Ride not found');
    }
    
    const ride = rideDoc.data();
    const totalCost = ride.estimatedCost || 0;
    const totalSeats = ride.totalSeats;
    const bookedSeats = totalSeats - ride.availableSeats;
    
    const totalPassengers = bookedSeats + 1;
    
    const costPerPerson = totalCost / totalPassengers;
    
    return {
      success: true,
      totalCost: totalCost,
      costPerPerson: parseFloat(costPerPerson.toFixed(2)),
      numberOfRiders: bookedSeats,
      currency: 'BHD'
    };
    
  } catch (error) {
    console.error('Error calculating cost split:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 6: Get User Statistics
exports.getUserStats = functions.https.onCall(async (data, context) => {
  try {
    const { userId } = data;
    
    const drivenRides = await db.collection('rides')
      .where('driverId', '==', userId)
      .get();
    
    const takenRides = await db.collection('bookings')
      .where('riderId', '==', userId)
      .where('status', '==', 'confirmed')
      .get();
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    return {
      success: true,
      stats: {
        ridesOffered: drivenRides.size,
        ridesTaken: takenRides.size,
        averageRating: userData?.averageRating || 0,
        totalRatings: userData?.totalRatings || 0
      }
    };
    
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { success: false, error: error.message };
  }
});

// FUNCTION 7: Manual Notification Creator (Alternative to scheduled function)
// Call this from your app when you want to send notifications
exports.createRideNotification = functions.https.onCall(async (data, context) => {
  try {
    const { rideId, recipientId, message } = data;
    
    await db.collection('notifications').add({
      userId: recipientId,
      title: 'Ride Notification',
      message: message,
      rideId: rideId,
      isRead: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'Notification created' };
    
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
});