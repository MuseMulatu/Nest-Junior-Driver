import firestore from '@react-native-firebase/firestore';
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from 'react';
import * as Location from "expo-location";
import { icons } from "@/constants";
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
//import { httpsCallable } from "@react-native-firebase/functions";
import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import MapView, { Marker } from "react-native-maps";
import { fetchLocalAdminData, fetchLocalDriverData, updateLocalCountData, updateLocalStreetCountData, checkAndResetTripCounts, saveRideToLocalHistory } from "@/lib/localDB";
import { useCreditbalanceStore, useDriverkmPriceStore, useLanguageStore, useDriverStatsStore, usePioneerStore } from "@/store";
import { storeAdminDataLocally, handleCommissionDeduction, fetchUserDataRecharge } from "@/lib/localDB";  
import {endTranslations} from "@/lib/translations"
import * as Linking from 'expo-linking';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const EndScreen = () => {
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;
const hasUpdated = useRef(false);

 const { weeklyTripsCount, weeklyStreetPickupCount, monthlyTripsCount, weeklyFareTotal, monthlyFareTotal, dailyTripsCount, dailyFareTotal, setDriverStats } = useDriverStatsStore();
const { tierType, setTierType } = usePioneerStore();
 const [creditRechargesDB, setCreditRechargesDB] = useState(null);
const { creditBalance, setCreditBalance } = useCreditbalanceStore()

  const { rideRequestId, originLat, originLng, timeTaken, farePrice, endLat, endLng, requestType, customerId, customerPhone } = useLocalSearchParams();
  const [address, setAddress] = useState('');
  const [originAddress, setOriginAddress] = useState('');
const router = useRouter();

  const { language, setLanguage } = useLanguageStore(); 
  const t = endTranslations[language];

  useEffect(() => {
if(farePrice){
 // updateDriverDoc(farePrice);
  handleCommissionDeduction(farePrice, tierType, setCreditBalance, driverId);}
  }, [farePrice]);

const updateDriverDoc = async (farePrice) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated.");
    }
 
    const driverId = user.uid;
    await checkAndResetTripCounts(driverId);
    
    const localDriverData = await fetchLocalDriverData(driverId) || {}; // Ensure it's an object
 
    // Destructure with default values to prevent "Cannot read property of null" errors
const {
  dailyTripsCount = 0,
  dailyFareTotal = 0,
  weeklyFareTotal = 0, 
  weeklyTripsCount = 0, 
   monthlyTripsCount = 0, 
  monthlyFareTotal = 0,
  weeklyStreetPickupCount = 0,
  monthlyStreetPickupCount = 0,
} = localDriverData ?? {}; // Ensures destructuring works even if localDriverData is null

const updatedRideSummary = {
  dailyTripsCount: (parseFloat(dailyTripsCount) || 0) + 1,
  dailyFareTotal: (parseFloat(dailyFareTotal) || 0) + (parseFloat(farePrice) || 0),
  weeklyTripsCount: (parseFloat(weeklyTripsCount) || 0) + 1,
  monthlyTripsCount: (parseFloat(monthlyTripsCount) || 0) + 1,
  weeklyFareTotal: (parseFloat(weeklyFareTotal) || 0) + (parseFloat(farePrice) || 0),
  monthlyFareTotal: (parseFloat(monthlyFareTotal) || 0) + (parseFloat(farePrice) || 0),
};
 
    // Update global state
   setDriverStats({ weeklyTripsCount: updatedRideSummary.weeklyTripsCount, monthlyTripsCount: updatedRideSummary.monthlyTripsCount, weeklyFareTotal: updatedRideSummary.weeklyFareTotal,
  monthlyFareTotal: updatedRideSummary.monthlyFareTotal})

    await updateLocalCountData(driverId, updatedRideSummary);

    if (requestType === "streetPickup") {
        const updatedStRideSummary = {
      weeklyStreetPickupCount: parseFloat(weeklyStreetPickupCount) + 1,
      monthlyStreetPickupCount: parseFloat(monthlyStreetPickupCount) + 1,
    };
// console.log("updatedStRideSummary", updatedStRideSummary)
      updateLocalStreetCountData(driverId, updatedStRideSummary);
      setDriverStats(parseFloat(weeklyStreetPickupCount) + 1);
    }

  } catch (error) {

  }
};

const saveHistory = async () => {
    // Save the ride to local history
    const rideDetails = {
      customerPhone,
      id: rideRequestId,
      driverId,
      type: requestType, 
      originAddress: originAddress || "-",
      destinationAddress: address || "-",
      userLocation: {lat: originLat, lng: originLng} || { lat: 8.7, lng: 38.7 },
      destinationLocation: { lat: endLat, lng: endLng } || { lat: 8.699, lng: 38.699 },
      farePrice: typeof farePrice === 'string' ? parseFloat(farePrice) : farePrice,
      timeTaken: timeTaken || "-",
      createdAt: new Date().toISOString(),
      CoriderPickupData: requestType === "corider" ? CoriderPickupData : null
    };
    await saveRideToLocalHistory(rideDetails);
}

    const fetchAddresses = async () => {
      try {
 
        const destAddress = await Location.reverseGeocodeAsync({
 latitude: parseFloat(endLat),
          longitude: parseFloat(endLng),
        });
        setAddress((`${destAddress[0].name}, ${destAddress[0].region}`) || 'Unknown destination');

        const originAddress = await Location.reverseGeocodeAsync({
          latitude: parseFloat(originLat),
          longitude: parseFloat(originLng),
        });
        setOriginAddress((`${originAddress[0].name}, ${originAddress[0].region}`) || 'Unknown origin');
      } catch (error) {

      }
    };

