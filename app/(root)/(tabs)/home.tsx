import firestore from '@react-native-firebase/firestore';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import * as Location from "expo-location";
import { useState, useEffect, useRef } from "react";
import { Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, Button,  Modal, StyleSheet, TextInput, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Map from "@/components/Map";
import { defaultStyles } from '@/constants/Styles';
import Colors from '@/constants/Colors';
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput"; 
import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import { Audio } from "expo-av";
import newFollowerSound from "@/assets/sounds/new_follower.mp3";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {MaterialIcons } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
import {translation1, modal1, translationA, profileTranslations } from "@/lib/translations";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { driverProfile, updateDriver, createRide, handleProcessPayment } from "@/lib/utils";
import { useAdminNumsStore, useTipStore, useDriverStatsStore, useLocationStore, useLanguageStore, useCreditbalanceStore,  useCreditStore, useDriverkmPriceStore, useWeeklyTripsCountStore, useDrivernightkmPriceStore, useDriverStatusStore,
useWeeklyStreetPickupCountStore, useMonthlyTripsCountStore, useWeeklyFareTotalStore, useMonthlyFareTotalStore, usePriceLogStore, usePhoneNumberStore, usePioneerStore, useShareUsernameStore, useTierLimitsStore} from "@/store";

import { uploadLocation, useRideStore, updateDriverGeohash, savePreferredLocationToFirestore } from '@/firebaseconf'; 
import MapViewDirections from "react-native-maps-directions";
import uuid from 'react-native-uuid';
import * as TaskManager from 'expo-task-manager';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline } from "react-native-maps";
import auth from '@react-native-firebase/auth';
import { RefillCreditModal, SuspensionModal, UpdateAppModal,  } from "@/lib/modals" 
import { CustomAlertModal, CreditRechargeModal, StatusNotices } from "@/components/modals" 
import { db, dynamoDbData, fetchLocalDriverData, checkHourAndFetchUpload, shouldDownloadData, shouldUploadData, handleRecharge, fetchAdminData, updatePrices, getTotalFetchCount, fetchUserDataRecharge, fetchLocalLocationData, updateLocalDriverLocation, getLimits } from "@/lib/localDB";  // Import SQLite utils
import { startLocationTracking, haversineDistance } from '@/backgroundTasks';
import { stopLongSound } from '../../notificationHandler';
import { prices, nightPrices } from './pricing';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
//Create a logic that if for some reason the screen was closed after the driver accepted, It will be checked if he has accepted a ride first thing upon mount

const Home = () => {
const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, carModel, bio, seatNumber, setprofileDetails, approvedRecharge, profileImageUrl } =  usePhoneNumberStore()  
const {shareUsername, setShareUsername, socialCount, setSocialCount, setExpoToken } = useShareUsernameStore(); 
const { isSuspended, isOutdated, setIsSuspended, setIsOutdated, } = useDriverStatusStore();
const { creditBalance, setCreditBalance } = useCreditbalanceStore()
const { tip, setTip, resetTip } = useTipStore()
const { adminAlertText, adminCreditAmount, adminCbeAccount, adminTelebirr, setCreditStore, creditRechargeModalContent } = useCreditStore();
const { kmPriceStore, setKmPriceStore } = useDriverkmPriceStore()
const { tierLimits, setTierLimits } = useTierLimitsStore();
const [loading, setLoading] = useState(false);

const { nightkmPriceStore, setNightkmPriceStore } = useDrivernightkmPriceStore()
const { weeklyTripsCount, weeklyStreetPickupCount, monthlyTripsCount, weeklyFareTotal, monthlyFareTotal, dailyTripsCount, dailyFareTotal, setDriverStats } = useDriverStatsStore();
const { setAdminSettings, baseFare, distanceRate, nightRate, timeRate, VAT} = useAdminNumsStore()
const {setIsPioneer, isPioneer, tierType, setTierType} = usePioneerStore()

const dbFirestore = getFirestore();
const auth = getAuth();

const user = auth.currentUser;
const driverId = user?.uid;
const router = useRouter();
const [kilometerPrice, setKilometerPrice] = useState(null);
const [nightKilometerPriceHome, setNightKilometerPriceHome] = useState(null);
const [visibleField, setVisibleField] = useState(null);
const [preferredLocations, setPreferredLocations] = useState([]);
const [newLocation, setNewLocation] = useState(null);
const [showLocationInput, setShowLocationInput] = useState(false);
const [priceUpdateLog, setPriceUpdateLog] = usePriceLogStore(state => [state.priceUpdateLog, state.setPriceUpdateLog]);

 const [showRefillModal, setShowRefillModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [driverData, setDriverData] = useState(null);
    const [adminData, setAdminData] = useState(null);

const [isOnline, setIsOnline] = useState(true); 
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY
  const { setUserLocation, setDestinationLocation, userLatitude, userLongitude, userAddress } = useLocationStore();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [originalLocation, setOriginalLocation] = useState<Location.LocationObject | null>(null)
const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});
  const [modalVisible, setModalVisible] = useState(false);
  const [isDetailsFilled, setIsDetailsFilled] = useState(true)
    const [isDocumentsSent, setIsDocumentsSent] = useState(true)
const [lastStatusChange, setLastStatusChange] = useState({"time": null, "count": 0});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
const { rideRequests, rejectRideRequest, acceptRideRequest, acceptSharedRideRequest } = useRideStore();
 const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
 const [sound, setSound] = useState(null);
