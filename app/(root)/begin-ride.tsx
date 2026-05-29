import { View, Text, Button, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import { useLocationStore, useLanguageStore, useSoloCancelledStore, usePhoneNumberStore } from "@/store";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline } from "react-native-maps";
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";
import { handleCall } from "@/lib/utils";
import { icons } from "@/constants";
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import firestore from '@react-native-firebase/firestore';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import auth from '@react-native-firebase/auth';
import * as Linking from 'expo-linking';
import CancelRideModal from "@/components/cancelRideModal"
import { checkAndResetTripCounts, db } from "@/lib/localDB";
import {rideTranslations} from "@/lib/translations"
import Map from "@/components/Map";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const BeginRideScreen = () => {
  const {requestTime, requestType, rideRequestId, destLat, destLng, originLng, originLat, originAddress, destAddress, customerPhone, customerName, pnumber, name, profileImage, customerId, expoToken, driverSetPrice } = useLocalSearchParams();
  const [startTime, setStartTime] = useState(new Date().getTime());
  const [trackingState, setTrackingState] = useState(false);
const { phoneNumberStore} =  usePhoneNumberStore()  

  const [intervalId, setIntervalId] = useState(null); // Define intervalId state
const router = useRouter();
const [loading, setLoading] = useState(false);
 const { isCancelled, setCancelled } = useSoloCancelledStore();
  const { language, setLanguage } = useLanguageStore();  
  const t = rideTranslations[language];
const [isModalVisible, setModalVisible] = useState(false);

  const openModal = () => {
    setModalVisible(true);
 
  };

  const closeModal = () => {
    setModalVisible(false);
  };
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

  useEffect(() => {
    if (isCancelled) {
      router.replace('/home');
    setTimeout(() => {
        setCancelled(false); // Reset after navigating
      }, 500); // Delay to ensure state is reset after navigation
    }
  }, [isCancelled]);

useEffect(() => {
checkAndResetTripCounts(driverId) 
 }, [driverId]); 

  const { userLatitude, userLongitude } = useLocationStore();
  const [riderDetails, setRiderDetails] = useState({"ratingSum": 14.7, "totalRatings": 3 }) 

 const bottomSheetRef = useRef(null);

 const updateDriverLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Enable your location!");
        return;
      }

      let newLocation = await Location.getCurrentPositionAsync({});
      const currentLat = newLocation.coords.latitude;
      const currentLng = newLocation.coords.longitude;

      // Calculate the distance from origin location
      const distance = distanceBetween([parseFloat(currentLat), parseFloat(currentLng)], [ parseFloat(originLat), parseFloat(originLng)]); // Distance in km


      // Prepare notification payload
      const message = {
        to: "expoToken", // Ensure token format is correct
        sound: "default",
        title: "Driver Location Update",
        body: `Your driver is now ${distance.toFixed(2)} km from the pickup point.`,
        data: {
          driverLat: currentLat,
          driverLng: currentLng,
          distanceFromOrigin: distance.toFixed(2),
        },
      };

      // Send notification
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

    } catch (error) {

    }
  };


useEffect(() => {
  if (requestType === "streetPickup") {

    return; // Exit useEffect early
  }

  const id = setInterval(updateDriverLocation, 30000); // 30 seconds
  setIntervalId(id);

  return () => {

    clearInterval(id);
  };
}, []);

const handleMessage = async () => { }
const openSafetyTools = async () => { }
const toggleMapStyle = async () => { }
const handleRecenter = async () => { }

  const handleBeginRide = async () => {
    setLoading(true)
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Enable your location!");
        return;
      }

      let originLocation = await Location.getCurrentPositionAsync({});
      const originLat = originLocation.coords.latitude;
      const originLng = originLocation.coords.longitude;

      setTrackingState(true);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }

       const currentTime = new Date().getTime();
      setStartTime(currentTime);

      // Update the ride status in Firestore to "started"


      // // Navigate to the next screen, passing all necessary params
      router.replace({
        pathname: "(root)/ride-screen",
        params: {
          destLat: destLat,
          destLng: destLng,
          originLat: originLat,
          originLng: originLng,
          requestType,
          rideRequestId: rideRequestId,
          startTime: currentTime,
          trackingState: true,
          requestTime,
          driverSetPrice,
          customerPhone
        },
      });

  // Update ride status in Firestore
    if (requestType === "streetPickup") {
     // await firestore().collection("streetRequests").doc(rideRequestId).update({ status: "started" , startTime});
    } else {
      await firestore().collection("requests").doc(rideRequestId).update({ status: "started",  startTime});
    }

    // Insert into SQLite database for ride recovery
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO active_ride 
          (driverId, rideId, originLat, originLng, destLat, destLng, timestamp, soloType, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [driverId, rideRequestId, originLat, originLng, destLat, destLng, Date.now(), requestType, 1]
      );

    } catch (dbError) {

    }

    } catch (error) {

    }
