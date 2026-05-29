import { create } from "zustand";
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";
import { router, useLocalSearchParams } from "expo-router";
import axios from 'axios';
import * as Location from "expo-location";
import firestore from '@react-native-firebase/firestore';
import { useCreditbalanceStore, usePioneerStore } from "@/store";
import { Text, View, TouchableOpacity, Image, TextInput, Alert } from "react-native";
import { db, fetchUserDataRecharge } from "@/lib/localDB"; 
import auth from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const getGeocodedAddress = async (lat, lng) => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY; // Make sure to secure this key
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const results = response.data.results;
    return results.length > 0 ? results[0].formatted_address : 'Unknown address';
  } catch (error) {

    return 'Unknown address'; // Fallback in case of error
  }
};

export const useRideStore = create((set, get) => ({
  rideRequests: [],
  selectedRideRequest: null,
// Handle incoming ride request push notifications
  handleRideRequestNotification: async (remoteMessage) => {

    let requestData = remoteMessage; // No need to parse the whole object

    try {
      // // Only parse `requestData.message` if it's a JSON string
      // if (typeof requestData.message === "string") {
      //   requestData = { ...requestData, ...JSON.parse(requestData.message) };
      // }

    } catch (error) {

      return;
    }

  // Now you can access requestData fields normally



    let formattedRequest;


if (requestData.rideType === "solo") {
const { requestId, origin, destination, destinationLocation, rideType, userLocation, destinationAddress, createdAt, estimatedPrice, pnumber, name, message, expoToken, profileImage, tip} = requestData;

const serverTimestamp = new Date(createdAt.seconds * 1000); // Convert to JS Date
const utcHours = serverTimestamp.getUTCHours(); // Get UTC hour
const utcMinutes = serverTimestamp.getUTCMinutes(); // Get UTC minutes
const adjustedHours = (utcHours + 3) % 24; // Convert to UTC+3
const formattedTime = `${adjustedHours}:${utcMinutes < 10 ? "0" : ""}${utcMinutes}`;

          const userFormatted = await Location.reverseGeocodeAsync({
            latitude: userLocation[0],
            longitude: userLocation[1],
          });
          const userFormattedAddress = userFormatted[0].formattedAddress;
 formattedRequest = {
      id: requestId,
      type: rideType,
      destinationAddress,
      userFormattedAddress,
      formattedTime,
        userLocation: origin,
        destinationLocation: destination,
      estimatedPrice,
      message,
      expoToken,
      tip
    };
        } else if (requestData.rideType === "corider") {
          const { dropOffPoints, createdAt, estimates, message, expoToken } = requestData;
          const userFormatted = await Location.reverseGeocodeAsync({
            latitude: dropOffPoints[0].origin[0],
            longitude: dropOffPoints[0].origin[1],
          });
          const userFormattedAddress = userFormatted[0].formattedAddress;

const serverTimestamp = new Date(createdAt.seconds * 1000); const utcHours = serverTimestamp.getUTCHours(); 
const utcMinutes = serverTimestamp.getUTCMinutes(); const adjustedHours = (utcHours + 3) % 24; 
const formattedTime = `${adjustedHours}:${utcMinutes < 10 ? "0" : ""}${utcMinutes}`;

          const formattedDropOffPoints = await Promise.all(
            dropOffPoints.map(async (point) => {
              const add = await Location.reverseGeocodeAsync({
                latitude: point.dropOff[0],
                longitude: point.dropOff[1],
              });
              const address = add[0].district + ", " + add[0].formattedAddress;
              return { ...point, formattedAddress: address };

            })
          );
     const sumTotal = estimates ? estimates.reduce((acc, curr) => acc + curr + 30, 0) : 0;         
    // Format request for UI
 formattedRequest = {
      id: requestData.requestId,
      type: requestData.rideType,
formattedDropOffPoints,
            userFormattedAddress,
            dropOffPoints,
    formattedTime,
      sumTotal,
      message,
    };
}    
    // Add the new request to the list (only show 2 at a time)
     set((state) => {
  const updatedRequests = [formattedRequest, ...state.rideRequests].slice(0, 2);

  // Mark as not attempted yet
  const updatedFormattedRequest = { ...formattedRequest, attempted: false };
    
// Auto-remove after 2 minutes
  setTimeout(async () => {
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

    const currentRequest = get().rideRequests.find(req => req.id === updatedFormattedRequest.id);
    
    if (currentRequest && !currentRequest.attempted) {

      await db.runAsync(
        `INSERT INTO ride_skips (driverId, rideId, timestamp) VALUES (?, ?, ?);`,
        [driverId, updatedFormattedRequest.id, Date.now()]
      );
    } else {

    }

    set((currentState) => ({
      rideRequests: currentState.rideRequests.filter((req) => req.id !== updatedFormattedRequest.id),
    }));
  }, 120000);
return { rideRequests: [updatedFormattedRequest, ...state.rideRequests.slice(0, 1)] };
  });
  },

  // Accept a ride request
  acceptRideRequest: async (tierType, isPioneer, requestId, driverId, creditBalance, isDocumentsSent, originAddress, formattedTime, setTip, tip, approvedRecharge ) => {

    try {
    //    if (!isPioneer) {
    //   if (creditBalance < 5) {
    //     Alert.alert("Insufficient Credit", "Please recharge your credit to start accepting jobs. Thanks!");
    //     return;
    //   }
    // }

   // if(!isDocumentsSent){
   //  Alert.alert("Docs not received", "Please send your documents @shareDriversSupport on telegram. Thanks!")
   //  return;
   // }  
//     const latestRechargeDate = new Date(approvedRecharge.rechargeDate * 1000); // Convert Unix timestamp to JS Date
//     const currentDate = new Date();
//     // Check tier type and validate last recharge date
//     const tierLimits = {
//       premium: 4, 
//       standard: 2, 
//       basic: 1, 
//       noBenefits: 0 
//     };
// if (isPioneer) {
//     if (tierType in tierLimits) {
//       const allowedMonths = tierLimits[tierType];
//       if (allowedMonths === 0) {
//         Alert.alert("Ride Blocked", "Your current plan does not allow accepting rides.");
//         return;
//       }
//       latestRechargeDate.setMonth(latestRechargeDate.getMonth() + allowedMonths);

//       if (currentDate > latestRechargeDate) {
//         Alert.alert("Recharge Expired", `Your last recharge is older than ${allowedMonths} month(s). Please recharge to continue.`);
//         return;
//       }
//     }
//   }
    // If all checks pass, proceed with the ride request acceptance

      const driverDoc = await firestore().collection("requests").doc(requestId).get();
    set((state) => ({
      rideRequests: state.rideRequests.map((req) =>
        req.id === requestId ? { ...req, attempted: true } : req
      )
    }));
      if (!driverDoc.exists) return;

      const data = driverDoc.data();
      if (data.acceptedBy) {
          // Mark the request as attempted
    set((state) => ({
      rideRequests: state.rideRequests.map((req) =>
        req.id === requestId ? { ...req, attempted: true } : req
      )
    }));
        set((state) => ({
      rideRequests: state.rideRequests.filter((req) => req.id !== requestId),
    }));
        Alert.alert("Whoops,", "Another driver has taken the job. Accept quickly next time!");

        return;
      }
      setTip(tip);
      router.push({
        pathname: "(root)/begin-ride",
        params: {
          rideRequestId: requestId,
          originLat: data.userLocation[0],
          originLng: data.userLocation[1],
          destLat: data.destinationLocation[0],
          destLng: data.destinationLocation[1],
          originAddress: originAddress || "-",
          destAddress: data.destinationAddress || "-",
          pnumber: data.pnumber || "",
          customerName: data.name || "Passenger",
          requestType: data.type,
          customerId: data.customerId || "",
          requestTime: formattedTime,
          driverSetPrice: data.driverSetPrice ? data.driverSetPrice : false 
        },
      });

      await firestore().collection("requests").doc(requestId).update({
        status: "accepted",
        acceptedBy: driverId,
      });

      // Remove request from the list since it's accepted
      set((state) => ({
        rideRequests: state.rideRequests.filter((req) => req.id !== requestId),
        selectedRideRequest: null,
      }));

    } catch (error) {

    }
  },

// Action to accept a shared ride request
  acceptSharedRideRequest: async ( tierType, isPioneer, requestId, driverId, dropOffPoints, creditBalance, isDocumentsSent, formattedTime, approvedRecharge ) => {
    try {
     
    // if (!isPioneer) {
    //   if (creditBalance < 5) {
    //     Alert.alert("Insufficient Credit", "Please recharge your credit to start accepting jobs. Thanks!");
    //     return;
    //   }
    // }

   // if(!isDocumentsSent){
   //  Alert.alert("Docs not received", "Please send your documents @shareDriversSupport on telegram. Thanks!")
   //  return;
   // } 
//   const latestRechargeDate = new Date(approvedRecharge.rechargeDate * 1000); // Convert Unix timestamp to JS Date
//   const currentDate = new Date();
//     // Check tier type and validate last recharge date
//     const tierLimits = {
//       premium: 4, 
//       standard: 2, 
//       basic: 1, 
//       noBenefits: 0 
//     };
// if (isPioneer) {
//     if (tierType in tierLimits) {
//       const allowedMonths = tierLimits[tierType];
//       if (allowedMonths === 0) {
//         Alert.alert("Ride Blocked", "Your current plan does not allow accepting rides.");
//         return;
//       }
//       latestRechargeDate.setMonth(latestRechargeDate.getMonth() + allowedMonths);

//       if (currentDate > latestRechargeDate) {
//         Alert.alert("Recharge Expired", `Your last recharge is older than ${allowedMonths} month(s). Please recharge to continue.`);
//         return;
//       }
//     }
//   }

 const driverDoc = await firestore().collection("requests").doc(requestId).get();
      set((state) => ({
      rideRequests: state.rideRequests.map((req) =>
        req.id === requestId ? { ...req, attempted: true } : req
      )
    }));
    if (!driverDoc.exists) {
      return;  }
    data = driverDoc.data();
    if (data.acceptedBy){
        // Mark the request as attempted
        set((state) => ({
      rideRequests: state.rideRequests.filter((req) => req.id !== requestId),
    }));
      Alert.alert("Whoops,", "Another driver has taken the job.. accept quickly next time" )
      return
    }

      router.push({
        pathname: "(root)/rideshare/begin-ride",
        params: {
          requestTime: formattedTime,
          rideRequestId: requestId,
          dropOffPoints: JSON.stringify(dropOffPoints),
        },
      });
    await firestore().collection("requests").doc(requestId).update({
      status: "accepted",
      acceptedBy: driverId,
    });

const sendPickupNotifications = async () => {
  try {
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

const name = user?.displayName

    // Send general pickup notification to passengers
    const messages = dropOffPoints.map((passenger) => ({
      to: passenger.expoToken, // Ensure each passenger has a valid Expo push token
      sound: "default",
      title: "Driver on the way!",
      body: `Driver ${name} has accepted your group and is on the way!`,
      data: { driverId, type: "shared_driver_accepted" },
    }));
    // Send notifications using Expo's API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

  } catch (error) {

  }
};
sendPickupNotifications()
      set({ selectedRideRequest: null });

    } catch (error) {

    }
  },

rejectRideRequest: (requestId) => {
  set((state) => {
    const updatedRideRequests = state.rideRequests.filter((request) => request.id !== requestId);
    return { rideRequests: updatedRideRequests };
  });
},

  // Remove request when another driver takes it
  handleRideTakenNotification: async (remoteMessage) => {
    const { requestId } = remoteMessage.data;

    set((state) => ({
      rideRequests: state.rideRequests.filter((req) => req.id !== requestId),
    }));
  },

  // Clear all ride requests
  clearRideRequests: () => {
    set({ rideRequests: [], selectedRideRequest: null });
  },
}));


async function updateDriverGeohash(userId, lat, lng) {
  const hash = geohashForLocation([lat, lng]);
  try {
    await firestore().collection("drivers").doc(userId).update({
      geohash: hash,
      lat: lat,
      lng: lng,
      time: firestore.Timestamp.now(),
    });

  } catch (error) {

  }
}

const uploadLocation = async (collection, docId, lat, long) => {
  //Add a new document in the specified collection with the given document ID
await firestore().collection(collection).doc(docId).update({
  location: new firestore.GeoPoint(lat, long),
  time: firestore.Timestamp.now(),
  driverId: docId,
});
};

const savePreferredLocationToFirestore = async (location) => {
  try {
   if(location.length>4){
Alert.alert("whoops", "you entered one too many locations!")
return
   } 

    const driverRef = firestore().collection('drivers').doc(driverId);
    
    await driverRef.update({
      preferredLocations: location,
    });

  } catch (error) {

  }
};

async function findNearbyDrivers(center, radiusInM, type) {
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
        // .where('seatType', '==', type)
        .orderBy('geohash')
        .startAt(start)
        .endAt(end)
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


export { uploadLocation, updateDriverGeohash, savePreferredLocationToFirestore};