const[postCount, setPostCount] = useState(0);
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';
const [showActionModal, setShowActionModal] = useState(false);
const [showDocumentsNotice, setShowDocumentsNotice] = useState(true);

// --- NEW & IMPROVED: Service Card Data ---
const services = [
  {
    key: 'school',
    title: 'School Ride',
    icon: 'bus-school',
    color: '#3B82F6', // Blue
    action: () => router.push('/active-ride'), // <-- This will navigate to your new screen
  },
];

  const handleRefillCredit = () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount < adminCreditAmount ) {
 setModalData({
    title: t.invalidAmount,
    message: `${user.displayName}, ${adminAlertText}.`,
    imageSource: "https://cdn.dribbble.com/userupload/19614493/file/original-196943147725f546207bf054b89eb1a7.gif",
  });
  setAlertModalVisible(true);
      return;
    }
    setModalVisible(true);
  };
  
useEffect(() => {
  return () => {
    stopLongSound(); // or even unloadAsync directly
  };
}, []);

useEffect(() => {
const setToLocalDriverData = async () =>  {
 const localData = await fetchLocalDriverData(driverId)
  const { dailyTripsCount = 0, weeklyTripsCount = 0, weeklyStreetPickupCount, monthlyTripsCount = 0, monthlyStreetPickup = 0, dailyFareTotal = 0, weeklyFareTotal = 0, monthlyFareTotal = 0 } = localData
  setDriverStats({ dailyTripsCount, weeklyTripsCount, weeklyStreetPickupCount, monthlyTripsCount,
                   monthlyStreetPickup, dailyFareTotal, weeklyFareTotal, monthlyFareTotal })
  }        
setToLocalDriverData();

  startLocationTracking(driverId, setUserLocation);
if(!isDetailsFilled){
  router.replace('/(auth)/form')
}
}, [kmPriceStore, creditBalance, nightkmPriceStore, userLatitude, userLongitude]);



  useEffect(() => {
checkHourAndFetchUpload(
          driverId, setDriverData, setAdminData, setDriverStats,setCreditStore,
           shouldDownloadData, shouldUploadData, isSuspended, isOutdated, setIsSuspended, setIsOutdated, setShareUsername, setProfileImageUrl,
        );  
    // Clean up listener on component unmount
    return () => {
      useRideStore.getState().clearRideRequests();
    };
  }, []);

useEffect(() => {
console.log("phoneNumberStore, pnumber..............................................................1")
const fetchAdminPriceData = async () => {
  const totalFetches = await getTotalFetchCount("posts");
  setPostCount(totalFetches);

  const adminData = await fetchAdminData(setIsOutdated);
  if (!adminData) return;

  const {
    base_fare, base_fare_shared, distance_rate,
    night_rate, time_rate, vat, vat_shared, alert_text,
    cbe_account, credit_minimum, telebirr, credit_recharge_modal,
  } = adminData;

  setAdminSettings({
    baseFare: base_fare, distanceRate: distance_rate, nightRate: night_rate,timeRate: time_rate, VAT: vat
  });

  setCreditStore({
    adminAlertText: alert_text,  adminCreditAmount: credit_minimum,
    adminCbeAccount: cbe_account, adminTelebirr: telebirr,
    creditRechargeModalContent: credit_recharge_modal
  });
};
fetchAdminPriceData()

    const fetchDriverData = async () => {
console.log("phoneNumberStore, pnumber..............................................................2")
      try {
// const driverRef = doc(dbFirestore, "drivers", driverId);
// const driverDoc = await getDoc(driverRef);
const driverData = await driverProfile(driverId, "user_id")
        if (driverData) {
       //   const driverData = driverDoc.data();

          // Extract values from Firestore
 //const { status, suspensionUntil, pioneer, tierType, documentsSent, creditAmount, kmPrice, nightKilometerPrice, profileImage, expoToken, carModel, driverBio, seatType, pnumber, plateNumber } = driverData;
const { status, suspension_until, pioneer, tier_type, documents_sent, credit_amount, prices, profile_image, expo_token, vehicle_details, bio, approved_recharge, pnumber, share_username, social_count } = driverData;
console.log("status, suspension_until, pioneer, tier_type, documents_sent, credit_amount, prices, profile_image, expo_token, vehicle_details, bio, approved_recharge, pnumber, share_username, social_count", status, suspension_until, pioneer, tier_type, documents_sent, credit_amount, prices, profile_image, expo_token, vehicle_details, bio, approved_recharge, pnumber, share_username, social_count)
     setIsPioneer(pioneer || false); // Default to false if null
    setTierType(tier_type || "noBenefits"); setIsDocumentsSent(documents_sent || false);
if (vehicle_details) {
  const {model, seat_type, plate_number, color } = vehicle_details;
  setprofileDetails({
    carModel: model,
    bio,
    seatNumber: seat_type,
    plateNumber: plate_number,
    color,
    approvedRecharge: approved_recharge
  });
} else {
  setprofileDetails({ bio, approvedRecharge: approved_recharge });
}
 
setCreditBalance(parseFloat(credit_amount)); setProfileImageUrl(profile_image); setPhoneNumberStore(pnumber);

console.log("phoneNumberStore, pnumber..............................................................3")
console.log("phoneNumberStore, pnumber", phoneNumberStore, pnumber)

if (prices) {
  let parsedPrices;
  try {
    parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices;
    setKmPriceStore(parsedPrices.kmPrice);
    setNightkmPriceStore(parsedPrices.nightKilometerPrice);
  } catch (error) {
    console.error("Failed to parse prices:", error);
    // Optionally set default values
    setKmPriceStore(15);
    setNightkmPriceStore(25);
  }
} else {
  // Fallback if prices is null or undefined
  setKmPriceStore(15);
  setNightkmPriceStore(25);
}
 
setExpoToken(expo_token)
setIsOnline(status);
const limits = await getLimits()
console.log("status, suspension_until", status, suspension_until)
setTierLimits(limits);

//const {followerCount, username} = await dynamoDbData(driverId)    
setShareUsername(share_username); setSocialCount(social_count || 0);

          if (status === "suspended") {
            const suspensionTimestamp = suspension_until ? new Date(suspension_until) : null;
            const today = new Date();
console.log("today, suspensionTimestamp", today, suspensionTimestamp)
            if (suspensionTimestamp && suspensionTimestamp > today) {
              setIsSuspended(true);
            }
          } else if (status === "offline"){
            setIsOnline(false)
          }

        } else {
        }
   await handleRecharge(driverId, creditBalance);    
} catch (error) {
  console.error("Error in fetchDriverData:", error);
}

    };
    fetchDriverData();
  }, [driverId]); // Runs when `driverId` changes


