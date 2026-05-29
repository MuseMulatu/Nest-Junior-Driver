import AWS from "aws-sdk";
import React, { useEffect, useState,  useRef } from "react";
import { ActivityIndicator, Text, View, Alert, Image, Modal, TouchableOpacity, TextInput, Button, StyleSheet, ScrollView } from "react-native";
import MapView, { Marker, Callout, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import auth from '@react-native-firebase/auth';
import { db, storeTipsLocally, shouldDownloadTips, deleteOutdatedTips, getTotalFetchCount, incrementFetchCount} from '@/lib/localDB'; 
import { emergencyButton } from "@/lib/utils";
import { Picker } from "@react-native-picker/picker";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { icons } from "@/constants";
import {  calculateDriverTimes, calculateRegion, generateMarkersFromData,} from "@/lib/map";
import {TipModal} from "@/lib/modals"
import { useDriverStore, useLocationStore, usePioneerStore, useCreditbalanceStore,  useLanguageStore, useTierLimitsStore, useShareUsernameStore, useEmergencyStore, usePhoneNumberStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import { startLocationTracking, LOCATION_TASK_NAME } from '@/backgroundTasks';
import axios from 'axios';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { haversineDistance } from '@/backgroundTasks';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

AWS.config.update({
  region: process.env.EXPO_PUBLIC_R, 
  accessKeyId: process.env.EXPO_PUBLIC_AI,
  secretAccessKey: process.env.EXPO_PUBLIC_SAI,
      // Disable CRC32 validation to prevent integrity check errors
    dynamoDbCrc32: false,
});
//
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const directionsAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY;
const Map = ({ origin, destination, dropOffPoints = [], googlePlacesApiKey, rideType}) => { 
  const user = auth().currentUser;
  const driverId =user.uid;
  const { phoneNumberStore, carModel, seatNumber,  profileImageUrl, plateNumber } =  usePhoneNumberStore() 
  const { 
    setUserLocation, setDestinationLocation, userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();
  const [region, setRegion] = useState(null);
  const { tierLimits, setTierLimits } = useTierLimitsStore();
  const [title, setTitle] = useState("");
const [author, setAuthor] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState(""); // Category state

const {shareUsername} = useShareUsernameStore(); 
const { trackedDriver } = useEmergencyStore();
  const [selectedCategory, setSelectedCategory] = useState("All"); 
  const categories = [
    "General",
    "Reminder",
    "Road Closed",
    "Parking Not Allowed",
    "Traffic Jam",
    "New Regulations",
    "Fuel Available",
    "Road Opened",
  ];
const [selectedTipId, setSelectedTipId] = useState(null);
const [createdAt, setCreatedAt] = useState('');
const [distanceToUser, setDistanceToUser] = useState(0);

const { tierType, setTierType} = usePioneerStore()
const { creditBalance, setCreditBalance } = useCreditbalanceStore()
const [hideTips, setHideTips] = useState(false);
const [ maxTipFetches, setMaxTipFetches ] = useState(40);
const [tips, setTips] = useState([]);
const [reminders, setReminders] = useState([]);

const [modalVisible, setModalVisible] = useState(false);
const [detailmodalVisible, setDetailmodalVisible] = useState(false);
  const [modalLatitude, setModalLatitude] = useState(null);
  const [modalLongitude, setModalLongitude] = useState(null);

    const getLocationWithRetries = async (maxAttempts = 10, delayMs = 1000) => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        let location = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${address[0].name}, ${address[0].region}`,
        });
console.log("Attempt number", attempts, ", location value is:", address[0].name, address[0].region)
        return; // Exit the loop if location is successfully fetched
      } catch (error) {

        if (attempts >= maxAttempts) {

        } else {
          await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait before retrying
        }
      }
    }
  };
const getThresholdForTier = (tier) => {
  switch (tier) {
    case 'noBenefits':
      return 15;
    case 'basic':
      return 40;
    case 'standard':
      return 75;
    case 'premium':
      return 100;
    default:
      return 15; // Default threshold if tierType is unknown
  }
};
//

// Check if tips should be hidden based on fetch count & credit balance
const checkTipUsageLimit = async () => {
  try {
    const totalFetches = await getTotalFetchCount("tips");
    if(!tierType || !tierLimits)
   
    { return; }
      

const { maxTipFetches, maxPostsPerHour } = tierLimits[tierType];
  
    if (totalFetches >= maxTipFetches) {
      //console .log(totalFetches, "totalFetches", maxTipFetches, "maxTipFetches")
      setHideTips(true);
    }
  } catch (error) {
  }
};  

useEffect(() => {
  console .log("tierLimits abve checkTipUsageLimit:", tierLimits)
  checkTipUsageLimit();
  if(tips){
    console .log(tips, "tips", )
  }
}, [tips, tierLimits]);  

  useEffect(() => {
  
    if (userLatitude && userLongitude) {
      const r = calculateRegion({
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      });
      setRegion(r);
    }

     if (!userLatitude || !userLongitude) {
          (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        return;
      }
 await getLocationWithRetries();
    })();
    } 
    if(!hideTips)(fetchApprovedTips())
if (hideTips && creditBalance < 50) {
  //console .log("⛔ Hiding tips due to creditBalance < 50");
  setTips([]);
}

  }, [userLatitude, driverId ]);



  const handleLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setModalLatitude(latitude); setModalLongitude(longitude)
    setModalVisible(true);
  };

const fetchApprovedTips = async () => {
    const totalFetches = await getTotalFetchCount("tips");
    console.log("totalFetches", totalFetches)
    if(!tierType || !tierLimits)
    {console.log("!tierLimits", !tierLimits); return; }
const { maxTipFetches, maxPostsPerHour } = tierLimits[tierType];
    console.log("maxTipFetches, maxPostsPerHour ", maxTipFetches, maxPostsPerHour, tierLimits, tierType)
    if (totalFetches >= maxTipFetches) {
         if(tierType === "premium") {
      const remindersLocal = await db.getAllAsync(`SELECT * FROM reminders`);
setReminders(remindersLocal);
      return;
}
 setTips(localTips || []);
    //console.log("Skipping fetch, data is fresh.");
    return;
    }
  // Fetch new recent approved tips from DynamoDB
  //console .log("dynamoDB", dynamoDB)
const result = await fetchFromDynamoDB() || []; // Ensure array fallback

console .log("setting tips to", result);
setTips(result);
      const remindersLocal = await db.getAllAsync(`SELECT * FROM reminders`);
setReminders(remindersLocal);
 console .log("  ⚠️   ⚠️   ⚠️   ⚠️   ⚠️ tips at the end", tips, "result ke dynamoDB:", result, "reminders in shouldFetch", remindersLocal)     
  await deleteOutdatedTips(result);
  await storeTipsLocally(result);
  await incrementFetchCount("tips");
};


const submitTip = async () => {
      if (!title || !details || !category) {
      alert("Please fill in all fields!");
      return;
    }
      if (!modalLatitude|| !modalLongitude ) {
      alert("Long press on the map to select a tip location first!");
      return;
    }

  if (!title.trim() || !details.trim() || !category.trim()) {
     Alert.alert("Empty Fields", "Please fill in all fields!");
    return;
  }

  if (title.length > 60 || details.length > 400) {
     Alert.alert("Whoops", "length exceeds allowed amount.");
    return;
  }
  const newTip = {
    id: driverId,
    title,
    details,
    author: shareUsername || user?.displayName, 
    category,
    latitude: modalLatitude,
    longitude: modalLongitude,
    status: "pending", // Will be approved by admin later
    created_at: new Date().toISOString(),
  };
  if(category!== "Reminder"){
 const combinedTips = [...tips, newTip]
setTips(combinedTips)
}

if(category==="Reminder"){
   await db.runAsync(
      `INSERT INTO reminders (title, details, latitude, longitude, date) VALUES (?, ?, ?, ?, ?)`,
      [title, details, modalLatitude, modalLongitude, Math.floor(Date.now() / 1000)]
    );
       // Clear modal after submission
    setModalVisible(false);
    setTitle("");
    setDetails("");
    setCategory("");
   return;
}
  const params = {
    TableName: "TipsTable",
    Item: newTip,
  };

  try {
    await dynamoDB.put(params).promise();
    //console.log("Tip successfully submitted.");

    // Clear modal after submission
    setModalVisible(false);
    setTitle("");
    setDetails("");
    setCategory("");
  } catch (error) {

  }
};


const fetchFromDynamoDB = async () => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1); // 24 hours ago

const params = {
  TableName: "TipsTable",
  IndexName: "status-created_at-index",
KeyConditionExpression: "#status = :approved AND #created_at > :yesterday",
ExpressionAttributeNames: {
  "#status": "status",
  "#created_at": "created_at",
},
  ExpressionAttributeValues: {
    ":approved": "approved",
    ":yesterday": new Date(Date.now() - 600 * 60 * 60 * 1000).toISOString(),
  },
};
  try {

    const result = await dynamoDB.query(params).promise();
    console .log("DynamoDB query params:", JSON.stringify(params, null, 2));
console .log("Approved and recent tips:", result.Items);

    return result.Items || [];
  } catch (error) {
  console .error(" query failed:", error); // <-- add this
  return [];
  }
};

const ICON_MAP = {
  "Traffic Jam": "traffic-light",
  "Parking Not Allowed": "car-brake-parking",
  "New Regulations": "bell-badge",
  "Road Closed": "movie-open",
  "Fuel Available": "note-check",
  "Road Opened": "road-variant",
  "General": "information-variant",
    default: "information-variant"
};

  const onClose = () => {
  setModalVisible(false);
  setTitle('');
  setDetails('');
};

const [pathCoordinates, setPathCoordinates] = useState([]);

useEffect(() => {
  if (origin && destination) {
    const fetchOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        const coords = response.data.routes[0].geometry.coordinates;

        const formattedCoords = coords.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));

        setPathCoordinates(formattedCoords);
      } catch (error) {

      }
    };

    fetchOSRMRoute();
  }
}, [origin, destination]);

// Update your marker press handler
const handleMarkerPress = (tip: Tip) => {
  setTitle(tip.title);
  setDetails(tip.details);
  setAuthor(tip?.author || "Share Community");
  setSelectedTipId(tip.id);
  setCreatedAt(tip.created_at);
  
  // Calculate distance if you have user location
  if (userLatitude && userLongitude) {
    const distance = haversineDistance(
      userLatitude,
      userLongitude,
      tip.latitude,
      tip.longitude
    );
    setDistanceToUser(distance);
  }
  
  setDetailmodalVisible(true);
};

// Star Rating Component
const StarRating = ({ tipId, initialRating }) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSummary, setRatingSummary] = useState({ count: 0, avg: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

useEffect(() => {
    const checkIfRated = async () => {
      try {
        const result = await db.getFirstAsync(
      'SELECT rating FROM ratedTips WHERE user_id = ? AND tip_id = ?',
      [driverId, tipId]
    );

       if (result) {
      setSelectedRating(parseInt(result.rating)); // Visually fill stars

      setAlreadyRated(true);
    }
      } catch (err) {

      }
    };

    const loadRating = async () => {
      try {
        const response = await fetch(`https://server-7az0.onrender.com/tip-rating?tipId=${tipId}`);
        if (!response.ok) return;
        const summary = await response.json();

        setRatingSummary(summary);
       // setSelectedRating(Math.round(summary.avg));
      } catch (err) {

      }
    };
    checkIfRated();
    loadRating();
  }, [tipId]);