setLoading(false)     
  };
const DEFAULT_AVATAR_URI = "https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg";
  const mapRef = useRef(null);
  const parsedOriginLat = parseFloat(originLat) || parseFloat(userLatitude);
  const parsedOriginLng = parseFloat(originLng) || parseFloat(userLongitude);
  const parsedDestLat = parseFloat(destLat) || parseFloat(userLatitude + 0.0002) || 8.958;
  const parsedDestLng = parseFloat(destLng) || parseFloat(userLongitude + 0.0002) || 38.7;

  const coordinates = [
    {
      latitude: parsedOriginLat,
      longitude: parsedOriginLng,
    },
    {
      latitude: parsedDestLat,
      longitude: parsedDestLng,
    }
  ];

  useEffect(() => {
    if (mapRef.current && coordinates.length > 1) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 80, bottom: 50, left: 80 },
        animated: true,
      });
    }
  }, [coordinates]);

return (
    <View className="flex-1 bg-gray-50">
    {/* Header Section */}
    <View className="px-6 pt-4 pb-2 bg-white shadow-sm shadow-black/10"
                style={[styles.shadowSm, styles.shadowOrange]}>
            <View className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <View 
            className="h-full bg-orange-500" 
            style={{ width: `50%` }}
          />
        </View>

      <Text className="text-center pt-4 text-xl font-JakartaBold text-gray-800">
        🚖 {t.rideAccepted}
      </Text>
      <Text className="text-center text-gray-600 font-JakartaMedium mt-1">
        {t.greeting(user?.displayName)}
      </Text>
    </View>
 {/* Main Content */}
    <View className="flex-1">
   
   {/* Action Buttons (Fixed Position) */}
      <View  style={ { zIndex: 1, position: "absolute", width:"60%", top: 20, alignSelf: "center"}}>
      <TouchableOpacity
      style={[styles.shadowLg, styles.shadowOrange]}
        onPress={handleBeginRide}
        className=" rounded-xl py-4 shadow-lg flex-1 bg-orange-500 rounded-xl py-4 items-center"
      >
        <Text className="text-center text-white text-lg font-JakartaBold">
         🚕 {t.beginRide}
        </Text>
      </TouchableOpacity>

    </View>
    {/* Map Container with Fixed Height */}
      <View className="rounded-2xl mx-4 mt-4" style={{ height: '70%' }}>
      <Map
        origin={parsedOriginLat && parsedOriginLng ? { 
          latitude: parsedOriginLat, 
          longitude: parsedOriginLng 
        } : null}
        destination={parsedDestLat && parsedDestLng ? { 
          latitude: parsedDestLat, 
          longitude: parsedDestLng 
        } : null}
        googlePlacesApiKey="Unknown"
        rideType={requestType}
      />
    </View>

      {loading && <LoadingOverlay /> }
   
       </View>
      {/* Customer Details Bottom Sheet */}
  <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["28%", "65%"]}
        index={0}

      >
        <BottomSheetScrollView 
          className="flex-1 px-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="self-center w-12 h-1.5 bg-gray-300 rounded-full mt-2" />

          <View className="mt-4 flex-row items-center">
            <Image
              source={{ uri: profileImage }}
              className="w-14 h-14 rounded-2xl border-2 border-white shadow-md"
            />
            <View className="ml-4 flex-1">
              <View className="flex-row items-center">
                <Text className="text-xl font-JakartaBold text-gray-900 mr-3">
                  {customerName}
                </Text>
                <RatingPill rating={Math.round(riderDetails?.ratingSum / riderDetails?.totalRatings * 10) / 10 || '5.0'} className="ml-3" />
              </View>
              <Text className="text-gray-600 font-JakartaMedium mt-1">
                {requestType || 'Standard ride'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between mt-6">
            <ActionButton 
              icon="call" 
              label="Call" 
              onPress={() => handleCall(pnumber || customerPhone)} 
              variant="primary"
            />
            <ActionButton 
              icon="chatbubble-ellipses" 
              label="Message" 
              onPress={handleMessage}
            />
            <ActionButton 
              icon="shield-checkmark" 
              label="Safety" 
              onPress={openSafetyTools}
            />
          </View>

          <View className="mt-6 bg-gray-50 rounded-2xl p-4">
            <RouteStep 
              icon="flag"
              type="Pickup"
              address={originAddress}
              time={requestTime}
              iconColor="#f97316"
            />
            <View className="h-6 border-l-2 border-dashed border-gray-300 ml-3" />
            <RouteStep 
              icon="navigate"
              type="Destination"
              address={destAddress}
              time={requestTime}
              iconColor="#22c55e"
            />
          </View>

          <TouchableOpacity
            onPress={handleBeginRide}
            className="mt-6 bg-orange-500 rounded-xl py-4 items-center justify-center shadow-lg"
          >
            <Text className="text-white text-lg font-JakartaBold">
              🚖 Begin Ride
            </Text>
          </TouchableOpacity>
                  <TouchableOpacity 
          onPress={openModal}
          className="border bg-white border-gray-300 rounded-xl py-3 mt-4"
        >
          <Text className="text-center font-JakartaMedium">
            {t.cancelRide}
          </Text>
        </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
  </View>
);}


