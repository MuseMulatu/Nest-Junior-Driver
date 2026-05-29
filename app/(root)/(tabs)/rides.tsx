import auth from '@react-native-firebase/auth';
import * as Location from 'expo-location';
import { db } from "@/lib/localDB";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, View, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';
//import { useVideoPlayer, VideoView } from 'expo-video';

const RideHistory = () => {
  const [loading, setLoading] = useState(false);
  const [completedRides, setCompletedRides] = useState([])
  const [showMore, setShowMore] = useState(false);
    const [soloRides, setSoloRides] = useState([])
        const [coRiderRides, setCoRiderRides] = useState([])
        const [originAddresses, setOriginAddresses] = useState([])        
const [addresses, setAddresses] = useState([]);
 const [expandedId, setExpandedId] = useState(null);

  // Enhanced date formatting with Ethiopian timezone
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-ET', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Addis_Ababa'
    }).format(date);
  };

  useEffect(() => {
     const loadRides = async () => {
    const rides = await fetchRideHistory();
    setCompletedRides(rides); 
 
  };
  loadRides();
  }, []);


const fetchRideHistory = async () => {
  try {
    const rides = await db.getAllAsync(`SELECT * FROM ride_history ORDER BY createdAt DESC`);
    return rides.map(ride => ({
      ...ride,
      userLocation: JSON.parse(ride.userLocation),
      destinationLocation: JSON.parse(ride.destinationLocation),
      CoriderPickupData: ride.CoriderPickupData ? JSON.parse(ride.CoriderPickupData) : null
    }));
  } catch (error) {

    return [];
  }
};

const fareTotalShared = (CoriderPickupData) => {
const coRiderData = CoriderPickupData || [];

let lastKnownFare = 0;
const totalFare = coRiderData.reduce((sum, rider) => {
  if (typeof rider.fare === "number") {
    lastKnownFare = rider.fare;
    return sum + rider.fare;
  } else {
    return sum + lastKnownFare;
  }
}, 0);
 
return totalFare || 0
}

const renderRideItem = ({ item }) => (
  <View className="m-4 rounded-2xl overflow-hidden bg-white shadow-lg">
    <TouchableOpacity 
      onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
      activeOpacity={0.9}
    >
       <LinearGradient colors={['#ffffff', '#f8fafc']} className="p-4 flex-row items-center justify-between">
        {/* Ride Header Content */}
        <View className="flex-row items-center">
<View style={[styles.rounded, item.type === 'corider' ? styles.bgBlue : styles.bgGreen]}>
            <MaterialIcons 
              name={item.type === 'corider' ? 'group' : 'directions-car'} 
              size={24} 
              color={item.type === 'corider' ? '#2563eb' : '#16a34a'}
            />
          </View>
          <View className="ml-4">
            <Text className="font-JakartaBold text-lg text-gray-900">
              {item.type === 'corider' ? 'Co-Ride' : 'Single Ride'}
            </Text>
            <Text className="font-JakartaMedium text-sm text-gray-500">
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
        </View>
        <Ionicons 
          name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#6b7280" 
        />
      </LinearGradient>
    </TouchableOpacity>  

    {expandedId === item.id && (
      <View className="p-4 bg-gray-50">
        {/* Map Preview */}
        <View className="h-48 rounded-xl overflow-hidden bg-white shadow-sm">
          <Image
            source={{ uri: generateMapUrl(item) }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Ride Information */}
        <View className="mt-4 space-y-4">
          <DetailRow icon="place" title="Pickup" value={item.originAddress} />
          <DetailRow icon="flag" title="Dropoff" value={item.destinationAddress} />

          <View className="flex-row justify-between">
          {item.type === 'corider' && (  <DetailRow icon="attach-money" title="Fare" value={`Br ${fareTotalShared(item.CoriderPickupData)}`} />)}
           {item.type !== 'corider' && ( <DetailRow icon="attach-money" title="Fare" value={`Br ${item.farePrice}`} />)}
            <DetailRow icon="access-time" title="Duration" value= {formatDateTime(item.createdAt)} />
          </View>

          {/* Co-Rider Details */}
          {item.type === 'corider' && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="font-JakartaSemiBold text-gray-900 mb-3">
                Co-Riders ({item.CoriderPickupData?.length || 0})
              </Text>
              {item.CoriderPickupData?.map((rider, index) => (
                <View key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <Text className="font-JakartaMedium text-gray-900">{rider.name}</Text>
                  <View className="mt-2 flex-row justify-between">
                    <Text className="font-Jakarta text-sm text-blue-600">
                      {rider.pnumber || "rider.pnumber"}
                    </Text>
                    <Text className="font-Jakarta text-sm text-green-600">
                      Br {rider.fare || ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    )}
  </View>
);

  // const player = useVideoPlayer(videoSource, player => {
  //   player.loop = true;
  //   player.play();
  // });

 // const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
const videoSource =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 mt-8">
        <Text className="text-2xl font-JakartaBold text-gray-900">Ride History</Text>
        <Text className="text-sm font-JakartaMedium text-gray-500 mt-1">
          Your completed trips and earnings
        </Text>
      </View>

      <FlatList
        data={completedRides}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          !loading && (
            <View className="flex-1 items-center justify-center mt-20">
              <MaterialIcons name="history" size={80} color="#e5e7eb" />
              <Text className="font-JakartaMedium text-gray-500 mt-4">
                No completed rides yet
              </Text>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={fetchRideHistory}
      />
    </SafeAreaView>
  );
};

// Reusable Detail Component
const DetailRow = ({ icon, title, value }) => (
  <View className="flex-row items-center space-x-3">
    <MaterialIcons name={icon} size={20} color="#4b5563" />
    <View>
      <Text className="font-JakartaMedium text-sm text-gray-500">
        {title || "title"}
      </Text>
      <Text className="font-JakartaMedium text-gray-900">
        {value || "N/A"}  {/* Add fallback for empty values */}
      </Text>
    </View>
  </View>
);

// Helper function to generate map URLs
const generateMapUrl = (item) => {
  if (item.type === 'corider') {
    const markers = item.CoriderPickupData.map(rider => 
      `marker=lonlat:${rider?.pickupLng || item?.userLocation?.lng || 37.8},${rider?.pickupLat || item.userLocation?.lat || 8.7};color:red;size:small&marker=lonlat:${rider.endLocation?.lng || item.destinationLocation?.lng || 38.7 },${rider?.endLocation?.lat || item.destinationLocation?.lat || 8.7};color:green;size:small`
    ).join('&');
    return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=500&zoom=11&${markers}&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`;
  }
  
  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=500&center=lonlat:${item?.userLocation?.lng || 38.7},${item?.userLocation?.lat || 8.7}&zoom=12&marker=lonlat:${item?.userLocation?.lng || 38.7},${item?.userLocation?.lat || 8.7};color:blue;size:small&marker=lonlat:${item?.destinationLocation?.lng || 38.7},${item?.destinationLocation?.lat || 8.7};color:green;size:small&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`;
};

const styles = StyleSheet.create({
    contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  video: {
    width: 350,
    height: 275,
  },
  controlsContainer: {
    padding: 10,
  },
  rounded: { padding: 12, borderRadius: 999 },
  bgBlue: { backgroundColor: '#dbeafe' },  // Equivalent to bg-blue-100
  bgGreen: { backgroundColor: '#d1fae5' } // Equivalent to bg-green-100
});

export default RideHistory;