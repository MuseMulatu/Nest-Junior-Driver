import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { HMSSDK } from '@100mslive/react-native-hms';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import axios from 'axios';
import { useLookInStore } from '@/store';

interface Props {
  rideId: string;
  driverId: string;
}

export default function LiveSafetyManager({ rideId, driverId }: Props) {
  const { isBroadcasting, roomId, stopLookIn } = useLookInStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const hmsInstance = useRef<HMSSDK | null>(null);

  // --- 1. 20-SECOND GPS ROUTE TRACKING (Firestore, not Push Notifications) ---
  useEffect(() => {
    const locationInterval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geoPoint = new firestore.GeoPoint(loc.coords.latitude, loc.coords.longitude);

        // Append the new coordinate to the active ride's path array
        await firestore().collection('active_rides').doc(rideId).set({
          driverCurrentLocation: geoPoint,
          pathPoints: firestore.FieldValue.arrayUnion(geoPoint),
          lastUpdated: firestore.FieldValue.serverTimestamp()
        }, { merge: true });

      } catch (error) {
        console.error("GPS Tracking Error:", error);
      }
    }, 20000); // 20 seconds

    return () => clearInterval(locationInterval);
  }, [rideId]);

  // --- 2. 20-MINUTE PERIODIC SNAPSHOTS ---
  useEffect(() => {
    if (!permission?.granted) requestPermission();

    const snapshotInterval = setInterval(async () => {
      // CRITICAL: Don't take a photo if 100ms is currently using the camera!
      if (isBroadcasting || !cameraRef.current) return;

      try {
        console.log("📸 Taking periodic 20-min snapshot...");
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.3 });
        
        // Upload to Firebase Storage
        const filename = `snapshots/${rideId}_${Date.now()}.jpg`;
        const reference = storage().ref(filename);
        await reference.putFile(photo.uri);
        const url = await reference.getDownloadURL();

        // Save URL to Firestore
        await firestore().collection('active_rides').doc(rideId).update({
          snapshots: firestore.FieldValue.arrayUnion({ url, timestamp: Date.now() })
        });
      } catch (error) {
        console.error("Snapshot failed:", error);
      }
    }, 20 * 60 * 1000); // 20 Minutes

    return () => clearInterval(snapshotInterval);
  }, [isBroadcasting, permission]);

  // --- 3. 30-SECOND 100ms LIVESTREAM (Triggered by Push Notification) ---
  useEffect(() => {
    if (isBroadcasting && roomId) {
      const startStream = async () => {
        try {
          // 1. Get Token from Backend
          const res = await axios.get(`https://api.zabiya.com/api/nest-junior/hms-token?roomId=${roomId}&role=broadcaster&userId=${driverId}`);
          const token = res.data.token;

          // 2. Initialize 100ms
          hmsInstance.current = await HMSSDK.build();
          await hmsInstance.current.join({ authToken: token, userName: "Driver Camera" });

          console.log("🎥 100ms Stream Started!");

          // 3. Auto-Kill stream after 30 seconds
          setTimeout(async () => {
            await hmsInstance.current?.leave();
            hmsInstance.current?.destroy();
            stopLookIn();
            console.log("🛑 30s Stream Ended.");
          }, 30000);

        } catch (error) {
          console.error("100ms Error:", error);
          stopLookIn();
        }
      };
      startStream();
    }
  }, [isBroadcasting, roomId]);

  // We mount a hidden 1x1 pixel camera for the periodic snapshots.
  // We unmount it temporarily if 100ms needs the camera to prevent hardware crashes.
  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}>
      {!isBroadcasting && permission?.granted && (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" mute={true} />
      )}
    </View>
  );
}