const handleRating = async (rating) => {
    if (isSubmitting || alreadyRated) return;
    setIsSubmitting(true);

    try {
      setSelectedRating(rating);
      const response = await axios.post('https://server-7az0.onrender.com/rate-tip', { tipId, rating });
      // Save to local db
      await db.runAsync(
  'INSERT OR REPLACE INTO ratedTips (user_id, tip_id, rating) VALUES (?, ?, ?)',
  [driverId, tipId, rating]
);
      Alert.alert("Thank you!", "Your feedback has been submitted.");
      setAlreadyRated(true);
    } catch (err) {

      setSelectedRating(0);
    }
    setIsSubmitting(false);
  };
  return (
    <View className="mt-4">
      <View className="flex-row justify-center items-center mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity 
          key={star}
          onPress={() => handleRating(star)}
          disabled={isSubmitting || alreadyRated}
          className="p-1"
        >
          <Ionicons
            name={star <= selectedRating ? "star" : "star-outline"}
            size={28}
            color={star <= selectedRating ? "#f59e0b" : "#d1d5db"}
          />
        </TouchableOpacity>
        ))}
      </View>
{alreadyRated && (
  <Text className="text-center text-sm text-gray-400 mt-1">
    You’ve already rated this tip: <Text className="text-orange-500 font-bold">{selectedRating}</Text> stars.
  </Text>
)}
      <Text className="text-center text-teal-500 text-sm font-JakartaMedium">
    People rated this tip  <Text className="text-center text-orange-500 text-sm font-JakartaBold">
  {ratingSummary?.average_rating ? Number(ratingSummary.average_rating).toFixed(1) : " "}
