import { useLocalSearchParams, router } from "expo-router";
import auth from '@react-native-firebase/auth';
import { useLocationStore, useLanguageStore, useSharedCancelledStore, useSharedAddStore, useCallCenterPickupStore } from "@/store";
import { handleCall } from "@/lib/utils";
import firestore from '@react-native-firebase/firestore';
import {checkAndResetCounts, createRide} from "@/lib/utils"
import {rideTranslations} from "@/lib/translations"
import React, { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import * as Linking from 'expo-linking';
import { View, Text, TouchableOpacity, Alert, Image, ActivityIndicator, StyleSheet, Button } from "react-native";
import { icons } from "@/constants";
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { checkAndResetTripCounts, db } from "@/lib/localDB";
import * as Notifications from "expo-notifications";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const BeginRideScreen = () => {
const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const { language, setLanguage } = useLanguageStore();  
  const t = rideTranslations[language];

  const [currentQrcdata, setCurrentQrcdata] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false); // To toggle scanner
const [currentCorider, setCurrentCorider] = useState({ index: null, name: "", pnumber: "" });

  const { requestTime, rideRequestId, dropOffPoints: dropOffPointsStr, expoToken } = useLocalSearchParams(); // Get rideRequestId passed from the previous screen
  const [dropOffPoints, setDropOffPoints] = useState(JSON.parse(dropOffPointsStr));
  const { cancelledNumber, reset: resetCancelled } = useSharedCancelledStore();
  const { addedMember, reset: resetAdded } = useSharedAddStore();

const { setUserLocation, userLatitude, userLongitude } = useLocationStore();
const dbFirestore = getFirestore();
const auth = getAuth();
const user = auth?.currentUser;
const driverId = user?.uid;

const [loading, setLoading] = useState(false);
const { pickup, clearPickup } = useCallCenterPickupStore();

  const [startTime, setStartTime] = useState(new Date().getTime());
  const [trackingState, setTrackingState] = useState(false);
  const [coriderPickupData, setCoriderPickupData] = useState([]);
  const [penalty, setPenalty] = useState(0); 
  const bottomSheetRef = useRef(null);

  // Watch for cancellations
  useEffect(() => {
    if (cancelledNumber) {
      setDropOffPoints((prev) =>
        prev.filter((member) => member.pnumber !== cancelledNumber)
      );
      resetCancelled();
    }
  }, [cancelledNumber]);

  // Watch for new members
  useEffect(() => {
    if (addedMember) {
      setDropOffPoints((prev) => [...prev, addedMember]);
      resetAdded();
    }
  }, [addedMember]);

useEffect(() => {
 
  if (pickup) {
    handleCallCenterCoriderPickup(pickup);
    clearPickup(); // Clear so it doesn’t trigger again
  }
}, [pickup]);


const snapPoints = ['25%', '50%', '70%'];
  useEffect(() => {
    if (dropOffPoints.length < 1) {
      router.replace('/home');
    setTimeout(() => {
        setDropOffPoints([]); // Reset after navigating
      }, 500); // Delay to ensure state is reset after navigation
    }
  }, [dropOffPoints]);

useEffect(() => {
checkAndResetTripCounts(driverId) 
 }, [driverId]); 

const handleCallCenterCoriderPickup = async ({ name, pnumber, expoToken }) => {
 
  try {
    let location = await Location.getCurrentPositionAsync({});
    const pickupLat = location.coords.latitude;
    const pickupLng = location.coords.longitude;
    const pickupTime = new Date().getTime();

const index = dropOffPoints.findIndex(point => point.pnumber === pnumber);
    let calculatedPenalty = 0;
    if (coriderPickupData.length > 0) {
      const lastPickupTime = coriderPickupData[coriderPickupData.length - 1].pickupTime;
      const timeDifference = (pickupTime - lastPickupTime) / (1000 * 60);

      if (timeDifference > 5) {
        const extraMinutes = timeDifference / 4;
        calculatedPenalty = Math.ceil(extraMinutes) * 5;
      }
    }

    setCoriderPickupData(prev => [
      ...prev,
      {
        index,  name, pnumber, pickupTime,  pickupLat,
        pickupLng,    penalty: calculatedPenalty,
        isPickedUp: true,  expoToken, isCallCenter: true,
      }
    ]);

    await sendPickupNotifications({ name, pnumber, pickupTime, pickupLat, pickupLng });
    Alert.alert("Success", `${name} (Call Center) picked up!`);
    clearPickup();
  } catch (error) {

  }
};



  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
  setShowScanner(false);
  const { index, name, pnumber, expoToken } = currentCorider;
 
    if (data === currentQrcdata) {
 
      Alert.alert("Success", "QR code verified. Passenger picked up!");
      // Proceed with the pickup logic here
     try {
      let location = await Location.getCurrentPositionAsync({});
      const pickupLat = location.coords.latitude;
      const pickupLng = location.coords.longitude;
      const pickupTime = new Date().getTime();

      let calculatedPenalty = 0;

      // Check if there's more than 4 minutes difference from the last pickup
      if (coriderPickupData.length > 0) {
        const lastPickupTime = coriderPickupData[coriderPickupData.length - 1].pickupTime;
        const timeDifference = (pickupTime - lastPickupTime) / (1000 * 60); // Time in minutes

        if (timeDifference > 5) { // Only apply penalty if more than 4 minutes
          const extraMinutes = timeDifference/4;
          calculatedPenalty = Math.ceil(extraMinutes) * 5; // 5 birr per extra minute
        }
      }

      // Add pickup data to the state
      setCoriderPickupData(prev => [
        ...prev,
        { index, name, pnumber, pickupTime, pickupLat, pickupLng, penalty: calculatedPenalty, isPickedUp: true, expoToken }
      ]);

      await sendPickupNotifications({ name, pnumber, pickupTime, pickupLat, pickupLng });

    } catch (error) {

    }
    setLoading(false)      
    } else {
      Alert.alert("Whoops", "Invalid QR code. Please scan again.");
      setScanned(false); // Allow scanning again
    }
  };
