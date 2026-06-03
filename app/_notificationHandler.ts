import { Alert } from 'react-native';

// 1. TEMPORARILY COMMENTED OUT TO PREVENT CRASH
// import { createAudioPlayer } from "expo-audio"; 

import * as Notifications from "expo-notifications";
import newFollowerSound from "@/assets/sounds/new_follower2.m4a";
import rideRequestSound from "@/assets/sounds/ride_request2.mp3";
import { useRideStore } from '@/firebaseconf'; 
import { useGroupStore, useSharedDriverStore, useSoloCancelledStore, useSharedCancelledStore, useSharedAddStore, useCallCenterPickupStore, useTrackStore } from '@/store';
import { useLookInStore } from '@/store';

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
      await playShortSound(); 
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
    case "emergency": 
      useEmergencyStore.getState().setTrackingData({ 
        name: data.name,
        pnumber: data.pnumber,
        userLocation: data.userLocation, 
        plateNumber: data.plateNumber 
      });
      break;
    case "START_LOOK_IN_BROADCAST":
      console.log("🎥 Parent requested Look-In! Room:", data.roomId);
      useLookInStore.getState().startLookIn(data.roomId);
      break;
    case "track":
      useTrackStore.getState().setTrack(true);
      break;
  }
};

export const registerNotificationListeners = () => {
  checkInitialNotification();
};

const checkInitialNotification = async () => {
  const lastNotification = await Notifications.getLastNotificationResponseAsync();
  if (lastNotification) {
    handleNotification(lastNotification.notification);
  }
};

// 🔹 2. TEMPORARILY BYPASSED SOUND LOGIC
let shortSoundInstance = null;

export const playShortSound = async () => {
  try {
    console.log("🔊 [BYPASSED] playShortSound triggered");
    // if (!shortSoundInstance) {
    //   shortSoundInstance = createAudioPlayer(newFollowerSound);
    // }
    // shortSoundInstance.seekTo(0); 
    // shortSoundInstance.play();
  } catch (error) {
    console.error("Error playing short sound:", error);
  }
};

let longSoundInstance = null;
let longSoundTimeout = null;

export const playLongSound = async () => {
  try {
    console.log("🔊 [BYPASSED] playLongSound triggered");
    // if (longSoundInstance) {
    //   return;
    // }
    // longSoundInstance = createAudioPlayer(rideRequestSound);
    // longSoundInstance.play();
  } catch (error) {
    console.error("Error playing long sound:", error);
  }
};

export const stopLongSound = async () => {
  try {
    console.log("🔇 [BYPASSED] stopLongSound triggered");
    // if (longSoundInstance) {
    //   longSoundInstance.pause();
    //   longSoundInstance.release(); 
    //   longSoundInstance = null;
    // }
  } catch (error) {
    console.error("Error stopping long sound:", error);
  }
};