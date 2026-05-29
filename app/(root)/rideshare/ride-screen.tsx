import { View, Text, Button, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from "react-native-maps";
import { PROVIDER_GOOGLE } from "react-native-maps";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useLocationStore, useLanguageStore, useDriverStatsStore, usePioneerStore, useCreditbalanceStore, usePhoneNumberStore, useTrackStore } from "@/store";
import { useEffect, useState } from "react";
import * as Location from 'expo-location';
import { haversineDistance, findNearbyDrivers, sendExpoNotifications, updateRide, emergencyButton } from "@/lib/utils"
import axios from 'axios'
import MapViewDirections from "react-native-maps-directions";
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { db, fetchLocalDriverData, updateLocalCountData, checkAndResetTripCounts, handleCommissionDeduction, saveRideToLocalHistory } from "@/lib/localDB";
import {rideTranslations} from "@/lib/translations"
import Map from "@/components/Map";
import * as Notifications from "expo-notifications";
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";
import { dynamoDB } from '@/lib/modals'; 
import { updateDriverGeohash } from '@/firebaseconf';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { retryPostLocation } from '@/backgroundTasks';

const RideScreen = () => {
const dbFirestore = getFirestore();
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

const { phoneNumberStore, carModel, seatNumber,  profileImageUrl, plateNumber } =  usePhoneNumberStore() 
  const { userLatitude, userLongitude, userAddress } = useLocationStore();
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [previousFares, setPreviousFares] = useState(0);
  const [previousDropOff, setPreviousDropOff] = useState(null);
  const [previousDropTime, setPreviousDropTime] = useState(null);
  const { requestTime, rideRequestId, dropOffPoints, coriderPickupData, startTime, trackingState, originLng, originLat } = useLocalSearchParams();
  const { language, setLanguage } = useLanguageStore();  
  const t = rideTranslations[language];
   const { weeklyTripsCount, weeklyStreetPickupCount, monthlyTripsCount, weeklyFareTotal, monthlyFareTotal, dailyTripsCount, dailyFareTotal, setDriverStats } = useDriverStatsStore();
  const { track, resetTrack } = useTrackStore();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [pickedUpRiders, setPickedUpRiders] = useState([]);
  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const [showFareModal, setShowFareModal] = useState(false); // Modal visibility state
 const [totalFare, setTotalFare] = useState(0);
const { tierType, setTierType } = usePioneerStore();
const { creditBalance, setCreditBalance } = useCreditbalanceStore()
const [completedOnce, setCompletedOnce] = useState(false);

const [baseFareSharedAdmin, setBaseFareSharedAdmin] = useState(140); 
const [distanceRateAdmin, setDistanceRateAdmin] = useState(18); 
const [nightRateAdmin, setNightRateAdmin] = useState(21); 
const [timeRateAdmin, setTimeRateAdmin] = useState(1.8); 
const [vatSharedAdmin, setVatSharedAdmin] = useState(0)

const [totalFaretoshow, setTotalFaretoshow] = useState(0);
  // State to store fare shown in the modal
let totalE = 0
const [totalEarning, setTotalEarning] = useState(0);
  const parsedDropOffPoints = JSON.parse(dropOffPoints);
  const parsedCoriderPickupData = JSON.parse(coriderPickupData);
  const [remaining, setRemaining] = useState(3);

const [ parsedCoriderPickupDataDB, setParsedCoriderPickupDataDB ] = useState(parsedCoriderPickupData)

async function sendNotification(expoToken, farePrice) {
  const message = {
    to: expoToken, 
    sound: "default",
    title: `Ride concluded, ${farePrice} Birr`,
    body: `Your shared ride has ended with a fare of: ${farePrice} Birr`,
    data:  { farePrice }
  };

  await axios.post("https://exp.host/--/api/v2/push/send", message);
}
 async function fetchAdminPriceData() {

//const { baseFareShared, distanceRate, nightRate, timeRate, VATShared } = adminData;

setBaseFareSharedAdmin(150); setDistanceRateAdmin(20); setNightRateAdmin(22); 
setTimeRateAdmin(2.25); setVatSharedAdmin(0.1)}

  const baseFare = parseFloat(baseFareSharedAdmin) / parsedCoriderPickupData.length;

useEffect(() => {
  const updateLocation = async () => {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
      await updateDriverGeohash(driverId, location.coords.latitude, location.coords.longitude);
}
  }  
if(track){
 
    updateLocation()
resetTrack()
}
   }, [track]);


