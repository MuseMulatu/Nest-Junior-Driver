import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import { HMSSDK, HMSUpdateListenerActions } from '@100mslive/react-native-hms';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import auth from '@react-native-firebase/auth'; // Firestore is gone!
import axios from 'axios';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://api.zabiya.com/api/nest-junior';

// --- CLOUDINARY CONFIG ---
const CLOUD_NAME = "dp---ia";       
const UPLOAD_PRESET = "expo_profile_images"; 

const Colors = {
  primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
  textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
  successGreen: "#22C55E", dangerRed: "#EF4444"
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
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
  const cameraRef = useRef<Camera>(null); 
  const hmsInstance = useRef<HMSSDK | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const [hasPermissions, setHasPermissions] = useState(false);
  const [manifest, setManifest] = useState<any[]>([]);
  const [driverLoc, setDriverLoc] = useState({ latitude: 9.0192, longitude: 38.7525 });
  const [controlsLocked, setControlsLocked] = useState(false);

  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingGeofenceCapture, setPendingGeofenceCapture] = useState<string | null>(null);

  const [localVideoTrackId, setLocalVideoTrackId] = useState<string | null>(null);
  const [HmsViewComponent, setHmsViewComponent] = useState<any>(null);
const cameraDevice = useCameraDevice('back');
  const driver = auth().currentUser;

  // 1. NATIVE VISION CAMERA HOOKS (V3/V4 Standard)
  const { hasPermission: hasCam, requestPermission: requestCam } = useCameraPermission();
  const { hasPermission: hasMic, requestPermission: requestMic } = useMicrophonePermission();

  // 2. BOOT SEQUENCE
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      // Use the modern hooks to check and request
      let camStatus = hasCam;
      if (!camStatus) camStatus = await requestCam();

      let micStatus = hasMic;
      if (!micStatus) micStatus = await requestMic();

      const locStatus = await Location.requestForegroundPermissionsAsync();

      if (camStatus && micStatus && locStatus.status === 'granted') {
        setHasPermissions(true);
        initializeManifest();
        setupSilentNotificationListener();
      } else {
        Alert.alert("Permissions Required", "Please allow Camera, Microphone, and Location access to run this route.");
      }
    };
    
    checkAndRequestPermissions();
  }, [hasCam, hasMic]); // Re-evaluates safely if hook state updates

  // 2. 30-SECOND NATIVE POSTGRESQL TELEMETRY
  useEffect(() => {
    if (!hasPermissions || manifest.length === 0) return; // Need a manifest target to track!

    const locationInterval = setInterval(async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        handleLocationUpdate({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        
        // Push strictly to your PostgreSQL backend, avoiding Firebase costs entirely
        const activeRouteId = manifest[0].id;
        await axios.post(`${API_BASE}/driver/telemetry`, {
            routeSubscriptionId: activeRouteId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
        });

      } catch (error) {
        console.error("Postgres Telemetry Error:", error);
      }
    }, 30000); 

    return () => clearInterval(locationInterval);
  }, [hasPermissions, manifest]); // Re-binds when manifest changes (i.e., next stop)
  
