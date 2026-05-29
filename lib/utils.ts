import { Ride } from "@/types/type";
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common"; 
import { getFirestore, doc, onSnapshot, where, collection, Timestamp, GeoPoint, query, orderBy, startAt, endAt, getDocs, updateDoc  } from "firebase/firestore"; 
//import { db } from "@/firebaseconf";
import { router } from "expo-router";
import * as LinkingExpo from 'expo-linking';
import { Share, Linking } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, Button,  Modal, StyleSheet, TextInput, Alert } from "react-native";
import axios from 'axios' 
import * as Location from 'expo-location';
import { dynamoDB } from '@/lib/modals'; 

const retryPostLocation = async (url, data, maxAttempts = 10, baseDelay = 1000, maxDelay = 30000) => {
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

const haversineDistance = (coords1, coords2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371; // Radius of the Earth in kilometers
  const lat1 = toRadians(coords1.latitude);
  const lon1 = toRadians(coords1.longitude);
  const lat2 = toRadians(coords2.latitude);
  const lon2 = toRadians(coords2.longitude);

  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;

  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
};

export const sortRides = (rides: Ride[]): Ride[] => {
  const result = rides.sort((a, b) => {
    const dateA = new Date(`${a.created_at}T${a.ride_time}`);
    const dateB = new Date(`${b.created_at}T${b.ride_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return result.reverse();
};


export function formatTime(minutes: number): string {
  const formattedMinutes = +minutes?.toFixed(0) || 0;

  if (formattedMinutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(formattedMinutes / 60);
    const remainingMinutes = formattedMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day < 10 ? "0" + day : day} ${month} ${year}`;
}

export const handleCall = (phoneNumber) => {
  let formattedPhoneNumber = phoneNumber;
    // Remove the country code (+251) and replace it with a 0
   if (phoneNumber.startsWith('+251')) {
    formattedPhoneNumber = '0' + phoneNumber.slice(4); // Deletes "+251" and prepends "0"
}
//console .log(formattedPhoneNumber)
    // Format the tel URL
    const telNumber = `tel:${formattedPhoneNumber}`;
    
    LinkingExpo.openURL(telNumber)
      .then(data => {

      })
      .catch(error => {

      });
};


const rejectRideRequest = async (requestId, driverId) => {
  try {
    await updateDoc(doc(db, "requests", requestId), {
      drivers: arrayRemove(driverId), // Remove driver from the drivers array
    });
  } catch (error) {

  }
};


// Helper function to calculate distance between two coordinates
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Number.MAX_VALUE;

  const toRad = angle => (Math.PI / 180) * angle;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculatePrice = (distance, time, requestTime, requestType, seatNumber, carModel, driverSetPrice, driverPrices) => {
  try {

    // Parse and validate distance and time
    const parsedDistance = parseFloat(distance);
    const parsedTime = parseFloat(time);
    if (isNaN(parsedDistance) || isNaN(parsedTime) || parsedDistance < 0 || parsedTime < 0) {

      return 1;
    }

    // Parse requestTime into minutes since midnight
    const parseTime = (timeStr) => {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
      return { hours, minutes };
    };

    const { hours: requestHours, minutes: requestMinutes } = parseTime(requestTime);
    if (isNaN(requestHours) || isNaN(requestMinutes) || requestHours < 0 || requestHours > 23 || requestMinutes < 0 ) {

      return 1;
    }

    const totalRequestMinutes = requestHours * 60 + requestMinutes;
    const isNightTime = totalRequestMinutes >= 19 * 60 + 30 || totalRequestMinutes < 6 * 60;

    // Parse seatNumber as integer
    const parsedSeatNumber = parseInt(seatNumber, 10);
    if (isNaN(parsedSeatNumber)) {

    }

    // Normalize carModel to lowercase
    const normalizedCarModel = typeof carModel === 'string' ? carModel.toLowerCase() : '';

    // Parse driverSetPrice correctly (handle string 'true'/'false')
    const isDriverSetPrice = typeof driverSetPrice === 'string' 
      ? driverSetPrice.toLowerCase() === 'true' 
      : Boolean(driverSetPrice);

    let kmPrice = 19, nightkmPrice = 21;
    if (isDriverSetPrice) {
      // Ensure driverPrices are valid numbers
      kmPrice = parseFloat(String(driverPrices.kmPrice).replace(',', '.'));
      nightkmPrice = parseFloat(String(driverPrices.nightkmPrice).replace(',', '.'));
      
      if (isNaN(kmPrice) || isNaN(nightkmPrice)) {

        isDriverSetPrice = false; // Fallback to default pricing
      } else {

      }
    }

    let ratePerKm, timeRate, baseFare;

    if (requestType === "streetPickup") {

      if ([6, 7].includes(parsedSeatNumber)) {

        baseFare = isNightTime ? 165 : 160;
        ratePerKm = isNightTime ? 28 : 26;
      } else if (normalizedCarModel === 'lada') {

        baseFare = isNightTime ? 140 : 130;
        ratePerKm = isNightTime ? 20 : 18;
      } else {

        baseFare = isNightTime ? 165 : 160;
        ratePerKm = isNightTime ? 25 : 21;
      }
      timeRate = 3;
    } else if (isDriverSetPrice) {

      ratePerKm = isNightTime ? nightkmPrice : kmPrice;
      timeRate = 2;
      baseFare = isNightTime ? 165 : 160;
    } else {
      if ([6, 7].includes(parsedSeatNumber)) {

        baseFare = isNightTime ? 165 : 160;
        ratePerKm = isNightTime ? 26.5 : 22.5;
      } else if (normalizedCarModel === 'lada') {

        baseFare = isNightTime ? 140 : 130;
        ratePerKm = isNightTime ? 21 : 19;
      } else {

        baseFare = isNightTime ? 165 : 160;
        ratePerKm = isNightTime ? 26 : 21.5;
      }
      timeRate = 3;
    }

    // Convert all values to fixed precision to avoid floating point issues
    const distanceKm = parsedDistance / 1000;
    const preciseBase = Math.round(baseFare * 100);
    const preciseDistance = Math.round(ratePerKm * distanceKm * 100);
    const preciseTime = Math.round(timeRate * parsedTime * 100);

    const totalCents = preciseBase + preciseDistance + preciseTime;
    const fare = Math.round(totalCents / 100); // Convert back to currency units

    return fare;
  } catch (error) {

    return 1;
  }
};


async function findNearbyDrivers(center, radiusInM) {
  try {
    const [riderLat, riderLng] = center;

    // Generate geohash bounds for the rider location and radius
    const bounds = geohashQueryBounds([riderLat, riderLng], radiusInM);
    if (!bounds.length) {

      return [];
    }
const promises = bounds.map(([start, end]) =>
  firestore()
    .collection('drivers')
    .orderBy('geohash')
    .startAt(start)
    .endAt(end)
    .limit(5) // 🔥 Add limit per geohash bound
    .get()
);
    // Wait for all queries to resolve
    const snapshots = await Promise.all(promises);

    const matchingDrivers = [];
    snapshots.forEach((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        const { lat, lng, driverId } = data;

        if (!lat || !lng) {

          return;
        }

        // Calculate distance and validate within radius
        const distance = distanceBetween([riderLat, riderLng], [lat, lng]) * 1000; // Convert km to meters

        if (distance <= radiusInM) {
          matchingDrivers.push(data);
        }
      });
    });

    return matchingDrivers;
  } catch (error) {

    throw error;
  }
}
export const sendExpoNotifications = async (expoTokens, message) => {
  const chunks = expoTokens.map((to) => ({
    to,
    sound: "default",
    ...message,
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunks),
    });
  } catch (error) {

  }
};

const shuffleArray = (array) => {
  // Create a copy to avoid mutating the original array
  const shuffled = [...array];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};


export const createDriver = async (updates) => {
  try {
    const response = await axios.post(
      'https://app.share-rides.com/drivers',
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err.response?.data?.error || err.message?.error;

    if (JSON.stringify(errorMessage).includes("duplicate key value")) {
      throw new Error("DuplicateDriverError");
    }
    throw err;
  }
};


export const updateDriver = async (userId, updates) => {
  try {
    // Deep copy updates to avoid modifying the original object passed to the component
    const processedUpdates = { ...updates };

    // --- FIX 1: Stringify vehicle_details ---
    if (processedUpdates.vehicle_details && typeof processedUpdates.vehicle_details === 'object') {
      processedUpdates.vehicle_details = JSON.stringify(processedUpdates.vehicle_details);
    }

    // --- FIX 2: Stringify languages_spoken ---
    if (Array.isArray(processedUpdates.languages_spoken)) {
      processedUpdates.languages_spoken = JSON.stringify(processedUpdates.languages_spoken);
    }

    const response = await axios.patch(`https://app.share-rides.com/drivers/${userId}`, processedUpdates); // Use processedUpdates

    // ... handle success ...
  } catch (err) {
    console.error('Frontend updateDriver error:', err.response?.data || err.message); // More detailed error logging
    // ... handle error ...
  }
};

const updateRide = async (rideId, updates) => {
  try {
    const response = await axios.patch(`https://app.share-rides.com/rides/${rideId}`, updates);

  } catch (err) {

  }
};

export const createRide = async (updates) => {
  const maxRetries = 10;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      const response = await axios.post('`https://app.share-rides.com/rides', updates);

      return response.data;
    } catch (err) {
      if (err.isAxiosError && err.message === 'Network Error') {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s cap

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw err; // Re-throw non-network errors
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: Network Error`);
};

export const driverProfile = async (driverId, type) => {
  //console .log("driverId, type", driverId, type)
  const maxRetries = 10;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      //console .log(`https://api.share-rides.com/drivers/${driverId}?type=${type}`)
      const response = await axios.get(`https://app.share-rides.com/drivers/${driverId}?type=${type}`);
console.log("response.data", response.data)
      return response.data;
    } catch (err) {
      if (err.isAxiosError && err.message === 'Network Error') {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s cap

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw err; // Re-throw non-network errors
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: Network Error`);
};

const formatToInternational = (phoneNumber) => {
  let formattedPhoneNumber = phoneNumber;

  // Convert 0-prefixed local number to +251 format
  if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
    formattedPhoneNumber = '+251' + phoneNumber.slice(1); // Replace '0' with '+251'
  }

  // Return the original if it's already in +251 format
  return formattedPhoneNumber;
};
export const handleProcessPayment = async (
  amountInETB,
  userId,
  context,
  shareUsername,
  phoneNumberStore,
  setLoading
) => {
  console.log("amountInETB, userId, context, shareUsername, phoneNumberStore", amountInETB, userId, context, shareUsername, phoneNumberStore);

  if (!userId) {
    Alert.alert('Authentication Required', 'Please log in to send a tip.');
    return;
  }

  if (!amountInETB || parseFloat(amountInETB) <= 0) {
    Alert.alert('Invalid Amount', 'Please select a tip package or enter a positive custom amount.');
    return;
  }

  if (setLoading) setLoading(true);

  try {
    const response = await fetch("https://app.share-rides.com/api/payment/initiate", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
     //   amount: parseFloat(amountInETB),
        amount: 1,
        context,
        referenceId: `${shareUsername}`,
        tipRecipientId: userId,
        phone: formatToInternational(phoneNumberStore)
      }),
    });

    const text = await response.text();
    console.log("Raw response from server:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("JSON parse failed:", jsonError);
      Alert.alert("Server Error", "The server did not return valid JSON.");
      return;
    }

    if (response.ok && data?.paymentUrl) {
      const supported = await Linking.canOpenURL(data.paymentUrl);
      if (supported) {
        await Linking.openURL(data.paymentUrl);
        Alert.alert('Complete Payment', 'Please complete your payment on the SantimPay page.');
      } else {
        Alert.alert('Error', `Cannot open this URL: ${data.paymentUrl}`);
      }
    } else {
      console.error('Payment Initiation Failed', data?.error);
      Alert.alert('Payment Initiation Failed', data?.error || 'Something went wrong.');
    }

  } catch (error) {
    console.error('Frontend Payment Error:', error);
    Alert.alert('Network Error', 'Could not connect to the server. Please try again.');
  } finally {
    if (setLoading) setLoading(false);
  }
};


const emergencyButton = async (profileImageUrl, carModel, name, pnumber, plateNumber, user ) => {
  Alert.alert(
    "Confirm Emergency",
    "Are you sure you want to send an emergency alert to nearby drivers?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes, Alert",
        onPress: async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert("Please enable location access.");
            return;
          }
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;

          const address = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          const posterAddress = `${address[0].name}, ${address[0].region}`;

  // Create a new post
  const now = Math.floor(Date.now() / 1000);
  const createdAt = Math.floor(Date.now() / 1000);
  const author = name;
  const coordinates = [latitude || 0, longitude || 0]; // 🔥 Combine lat & lon into an array
  const posterLocation = posterAddress
const posterId = user.uid
const authorAvatar = profileImageUrl || user?.photoURL
  const newPost = {
    communityPost: "emergency", createdAt, author, plateNumber: plateNumber || "00000",
    coordinates, posterLocation, authorAvatar, posterId
  };

  try {
    // Save post to DynamoDB
    const params = {
      TableName: "DriverEmergency",
      Item: newPost,
    };

    await dynamoDB.put(params).promise(); // 🔥 Save post to DynamoDB

  } catch (error) {
//   Alert.alert("Error", "Failed to create post. Please try again.");
  }

          let nearbyDrivers;
          try {
            const response = await fetch(`https://app.share-rides.com/nearby-drivers?lat=${latitude}&lng=${longitude}&radius=5000`);
            nearbyDrivers = await response.json();
//console.log("nearbyDrivers", response)
//console.log("nearbyDrivers", nearbyDrivers)
          } catch (error) {

            return;
          }

          const tokens = nearbyDrivers.drivers.map((driver) => driver.expo_token).filter(Boolean);
          if (tokens.length > 0) {
            await sendExpoNotifications(tokens, {
              title: "🚨 Emergency Alert",
              body: "A nearby rider needs urgent help. Tap to assist.",
              data: { type: "emergency", profileImageUrl, carModel, name, pnumber, userLocation: { latitude, longitude }, plateNumber },
            });

          } else {

          }

    //       if (!rideRequestId) {
    // Alert.alert("Emergency action cannot proceed; ride details are missing.");
    //         return;
    //       }

          try {
        const response = await retryPostLocation(
          `https://api.share-rides.com/drivers/${driverId}/location`, 
          { lat: location.coords.latitude, lng: location.coords.longitude }
        );
          } catch (error) {
         //  Alert.alert("Failed to send emergency location. Please try again.", `${error}`);
          }
        },
      },
    ],
    { cancelable: true }
  );
};
  

export { haversineDistance, getDistance, findNearbyDrivers, shuffleArray, updateRide, emergencyButton };
