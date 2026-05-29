import firestore from '@react-native-firebase/firestore';
import { View, Text, Button, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import Map from "@/components/Map";
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from "react-native-maps";
import { PROVIDER_GOOGLE } from "react-native-maps";
import { useRouter, useLocalSearchParams } from 'expo-router';
import {rideTranslations} from "@/lib/translations"
import { useLocationStore, useDriverkmPriceStore, useDrivernightkmPriceStore, useLanguageStore, usePhoneNumberStore, useTipStore, useTrackStore} from "@/store";
import { useEffect, useState } from "react";
import * as Location from 'expo-location';
import {haversineDistance, calculatePrice, findNearbyDrivers, sendExpoNotifications, createRide, updateRide, emergencyButton } from "@/lib/utils"
import MapViewDirections from "react-native-maps-directions";
import axios from 'axios'
import functions from '@react-native-firebase/functions'
import { db, fetchLocalAdminData, handleCommissionDeduction } from "@/lib/localDB";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";
import { dynamoDB } from '@/lib/modals'; 
import { updateDriverGeohash } from '@/firebaseconf';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { retryPostLocation } from '@/backgroundTasks';

const RideScreen = () => {
const { tip, setTip, resetTip } = useTipStore()
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const { track, resetTrack } = useTrackStore();

  const { requestTime, rideRequestId, startTime, trackingState, originLng, originLat, destLat, destLng, requestType, customerId, driverSetPrice, customerPhone } = useLocalSearchParams(); // Get rideRequestId passed from the previous screen
  const { userLatitude, userLongitude, userAddress, setDestinationLocation} = useLocationStore();
 
const { kmPriceStore, setKmPriceStore } = useDriverkmPriceStore()
const { nightkmPriceStore, setNightkmPriceStore } = useDrivernightkmPriceStore()
const [loading, setLoading] = useState(false);
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

const { profileImageUrl, plateNumber } =  usePhoneNumberStore()  
  const { language, setLanguage } = useLanguageStore();  
  const t = rideTranslations[language];
const router = useRouter();
    const [location, setLocation] = useState(null);
const [isDriverSet, setIsDriverSet] = useState(false);

    const [prevLocation, setPrevLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
//set the tracking to true with the "trackingState" variable from th previous begin ride screen
const { phoneNumberStore, carModel, seatNumber} =  usePhoneNumberStore() 
const [baseFareAdmin, setBaseFareAdmin] = useState(120); 
const [distanceRateAdmin, setDistanceRateAdmin] = useState(18); 
const [nightRateAdmin, setNightRateAdmin] = useState(21); 
const [timeRateAdmin, setTimeRateAdmin] = useState(1.8); 
const [vatAdmin, setVatAdmin] = useState(15)

  const formatTime = (timeInMins) => {
    const hours = Math.floor(timeInMins / 60);
    const minutes = Math.floor((timeInMins % 60));
    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
  };
 
  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

useEffect(() => {
setIsDriverSet(driverSetPrice)
  }, [driverSetPrice]);

useEffect(() => {
   
    setTracking(trackingState); // Set tracking from the previous screen's state
  }, [trackingState]);

useEffect(() => {
  const updateLocation = async () => {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
          try {
        const response = await axios.post(
          `https://app.share-rides.com//drivers/${driverId}/location`, 
          { lat: location.coords.latitude, lng: location.coords.longitude }
        );

      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message;

      }
      await updateDriverGeohash(driverId, location.coords.latitude, location.coords.longitude);
}
  }  
if(track){
 
    updateLocation()
resetTrack()
}
   }, [track]);

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY

  const handleEndRide = async (requestTime) => {
setLoading(true)    
let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Enable your location!") }

      let endLocation = await Location.getCurrentPositionAsync({});
 
    const endLat = endLocation.coords.latitude
    const endLng = endLocation.coords.longitude
    setTracking(false)
     const endTime = new Date().getTime();
    const timeTaken = ((endTime - startTime) / 1000 / 60).toFixed(2);
   const { distance } = await fetchDistanceAndTime(parseFloat(originLat), parseFloat(originLng), parseFloat(endLat), parseFloat(endLng))
    const fare = await calculateFare(distance, timeTaken);

const destAddress = await Location.reverseGeocodeAsync({
 latitude: parseFloat(endLat), longitude: parseFloat(endLng)  });
   const address = (`${destAddress[0].name}, ${destAddress[0].region}`) || 'Unknown destination'

  let originAddress = await Location.reverseGeocodeAsync({
          latitude: parseFloat(originLat), longitude: parseFloat(originLng), });
    originAddress= (`${originAddress[0].name}, ${originAddress[0].region}`) || 'Unknown origin'

    router.replace({
      pathname: "(root)/end-ride",
      params: {
        rideRequestId: rideRequestId,
        timeTaken: formatTime(timeTaken),
        farePrice: fare + tip || 0,
        endLat: endLat,
        endLng: endLng,
        originLat: originLat,
        originLng: originLng,
        requestType,
        customerId,
        customerPhone
      },
    });
 

 if(requestType==="streetPickup"){
 // const rideRef = firestore().collection("streetRequests").doc(rideRequestId);
// await rideRef.update({
//   status: "completed",
//   endTime: firestore.Timestamp.now(), // Use Firebase timestamp
//   farePrice: fare,
//   distanceTravelled: distance / 1000, // Distance in kilometers
//   timeTaken: formatTime(timeTaken), // Time in minutes
//   endLocation: [endLat, endLng], // Final location
// });
updateRide(rideRequestId, {
  user_id: customerId,
  driver_id: driverId,
  type: requestType,
  origin_address: originAddress,
  destination_address: address,
  user_location: { lat: originLat, lng: originLng },
  destination_location: { lat: endLat, lng: endLng },
  fare: fare,
  time_taken: formatTime(timeTaken),
  corider_pickup_data: null,
  customer_phone: customerPhone || "Unknown",
  status: "completed"
});
}
else{
       createRide({
    id: rideRequestId,
    user_id: customerId || customerPhone,
    driverId,
    requestType, // 'solo' or 'corider'
    originAddress,
    address,
    originLat,
    originLng,
    endLat,
    endLng,
    farePrice: fare + tip || 0,
    timeTaken: formatTime(timeTaken),
    CoriderPickupData: null,
    customerPhone,
    status: "completed"})

 // Update the ride status in Firestore to "completed"
const rideRef = firestore().collection("requests").doc(rideRequestId);
await rideRef.update({
  status: "completed",
  endTime: firestore.Timestamp.now(), // Use Firebase timestamp
  farePrice: fare + tip || 0,
  distanceTravelled: distance / 1000, // Distance in kilometers
  timeTaken: formatTime(timeTaken), // Time in minutes
  endLocation: [endLat, endLng], // Final location
});
}

try {
  const result = await db.runAsync(
    `UPDATE active_ride SET status = 0 WHERE status = 1;`
  );

  if (result.rowsAffected > 0) {

  } else {

  }
} catch (dbError) {

}

setLoading(false); 
resetTip();
  };

const AVERAGE_SPEED_KMPH = 35;
const fetchDistanceAndTime = async (
  userLatitude, userLongitude, driverLocationLat, driverLocationLng ) => {
 
  // try {
  //   const response = await axios.get(
  //     `https://maps.googleapis.com/maps/api/distancematrix/json`,
  //     {
  //       params: {
  //         origins: `${userLatitude},${userLongitude}`,
  //         destinations: `${driverLocationLat},${driverLocationLng}`,
  //         key: googlePlacesApiKey,
  //       },
  //     }
  //   );

  //   const data = response.data;
  //   const distance = data.rows[0].elements[0].distance.value;
  //   const timeTaken = data.rows[0].elements[0].duration.value;

  //   return { distance, timeTaken };
  // } catch (error) {
  //   console.warn("Google API failed, using fallback. Error:", error.message);

    const rawDistance = distanceBetween(
      [userLatitude, userLongitude],
      [driverLocationLat, driverLocationLng]
    ) * 1000;

    // Dynamic padding: 20% of the raw distance
    const paddedDistance = rawDistance * 1.25;

    const averageSpeedMps = (AVERAGE_SPEED_KMPH * 1000) / 3600;
    const estimatedTime = Math.round(1.5 * (paddedDistance / averageSpeedMps));
 
    return {
      distance: Math.round(paddedDistance),
      timeTaken: estimatedTime,
    };
 // }
};


const calculateFare = async (distance, timeTaken) => {
  // Determine if it's nighttime
  const fallbackTime = new Date();
fallbackTime.setHours(fallbackTime.getHours() - 1); // Subtract 1 hour from current time
const formattedFallbackTime = `${String(fallbackTime.getHours()).padStart(2, "0")}:${String(fallbackTime.getMinutes()).padStart(2, "0")}`;

const finalRequestTime = requestTime || formattedFallbackTime; // Use requestTime if available, otherwise fallback
const isNightTime = finalRequestTime >= "19:30" || finalRequestTime < "06:00";

const functionU = process.env.EXPO_PUBLIC_FUNCTIONU;

const payload = {
  distance, time: timeTaken, requestTime: finalRequestTime, requestType,
  carModel, driverSetPrice, seatNumber, driverPrices: {
    kmPrice: kmPriceStore,
    nightkmPrice: nightkmPriceStore
  }
};

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await fetch(functionU, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.fare; // Return fare if successful

    } catch (error) {
      attempts++;

      if (attempts === 3) {
    const localFare = calculatePrice(distance, timeTaken, finalRequestTime, requestType, carModel, driverSetPrice, seatNumber, {
    kmPrice: kmPriceStore,
    nightkmPrice: nightkmPriceStore })

        return localFare; // Return 0 after 3 failed attempts
      }
    }
  }
};
  const parsedOriginLat = parseFloat(originLat) || parseFloat(userLatitude);
  const parsedOriginLng = parseFloat(originLng) || parseFloat(userLongitude);
  const parsedDestLat = parseFloat(destLat) || parseFloat(userLatitude + 0.0002) || 8.958;
  const parsedDestLng = parseFloat(destLng) || parseFloat(userLongitude + 0.0002) || 38.7;

return (
<>
<Map
  origin={originLat && originLng ? { latitude: parseFloat(originLat), longitude: parseFloat(originLng) } : null}
  destination={destLat && destLng ? { latitude: parseFloat(destLat), longitude: parseFloat(destLng) } : null}
  dropOffPoints={[]}
  googlePlacesApiKey={googlePlacesApiKey}
  rideType= {requestType}
/>


      {loading ? (
    <ActivityIndicator size="large" color="#f97316" />
  ) : (
    <View className="space-y-4 mb-6">
      {/* End Ride Button */}
      <TouchableOpacity
        onPress={() => handleEndRide(requestTime)}
        className=" rounded-xl py-4 shadow-lg bg-teal-500"
        style={{
          shadowColor: '#f97316',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-center space-x-2">
          <MaterialIcons name="stop-circle" size={24} color="white" />
          <Text className="text-white text-xl font-JakartaBold">
          {t.endRide} 🚕
          </Text>
        </View>
      </TouchableOpacity>
          </View>
  )}
      {/* Emergency Button */}
      <TouchableOpacity 
        onPress={() => emergencyButton(profileImageUrl, carModel, user?.displayName, phoneNumberStore, plateNumber, user)}
        className="bg-red-500 rounded-xl py-4 flex-row items-center justify-center space-x-2"
        style={{
          shadowColor: '#ef4444',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Ionicons name="warning" size={20} color="white" />
        <Text className="text-white text-lg font-JakartaSemiBold">
          {t.emergency}
        </Text>
      </TouchableOpacity>
        </>

  );
};
const styles = StyleSheet.create({
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyShadow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  }
});
export default RideScreen;
