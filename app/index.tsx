import { LogBox } from 'react-native';
//LogBox.ignoreAllLogs(true); // Turn off all yellow box warnings
import auth from '@react-native-firebase/auth';
import { useEffect, useState} from 'react';
import { Redirect } from "expo-router";
import {  ActivityIndicator, View, Text } from 'react-native';
import { registerNotificationListeners, playShortSound, playLongSound, handleNotification } from './_notificationHandler';
import crashlytics from '@react-native-firebase/crashlytics';//
import firestore from '@react-native-firebase/firestore';
import { useCreditStore } from "@/store"
import { initLocalDB  } from '@/lib/localDB'; 
import * as Notifications from "expo-notifications";
import { Platform } from 'react-native';
import rideRequestSound from "@/assets/sounds/ride_request2.mp3";
import Constants from 'expo-constants';


const Page = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false); // To ensure we wait for auth check
 
  // Configure notification channel (Android only)
  const configureNotificationChannel = async () => {
    try {
await Notifications.setNotificationChannelAsync("ride_notifications_happy", {
  name: "Happy Ride Notifications",
  importance: Notifications.AndroidImportance.HIGH,
  sound: "new_follower1.wav", // <--- Fixed
  vibrationPattern: [0, 200, 100, 1000, 300, 200, 100, 1000, 300],
});

      await Notifications.setNotificationChannelAsync("ride_notifications", {
  name: "Ride Notifications",
  importance: Notifications.AndroidImportance.HIGH,
  sound: "ride_request2.mp3", 
 vibrationPattern: [0, 200, 100, 1000, 300, 200, 100, 1000, 300, 200, 100, 1000, 300, 200, 100, 1000, 300, 200, 100, 1000, 300, 200, 100, 1000, 300, 200, 100, 1000, 300],
});

    } catch (error) {

    }
  };


  // Request Notification Permission
  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {

    } else {

    }
  };


useEffect(() => {
  // console.log(Constants.expoConfig?.updates?.channel); 
  // console.log(Constants.expoConfig?.updates); 
  // console.log(Constants.expoConfig); 
  const checkChannel = async () => {
    const channel = await Notifications.getNotificationChannelAsync("ride_notifications");

  };
  checkChannel();
 
}, []);

useEffect(() => {
  // Ensure notifications show and sound plays when received in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,  // ✅ Ensure alert is shown
      shouldPlaySound: true,  // ✅ Enable sound for notifications
      shouldSetBadge: false,
    }),
  });

Notifications.addNotificationReceivedListener(notification => {

   handleNotification(notification); // ✅ Process foreground notifications
});


  // Background notifications (user taps notification)
Notifications.addNotificationResponseReceivedListener(response => {

    handleNotification(response.notification);
  });

}, []);

  useEffect(() => {
  configureNotificationChannel();
 initLocalDB();
 
crashlytics().setCrashlyticsCollectionEnabled(true);
crashlytics().log('App mounted.');
 requestPermissions();  
    // Handle initial notification if app was opened from a notification
 registerNotificationListeners();

    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);

      } else {

        setIsSignedIn(false);
      }
      setIsAuthChecked(true); // Auth check is done
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []);

  if (!isAuthChecked) return <ActivityIndicator size="large" color="black" />; // While auth state is being checked, return null or a loading screen

  if (isSignedIn){ 
 return  <Redirect href="/(root)/(tabs)/home" />
  }

  return <Redirect href="/(auth)/welcome" />;
};

export default Page;