useEffect(() => {
 const checkActiveRide = async () => {
    try {
      const activeRide = await db.getAllAsync(`SELECT * FROM active_ride WHERE status = 1;`);

      if (activeRide.length > 0) {

        const ride = activeRide[0];

        // Validate required values before navigating
        if (
          ride.destLat == null || ride.destLng == null || ride.originLat == null || ride.originLng == null ||
          ride.rideId == null || ride.timestamp == null
        ) {

          return;
        }

        // Ask the user before resuming
        Alert.alert(
          "Resume Ride?",
          "OOur system has detected you have an active ride. You have should resume it if you have an interrupted trip.",
          [
            {
              text: "No active ride",
              style: "destructive",
              onPress: async () => {
                await db.runAsync(`UPDATE active_ride SET status = 0 WHERE status = 1;`);

              },
            },
            {
              text: "Resume Ride",
              onPress: () => {
                router.replace({
                  pathname: "(root)/ride-screen",
 params: {
          destLat: ride.destLat, destLng: ride.destLng, originLat: ride.originLat,  originLng: ride.originLng,
          rideRequestId: ride.rideId, startTime: ride.timestamp, trackingState: true, requestType: ride.soloType
        },
                });
              },
            },
          ]
        );
      }
    } catch (error) {

    }
  };
 const checkActiveSharedRide = async () => {
    try {
      const activeRide = await db.getAllAsync(
        `SELECT * FROM active_shared_ride WHERE status = 1;`,
        [driverId]
      );

      if (activeRide.length > 0) {

        const ride = activeRide[0];

        // Validate required values before navigating
        if (
          ride.dropOffPoints == null || ride.rideId == null || ride.originLng == null || ride.originLat == null ||
          ride.startTime == null || ride.coriderPickupData == null || ride.requestTime == null
        ) {

          return;
        }
const coriderPickupData = ride.coriderPickupData;
const dropOffPoints = ride.dropOffPoints;

        // Ask the user before resuming
        Alert.alert(
          "Resume Shared Ride?",
          "Our system has detected you have an active ride. You have should resume it if you have an interrupted trip.",
          [
            {
              text: "Cancel",
              style: "destructive",
              onPress: async () => {
                await db.runAsync(`UPDATE active_shared_ride SET status = 0 WHERE status = 1;`);

              },
            },
            {
              text: "Resume Ride",
              onPress: () => {
                router.replace({
                  pathname: "(root)/rideshare/ride-screen",

        params: {
          dropOffPoints: dropOffPoints, rideRequestId: ride.rideId, originLng: ride.originLng,  originLat: ride.originLat,
          startTime: ride.startTime,  trackingState: true, coriderPickupData, requestTime: ride.requestTime,
        },
                });
              },
            },
          ]
        );
      }
    } catch (error) {

    }
  };

    checkActiveSharedRide();
    checkActiveRide();
// setShowRefillModal(true) 

}, []);

useEffect(() => {
if(isSuspended) {
console.error("isSuspended.........................................................")
      router.replace({
        pathname: "(auth)/updateApp",
        params: { type: "suspended"},
      });
      return}

if(isOutdated){
 setShowUpdateModal(true)
 router.replace({  pathname: "(auth)/updateApp",
        params: { type: "outdated"},}) 
}
}, [isSuspended, isOutdated]);
const formatPhoneNumber = (number) => {
  if (number.startsWith('0')) {
    return '+251' + number.slice(1); // Remove '0' and replace with '+251'
  }
  return number; // Return as is if already formatted
};

// Function to validate the phone number
const validatePhoneNumber = (number) => {
  const regex = /^(09|07)[0-9]{8}$/; // Starts with 09 or 07, followed by 8 digits
  return regex.test(number);
};

const PaymentLoadingOverlay = ({
  visible,
  message = "Processing your payment, please wait..."
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Ionicons name="wallet-outline" size={48} color="#F97316" />
        <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 20 }} />
        <Text style={styles.messageText}>{message}</Text>
        <Text style={styles.subMessageText}>Do not close the app.</Text>
      </View>
    </View>
  );
};