const sendPickupNotifications = async ({ name, pnumber, pickupTime, pickupLat, pickupLng }) => {
  try {
    // Filter out the picked-up passenger for the general notification
    const otherPassengers = dropOffPoints.filter(p => p.pnumber !== pnumber);

    // Send general pickup notification to other passengers
    const messages = otherPassengers.map((passenger) => ({
      to: passenger.expoToken, // Ensure each passenger has a valid Expo push token
      sound: "default",
      title: "Passenger Picked Up",
      body: `${name} has entered the vehicle.`,
      data: { name, pnumber, pickupTime, pickupLat, pickupLng, type: "pickup_notification" },
    }));

    // Send a personal pickup notification to the picked-up passenger
    const pickedUpPassenger = dropOffPoints.find(p => p.pnumber === pnumber);
    if (pickedUpPassenger) {
      messages.push({
        to: pickedUpPassenger.expoToken,
        sound: "default",
        title: "You're Picked Up!",
        body: "You've just been picked up. Have a great ride!",
        data: { pickupTime, pickupLat, pickupLng, type: "personal_pickup_notification" },
      });
    }

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

//console.log(coriderPickupData, "coriderPickupData")
  const handleCoriderPickup = async (index, name, pnumber, qrcdata, expoToken, isCallCenter) => {
    let encData = "Share"+qrcdata+pnumber
    setCurrentQrcdata(encData);
    setCurrentCorider({ index, name, pnumber, expoToken }); // Save corider info
if (isCallCenter)
    {     
      Alert.alert("Whoops", "ell he call center.");
      return  }
else
  {setShowScanner(true);}   
  };

  // To disable the button after pickup
  const isCoriderPickedUp = (index) => {
    return coriderPickupData.some((pickup) => pickup.index === index && pickup.isPickedUp);
  };
// console.log(dropOffPoints, "dropOffPoints")

  const handleBeginRide = async () => {
    setLoading(true)
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Enable your location!");
        return; // Exit if location permission is not granted
      }

      let originLocation = await Location.getCurrentPositionAsync({});
      const originLat = originLocation.coords.latitude;
      const originLng = originLocation.coords.longitude;
const originAddress1 = await Location.reverseGeocodeAsync({
 latitude: parseFloat(originLat), longitude: parseFloat(originLng)});

const originAddress = `${originAddress1[0].name}, ${originAddress1[0].region}`
      // Start tracking the ride
      setTrackingState(true);
      const currentTime = new Date().getTime();
      setStartTime(currentTime);
 
      // Update the ride status in Firestore to "started"
const rideRef = doc(dbFirestore, 'requests', rideRequestId);
await updateDoc(rideRef, {
  status: "started",
  coriderPickupData,
  startTime: currentTime
});
       createRide({
    id: rideRequestId,
    user_id: null,
    driverId,
    requestType: "corider", // 'solo' or 'corider'
    originAddress,
    address: "corider",
    originLat,
    originLng,
    endLat: 8.67676767,
    endLng: 38.8787878,
    farePrice: 0,
    timeTaken: "0m",
    CoriderPickupData: coriderPickupData,
    customerPhone: null,
    status: "completed"})

// console.log(dropOffPoints, "dropOffPoints")
      // Navigate to the next screen, passing all necessary params
      router.replace({
        pathname: "(root)/rideshare/ride-screen",
        params: {
          dropOffPoints: JSON.stringify(dropOffPoints),
          rideRequestId, originLng, originLat,
          startTime: currentTime,
          trackingState: true,
          coriderPickupData: JSON.stringify(coriderPickupData), 
          requestTime
        },
      });

          // Insert ride details into SQLite
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO active_shared_ride 
        (driverId, rideId, originLat, originLng, dropOffPoints, coriderPickupData, startTime, trackingState, remainingPassengers, status, requestTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [driverId, rideRequestId, originLat, originLng, JSON.stringify(dropOffPoints), JSON.stringify(coriderPickupData), currentTime, 1, coriderPickupData.length, 1, requestTime]
      );

    } catch (dbError) {

    }
    } catch (error) {

    }
    setLoading(false)  
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }
 if (showScanner) {
    if (!permission) {
    // Camera permissions are still loading.  
    return <View   >
    <Text> Camera permissions are still loading.   </Text>  
    </View>;
  }

  if (!permission.granted) {       
    // Camera permissions are not granted yet.
    return (
      <View  style={{
    position: "absolute",
    alignSelf: "center",
    top: "50%", // Distance from the bottom
  }}>
        <Text>We need your permission to show the camera</Text>
        <Button color="black" onPress={requestPermission} title="grant permission" />
      </View>
    );
  }  
  }

  const AvatarBadge = ({ source, status = 'pending', size = 64, style }) => {
  const statusConfig = {
    success: {
      color: '#4CAF50',
      icon: 'check-circle',
    },
    pending: {
      color: '#9E9E9E',
      icon: 'clock',
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  return (
    <View style={[styles.avaContainer, style]}>
      <Image
        source={source}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      />
      <View style={[
        styles.avaBadge,
        {
          backgroundColor: currentStatus.color,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
        }
      ]}>
        <FontAwesome6
          name={currentStatus.icon}
          size={size * 0.2}
          color="white"
          solid
        />
      </View>
    </View>
  );
};


  // Co-Rider List Item
  const renderCoRider = ({ item, index }) => (
    <View key={`${item.pnumber}-${index}`} style={styles.coRiderCard}>
      <AvatarBadge 
        source={{ uri: item?.profileImage || "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg" }} 
        status={item.pickedUp ? 'success' : 'pending'}
      />
      <View style={styles.coRiderInfo}>
        <Text style={styles.coRiderName}>{item.name}</Text>
          <TouchableOpacity 
              style={styles.callButton} className="mr-3"
              onPress={() => handleCall(item.pnumber)}>
              <FontAwesome6 name="phone" size={20} color="#FFF" />
            <Text className="ml-5 text-teal-50 item-center font-Jakarta-Light" > {item.pnumber} </Text>
            </TouchableOpacity>
        <Text className="mt-1 font-Jakarta-Light" style={styles.coRiderStatus}>
          {isCoriderPickedUp(index) ? 'Picked Up' : 'En Route'}
        </Text>
      </View>
      {isCoriderPickedUp(index) && (
        <FontAwesome6 name="check-circle" size={24} color="#4CAF50" />
      )}
    </View>
  );


  return (
       <GestureHandlerRootView style={{ flex: 1 }}>
    {showScanner && ( 
     <CameraView
       barcodeScannerSettings={{
    barcodeTypes: ["qr"],
  }}
    onBarcodeScanned={handleBarCodeScanned}
      style={styles.camera} facing={facing}>
              <Text className="font-JakartaSemiBold mt-3 p-2 text-center" style={{  flex: 4, color: "white", fontSize: 18, width: '100%', alignSelf: 'center',}}>
 {t.scanQrCode} 
          </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text className="font-JakartaSemiBold text-white mt-3 p-2 text-center" style={styles.text}> {t.flipCamera}</Text>
          </TouchableOpacity>

         <TouchableOpacity style={styles.button} onPress={() => setShowScanner(false)}>
            <Text className="font-JakartaSemiBold text-white mt-3 p-2 text-center" style={styles.text}>   {t.cancel} </Text>
          </TouchableOpacity>
        </View>
      </CameraView>)}      
    <View className= "flex-1 bg-white mt-5">

      <Text className="text-center text-lg font-semibold font-JakartaBold mb-2 mt-10"> {t.rideAccepted}</Text>

      {loading || showScanner ? (
      <ActivityIndicator  size="large"  color="#000" style={{ marginVertical: 20 }}/>
    ) : (
    dropOffPoints.map((point, index) => (
<TouchableOpacity
  key={`${point.name}-${index}`}
  className={isCoriderPickedUp(index) ? 'bg-gray-500 py-3 rounded mb-3' : 'bg-teal-600 py-3 rounded mb-3'}
  onPress={() => handleCoriderPickup(index, point.name, point.pnumber, point.origin[0], point.expoToken, point?.isCallCenter)}
  disabled={isCoriderPickedUp(index)}
>
      <Text className={`text-white text-center font-semibold ${isCoriderPickedUp(index) ? 'line-through' : 'font-JakartaBold'}`}>
                {isCoriderPickedUp(index) ? t.pickedUpPassenger(point.name) : t.pickUpPassenger(point.name)} {/* Translated pick up/picked up text */}
              </Text>
</TouchableOpacity>
))
     )}

     {loading ? (
      <ActivityIndicator
        size="large"
        color="#800020"
        style={{ marginTop: 20 }}
      />
    ) : (
    coriderPickupData.length === dropOffPoints.length && ( 
      <TouchableOpacity
        className="bg-orange-500 py-3 rounded"
        onPress={handleBeginRide}
      >
        <Text className="text-white text-center font-semibold font-JakartaBold">
        {t.beginRide}
        </Text>
      </TouchableOpacity> )
      )}

      <Text className="mt-3 px-5 pb-3 pt-3 bg-slate-50 font-Jakarta text-md">
        {t.greetingShared(user?.displayName)}
      </Text>

      {/* Show the current origin locations on the map */}

 <MapView
    provider={PROVIDER_GOOGLE}
      style={{ height: 500, width: '100%' }}
      initialRegion={{
        latitude: dropOffPoints[0]?.dropOff[0] || dropOffPoints[1]?.dropOff[0] || userLatitude + 0.05, 
        longitude: dropOffPoints[0]?.dropOff[1] || dropOffPoints[1]?.dropOff[1] || userLongitude + 0.05,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
{dropOffPoints.map((point, index) => (
  <Marker
    key={`${point.name}-${index}`} // Ensure unique key for each Marker
    coordinate={{ latitude: point.origin[0], longitude: point.origin[1] }}
    title={point.name}
    description={`Current Location`}
  />
))}

    </MapView>
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundComponent={({ style }) => (
          <View style={[style, styles.sheetBackground]} />
        )}>
        
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {/* Co-Riders List */}
          <Text className="font-JakartaBold bg-slate-50 ml-4" style={styles.sectionTitle}>Co-Riders ({dropOffPoints.length})</Text>
          {dropOffPoints.map((member, index) => renderCoRider({ item: member, index}))}

        </BottomSheetScrollView>
      </BottomSheet>
 
    </View>
    </GestureHandlerRootView>
);}


const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <FontAwesome6 name={icon} size={20} color="#0F77EA" />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 119, 234, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrButton: {
    backgroundColor: '#1A73E8',
    padding: 12,
    borderRadius: 12,
  },
  etaContainer: {
    flex: 1,
    marginLeft: 16,
  },
  etaText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  distanceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  qrModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
  },
  qrHint: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  driverInfo: {
    flex: 1,
    marginLeft: 16,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  callButton: {
        flexDirection: 'row',
    backgroundColor: '#0F77EA',
    padding: 12,
    borderRadius: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Inter-SemiBold',
  },
  coRiderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  coRiderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  coRiderName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  coRiderStatus: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  carMarker: {
    alignItems: 'center',
  },
  driverBadge: {
    backgroundColor: '#0F77EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  driverBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
   avaContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avaBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  camera: {
    flex: 1
  }
});


export default BeginRideScreen;
