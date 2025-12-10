// src/utils/routeHelpers.js
// Helper functions for routes, distance calculation, and pricing

const GOOGLE_MAPS_API_KEY = 'AIzaSyDfdostSE5FbdXxXJ-2MUEpnGO7YKspK4k';

/**
 * Decode Google Maps polyline format to coordinates
 */
export const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return poly;
};

/**
 * Fetch route from Google Directions API
 */
export const fetchRoute = async (origin, destination) => {
  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        success: true,
        coordinates: decodePolyline(route.overview_polyline.points),
        distance: leg.distance.text,
        distanceValue: leg.distance.value, // in meters
        duration: leg.duration.text,
        durationValue: leg.duration.value, // in seconds
      };
    } else {
      console.error('Directions API error:', data.status, data.error_message);
      return {
        success: false,
        coordinates: [origin, destination],
        distance: null,
        duration: null,
      };
    }
  } catch (error) {
    console.error('Error fetching route:', error);
    return {
      success: false,
      coordinates: [origin, destination],
      distance: null,
      duration: null,
    };
  }
};

/**
 * Calculate distance between two points using Distance Matrix API
 */
export const calculateDistance = async (origin, destination) => {
  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        return {
          success: true,
          distance: element.distance.text,
          distanceValue: element.distance.value, // in meters
          duration: element.duration.text,
          durationValue: element.duration.value, // in seconds
        };
      }
    }
    
    return {
      success: false,
      distance: null,
      distanceValue: null,
      duration: null,
      durationValue: null,
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    return {
      success: false,
      distance: null,
      distanceValue: null,
      duration: null,
      durationValue: null,
    };
  }
};

/**
 * Calculate recommended price based on distance
 * Base formula: 0.5 BHD base + 0.3 BHD per km
 */
export const calculateRecommendedPrice = (distanceInMeters) => {
  if (!distanceInMeters || distanceInMeters === 0) return 0;
  
  const distanceInKm = distanceInMeters / 1000;
  const baseFare = 0.5; // BHD
  const pricePerKm = 0.3; // BHD per km
  
  const totalPrice = baseFare + (distanceInKm * pricePerKm);
  
  // Round to nearest 0.5
  return Math.round(totalPrice * 2) / 2;
};

/**
 * Generate Static Map image URL for route preview
 */
export const generateStaticMapUrl = (origin, destination, routePolyline = null) => {
  const size = '400x200';
  const markers = `markers=color:blue|label:A|${origin.latitude},${origin.longitude}&markers=color:red|label:B|${destination.latitude},${destination.longitude}`;
  
  let url = `https://maps.googleapis.com/maps/api/staticmap?size=${size}&${markers}&key=${GOOGLE_MAPS_API_KEY}`;
  
  // Add route polyline if available
  if (routePolyline) {
    url += `&path=color:0x5B9FAD|weight:3|enc:${routePolyline}`;
  }
  
  return url;
};

/**
 * Format distance text
 */
export const formatDistance = (distanceInMeters) => {
  if (!distanceInMeters) return 'N/A';
  
  const km = distanceInMeters / 1000;
  
  if (km < 1) {
    return `${distanceInMeters} m`;
  }
  
  return `${km.toFixed(1)} km`;
};

/**
 * Format duration text
 */
export const formatDuration = (durationInSeconds) => {
  if (!durationInSeconds) return 'N/A';
  
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes} min`;
};