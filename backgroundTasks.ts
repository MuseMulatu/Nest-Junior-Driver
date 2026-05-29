import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { uploadLocalDataToFirestore } from '@/lib/localDB'; // Import the function
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import { db } from '@/lib/localDB'; // import your local DB instance
import { updateLocalDriverLocation, fetchLocalLocationData } from '@/lib/localDB'; // adjust paths as needed
import { useLocationStore} from "@/store";
import {uploadLocation, useRideStore, updateDriverGeohash } from '@/firebaseconf'; 
import axios from 'axios' 

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = degree => degree * Math.PI / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


// Retry with exponential backoff and 30s cap
export const retryPostLocation = async (url, data, maxAttempts = 10, baseDelay = 1000, maxDelay = 30000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.post(url, data);
      return response;
    } catch (err) {
      const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);

      if (attempt === maxAttempts) {
        throw err;
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Start tracking function
export const startLocationTracking = async (driverId, setUserLocation) => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
    const addressResponse = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
     longitude: location.coords.longitude,
    });
    const address = addressResponse[0];
    
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address: `${address.name}, ${address.region}`,
    });

    const localLocationData = await fetchLocalLocationData(driverId);
    const lastLat = localLocationData?.lastKnownLat;
    const lastLng = localLocationData?.lastKnownLng;

    let distance = 100;
    if (lastLat != null && lastLng != null) {
      distance = haversineDistance(lastLat, lastLng, location.coords.latitude, location.coords.longitude);
    }

    let locationLog = localLocationData?.locationLog ? JSON.parse(localLocationData.locationLog) : [];
    locationLog.push({ 
      time: Date.now(), 
      latitude: location.coords.latitude, 
      longitude: location.coords.longitude, 
      source: "foreground" 
    });
    if (locationLog.length > 15) locationLog.shift();

    await updateLocalDriverLocation(driverId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      source: "foreground",
      locationLog,
    });

    if (distance > 3) {
      try {
        const response = await retryPostLocation(
          `https://app.share-rides.com/drivers/${driverId}/location`, 
          { lat: location.coords.latitude, lng: location.coords.longitude }
        );

      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message;

      }

    } else {

    }
  } else {

  }
};