const updateDriverDoc = async () => {
  try {
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

checkAndResetTripCounts(driverId);
    const localDriverData = await fetchLocalDriverData(driverId);

    const {
      creditAmount, kmPrice, weeklyFareTotal = 0, weeklyTripsCount = 0 , weeklyStreetPickupCount =  0 , monthlyTripsCount = 0 ,
      monthlyFareTotal = 0, detailsFilled, documentsSent, pnumber, nightKilometerPrice, pioneer
    } = localDriverData;

     // Compute the updated values
    const updatedRideSummary = {
      weeklyTripsCount: parseFloat(weeklyTripsCount || 0) + 1,
      dailyTripsCount: parseFloat(dailyTripsCount || 0) + 1,
      dailyFareTotal: parseFloat(dailyFareTotal || 0) + totalFaretoshow,
      monthlyTripsCount: parseFloat(monthlyTripsCount || 0) + 1,
      weeklyFareTotal: parseFloat(weeklyFareTotal || 0) + totalFaretoshow,
      monthlyFareTotal: parseFloat(monthlyFareTotal || 0)  + totalFaretoshow,
    };

   await updateLocalCountData(driverId, updatedRideSummary);

const requestType = "corider";

        const rideDetails = {
      id: rideRequestId,
      driverId,
      type: requestType, 
      originAddress: userAddress || "Origin",
      destinationAddress: "Drop off",
      userLocation: {lat: userLatitude, lng: userLongitude} || { lat: 8.7, lng: 38.7 },
      destinationLocation: previousDropOff || { lat: 8.699, lng: 38.699 },
      farePrice: totalFaretoshow || 0,
      timeTaken: previousDropTime - startTime || "Unknown",
      createdAt: new Date().toISOString(),
      CoriderPickupData: parsedCoriderPickupDataDB
    };

    await saveRideToLocalHistory(rideDetails);
  } catch (error) {

  }
};

  useEffect(() => {
    setTracking(trackingState);
  }, [trackingState]);

useEffect(() => {
  if (parsedCoriderPickupData) {
    setRemaining(parsedCoriderPickupData.length);

    const pickedNumbers = parsedCoriderPickupDataDB
      .filter(rider => rider.endLocation && rider.fare != null)
      .map(rider => rider.pnumber);

    setPickedUpRiders(pickedNumbers);
  }

  setParsedCoriderPickupDataDB(parsedCoriderPickupDataDB);
  fetchAdminPriceData();
}, []); // Runs only once


  const handleEndRide = async (riderName, pnumber, expoToken) => {
    setLoading(true)
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Enable your location!");
      return;
    }
  const remainingCount = parsedCoriderPickupDataDB.filter(
    rider => !rider.endLocation || rider.fare === undefined || rider.fare === null
  ).length;

    let currentLocation = await Location.getCurrentPositionAsync({});
    const endLat = currentLocation.coords.latitude;
    const endLng = currentLocation.coords.longitude;

    const previousLatLng = previousDropOff || { lat: originLat, lng: originLng };
    const previousTime = previousDropTime || startTime;

  const { distance } = await fetchDistanceAndTime(parseFloat(previousLatLng.lat), parseFloat(previousLatLng.lng), parseFloat(endLat), parseFloat(endLng));
    const endTime = new Date().getTime();
    const timeTaken = (endTime - previousTime) / 1000 / 60;

const riderData = parsedCoriderPickupData.find(rider => rider.pnumber === pnumber);
const riderPenalty = riderData ? riderData.penalty : 0;

const YOUR_LAMBDA_URL = process.env.EXPO_PUBLIC_YOUR_LAMBDA_URL;
const isNightTime = (requestTime || startTime) >= 19.5 || (requestTime || startTime) < 12; // Night time condition check
 const calculationParams = {
    distance,
    time: timeTaken,
    passengersOriginal: parsedCoriderPickupData.length,
    passengers: remainingCount,
    isNight: isNightTime,
    previousFares, carModel, seatNumber
  };

  let lambdaSuccess = false;
  let calculatedFare = null;
  let distanceFare = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {

      const lambdaResponse = await fetch(YOUR_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationParams)
      });

      if (!lambdaResponse.ok) {
        throw new Error(`Lambda call failed with status ${lambdaResponse.status}`);
      }

      const result = await lambdaResponse.json();
      calculatedFare = result.calculatedFare;
      distanceFare = result.distanceFare;
      lambdaSuccess = true;

      break; // Exit loop after successful call
    } catch (err) {

      if (attempt === 3) {

      }
    }
  }

  if (!lambdaSuccess) {
    const localFare = calculateConsistentFare(distance, timeTaken, remainingCount, isNightTime);
    calculatedFare = localFare.calculatedFare;
    distanceFare = localFare.distanceFare;

  }
 
