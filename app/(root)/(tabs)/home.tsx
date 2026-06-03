import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const Colors = { orange: "#FF8C00", teal: "#0FB1BB", dark: "#1A202C", gray: "#718096", lightBg: "#F7FAFC" };
const API_BASE = 'https://api.zabiya.com/api/nest-junior';

export default function DriverHomeScreen() {
  const [isGatePassed, setIsGatePassed] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  
  // --- MANIFEST STATE ---
  const [manifestCount, setManifestCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [checklist, setChecklist] = useState({ dashcam: false, boosterSeats: false, safetyDoors: false });

  // --- FETCH ASSIGNED ROUTES ON LOAD ---
  useEffect(() => {
    const fetchManifestSummary = async () => {
      const driver = auth().currentUser;
      if (!driver) return;

      try {
        const res = await axios.get(`${API_BASE}/driver/manifest?driverId=${driver.uid}`);
        setManifestCount(res.data.length);
      } catch (error) {
        console.error("Failed to fetch routes", error);
        setManifestCount(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchManifestSummary();
  }, []);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const commitSafetyLog = async () => {
    const { dashcam, boosterSeats, safetyDoors } = checklist;
    if (!dashcam || !boosterSeats || !safetyDoors) {
      Alert.alert("Safety Enforcement", "All mandatory safety elements must be checked before picking up students.");
      return;
    }

    const driver = auth().currentUser;
    if (!driver) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    try {
      await firestore()
        .collection('compliance_logs')
        .doc(`${driver.uid}_${todayStr}`)
        .set({
          timestamp: firestore.FieldValue.serverTimestamp(),
          clearedBy: driver.email,
          uid: driver.uid,
          date: todayStr,
          ...checklist
        });

      setIsGatePassed(true);
      setGateModalOpen(false); // Closes the modal
    } catch (error) {
      Alert.alert("Sync Error", "Could not save safety log. Check your connection.");
    }
  };

  const hasRoutesToday = manifestCount !== null && manifestCount > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollLayout}>
        <Text style={styles.title}>CareDriver Dashboard</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Gate Status</Text>
          <View style={styles.row}>
            <MaterialCommunityIcons name="shield-check" color={isGatePassed ? Colors.teal : Colors.gray} size={24} />
            <Text style={[styles.statusText, { color: isGatePassed ? Colors.teal : Colors.dark }]}>
              {isGatePassed ? "Verified Safety Pass Locked" : "Pre-Trip Verification Required"}
            </Text>
          </View>
          
          {/* Hide the Safety Gate if they have no routes anyway */}
          {!isGatePassed && hasRoutesToday && (
            <TouchableOpacity style={styles.gateBtn} onPress={() => setGateModalOpen(true)}>
              <Text style={styles.btnText}>Open Safety Verification</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Route Sheet Card */}
        <View style={[styles.card, { opacity: isGatePassed && hasRoutesToday ? 1 : 0.5 }]}>
          <Text style={styles.cardTitle}>Assigned Shifts</Text>
          
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.teal} />
          ) : hasRoutesToday ? (
             <Text style={styles.desc}>You have {manifestCount} active pickups securely routed for today's sequence.</Text>
          ) : (
             <Text style={[styles.desc, { color: Colors.orange, fontWeight: 'bold' }]}>You have no assigned pickups today, or all parents have skipped today's ride.</Text>
          )}
          
          <TouchableOpacity 
            style={[styles.startBtn, { backgroundColor: isGatePassed && hasRoutesToday ? Colors.orange : Colors.gray }]}
            disabled={!isGatePassed || !hasRoutesToday}
            onPress={() => router.push('/(root)/active-ride')}
          >
            <FontAwesome5 name="play" color="#FFF" size={16} />
            <Text style={styles.startBtnText}>Initialize Sequence</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FULLY RESTORED SAFETY MODAL */}
      <Modal 
        visible={gateModalOpen} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setGateModalOpen(false)} // Handles Android physical back button
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            
            {/* Close Button to prevent getting stuck */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setGateModalOpen(false)}>
              <Ionicons name="close" size={24} color={Colors.gray} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>🛡️ Pre-Trip Safety Check</Text>
            
            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('dashcam')}>
              <Ionicons name="checkmark-circle" size={24} color={checklist.dashcam ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Dashcam actively loop-recording?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('boosterSeats')}>
              <Ionicons name="checkmark-circle" size={24} color={checklist.boosterSeats ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Booster seats safely locked?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('safetyDoors')}>
              <Ionicons name="checkmark-circle" size={24} color={checklist.safetyDoors ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Child security locks activated?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.commitBtn} onPress={commitSafetyLog}>
              <Text style={styles.commitText}>Seal & Sign Digital Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightBg },
  scrollLayout: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: Colors.dark },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: Colors.dark },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  statusText: { marginLeft: 10, fontSize: 16, fontWeight: '500' },
  gateBtn: { backgroundColor: Colors.dark, padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  desc: { color: Colors.gray, marginBottom: 15, lineHeight: 20 },
  startBtn: { flexDirection: 'row', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 10 },
  startBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, position: 'relative' },
  closeButton: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', marginTop: 10, color: Colors.dark },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  checkLabel: { fontSize: 16, flex: 1, color: Colors.dark },
  commitBtn: { backgroundColor: Colors.teal, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  commitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});