useEffect(() => {
  const executeSave = async () => {
    if (originLng && originLat && endLat && endLng && originAddress && address && farePrice) {
      if (!hasUpdated.current) {
        updateDriverDoc(farePrice);
        await saveHistory();
        hasUpdated.current = true;
      }
      console.log(farePrice, "farePrice", typeof farePrice === 'string' ? parseFloat(farePrice) : farePrice);
    }
  };
  fetchAddresses();
  executeSave();
}, [originLat, originLng, endLat, endLng, originAddress, address]);

const handleCall = () => {

    const telNumber = "tel:0965187968";
    
    Linking.openURL(telNumber)
      .then(data => {

      })
      .catch(error => {

      });
};

useEffect(() => {
  return () => {
    hasUpdated.current = false;
  };
}, []);

  return (
    <View className="flex-1 bg-gray-50 mt-12 p-4">
      {/* Map Card */}
      <View style={styles.card}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: parseFloat(originLat),
            longitude: parseFloat(originLng),
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker 
          coordinate={{
              latitude: parseFloat(originLng),
              longitude: parseFloat(originLng),
            }}
           title={t.origin}>
            <View className="bg-blue-500 p-2 rounded-full">
              <FontAwesome6 name="location-arrow" size={20} color="white" />
            </View>
          </Marker>
          
          <Marker 
 coordinate={{
              latitude: parseFloat(endLat),
              longitude: parseFloat(endLng),
            }}
           title={t.destination}>
            <View className="bg-orange-500 p-2 rounded-full">
              <Feather name="map-pin" size={20} color="white" />
            </View>
          </Marker>
        </MapView>
      </View>

      {/* Ride Details Card */}
      <View style={styles.card}>
        <View style={{alignItems: "center"}} className="space-y-4">
          {/* Origin */}
          <View className="flex-row items-center">
            <FontAwesome6 name="location-arrow" size={20} color="#3b82f6" />
            <Text className="ml-3 text-gray-700 font-JakartaMedium">
              {t.origin}: {originAddress}
            </Text>
          </View>

          {/* Destination */}
          <View className="flex-row items-center">
            <Feather name="map-pin" size={20} color="#f97316" />
            <Text className="ml-3 text-gray-700 font-JakartaMedium">
              {t.destination}: {address}
            </Text>
          </View>

          {/* Time Taken */}
          <View className="flex-row items-center">
            <AntDesign name="clockcircleo" size={20} color="#6b7280" />
            <Text className="ml-3 text-gray-700 font-JakartaMedium">
              {t.timeTaken}: {timeTaken}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Card */}
      <View style={styles.card}>
<View className="space-y-3 mx-10">
  <DetailRow 
    label={t.tripPrice} 
    value={`${parseFloat(farePrice) === 1 ? "Contact the call-center" : farePrice} Br`} 
    bold
    valueStyle={{ fontSize: 24, color: '#16a34a' }} // Add this line
  />
      { farePrice && parseFloat(farePrice) === 1 && (
        <View style={{
          position: "absolute", bottom: "40%", left: 0, right: 0,  padding: 10,  backgroundColor: "#eee",
          borderRadius: 5, alignItems: "center" }}>
          <Text className="font-JakartaSemiBold text-center text-red-700" style={{ fontSize: 14 }}>
There seems to be a network problem. Contact the call-center immediately to get an accurate price.
          </Text> 
      <TouchableOpacity onPress={() => handleCall()} style={{ padding: 15, width:150, backgroundColor: '#24344b', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 15 }}>
        <Text className="text-red-500 font-JakartaBold" style={{textAlign: "center", size:19 }}> Call Now</Text>
      </TouchableOpacity>     
        </View>
      )}   
  <DetailRow label={t.rideType} value={t.solo} />
  <DetailRow label={t.paymentMethod} value={t.cash} />
</View>
      </View>

      {/* Arrival Message */}
      <Text className="text-xl text-center font-JakartaBold text-green-600 my-4">
        🎉 {t.arrived}
      </Text>

      {/* Back Home Button */}
<TouchableOpacity 
  style={styles.primaryButton}
  onPress={() => {
    if (!hasUpdated.current) {
      updateDriverDoc(farePrice);
      saveHistory();
      hasUpdated.current = true;
    }
    router.replace("(root)/(tabs)/home");  
  }}
>
  <Text className="text-white text-lg font-JakartaBold">
    {t.backHome}
  </Text>
</TouchableOpacity>

    </View>
  );
}

// Reusable Detail Row Component
const DetailRow = ({ label, value, bold = false, valueStyle }) => (
  <View className="flex-row justify-between items-center">
    <Text className="text-gray-600 font-JakartaMedium text-base">
      {label}
    </Text>
    <Text 
      className={`${bold ? 'font-JakartaBold' : 'font-JakartaMedium'}`}
      style={[valueStyle]} // Apply the custom style here
    >
      {value}
    </Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    height: 200,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#292929',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default EndScreen;