sendNotification(expoToken, calculatedFare);
 

let updatedData;
setParsedCoriderPickupDataDB(prevData => {
  const newData = [...prevData];
  const riderIndex = newData.findIndex(rider => rider.pnumber === pnumber);
  if (riderIndex !== -1) {
    newData[riderIndex] = {
      ...newData[riderIndex],
      endLocation: { lat: endLat, lng: endLng },
      fare: calculatedFare,
    };
    updatedData = newData;
  }
  return newData;
});
updateRide(rideRequestId, {
  corider_pickup_data: updatedData,
  status: "riderCompleted"
});
// Then use updatedData to update the SQLite DB
try {
  await db.runAsync(
    `UPDATE active_shared_ride SET coriderPickupData = ?, remainingPassengers = remainingPassengers - 1 WHERE rideId = ?;`,
    [JSON.stringify(updatedData), rideRequestId]
  );

} catch (dbError) {

}
 
 
    setTotalFare(calculatedFare); // Set the fare to be displayed in the modal
    setShowFareModal(true); // Show modal with fare

setShowFareModal(true);
    setPreviousFares(prev => prev + distanceFare);
    setPreviousDropOff({ lat: endLat, lng: endLng });
    setPreviousDropTime(endTime);
    setPickedUpRiders((prev) => [...prev, pnumber]);
setTotalEarning(prev => prev + calculatedFare)

    if (remaining - 1 === 0) {

    }
    setLoading(false)    
  };

