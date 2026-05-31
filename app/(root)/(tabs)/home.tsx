import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShieldCheck, Play, CheckCircle, Navigation } from 'lucide-react-native';
import database from '@react-native-firebase/database';
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
    
    // Lock signed security token payload inside Firebase Realtime logs for liability protection
    await database().ref(`/compliance_logs/${driver.uid}/${todayStr}`).set({
      timestamp: Date.now(),
      clearedBy: driver.email,
      ...checklist
    });

    setIsGatePassed(true);
    setGateModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollLayout}>
        <Text style={styles.title}>CareDriver Dashboard</Text>
        
        {/* Status Indicators */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Gate Status</Text>
          <View style={styles.row}>
            <ShieldCheck color={isGatePassed ? Colors.teal : Colors.gray} size={24} />
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
            <Play color="#FFF" size={20} />
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
              <CheckCircle color={checklist.dashcam ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Dashcam actively loop-recording?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('boosterSeats')}>
              <CheckCircle color={checklist.boosterSeats ? Colors.teal : Colors.gray} />
              <Text style={styles.checkLabel}>Booster seats safety-locked?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleCheck('safetyDoors')}>
              <CheckCircle color={checklist.safetyDoors ? Colors.teal : Colors.gray} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollLayout: { padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.dark, marginBottom: 20 },
  card: { backgroundColor: Colors.lightBg, padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.dark, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusText: { marginLeft: 10, fontWeight: '600', fontSize: 15 },
  desc: { color: Colors.gray, marginBottom: 15, fontSize: 14 },
  gateBtn: { backgroundColor: Colors.teal, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  startBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 10 },
  startBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', p: 20, padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.dark, marginBottom: 20, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  checkLabel: { marginLeft: 12, fontSize: 15, color: Colors.dark },
  commitBtn: { backgroundColor: Colors.dark, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  commitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});