const handleSubmit = async () => {
    try {
// if(!isDocumentsSent){
// setModalData({
//     title: "Send your documents",
//     message: `${user.displayName}, please send screenshot of your deposit plus documents at @shareDriverSupport on telegram to start accepting jobs.`,
//     imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
//   });
//   setAlertModalVisible(true);
// return
// }

    if (!isPioneer) {
      if (creditBalance < 5) {
        Alert.alert("Insufficient Credit", "Please recharge your credit to start accepting jobs. Thanks!");
        return;
      }
    }

   // if(!isDocumentsSent){
   //  Alert.alert("Docs not received", "Please send your documents @shareDriversSupport on telegram. Thanks!")
   //  return;
   // } 
      if (!approvedRecharge ) {
      Alert.alert("Recharge Required", "You need to recharge before accepting rides.");
      return;
    }

const latestRechargeDate = new Date(approvedRecharge.rechargeDate * 1000); // Convert Unix timestamp to JS Date
const currentDate = new Date();

    // Check tier type and validate last recharge date
    const tierLimits = {
      premium: 3, 
      standard: 2, 
      basic: 1, // 1 month
      noBenefits: 0 // No benefits → directly block
    };

if (isPioneer) {
    if (tierType in tierLimits) {
      const allowedMonths = tierLimits[tierType];
      if (allowedMonths === 0) {
        Alert.alert("Ride Blocked", "Your current plan does not allow accepting rides.");
        return;
      }
      latestRechargeDate.setMonth(latestRechargeDate.getMonth() + allowedMonths);

      if (currentDate > latestRechargeDate) {
        Alert.alert("Recharge Expired", `Your last recharge is older than ${allowedMonths} month(s). Please recharge to continue.`);
        return;
      }
    }
  }
if (!customerName || !customerPhone) {
  setModalData({
    title: "Empty input",
    message: "Please enter customer name and phone number!",
    imageSource: "https://cdn.dribbble.com/userupload/19614493/file/original-196943147725f546207bf054b89eb1a7.gif",
  });
  setAlertModalVisible(true);
  return;
}

  if (!validatePhoneNumber(customerPhone)) {
    Alert.alert("Whoops,", "please enter a valid phone number"); // Translated alert
    return
  }

    if(!userLatitude || !userLongitude)
    {
      setModalData({
    title: "Whoops",
    message: "Weak Internet connection... please check your Internet connection and try again!",
    imageSource: "https://cdn.dribbble.com/userupload/19614493/file/original-196943147725f546207bf054b89eb1a7.gif",
  });
  setAlertModalVisible(true);
      return  
    }
    // Update Firestore
//const docRef = doc(collection(dbFirestore, 'streetRequests'));
// await setDoc(docRef, {
//   status: "accepted",
//   acceptedBy: driverId,
//   customerName,
//   customerPhone: formatPhoneNumber(customerPhone),
//   origin: [userLatitude, userLongitude],
//   destination: [8.997347428549713, 38.7867607552173],
//   createdAt: serverTimestamp(),
// });
  const fullUUID = uuid.v4();
  const streetId = fullUUID.split('-').slice(0, 2).join('-');

   createRide({
    id: streetId,
    user_id: customerPhone,
    driverId,
    requestType: "streetPickup", // 'solo' or 'corider'
    originAddress: userAddress,
    address: "Street Pickup Destination",
    originLat: userLatitude,
    originLng: userLongitude,
    endLat: 8.997347428549713,
    endLng: 38.7867607552173,
    farePrice: 0,
    timeTaken: "just starting",
    CoriderPickupData: null,
    customerPhone: formatPhoneNumber(customerPhone),
    status: "accepted"})
//const rideRequestId = docRef.id
const currentHour = new Date().getUTCHours() + 3; 
      // Navigate to begin-ride
      router.replace({
        pathname: "(root)/begin-ride",
        params: {
          destLat: 8.997347428,
          destLng: 38.78676075,
          originLat: userLatitude,
          originLng: userLongitude,
          rideRequestId: streetId,
          originAddress: "Street Pickup",
          destAddress: "Street Pickup Destination",
          requestType: "streetPickup",
          customerPhone: formatPhoneNumber(customerPhone),
          customerName,
          requestTime: currentHour,
          driverSetPrice: false
        },
      });
      // Close modal and reset
      setModalVisible(false);
      setCustomerName("");
      setCustomerPhone("");
    } catch (error) {

    }
  };      

const getInitialRegion = (item) => {
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;

      if (item.type === "solo") {
        const [originLat, originLng] = item.userLocation;
        const [destLat, destLng] = item.destinationLocation;
        minLat = Math.min(minLat, originLat, destLat);
        maxLat = Math.max(maxLat, originLat, destLat);
        minLng = Math.min(minLng, originLng, destLng);
        maxLng = Math.max(maxLng, originLng, destLng);
      } else if (item.type === "corider") {
        item.dropOffPoints.forEach((point) => {
          const [dropLat, dropLng] = point.dropOff;
          minLat = Math.min(minLat, dropLat);
          maxLat = Math.max(maxLat, dropLat);
          minLng = Math.min(minLng, dropLng);
          maxLng = Math.max(maxLng, dropLng);
        });

          const [originLat, originLng] = item.dropOffPoints[0].origin;
          minLat = Math.min(minLat, originLat);
          maxLat = Math.max(maxLat, originLat);
          minLng = Math.min(minLng, originLng);
          maxLng = Math.max(maxLng, originLng);
      }

    const latitudeDelta = maxLat - minLat + 0.01;
    const longitudeDelta = maxLng - minLng + 0.01;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta,
      longitudeDelta,
    };
  };