const AVERAGE_SPEED_KMPH = 35;
const fetchDistanceAndTime = async (
  userLatitude, userLongitude, driverLocationLat, driverLocationLng ) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json`,
      {
        params: {
          origins: `${userLatitude},${userLongitude}`,
          destinations: `${driverLocationLat},${driverLocationLng}`,
          key: GOOGLE_API_KEY,
        },
      }
    );

    const data = response.data;
    const distance = data.rows[0].elements[0].distance.value;
    const timeTaken = data.rows[0].elements[0].duration.value;

    return { distance, timeTaken };
  } catch (error) {

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
  }
};

  // Revised calculation function
const calculateConsistentFare = ( distance, time, passengers, isNight) => {
  // Use fixed-point arithmetic
  const preciseRound = (num, decimals = 2) => 
    Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
 
  const ratePerKm = isNight ? nightRateAdmin/passengers : distanceRateAdmin/passengers;
  
  const distanceCost = preciseRound((distance / 1000) * ratePerKm);
  const timeCost = preciseRound(time * (timeRateAdmin/passengers));
  
  const subtotal = preciseRound(baseFare + distanceCost + timeCost + previousFares);
  const total = preciseRound(subtotal * (1 + vatSharedAdmin));
 
  return { distanceFare: preciseRound(distanceCost + timeCost), calculatedFare: Math.ceil(total) }; // Final rounding only once
};

const totalComplete = async () => {
const rideRef = doc(dbFirestore, 'requests', rideRequestId);
const minimizedPickupData = parsedCoriderPickupDataDB.map(rider => ({
  endLocation: rider.endLocation,
  name: rider.name,
  fare: rider.fare,
  pickupLat: rider.pickupLat,
  pickupLng: rider.pickupLng,
  pickupTime: rider.pickupTime,
}));

await updateDoc(rideRef, {
  status: "completed",
  CoriderPickupData: minimizedPickupData,
  farePrice: totalFaretoshow,
  startTime,
});
}

const completionUpdate = async () => {
 // Update SQLite with new details
    try {
      await db.runAsync(
        `UPDATE active_shared_ride SET status = 0 WHERE rideId = ?;`,
        [rideRequestId]
      );

    } catch (dbError) {

    }
}

useEffect(() => {
totalE = totalFare + totalEarning
 
  // Check that all riders have both `fare` and `endLocation`
  const allRidersCompleted = parsedCoriderPickupDataDB.every(
    rider => rider.fare != null && rider.endLocation != null
  );

  if ( allRidersCompleted && !completedOnce) {

const totalFareFromDB = parsedCoriderPickupDataDB.reduce((sum, rider) => sum + (rider.fare || 0), 0);
setTotalFaretoshow(totalFareFromDB);    
    totalComplete();
    updateDriverDoc();
    completionUpdate();
    handleCommissionDeduction(totalFareFromDB, tierType, setCreditBalance, driverId);
    setCompletedOnce(true); // Prevent reruns
  updateRide(rideRequestId, {
  destination_location: { lat: parsedCoriderPickupDataDB[0].endLocation.lat, lng: parsedCoriderPickupDataDB[0].endLocation.lng },
  fare: totalFareFromDB,
  corider_pickup_data: parsedCoriderPickupDataDB,
  status: "completed"
});
  }
}, [remaining, parsedCoriderPickupDataDB]);

  return (
<View style={{ flex: 1 }}>
<Map
  dropOffPoints={parsedDropOffPoints}
  googlePlacesApiKey={googlePlacesApiKey}
  origin={{
    latitude: parsedDropOffPoints[0]?.origin?.[0],
    longitude: parsedDropOffPoints[0]?.origin?.[1],
  }}
  destination={{
    latitude: parsedDropOffPoints[0]?.dropOff?.[0],
    longitude: parsedDropOffPoints[0]?.dropOff?.[1],
  }}
  rideType="Shared"
/>
      <TouchableOpacity 
        onPress={() => emergencyButton(profileImageUrl, carModel, user?.displayName, phoneNumberStore, plateNumber, user)}
        className="bg-red-500 rounded-xl py-4 flex-row items-center justify-center space-x-2 mb-2 ml-3"
        style={{
          shadowColor: '#ef4444',
          width: "40%",
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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 3 }}
    >
      <View className="mt-3">
      {loading ? (
      <ActivityIndicator
        size="large"
        color="#800020"
        style={{ marginTop: 20 }}
      />
    ) : (
        parsedCoriderPickupData.map(({ name, pnumber, expoToken }) => (
          <TouchableOpacity
            key={pnumber}
            style={{
              backgroundColor: pickedUpRiders.includes(pnumber) ? '#64748b' : '#20DDDD',
              paddingVertical: 15,
              marginBottom: 20,
            }}
            onPress={() => handleEndRide(name, pnumber, expoToken)}
            disabled={pickedUpRiders.includes(pnumber)}
          >
            <Text className={`text-white text-center font-semibold ${pickedUpRiders.includes(pnumber) ? 'line-through' : 'font-JakartaBold'}`}
             style={{ color: 'white', textAlign: 'center', fontSize: 15, }}>
              {pickedUpRiders.includes(pnumber) ? `Droped Off ${name}` : `End Ride for ${name}`}
            </Text>
          </TouchableOpacity>
        ))
 )}
      </View>
 </ScrollView>
    { completedOnce && (
        <View style={{
          position: "absolute", bottom: "5%", left: 0, right: 0,  padding: 10,  backgroundColor: '#20DDDD',
          borderRadius: 5, alignItems: "center" }}>
          <Text className="text-center font-JakartaBold" style={{ color: "white", fontSize: 16 }}>
          </Text>
          <Text className="font-JakartaSemiBold" style={{ color: "white", fontSize: 14 }}>
            Total Earnings So Far:  <Text className="font-JakartaBold text-gray-700" style={{fontSize: 17 }}>{totalFaretoshow} Birr </Text>
          </Text>
      <TouchableOpacity onPress={() => router.replace("(root)/(tabs)/home")} style={{ padding: 15, width:150, backgroundColor: '#64748b', borderRadius: 5, alignSelf: 'center', marginTop: 34 }}>
        <Text className="font-JakartaBold text-white" style={{ textAlign: "center", size:17 }}> Complete Ride</Text>
      </TouchableOpacity>     
        </View>
      )}      
      {/* Modal to show total fare */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showFareModal}
        onRequestClose={() => setShowFareModal(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View style={{ width: 300, padding: 20, backgroundColor: "white", borderRadius: 10, alignItems: "center" }}>
            <Text className="font-JakartaBold" style={{ fontSize: 18}}>Ride Fare</Text>
            <Text className="font-JakartaMedium" style={{ fontSize: 16, marginVertical: 10 }}>Fare Price: {totalFare.toFixed(2)} Birr</Text>
            <TouchableOpacity
              style={{ marginTop: 15, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#05EADA", borderRadius: 5 }}
              onPress={() => setShowFareModal(false)}
            >
              <Text className="font-JakartaBold text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RideScreen;