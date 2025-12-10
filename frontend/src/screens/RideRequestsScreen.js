// src/screens/RideRequestsScreen.js - FIXED
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc, increment } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function RideRequestsScreen({ navigation, route }) {
    const { rideId } = route.params;
    const [ride, setRide] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const user = auth.currentUser;

    useEffect(() => {
        loadRide();
        subscribeToRequests();
    }, []);

    const loadRide = async () => {
        try {
            const rideDoc = await getDoc(doc(db, 'rides', rideId));
            if (rideDoc.exists()) {
                setRide({ id: rideDoc.id, ...rideDoc.data() });
            }
        } catch (error) {
            console.error('Error loading ride:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToRequests = () => {
        const q = query(
            collection(db, 'rideRequests'),
            where('rideId', '==', rideId),
            where('status', '==', 'pending')
        );

        return onSnapshot(q, async (snapshot) => {
            const requestsData = [];
            for (const docSnapshot of snapshot.docs) {
                const requestData = { id: docSnapshot.id, ...docSnapshot.data() };

                // Load rider info
                try {
                    const riderDoc = await getDoc(doc(db, 'users', requestData.riderId));
                    if (riderDoc.exists()) {
                        requestData.riderInfo = riderDoc.data();
                    }
                } catch (error) {
                    console.error('Error loading rider info:', error);
                }

                requestsData.push(requestData);
            }
            setRequests(requestsData);
        });
    };

    const handleAcceptRequest = async (request) => {
        if (!ride || ride.availableSeats <= 0) {
            Alert.alert('No Seats Available', 'This ride is full');
            return;
        }

        setProcessing(request.id);
        try {
            // Create booking
            await addDoc(collection(db, 'bookings'), {
                rideId: ride.id,
                riderId: request.riderId,
                riderName: request.riderName,
                driverId: user.uid,
                driverName: ride.driverName,
                pickupLocation: request.pickupLocation || 'Pickup not specified',
                pickupCoordinates: request.pickupCoordinates || null,
                destination: ride.destination,
                destinationCoordinates: ride.destinationCoordinates,
                departureTime: ride.departureTime,
                estimatedCost: ride.estimatedCost || ride.price || 0,
                status: ride.status === 'active' ? 'in_progress' : 'scheduled',
                createdAt: new Date().toISOString(),
                rated: false,
            });

            // Update request status
            await updateDoc(doc(db, 'rideRequests', request.id), {
                status: 'accepted',
                acceptedAt: new Date().toISOString(),
            });

            // Update ride available seats
            await updateDoc(doc(db, 'rides', ride.id), {
                availableSeats: increment(-1),
            });

            // Send notification to rider
            await addDoc(collection(db, 'notifications'), {
                userId: request.riderId,
                type: 'ride_accepted',
                title: 'Request Accepted!',
                message: `${ride.driverName} accepted your ride request`,
                rideId: ride.id,
                isRead: false,
                createdAt: new Date().toISOString(),
            });

            Alert.alert('Success', 'Request accepted');
        } catch (error) {
            console.error('Error accepting request:', error);
            Alert.alert('Error', 'Failed to accept request');
        } finally {
            setProcessing(null);
        }
    };

    const handleDeclineRequest = async (request) => {
        Alert.alert(
            'Decline Request',
            'Are you sure you want to decline this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(request.id);
                        try {
                            await updateDoc(doc(db, 'rideRequests', request.id), {
                                status: 'declined',
                                declinedAt: new Date().toISOString(),
                            });

                            await addDoc(collection(db, 'notifications'), {
                                userId: request.riderId,
                                type: 'ride_declined',
                                title: 'Request Declined',
                                message: `${ride.driverName} declined your ride request`,
                                rideId: ride.id,
                                isRead: false,
                                createdAt: new Date().toISOString(),
                            });

                            Alert.alert('Request Declined');
                        } catch (error) {
                            console.error('Error declining request:', error);
                            Alert.alert('Error', 'Failed to decline request');
                        } finally {
                            setProcessing(null);
                        }
                    },
                },
            ]
        );
    };

    const handleCallRider = (phone) => {
        if (!phone) {
            Alert.alert('Not Available', 'Rider phone number is not available');
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const openMapLocation = (coords, label) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
        Linking.openURL(url);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ride Requests</Text>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#5B9FAD" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ride Requests</Text>
                <Text style={styles.requestCount}>{requests.length}</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {requests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="hourglass-outline" size={60} color="#3A3A4E" />
                        <Text style={styles.emptyText}>No pending requests</Text>
                        <Text style={styles.emptySubtext}>Riders will appear here when they request to join</Text>
                    </View>
                ) : (
                    requests.map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                            {/* Rider Info */}
                            <View style={styles.riderSection}>
                                <View style={styles.riderAvatar}>
                                    {request.riderInfo?.profilePictureUrl ? (
                                        <Image
                                            source={{ uri: request.riderInfo.profilePictureUrl }}
                                            style={styles.riderAvatarImage}
                                        />
                                    ) : (
                                        <Text style={styles.riderInitial}>
                                            {request.riderName?.charAt(0).toUpperCase() || 'R'}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.riderInfo}>
                                    <Text style={styles.riderName}>{request.riderName}</Text>
                                    {request.riderInfo?.averageRating > 0 && (
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={14} color="#FFD700" />
                                            <Text style={styles.ratingText}>
                                                {request.riderInfo.averageRating.toFixed(1)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {request.riderInfo?.phone && (
                                    <TouchableOpacity
                                        style={styles.callButton}
                                        onPress={() => handleCallRider(request.riderInfo.phone)}
                                    >
                                        <Ionicons name="call" size={20} color="#5B9FAD" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Pickup Location with Map */}
                            <View style={styles.pickupSection}>
                                <Text style={styles.sectionLabel}>Pickup Location</Text>
                                <Text style={styles.pickupText}>{request.pickupLocation || 'Pickup location not specified'}</Text>

                                {/* SHOW MESSAGE IF EXISTS */}
                                {request.message && (
                                    <View style={styles.messageBox}>
                                        <Ionicons name="chatbubble" size={16} color="#5B9FAD" />
                                        <Text style={styles.messageText}>{request.message}</Text>
                                    </View>
                                )}

                                {request.pickupCoordinates && request.pickupCoordinates.latitude && request.pickupCoordinates.longitude && (
                                    <TouchableOpacity
                                        style={styles.mapPreview}
                                        onPress={() => openMapLocation(request.pickupCoordinates, request.pickupLocation)}
                                    >
                                        <MapView
                                            provider={PROVIDER_GOOGLE}
                                            style={styles.miniMap}
                                            initialRegion={{
                                                ...request.pickupCoordinates,
                                                latitudeDelta: 0.01,
                                                longitudeDelta: 0.01,
                                            }}
                                            scrollEnabled={false}
                                            zoomEnabled={false}
                                            pitchEnabled={false}
                                            rotateEnabled={false}
                                        >
                                            <Marker coordinate={request.pickupCoordinates} pinColor="#5B9FAD" />
                                        </MapView>
                                        <View style={styles.mapOverlay}>
                                            <Ionicons name="location" size={16} color="#5B9FAD" />
                                            <Text style={styles.mapOverlayText}>Open in Maps</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Request Time */}
                            <Text style={styles.requestTime}>
                                Requested {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Just now'}
                            </Text>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.declineButton]}
                                    onPress={() => handleDeclineRequest(request)}
                                    disabled={processing === request.id}
                                >
                                    {processing === request.id ? (
                                        <ActivityIndicator size="small" color="#E74C3C" />
                                    ) : (
                                        <>
                                            <Ionicons name="close-circle" size={20} color="#E74C3C" />
                                            <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>
                                                Decline
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.acceptButton]}
                                    onPress={() => handleAcceptRequest(request)}
                                    disabled={processing === request.id}
                                >
                                    {processing === request.id ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>Accept</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
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
        flex: 1,
        marginLeft: 16,
    },
    requestCount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5B9FAD',
        backgroundColor: 'rgba(91, 159, 173, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontFamily: 'System',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
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
    requestCard: {
        backgroundColor: '#2C2C3E',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#3A3A4E',
    },
    riderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#3A3A4E',
    },
    riderAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#5B9FAD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    riderAvatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    riderInitial: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        fontFamily: 'System',
    },
    riderInfo: {
        flex: 1,
    },
    riderName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
        fontFamily: 'System',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        color: '#7F8C8D',
        fontFamily: 'System',
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(91, 159, 173, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickupSection: {
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        marginBottom: 4,
        fontFamily: 'System',
    },
    pickupText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '500',
        marginBottom: 12,
        fontFamily: 'System',
    },
    mapPreview: {
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    miniMap: {
        width: '100%',
        height: 150,
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    mapOverlayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5B9FAD',
        fontFamily: 'System',
    },
    requestTime: {
        fontSize: 12,
        color: '#7F8C8D',
        marginBottom: 16,
        fontFamily: 'System',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    declineButton: {
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 1,
        borderColor: '#E74C3C',
    },
    acceptButton: {
        backgroundColor: '#5B9FAD',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: 'System',
    },
    callButtonBig: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#2ECC71',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#2ECC71',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
},
messageBox: {
  flexDirection: 'row',
  backgroundColor: 'rgba(91, 159, 173, 0.1)',
  padding: 12,
  borderRadius: 10,
  gap: 10,
  marginTop: 12,
  borderWidth: 1,
  borderColor: '#5B9FAD',
},
messageText: {
  flex: 1,
  fontSize: 14,
  color: '#5B9FAD',
  fontFamily: 'System',
  fontStyle: 'italic',
},
});