const renderMap = (item) => {
    const initialRegion = getInitialRegion(item)

    return (
      <MapView
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        style={{ height: 200, marginVertical: 10, borderRadius: 10 }}
      initialRegion={initialRegion}
      >
        {/* Display markers for solo and corider types */}
        {item.type === "solo" && (
          <>
            <Marker 
              coordinate={{ 
                latitude: item.userLocation[0] || 8.965, 
                longitude: item.userLocation[1] || 38.7
              }} 
              title="Pickup" 
            />
            <Marker 
              coordinate={{ 
                latitude: item.destinationLocation[0] || 8.967, 
                longitude: item.destinationLocation[1] || 38.69
              }} 
              title="Destination" 
              pinColor="blue"
            />
          </>
        )}
        
        {item.type === "corider" &&
          <>
            {item.dropOffPoints.map((point, index) => (
              point.dropOff && (
                <Marker 
                  key={index} 
                  coordinate={{ 
                    latitude: point.dropOff[0] || 8.967, 
                    longitude: point.dropOff[1] || 38.69
                  }} 
                  title={`Drop-off ${index + 1}`} 
                  pinColor="blue"
                />
              )
            ))}
            {item.dropOffPoints.map((point, index) => (
              point.origin && (
                <Marker 
                  key={index} 
                  coordinate={{ 
                    latitude: point.origin[0] || 8.97, 
                    longitude: point.origin[1] || 38.69
                  }} 
                  title={`Customer ${index + 1} Location`} 
                />
              )
            ))}
          </>
        }
      </MapView>
    );
  };

const { language, setLanguage } = useLanguageStore();
const t = profileTranslations[language];    
const { requestHeader, welcome, currentLocation, informativeTip, rewards, ontStyles, button, warning, noRides, pickupTxt, sendDocs, yourPrices } = translation1[language];
const {A, B, C ,D , E, F, G, H , I , J, K , L, M, N} = translationA[language]
const { header, modal1Name, modal1Phone, button1,  button2} = modal1[language]


const handleToggleOnlineOffline = async () => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  // Prevent change if last change was less than 30 minutes ago
  if (lastStatusChange.time && now - lastStatusChange.time < THIRTY_MINUTES && lastStatusChange.count > 3) {
    return;
  }

// const driverRef = doc(dbFirestore, "drivers", driverId);
// const driverDoc = await getDoc(driverRef);
  
    const currentStatus = isOnline ? "available" : "offline"
    let newStatus;
    if (currentStatus === "available") {
      newStatus = "offline";  // If online, go offline

    } else if (currentStatus === "offline") {
      newStatus = "available";  // If offline, go online
    } else {
      newStatus = currentStatus; // If suspended//, don't change
    }
//   await driverRef.update({ status: newStatus });

setIsOnline((prevStatus) => !prevStatus);
  setLastStatusChange({"time": now, "count": lastStatusChange.count +1});

