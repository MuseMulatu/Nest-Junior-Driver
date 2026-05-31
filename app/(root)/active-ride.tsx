import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
// Using the updated Vision Camera v3/v4 syntax
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { HMSSDK } from '@100mslive/react-native-hms';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://api.zabiya.com/api/nest-junior';

const Colors = {
  primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
  textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC", successGreen: "#22C55E", warningRed: "#EF4444",
};

// Haversine calculation to verify geofence crosshairs
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function ActiveRideScreen() {
  const mapRef = useRef<MapView | null>(null);
  // Type strictly as the Vision Camera component
  const cameraRef = useRef<Camera>(null); 
  
  const [manifest, setManifest] = useState<any[]>([]);
  const [driverLoc, setDriverLoc] = useState({ latitude: 9.0192, longitude: 38.7525 });
  const [controlsLocked, setControlsLocked] = useState(false);

  // --- HARDWARE MUTEX & SERIALIZATION STATES ---
  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingGeofenceCapture, setPendingGeofenceCapture] = useState<string | null>(null);

  // Vision Camera v4 specific hook
  const cameraDevice = useCameraDevice('back');

  useEffect(() => {
    initializeManifest();
    setupSilentNotificationListener();
    requestCameraPermissions();
  }, []);

  // WATCHER: Execute cached snapshot the exact moment the hardware stream finishes
  useEffect(() => {
    if (!isCameraBusy && !isStreaming && pendingGeofenceCapture) {
      executeAutomatedBoardingCapture(pendingGeofenceCapture);
    }
  }, [isCameraBusy, isStreaming, pendingGeofenceCapture]);

  const requestCameraPermissions = async () => {
    await Camera.requestCameraPermission();
  };

  const initializeManifest = async () => {
    const res = await axios.get(`${API_BASE}/driver/manifest?driverId=sample-driver-id`);
    setManifest(res.data.filter((node: any) => !node.isSkippedToday));
  };

  // 1. Silent Expo Notification Listener
  const setupSilentNotificationListener = () => {
    Notifications.addNotificationReceivedListener(async (notification) => {
      const { data } = notification.request.content;
      
      if (data && data.type === 'REQUEST_LIVE_LOOK') {
        // If a snapshot is currently being taken, delay stream by 2.5 seconds
        if (isCameraBusy) {
          setTimeout(() => initializeGhostStream(data.hmsRoomToken), 2500);
        } else {
          initializeGhostStream(data.hmsRoomToken);
        }
      }
    });
  };

  // 2. Ghost WebRTC Media System
  const initializeGhostStream = async (roomToken: string) => {
    setIsCameraBusy(true); // Lock hardware
    setIsStreaming(true);
    try {
      const hmsSdk = await HMSSDK.build();
      // Fixed HMS types: using 'username'
      await hmsSdk.join({ authToken: roomToken, username: "Driver-Track-Cam" }); 
      
      // Hold stream for 30s max
      setTimeout(async () => {
        await hmsSdk.leave();
        setIsStreaming(false);
        setIsCameraBusy(false); // Release hardware
      }, 30000);
    } catch (e) {
      setIsStreaming(false);
      setIsCameraBusy(false); // Release on failure
    }
  };

  // 3. Automated Geofence Crosshairs Hook
  const handleLocationUpdate = (loc: { latitude: number, longitude: number }) => {
    setDriverLoc(loc);
    if (manifest.length === 0) return;

    const currentTarget = manifest[0];
    const distance = getDistance(loc.latitude, loc.longitude, currentTarget.pickupLat, currentTarget.pickupLng);

    if (distance < 35 && !controlsLocked) {
      // If streaming is occupying the hardware, queue the snapshot for later
      if (isCameraBusy || isStreaming) {
        setPendingGeofenceCapture(currentTarget.id);
      } else {
        executeAutomatedBoardingCapture(currentTarget.id);
      }
    }
  };

  const executeAutomatedBoardingCapture = async (subId: string) => {
    setIsCameraBusy(true); // Lock hardware
    setControlsLocked(true);
    setPendingGeofenceCapture(null); // Clear queue
    
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePhoto({ flash: 'off' });
        
        await axios.post(`${API_BASE}/driver/milestone`, {
          routeSubscriptionId: subId,
          photoUrl: photo.path
        });
      }
    } catch (e) {
      console.error("Camera capture bypass error", e);
    } finally {
      // Shift out current target to optimize layout paths to next destination
      setManifest(prev => prev.slice(1));
      setControlsLocked(false);
      setIsCameraBusy(false); // Release hardware
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...driverLoc, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
        scrollEnabled={!controlsLocked}
        zoomEnabled={!controlsLocked}
      >
        <Marker coordinate={driverLoc} title="Your Vehicle" pinColor="blue" />
        {manifest.map((node, idx) => (
          <Marker 
            key={node.id} 
            coordinate={{ latitude: node.pickupLat, longitude: node.pickupLng }} 
            title={`Stop ${idx + 1}: ${node.student.name}`}
            pinColor={idx === 0 ? "orange" : "red"}
          />
        ))}
      </MapView>

      {/* Hidden/Ghost Camera Node Layer */}
      {cameraDevice && (isStreaming || isCameraBusy) && (
        <View style={styles.hiddenCameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.hiddenCamera}
            device={cameraDevice}
            isActive={true}
            photo={true}
            video={true} // Enabled video to support the background HMS broadcast
            audio={true}
          />
        </View>
      )}

      {/* Streaming Broadcast Live Pill Overlay UI */}
      {isStreaming && (
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>📡 Live Feed Transmitting to Parent...</Text>
        </View>
      )}

      {/* Navigation Queue Panel Bottom Sheet */}
      <View style={styles.metaPanel}>
        <Text style={styles.panelTitle}>Active Target Queue ({manifest.length} Stops remaining)</Text>
        {manifest.length > 0 ? (
          <View>
            <Text style={styles.manifestNode}>Next Student: <Text style={{fontWeight: 'bold'}}>{manifest[0].student.name}</Text></Text>
            <Text style={styles.subtext}>Destination School: {manifest[0].student.schoolName}</Text>
          </View>
        ) : (
          <Text style={styles.successRoute}>Route Complete. All kids delivered safely.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: width, height: height },
  hiddenCameraContainer: { position: 'absolute', top: -100, left: -100, width: 1, height: 1, opacity: 0 }, 
  hiddenCamera: { flex: 1 },
  liveIndicator: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: 'rgba(239, 68, 68, 0.95)', padding: 12, borderRadius: 8, alignItems: 'center' },
  liveText: { color: '#FFF', fontWeight: 'bold' },
  metaPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  panelTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginBottom: 8 },
  manifestNode: { fontSize: 18, color: Colors.textDark },
  subtext: { color: Colors.textLight, marginTop: 4, fontSize: 13 },
  successRoute: { color: Colors.successGreen, fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginVertical: 10 }
});