// Reusable Components
const ControlButton = ({ icon, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className="w-12 h-12 bg-white rounded-xl items-center justify-center shadow-md"
  >
    <Ionicons name={icon} size={20} color="#1f2937" />
  </TouchableOpacity>
);

const RouteStep = ({ icon, type, address, time, iconColor }) => (
  <View className="flex-row items-start">
    <View className="w-8 h-8 rounded-lg items-center justify-center" 
      style={{ backgroundColor: iconColor + '20' }}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <View className="ml-3 flex-1">
      <Text className="text-sm font-JakartaMedium text-gray-500">{type}</Text>
      <Text className="text-base font-JakartaMedium text-gray-900">{address}</Text>
      {time && <Text className="text-sm font-JakartaLight text-gray-500 mt-1">{time} O'clock</Text>}
    </View>
  </View>
);

const ActionButton = ({ icon, label, onPress, variant }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-1 items-center py-3 rounded-xl mx-1 ${
      variant === 'primary' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
    }`}
  >
    <Ionicons 
      name={icon} 
      size={24} 
      color={variant === 'primary' ? '#3b82f6' : '#4b5563'} 
    />
    <Text className={`mt-2 text-sm font-JakartaMedium ${
      variant === 'primary' ? 'text-blue-600' : 'text-gray-600'
    }`}>
      {label}
    </Text>
  </TouchableOpacity>
);
const LoadingOverlay = () => (
  <View className="absolute inset-0 bg-black/30 justify-center items-center">
    <View className="items-center">
      <ActivityIndicator size="large" color="#f97316" />
      <Text className="text-white font-JakartaMedium mt-3">Starting ride...</Text>
    </View>
  </View>
);
const RatingPill = ({ rating }) => (
  <View className="flex-row items-center bg-amber-100 px-2.5 py-1 rounded-full">
    <Ionicons name="star" size={16} color="#f59e0b" />
    <Text className="text-amber-700 font-JakartaMedium ml-1 text-sm">
      {typeof rating === 'number' ? rating.toFixed(1) : '5.0'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  cancelButton: {
    backgroundColor: '#9aadad', // Red color to indicate cancellation
    padding: 10, // Padding for the button
    borderRadius: 10, // Rounded corners
    marginTop: 20, // Space from the top
    alignItems: 'center', // Center the button text
    justifyContent: 'center', // Center content vertically
    width: '70%', // Width of the button
    alignSelf: 'center', // Center the button horizontally
  },
  cancelButtonText: {
    color: '#fff', // White text color
    fontSize: 18, // Font size for the text
    fontWeight: '600', // Semi-bold text
  },
  closeButton: {
    backgroundColor: '#ff5757',
    padding: 10,
    color:"#eee",
    alignSelf: "center",
    marginTop: 15,
    width: "50%",
    fontFamily: "mon-sb",
    borderRadius: 5,
  },
  // Shadow utilities
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // For Android
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6, // For Android
  },// Optional: Custom colored shadow
  shadowOrange: {
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  }
});
export default BeginRideScreen;