await updateDriver(driverId, {status: newStatus})
}
const buttonScale = useRef(new Animated.Value(1)).current;
 return (
  <SafeAreaView className="bg-general-300" style={{flex: 1}}>
    {/* Language Selector */}
  <PaymentLoadingOverlay visible={loading} />
    <View className="flex-row justify-center mt-4 mb-2">
      {['ENG', 'AMH', 'ORM'].map((lang) => (
        <TouchableOpacity
          key={lang}
          onPress={() => setLanguage(lang)}
          className={`px-4 py-2.5 rounded-full mx-1.5 ${
            language === lang ? 'bg-gray-800 shadow-lg' : 'bg-gray-100 shadow'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: language === lang ? 0.25 : 0.1,
            shadowRadius: language === lang ? 4 : 2,
            elevation: 4,
          }}
        >
          <Text className={`text-sm font-JakartaBold ${
            language === lang ? 'text-white' : 'text-gray-700'
          }`}>
            {lang === 'ENG' ? '🇺🇸 ENG' : '🇪🇹 ' + lang}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
 <FlatList
      className="px-3"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingBottom: 120,
      }}
      ListHeaderComponent={
         <>
<TouchableOpacity
  style={{alignSelf: "center"}}
  className={`flex-row items-center w-14 h-8 rounded-full p-1 ${
    isOnline ? 'bg-green-100 justify-end' : 'bg-gray-200 justify-start'
  }`}
  onPress={handleToggleOnlineOffline}
>
  <View
    className={`w-6 h-6 rounded-full ${
      isOnline ? 'bg-green-500' : 'bg-gray-500'
    }`}
  />
</TouchableOpacity>
          {/* Refill Credit Button */}
          {!isPioneer && (
            <View>
            <TouchableOpacity 
              className="mx-5 mt-4"
              onPress={() => handleProcessPayment(59, driverId, "Driver-Wallet", shareUsername, phoneNumberStore, setLoading)}
              style={{ 
                height: 50,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                width: "80%",
                alignSelf: 'center',
                shadowColor: '#220022',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={['#8A2B82', '#4B0082']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                <Text className="font-JakartaBold text-xl text-white mr-2">
                  {t.refillCredit}
                </Text>
                <Ionicons name="add-circle" size={24} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            </View>
          )}

{/* Header Section */}
<View className="flex-row items-center justify-between ml-3 my-2 ">
  {/* User Profile Section */}
  <View className="flex-row items-center flex-1">
    {/* Avatar Container */}
    <TouchableOpacity 
      className="relative"
      onPress={() => router.push({ pathname: "/(root)/profile" })}
    >
      <Image
        className="w-14 h-14 rounded-full border-2 border-white"
        source={{ uri: profileImageUrl || user?.photoURL || DEFAULT_AVATAR }}
        resizeMode="cover"
      />
      {/* Online Status Indicator */}
       <View 
  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}/>
    </TouchableOpacity>

    {/* Greeting Text */}
    <View className="ml-4">
      <Text className="text-xs font-JakartaMedium text-gray-500 uppercase tracking-wider">
        {welcome}
      </Text>
      <Text className="text-xl font-JakartaBold text-gray-900 mt-0.5">
        {user?.displayName || "guest"}
      </Text>
    </View>
  </View>

{/* Price Status Indicator */}
  <View>
  <Text  className="text-center font-JakartaLight text-gray-500 mb-1"> {yourPrices}</Text>
  <TouchableOpacity 
    className="flex-row items-center bg-gray-50 rounded-full px-4 py-1.5 mx-2 border border-gray-200 active:bg-gray-100"
    onPress={() => router.push('/(root)/(tabs)/pricing')}
  >
    <View className="items-center mr-1">
      <Ionicons name="sunny" size={14} color="#f59e0b" />
      <Text className="text-xs font-JakartaBold text-gray-700 mt-0.5">
        {kilometerPrice || kmPriceStore || 19.5} BR
      </Text>
    </View>
    
    <View className="h-4 w-px bg-gray-300 mx-1" />

    <View className="items-center ml-1">
      <Ionicons name="moon" size={14} color="#1e40af" />
      <Text className="text-xs font-JakartaBold text-gray-700 mt-0.5">
        {nightKilometerPriceHome || nightkmPriceStore || 21.5} BR
      </Text>
    </View>
  </TouchableOpacity>
  </View>

  {/* Action Button with Dropdown Modal */}
  <View className="relative">
    <TouchableOpacity
      className="p-2"
      onPress={() => setShowActionModal(!showActionModal)}
    >
      <Ionicons name="ellipsis-vertical" size={20} color="#4B5563" />
    </TouchableOpacity>

    {/* Action Modal */}
    {showActionModal && (
      <View className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-100 z-50"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
          minWidth: 160
        }}
      >
        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 active:bg-gray-50"
          onPress={() => {
            handleToggleOnlineOffline();
            setShowActionModal(false);
          }}
        >
          <Ionicons 
            name={isOnline ? "radio-button-on" : "radio-button-off"} 
            size={18} 
            color={isOnline ? "#10B981" : "#6B7280"} 
          />
          <Text className="ml-3 font-JakartaMedium text-gray-700">
            {isOnline ? t.online : t.offline}
          </Text>
        </TouchableOpacity>
 {(phoneNumberStore === "+251964231566" || phoneNumberStore === "+251934963090") && (
        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 active:bg-gray-50"
          onPress={() => {
            router.push({ pathname: "/(root)/onboardDriver" });
            setShowActionModal(false);
          }}
        >
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <Text className="ml-3 font-JakartaMedium text-gray-700">
            onboard Driver
          </Text>
        </TouchableOpacity>
      )}


        <View className="h-px bg-gray-100 mx-2" />

        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 active:bg-gray-50"
          onPress={() => {
            router.push({ pathname: "/(root)/profile" });
            setShowActionModal(false);
          }}
        >
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <Text className="ml-3 font-JakartaMedium text-gray-700">
            {t.myProfile}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
</View>

{/* Modal Backdrop (click outside to close) */}
{showActionModal && (
  <TouchableOpacity
    className="absolute inset-0 bg-transparent"
    onPress={() => setShowActionModal(false)}
    activeOpacity={1}
  />
)}

{/* Subtle Separator */}
<View className="mx-5 my-3 border-b border-gray-50" />
      <UpdateAppModal visible={showUpdateModal} />

      <RefillCreditModal 
        visible={showRefillModal} 
        onRefillPress={() => {
          // Handle credit refill process here
          setShowRefillModal(false);
        }}
      />
 <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />

 <CreditRechargeModal
      visible={creditModalVisible}
      onClose={() => setCreditModalVisible(false)}
      adminCbeAccount={adminCbeAccount}
      creditRechargeModalContent={creditRechargeModalContent}
  />

      <View>
<StatusNotices 
  isOnline={isOnline}
  isDocumentsSent={isDocumentsSent}
  showDocumentsNotice={showDocumentsNotice}
  onCloseDocumentsNotice={() => setShowDocumentsNotice(false)}
  language={language}
/>

{rideRequests.length > 0 && (
  <View className="pb-4">
    <Text className="text-lg font-JakartaBold text-center text-gray-800 mb-2">
      {requestHeader}
    </Text>
    <View className="h-px bg-gray-200 w-full" />
  </View>
)}

  {/* Trigger Button */}

{/* Floating Action Button */}
<Animated.View 
  style={{ 
    position: "absolute",
    top: "100%",
    alignSelf: "center",
    zIndex: 2,
    transform: [{ scale: buttonScale }],
    shadowColor: "#0F52A0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  }}
>
  <TouchableOpacity 
    onPressIn={() => Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start()}
    onPressOut={() => Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start()}
    onPress={() => setModalVisible(true)}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={['#0F7280', '#2AB5DC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="flex-row items-center px-6 py-4 rounded-[14px]"
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
    >
      <Ionicons 
        name="navigate-circle" 
        size={28} 
        color="white" 
        style={{ marginRight: 12 }}
      />
      <Text className="text-white font-JakartaBold text-lg tracking-tight">
        {pickupTxt.toUpperCase()}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
</Animated.View>


<FlatList
  data={rideRequests}
  keyExtractor={(item) => item.id}
  contentContainerStyle={{ paddingBottom: 40 }}
  renderItem={({ item }) => (
    <View className="mx-4 mb-4">
      {/* Ride Card Container */}
      <View style={{ zIndex: 1, position: 'relative' }} className="bg-white rounded-xl p-4 shadow-lg shadow-black/5">
        {/* Ride Type Indicator */}
        <View className={`absolute top-4 right-4 px-2 py-1 rounded-full ${item.type === 'solo' ? 'bg-blue-100' : 'bg-purple-100'}`}>
          <Text className={`text-xs font-JakartaBold ${item.type === 'solo' ? 'text-blue-600' : 'text-purple-600'}`}>
            {item.type === 'solo' ? 'SOLO RIDE' : 'SHARED RIDE'}
          </Text>
        </View>

        {/* Ride Details */}
        <View className="space-y-3">
          <View className="flex-row items-start space-x-2">
            <Ionicons name="location" size={16} color="#3b82f6" />
            <View className="flex-1">
              <Text className="text-sm font-JakartaMedium text-gray-500">Pickup</Text>
              <Text className="text-base font-JakartaSemiBold text-gray-800">
                {item.userFormattedAddress}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start space-x-2">
            <Ionicons name="flag" size={16} color="#ef4444" />
            <View className="flex-1">
              <Text className="text-sm font-JakartaMedium text-gray-500">
                {item.type === 'solo' ? 'Dropoff' : 'Destinations'}
              </Text>
              {item.type === 'solo' ? (
                <Text className="text-base font-JakartaSemiBold text-gray-800">
                  {item.destinationAddress}
                </Text>
              ) : (
                <View className="space-y-1">
                  {item.formattedDropOffPoints.map((point, index) => (
                    <View key={index} className="flex-row items-center space-x-1">
                      <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                      <Text className="text-base font-JakartaMedium text-gray-700">
                        {point.formattedAddress}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
{renderMap(item)}
          {/* Price & Time Section */}
          <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="time" size={16} color="#6b7280" />
              <Text className="text-sm font-JakartaMedium text-gray-600">
                {item.formattedTime}
              </Text>
            </View>
            <View className="bg-emerald-50 px-3 py-1 rounded-full">
              <Text className="text-base font-JakartaBold text-emerald-600">
                {item?.estimatedPrice ?  parseFloat(item?.estimatedPrice) + (parseFloat(item?.tip) || 0) : item?.sumTotal} ETB
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-4">
            <TouchableOpacity
  onPress={async () => {// Store skip event in the database
    await db.runAsync(
      `INSERT INTO ride_skips (driverId, rideId, timestamp) VALUES (?, ?, ?);`,
      [driverId, item.id, Date.now()] 
    );
 await stopLongSound(); // Stop sound when rejecting
      rejectRideRequest(item.id, driverId);
    }}
              className="flex-1 items-center justify-center p-3 bg-gray-100 rounded-lg active:bg-gray-200"
            >
              <Text className="text-base font-JakartaSemiBold text-gray-600">
                {F}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
             onPress={async () => {
 await stopLongSound();
      item.type === 'solo'
        ? acceptRideRequest(tierType, isPioneer, item.id, driverId, creditBalance, isDocumentsSent, item.userFormattedAddress, item.formattedTime, setTip, item.tip || 0, approvedRecharge)
        : acceptSharedRideRequest(tierType, isPioneer, item.id, driverId, item.dropOffPoints, creditBalance, isDocumentsSent, item.formattedTime, approvedRecharge);
    }}
              className="flex-1 items-center justify-center p-3 bg-blue-600 rounded-lg active:bg-blue-700"
            >
              <Text className="text-base font-JakartaSemiBold text-white">
                {E}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Additional Information */}
          {item.message && (
            <View className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Text className="text-sm font-JakartaMedium text-amber-700">
                {item.message}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )}
/>
            </View>
<View className="px-4">


  {/* Customer Details Modal */}
  <Modal
    visible={modalVisible}
    transparent={true}
    animationType="fade"
  >
    <View className="flex-1 justify-end bg-black/60">
      <View className="bg-white rounded-t-3xl p-6 pt-4 max-h-[85vh]">
        {/* Modal Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-JakartaBold text-[#2AA2D0]">
            {header}
          </Text>
          <TouchableOpacity 
            onPress={() => setModalVisible(false)}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        <View className="space-y-5">
          <View className="bg-gray-100 rounded-xl p-3">
            <Text className="text-sm font-JakartaMedium text-gray-500 mb-1">
              {modal1Name}
            </Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              value={customerName}
              onChangeText={setCustomerName}
              className="text-lg font-JakartaMedium text-gray-800"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="bg-gray-100 rounded-xl p-3">
            <Text className="text-sm font-JakartaMedium text-gray-500 mb-1">
              {modal1Phone}
            </Text>
            <TextInput
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              className="text-lg font-JakartaMedium text-gray-800"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-8">
<TouchableOpacity 
  onPress={handleSubmit}
  style={[styles.shadowSm, styles.shadowOrange]}
  className="flex-1 bg-orange-500 rounded-xl py-4 items-center"
>
  <Text className="text-[#eeffff] font-JakartaBold text-lg">
    {button1}
  </Text>
</TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setModalVisible(false)}
            className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
          >
            <Text className="text-gray-700 font-JakartaBold text-lg">
              {button2}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
</View>
              <View className="flex flex-row mb-2 items-center bg-transparent h-[500px] flex-1">
                <Map rideType= "home" />
              </View>
{rideRequests.length < 1 && (
      <View className="bg-white rounded-2xl mx-4 p-6 shadow-sm shadow-black/10 mt-4">
      {/* Kilometer Price */}  
      <View className="mb-6">
        <Text className="text-gray-700 font-JakartaSemiBold text-base mb-2">{M}</Text>
        <TouchableOpacity 
          onPress={() => setVisibleField(visibleField === 'kilometerPrice' ? null : 'kilometerPrice')}
          className="flex-row justify-between items-center bg-gray-100 rounded-lg px-4 py-3"
        >
          <Text className="font-JakartaMedium text-gray-600">
            {kilometerPrice || kmPriceStore || 'Select Price'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        {visibleField === 'kilometerPrice' && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {prices.map((price) => (
              <TouchableOpacity
                key={price}
                onPress={() => {
                  setKilometerPrice(price); setKmPriceStore(price);
                  setVisibleField(null);
                  updatePrices({
                  price,
                  type: "day",
                  ther: nightkmPriceStore,
                  updateLog: priceUpdateLog,
                  setUpdateLog: setPriceUpdateLog,
                  driverId,
                       });
                }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full"
              >
                <Text className="font-JakartaMedium text-gray-700">{price} ETB</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Night Price */}
      <View>
        <Text className="text-gray-700 font-JakartaSemiBold text-base mb-2">{L}</Text>
        <TouchableOpacity 
          onPress={() => setVisibleField(visibleField === 'nightKilometerPriceHome' ? null : 'nightKilometerPriceHome')}
          className="flex-row justify-between items-center bg-gray-100 rounded-lg px-4 py-3"
        >
          <Text className="font-JakartaMedium text-gray-600">
            {nightKilometerPriceHome || nightkmPriceStore || 'Select Price'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        {visibleField === 'nightKilometerPriceHome' && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {nightPrices.map((price) => (
              <TouchableOpacity
                key={price}
                onPress={() => {
                  setNightKilometerPriceHome(price);setNightkmPriceStore(price);
                  setVisibleField(null); 
                  updatePrices({
                  price,
                  type: "night",
                  other: kmPriceStore,
                  updateLog: priceUpdateLog,
                  setUpdateLog: setPriceUpdateLog,
                  driverId,
                       });
                               }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full"
              >
                <Text className="font-JakartaMedium text-gray-700">{price} ETB</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
)}

   {/* --- NEW & IMPROVED: Dedicated Services Section --- */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>More Services</Text>
                <FlatList
                    data={services}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.serviceCard} onPress={item.action}>
                            <View style={[styles.serviceIconContainer, { backgroundColor: item.color + '20' }]}>
                               <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                            </View>
                            <Text style={styles.serviceCardTitle}>{item.title}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingRight: 16 }}
                />
            </View>

    {/* Community Post */}
    {postCount < 10 && (
      <View className="bg-white rounded-2xl mx-4 p-5 mt-6 shadow-sm shadow-black/10">
        <TouchableOpacity 
          onPress={() => router.push({ pathname: "/(root)/(tabs)/posts" })}
        >
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-2">
              <Text className="font-JakartaBold text-orange-500">S</Text>
            </View>
            <View>
              <Text className="font-JakartaBold text-gray-800">Samri</Text>
              <Text className="text-gray-500 text-sm">{new Date().toLocaleTimeString()}</Text>
            </View>
          </View>

          <Text className="text-gray-700 mb-4">"Avoid rush hours near Rwanda, it's a nightmare!"</Text>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full">
                <Entypo name="arrow-up" size={16} color="#4b5563" />
                <Text className="ml-1 font-JakartaMedium text-gray-600">34</Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full">
                <Entypo name="arrow-down" size={16} color="#4b5563" />
                <Text className="ml-1 font-JakartaMedium text-gray-600">12</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-sm">22 comments</Text>
          </View>
        </TouchableOpacity>
      </View>
    )}

    {/* Recharge Section */}
    <View className="mx-4 mt-6">
      <TouchableOpacity 
        onPress={() => handleRecharge(driverId, creditBalance)}
        className="border-2 border-orange-500 rounded-xl py-3 flex-row items-center justify-center"
      >
        <MaterialIcons name="attach-money" size={20} color="#f97316" />
        <Text className="ml-2 font-JakartaMedium text-orange-500 text-lg">Process</Text>
      </TouchableOpacity>
    </View>
          </>          
        }
      />     
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalTitle: { fontSize: 20, marginBottom: 10, color: "white" },
  input: { width: "80%", padding: 10, marginVertical: 10, backgroundColor: "white", borderRadius: 5 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", width: "60%", marginTop: 20 },
    container: { flex: 1, backgroundColor: '#fff', paddingBottom:200 },
  seperatorView: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 20 },
  seperator: { color: '#232323', fontSize: 16 },
  seperatorView2: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 5, marginBottom:5 },
// In your StyleSheet.create()
shadowSm: {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2, // For Android
},
shadowOrange: {
  shadowColor: '#2AB5DC',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 6, // For Android
},
  seperator2: { fontFamily: 'mon-sb', color: Colors.grey, fontSize: 12 },
  btnOutline: { backgroundColor: '#0F52BA', borderWidth: 1, borderColor: "#0F52dA", height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10 },
  btnOutlineText: { color: '#fff', fontSize: 16, fontFamily: 'mon-sb' },
    text: { color: '#0F52BA', fontSize: 12.2, }, buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    width: "100%",
  },
    overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Make sure it's on top
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  messageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  subMessageText: {
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
  },
    sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
   serviceCard: {
    backgroundColor: Colors.backgroundWhite,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 8,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  serviceCardDescription: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginLeft: 36, // Align with title
  },
});
export default Home;