// --- CLOUDINARY UPLOAD HANDLER ---
  const uploadImageToCloudinary = async (imageUri: string): Promise<string | null> => {
    try {
      const data = new FormData();
      data.append("file", { 
        uri: imageUri, 
        type: "image/jpeg", 
        name: `snapshot_${Date.now()}.jpg` 
      } as any);
      data.append("upload_preset", UPLOAD_PRESET);

      // 🚨 FIX: Removed the headers completely. Let Axios auto-configure the boundary!
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);

      if (res.data && res.data.secure_url) {
        console.log("✅ Uploaded to Cloudinary:", res.data.secure_url);
        return res.data.secure_url;
      } else {
        console.error("Cloudinary upload error:", res.data);
        return null;
      }
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  // 1. Add this new state variable at the top with your others
const [testLock, setTestLock] = useState(false);

// 2. Update your Geofence trigger to check for the lock
const handleLocationUpdate = (loc: { latitude: number, longitude: number }) => {
  setDriverLoc(loc);
  if (manifest.length === 0 || testLock) return; // 🚨 Stops infinite loops during testing
  
  const currentTarget = manifest[0];
  const distance = getDistance(loc.latitude, loc.longitude, currentTarget.pickupLat, currentTarget.pickupLng);
  
  if (distance < 35 && !controlsLocked) {
    if (isCameraBusy || isStreaming) setPendingGeofenceCapture(currentTarget.id);
    else executeAutomatedBoardingCapture(currentTarget.id);
  }
};

// 3. Update the executeAutomatedBoardingCapture function
const executeAutomatedBoardingCapture = async (subId: string) => {
  setIsCameraBusy(true); setControlsLocked(true); setPendingGeofenceCapture(null); 
  try {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const uploadedUrl = await uploadImageToCloudinary(`file://${photo.path}`);
      
      if (uploadedUrl) {
        await axios.post(`${API_BASE}/driver/milestone`, { 
          routeSubscriptionId: subId, 
          photoUrl: uploadedUrl,
          type: 'BOARDING'
        });
      }
    }
  } catch (e) {
    console.error("Camera bypass error", e);
  } finally {
    // 🚨 We removed setManifest(prev => prev.slice(1)) so the route never ends!
    setTestLock(true); // Locks the geofence so it doesn't fire again
    setControlsLocked(false); 
    setIsCameraBusy(false); 
  }
};
// 3. PERIODIC SNAPSHOT LOGIC
  const executePeriodicSnapshot = async () => {
    if (isStreaming || isCameraBusy || !cameraRef.current || manifest.length === 0) return null;
    
    try {
      setIsCameraBusy(true);
      console.log("📸 Taking 20-minute periodic snapshot...");
      
      let photo;
      
      // Safely check which method your specific version of Vision Camera supports
      if (typeof cameraRef.current.takePhoto === 'function') {
        photo = await cameraRef.current.takePhoto({ flash: 'off' });
      } else if (typeof cameraRef.current.takeSnapshot === 'function') {
        photo = await cameraRef.current.takeSnapshot({ quality: 85 });
      } else {
        throw new Error("Camera methods not bound. The OS culled the hidden camera view.");
      }
      
      // 🚨 FIX: Safely normalize the URI right before sending to Cloudinary
      const validUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      
      const uploadedUrl = await uploadImageToCloudinary(validUri);
      
      if (uploadedUrl) {
        await axios.post(`${API_BASE}/driver/milestone`, { 
          routeSubscriptionId: manifest[0].id, 
          photoUrl: uploadedUrl, 
          type: 'PERIODIC' 
        });
        return uploadedUrl;
      }
      return null;
    } catch (e) {
      console.error("Periodic Snapshot Failed:", e);
      return null;
    } finally {
      setIsCameraBusy(false);
    }
  };
  
  useEffect(() => {
    const snapshotInterval = setInterval(executePeriodicSnapshot, 20 * 60 * 1000);
    return () => clearInterval(snapshotInterval);
  }, [isStreaming, isCameraBusy, manifest]);

  useEffect(() => {
    if (!isCameraBusy && !isStreaming && pendingGeofenceCapture) {
      executeAutomatedBoardingCapture(pendingGeofenceCapture);
    }
  }, [isCameraBusy, isStreaming, pendingGeofenceCapture]);

  const initializeManifest = async () => {
    try {
      const res = await axios.get(`${API_BASE}/driver/manifest?driverId=${driver?.uid}`);
      setManifest(res.data.filter((node: any) => !node.isSkippedToday));
    } catch (error) {
      console.log("Manifest fetch failed, maybe no routes yet.");
    }
  };

  // 4. 100MS GHOST STREAM
  const setupSilentNotificationListener = () => {
    Notifications.addNotificationReceivedListener(async (notification) => {
      const { data } = notification.request.content;
      if (data && data.type === 'START_LOOK_IN_BROADCAST') {
        if (isCameraBusy) setTimeout(() => initializeGhostStream(data.roomId), 2500);
        else initializeGhostStream(data.roomId);
      }
    });
  };

  const initializeGhostStream = async (roomId: string) => {
    if (!roomId) return Alert.alert("Error", "No Room ID provided.");
    
    setIsCameraBusy(true); 
    setIsStreaming(true); 
    
    setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/hms-token?roomId=${roomId}&role=broadcaster&userId=${driver?.uid}`);
        const token = res.data.token;

        const hms = await HMSSDK.build();
        hmsInstance.current = hms;
        setHmsViewComponent(() => hms.HmsView);

        const onTrackUpdate = (data: any) => {
          if (data.peer?.isLocal && data.track?.type === 'VIDEO') {
            setLocalVideoTrackId(data.track.trackId);
          }
        };

        hms.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, onTrackUpdate);
        await hms.join({ authToken: token, username: "Driver-Track-Cam" }); 

        setTimeout(async () => {
           const localPeer = await hms.getLocalPeer();
           if (localPeer?.audioTrack) await localPeer.audioTrack.setMute(false);
        }, 2000);

        setTimeout(async () => {
          await hms.leave();
          hms.removeAllListeners();
          hms.destroy();
          
          setTimeout(() => {
            setIsStreaming(false); 
            setIsCameraBusy(false); 
            setLocalVideoTrackId(null);
          }, 1500);
        }, 30000);
      } catch (e) {
        setTimeout(() => {
          setIsStreaming(false);
          setIsCameraBusy(false); 
          setLocalVideoTrackId(null);
        }, 1500);
      }
    }, 1000); 
  };

  // const handleLocationUpdate = (loc: { latitude: number, longitude: number }) => {
  //   setDriverLoc(loc);
  //   if (manifest.length === 0) return;
  //   const currentTarget = manifest[0];
  //   const distance = getDistance(loc.latitude, loc.longitude, currentTarget.pickupLat, currentTarget.pickupLng);
  //   if (distance < 35 && !controlsLocked) {
  //     if (isCameraBusy || isStreaming) setPendingGeofenceCapture(currentTarget.id);
  //     else executeAutomatedBoardingCapture(currentTarget.id);
  //   }
  // };

  // // 5. GEOFENCE AUTOMATED CAPTURE WITH CLOUDINARY
  // const executeAutomatedBoardingCapture = async (subId: string) => {
  //   setIsCameraBusy(true); setControlsLocked(true); setPendingGeofenceCapture(null); 
  //   try {
  //     if (cameraRef.current) {
  //       const photo = await cameraRef.current.takePhoto({ flash: 'off' });
  //       const uploadedUrl = await uploadImageToCloudinary(`file://${photo.path}`);
        
  //       if (uploadedUrl) {
  //         await axios.post(`${API_BASE}/driver/milestone`, { 
  //           routeSubscriptionId: subId, 
  //           photoUrl: uploadedUrl,
  //           type: 'BOARDING'
  //         });
  //       }
  //     }
  //   } catch (e) {
  //     console.error("Camera bypass error", e);
  //   } finally {
  //     setManifest(prev => prev.slice(1)); setControlsLocked(false); setIsCameraBusy(false); 
  //   }
  // };

  if (!hasPermissions) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.textDark }]}>
        <Ionicons name="warning" size={60} color={Colors.primaryOrange} />
        <Text style={{ color: '#FFF', fontSize: 18, textAlign: 'center', marginTop: 20, paddingHorizontal: 40 }}>
          Waiting for Hardware Permissions...
        </Text>
      </View>
    );
  }

  const routeCoordinates = [driverLoc, ...manifest.map(node => ({ latitude: node.pickupLat, longitude: node.pickupLng }))];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapView ref={mapRef} style={styles.map} initialRegion={{ ...driverLoc, latitudeDelta: 0.015, longitudeDelta: 0.015 }}>
        <Marker coordinate={driverLoc} title="Your Vehicle" pinColor="blue" />
        {routeCoordinates.length > 1 && <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor={Colors.primaryOrange} lineDashPattern={[5, 5]} />}
        {manifest.map((node, idx) => (
          <Marker key={node.id} coordinate={{ latitude: node.pickupLat, longitude: node.pickupLng }} title={`Stop ${idx + 1}`} pinColor={idx === 0 ? "orange" : "red"} />
        ))}
      </MapView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <View style={styles.devToolsPanel}>
        <Text style={styles.devTitle}>DEV TOOLS</Text>
        <TouchableOpacity style={styles.devBtn} onPress={() => initializeGhostStream(manifest[0]?.hmsRoomId || 'test-room-id')}>
          <Text style={styles.devBtnText}>🎥 Test 30s Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.devBtn, { backgroundColor: Colors.secondaryTeal }]} onPress={async () => {
            const url = await executePeriodicSnapshot();
            if (url) Alert.alert("Snapshot Success", `Logged to PostgreSQL via Cloudinary.`);
          }}>
          <Text style={styles.devBtnText}>📸 Test Cloudinary Snapshot</Text>
        </TouchableOpacity>
      </View>

      {/* 100ms Picture-in-Picture */}
      {isStreaming && HmsViewComponent && localVideoTrackId && (
        <View style={styles.pipContainer}>
          <HmsViewComponent trackId={localVideoTrackId} style={styles.pipVideo} mirror={true} />
          <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
        </View>
      )}

      {/* Vision Camera Mutex */}
      {cameraDevice && (
        <View style={styles.hiddenCameraContainer}>
          <Camera ref={cameraRef} style={styles.hiddenCamera} device={cameraDevice} isActive={!isStreaming} photo={true} />
        </View>
      )}

      {isStreaming && (
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>📡 Live Feed Transmitting to Parent...</Text>
        </View>
      )}

      <BottomSheet ref={bottomSheetRef} snapPoints={['15%', '40%']} index={0} backgroundStyle={styles.bottomSheetBg}>
        <BottomSheetView style={styles.metaPanelContent}>
          <Text style={styles.panelTitle}>Active Target Queue ({manifest.length} Stops remaining)</Text>
          {manifest.length > 0 ? (
            <View>
              <Text style={styles.manifestNode}>Next: <Text style={{fontWeight: 'bold'}}>{manifest[0].student.name}</Text></Text>
            </View>
          ) : (
            <Text style={styles.successRoute}>Route Complete.</Text>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: width, height: height },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  devToolsPanel: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 12, alignItems: 'center', zIndex: 100 },
  devTitle: { color: '#FFF', fontWeight: 'bold', marginBottom: 10, fontSize: 12, letterSpacing: 1 },
  devBtn: { backgroundColor: Colors.dangerRed, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 8, width: '100%', alignItems: 'center' },
  devBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  pipContainer: { position: 'absolute', top: 170, right: 20, width: 110, height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: Colors.successGreen, backgroundColor: '#000', zIndex: 50, elevation: 10 },
  pipVideo: { flex: 1 },
  liveBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: Colors.dangerRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  hiddenCameraContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: 100, 
    height: 100, 
    zIndex: -1 
  },
  hiddenCamera: { flex: 1 },
  liveIndicator: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: 'rgba(239, 68, 68, 0.95)', padding: 12, borderRadius: 8, alignItems: 'center' },
  liveText: { color: '#FFF', fontWeight: 'bold' },
  bottomSheetBg: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  metaPanelContent: { padding: 24, paddingBottom: 40 },
  panelTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginBottom: 8 },
  manifestNode: { fontSize: 18, color: Colors.textDark },
  subtext: { color: Colors.textLight, marginTop: 4, fontSize: 13 },
  successRoute: { color: Colors.successGreen, fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginVertical: 10 }
});