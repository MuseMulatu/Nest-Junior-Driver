import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const Colors = { orange: "#FF8C00", teal: "#0FB1BB", dark: "#1A202C", gray: "#718096", lightBg: "#F7FAFC" };

export default function DriverHomeScreen() {
  const [isGatePassed, setIsGatePassed] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  
  // Checklist verification matrices
  const [checklist, setChecklist] = useState({ dashcam: false, boosterSeats: false, safetyDoors: false });

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

const commitSafetyLog = async () => {
    const { dashcam, boosterSeats, safetyDoors } = checklist;
    if (!dashcam || !boosterSeats || !safetyDoors) {
      Alert.alert("Safety Enforcement", "All mandatory safety elements must be functional before picking up students.");
      return;
    }

    const driver = auth().currentUser;
    if (!driver) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    // 3. Lock signed security token payload inside Firestore for liability protection
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
      setGateModalOpen(false);
    } catch (error) {
      Alert.alert("Sync Error", "Could not save safety log. Check your connection.");
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollLayout}>
        <Text style={styles.title}>CareDriver Dashboard</Text>
        
        {/* Status Indicators */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Gate Status</Text>
          <View style={styles.row}>
            {/* Swapped ShieldCheck */}
            <MaterialCommunityIcons name="shield-check" color={isGatePassed ? Colors.teal : Colors.gray} size={24} />
            <Text style={[styles.statusText, { color: isGatePassed ? Colors.teal : Colors.dark }]}>
              {isGatePassed ? "Verified Safety Pass Locked" : "Pre-Trip Verification Required"}
            </Text>
          </View>
          
          {!isGatePassed && (
            <TouchableOpacity style={styles.gateBtn} onPress={() => setGateModalOpen(true)}>
              <Text style={styles.btnText}>Open Safety Gate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Route Sheet Card */}
        <View style={[styles.card, { opacity: isGatePassed ? 1 : 0.5 }]}>
          <Text style={styles.cardTitle}>Assigned Shifts</Text>
          <Text style={styles.desc}>Amharic and English-mapped routes for municipal schools.</Text>
          
          <TouchableOpacity 
            style={[styles.startBtn, { backgroundColor: isGatePassed ? Colors.orange : Colors.gray }]}
            disabled={!isGatePassed}
            onPress={() => router.push('/(root)/active-ride')}
          >
            {/* Swapped Play */}
            <FontAwesome5 name="play" color="#FFF" size={16} />
            <Text style={styles.startBtnText}>Initialize Morning Sequence</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BLOCKING COMPLIANCE MODAL GATE */}
      <Modal visible={gateModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🛡️ Pre-Trip Liability Check</Text>
            
            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('dashcam')}>
              {/* Swapped CheckCircle */}
              <Ionicons name="checkmark-circle" size={24} color={checklist.dashcam ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Dashcam actively loop-recording?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('boosterSeats')}>
              <Ionicons name="checkmark-circle" size={24} color={checklist.boosterSeats ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Booster seats safety-locked?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('safetyDoors')}>
              <Ionicons name="checkmark-circle" size={24} color={checklist.safetyDoors ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Child security safety doors activated?</Text>
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

// Ensure you have these styles defined, or adjust as needed
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
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  checkLabel: { fontSize: 16, flex: 1, color: Colors.dark },
  commitBtn: { backgroundColor: Colors.teal, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  commitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});