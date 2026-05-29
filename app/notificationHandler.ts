import { Alert } from 'react-native';
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import newFollowerSound from "@/assets/sounds/new_follower2.m4a";
import rideRequestSound from "@/assets/sounds/ride_request2.mp3";
import { useRideStore } from '@/firebaseconf'; 
import { useGroupStore, useSharedDriverStore, useSoloCancelledStore, useSharedCancelledStore, useSharedAddStore, useCallCenterPickupStore, useTrackStore } from '@/store';

export const handleNotification = async (notification) => {

 let { title, body, data } = notification.request.content;
  let type = data?.type;
let parsed = null;

  const { handleRideRequestNotification, handleRideTakenNotification, useEmergencyStore } = useRideStore.getState();

  switch (type) {
    case "general":
      Alert.alert("Notification", body);
      await playShortSound();
      break;
    case "new_follower":
      Alert.alert("New Follower!", body);
      await playShortSound();
      break;
    case "ride_request":
      handleRideRequestNotification(data);
      await playShortSound(); // Play ride request sound
      break;
    case "ride_taken":
      handleRideTakenNotification(data);
      break;
    case "solo_cancelled":
      Alert.alert("Ride canceled", "passenger has canceled the ride");
      useSoloCancelledStore.getState().setCancelled(true);
      break;
    case "shared_cancelled":
      useSharedCancelledStore.getState().setCancelledNumber(data.pnumber);
      break;
    case "add_member":
      Alert.alert("New Co-rider", `${data.name} has joined the ride.`);
      useSharedAddStore.getState().setAddedMember({
        name: data.name,
        pnumber: data.pnumber,
        origin: data.origin,
        dropOff: data.dropOff,
        expoToken: data.expoToken
      });
      break;
    case "callCenterPickup":
       useCallCenterPickupStore.getState().setCallCenterPickup({
        name: data.name,
        pnumber: data.pnumber,
        expoToken: data.expoToken,
      });
      break;
    case "emergency": //
      // console.log("Received emergency notification with data:", data); // For debugging
      useEmergencyStore.getState().setTrackingData({ //
        name: data.name,
        pnumber: data.pnumber,
        userLocation: data.userLocation, //
        plateNumber: data.plateNumber //
      });
      break;
    case "track":
      useTrackStore.getState().setTrack(true);
      break;

  }
};

export const registerNotificationListeners = () => {
  checkInitialNotification();
};

// 🔹 Function to handle notifications when app is opened manually
const checkInitialNotification = async () => {
  const lastNotification = await Notifications.getLastNotificationResponseAsync();
  if (lastNotification) {

    handleNotification(lastNotification.notification);
  }
};


export const playShortSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(newFollowerSound, {
      shouldPlay: true,
    });
    await sound.playAsync();
  } catch (error) {

  }
};

let longSoundInstance = null;
let longSoundTimeout = null; // Keep track of the timeout instance

export const playLongSound = async () => {
  try {
    if (longSoundInstance) {

      return;
    }
    const { sound } = await Audio.Sound.createAsync(rideRequestSound, {
      shouldPlay: true,
    });
    longSoundInstance = sound; // <--- this was missing!
  } catch (error) {

  }
};

// Function to stop long sound
export const stopLongSound = async () => {
  try {
    if (longSoundInstance) {

      await longSoundInstance.stopAsync();
      await longSoundInstance.unloadAsync();
      longSoundInstance = null;

    } else {

    }
  } catch (error) {

  }
};

//{"notification": {"android": , "body": "share - hello", "title": "Conatts"}, "originalPriority": 1, "priority": 1, "sentTime": 1730286635724, "ttl": 2419200} 