</Text>  stars.
      </Text>
    </View>
  );
};


if (!userLatitude && !userLongitude) {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#f97316" />
      <Text className="mt-4 font-JakartaMedium text-gray-600">Loading Map...</Text>
    </View>
  );
}

return (
  <View className="flex-1 bg-gray-50">
    {/* Add Tip Modal */}
    <Modal visible={modalVisible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="w-[90%] max-w-md bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-JakartaBold text-gray-800">New Location Tip</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="font-JakartaMedium text-gray-600 mb-1">Title</Text>
              <TextInput
                placeholder="e.g., Closed Road - Bole Road"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                className="bg-gray-100 rounded-lg px-4 py-3 font-JakartaMedium"
              />
            </View>

            <View>
              <Text className="font-JakartaMedium text-gray-600 mb-1">Details</Text>
              <TextInput
                placeholder="Describe the situation..."
                placeholderTextColor="#9ca3af"
                value={details}
                onChangeText={setDetails}
                multiline
                className="bg-gray-100 rounded-lg px-4 py-3 h-24 font-JakartaMedium"
              />
            </View>

            <View>
              <Text className="font-JakartaMedium text-gray-600 mb-1">Category</Text>
              <View className="bg-gray-100 rounded-lg">
                <Picker
                  selectedValue={category}
                  onValueChange={setCategory}
                  dropdownIconColor="#6b7280"
                  mode="dropdown"
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((cat, index) => (
                    <Picker.Item 
                      key={index} 
                      label={cat} 
                      value={cat} 
                      fontFamily="JakartaMedium"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity 
                onPress={submitTip}
                className="flex-1 bg-orange-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-JakartaBold">Submit Tip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onClose}
                className="flex-1 bg-gray-100 rounded-lg p-3 items-center"
              >
                <Text className="text-gray-700 font-JakartaBold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>

    {/* Detail Modal */}
<Modal visible={detailmodalVisible} transparent animationType="slide">
  <View className="flex-1 justify-end bg-black/60">
    <View className="bg-white rounded-t-3xl p-6 max-h-[70vh]">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-JakartaBold text-gray-800">{title}</Text>
        <TouchableOpacity       onPress={() => {
       setDetailmodalVisible(false);
       setSelectedTipId(null);
      }}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <ScrollView className="mb-4">
        <Text className="text-gray-600 font-JakartaMedium leading-6 mb-4">
          {details}
        </Text>
        
        <View className="border-t border-b border-gray-100 py-4 my-4">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="person-circle" size={20} color="#4b5563" />
            <Text className="text-gray-500 font-JakartaMedium">
              Posted by {author || "Share Community"}
            </Text>
          </View>
            { selectedTipId && (
              <StarRating 
                tipId={selectedTipId} 
                initialRating={selectedTipId} 
              />)}
          </View>

        {/* Additional Tip Metadata */}
        <View className="flex-row justify-between mt-4">
<View className="flex-row items-center space-x-2">
  <Ionicons name="time" size={16} color="#4b5563" />
  <Text className="text-gray-500 text-sm font-JakartaMedium">
    {createdAt ? dayjs(createdAt).fromNow() : 'Recently'}
  </Text>
</View>
          <View className="flex-row items-center space-x-2">
            <Ionicons name="location" size={16} color="#4b5563" />
            <Text className="text-gray-500 text-sm font-JakartaMedium">
              {Math.round(distanceToUser)|| 0} km away
            </Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity 
      onPress={() => {
       setDetailmodalVisible(false);
        setSelectedTipId(null);
      }}
        className="bg-orange-500 rounded-lg p-3 items-center"
      >
        <Text className="text-white font-JakartaBold">Close Details</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    {/* Map Container */}
    <View className="flex-1 rounded-2xl overflow-hidden">
      <MapView
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        initialRegion={{
          latitude: userLatitude || 8.967,
          longitude: userLongitude || 38.7,
          latitudeDelta: 0.01,  // Shows ~1km tall area
          longitudeDelta: 0.01  // Shows ~1km wide area//
        }}
        showsUserLocation={true}
        userInterfaceStyle="light"
        onLongPress={handleLongPress}
        className="flex-1"
      >
        {/* Custom Markers */}
{Array.isArray(tips) && tips.map((tip) => (
  <Marker
    key={tip.id}
    coordinate={{ latitude: tip.latitude, longitude: tip.longitude }}
    tracksViewChanges={false}
    onPress={() => handleMarkerPress(tip)}
  >
            <View style={{padding: 2}} className=" rounded-full shadow-lg border-2 border-teal-500">
              <MaterialCommunityIcons 
                name={ICON_MAP[tip.category] || "bell-badge"} 
                size={17} 
                color="orange" 
              />
            </View>
          </Marker>
        ))}
{Array.isArray(reminders) &&
  reminders.map((reminder) => (
    <Marker
      key={reminder.id}
      coordinate={{ latitude: reminder.latitude, longitude: reminder.longitude,
      }}
            tracksViewChanges={false}
                  onPress={() => {
        setTitle(reminder.title);
        setDetails(reminder.details);
        setDetailmodalVisible(true);
        setCreatedAt((reminder.date*1000));
        setAuthor("you. This is a reminder for yourself🙂.")
        setDistanceToUser(haversineDistance(
      userLatitude,
      userLongitude,
      reminder.latitude,
      reminder.longitude));
      }}
          >
              <MaterialIcons 
                name="note-alt"
                size={17} 
                color="#000" 
              />
          </Marker>
  ))}
        {/* Ride Markers */}
        {origin?.latitude && origin?.longitude && (
          <Marker coordinate={origin}
          title="origin">
            <View className="bg-black p-2 rounded-full shadow-lg">
              <MaterialIcons name="person-pin-circle" size={28} color="white" />
            </View>
          </Marker>
        )}

       {destination?.latitude && destination?.longitude && (
          <Marker coordinate={destination}
          title="destination">
            <View className="bg-orange-500 p-2 rounded-full shadow-lg">
              <MaterialIcons name="place" size={28} color="white" />
            </View>
          </Marker>
        )}

{/* Shared Passenger Pins */}
{Array.isArray(dropOffPoints) && dropOffPoints.length > 0 &&
  dropOffPoints[0]?.origin?.[0] &&
  dropOffPoints[0]?.origin?.[1] &&
  dropOffPoints.map((point) => (
    <Marker
      key={`origin-${point.pnumber}`}  // ✅ Ensure key uniqueness
      coordinate={{
        latitude: point.origin[0] ?? 8.7,  
        longitude: point.origin[1] ?? 38.7,
      }}
      title={`${point.name}'s origin location`}  // ✅ Removed extra `}`
    >
      <MaterialIcons name="trip-origin" size={26} color="#0abbdd" />
    </Marker>
  ))}

{Array.isArray(dropOffPoints) && dropOffPoints.length > 0 &&
  dropOffPoints[0]?.dropOff?.[0] &&
  dropOffPoints[0]?.dropOff?.[1] &&
  dropOffPoints.map((point) => (
    <Marker
      key={`dropOff-${point.pnumber}`}  // ✅ Ensure key uniqueness
      coordinate={{
        latitude: point.dropOff[0] ?? 8.7,  // ✅ Corrected to use dropOff
        longitude: point.dropOff[1] ?? 38.7,
      }}
      title={`${point.name}'s destination location`}  // ✅ Removed extra `}`
    >
      <MaterialIcons name="location-pin" size={26} color="black" />
    </Marker>
  ))}


{pathCoordinates.length > 0 && rideType !== "streetPickup" && (
  <Polyline
    coordinates={pathCoordinates}
    strokeColor="#0Fa0e9"
    strokeWidth={3}
  />
)}
      </MapView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg"
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="tips-and-updates" size={28} color="#f97316" />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => emergencyButton(profileImageUrl, carModel, user?.displayName, phoneNumberStore, plateNumber, user)}
        className="absolute top-14 left-4 bg-white p-2 rounded-full shadow-lg"
        style={{
          shadowColor: '#ef4444',
          width: "15%",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Ionicons style={{alignSelf: "center"}} name="warning" size={18} color="black" />
        <Text className="text-center text-sm font-JakartaSemiBold">
          SOS
        </Text>
      </TouchableOpacity>

            {/* Floating Action Button to update location*/}
      <TouchableOpacity 
        className="absolute bottom-4 left-4 bg-white p-3 rounded-full shadow-lg"
        onPress={() => startLocationTracking(driverId, setUserLocation)}
      >
        <MaterialIcons name="add-location" size={28} color="black" />
      </TouchableOpacity>
    </View>
  </View>
);
};

const styles = StyleSheet.create({
  // Category dropdown container
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
})
export default Map;