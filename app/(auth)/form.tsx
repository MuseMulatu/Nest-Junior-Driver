import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import auth from '@react-native-firebase/auth';

const API_BASE = 'https://api.zabiya.com/api/nest-junior/auth';
const Colors = { primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C", textMedium: "#4A5568", backgroundWhite: "#FFFFFF", borderLight: "#E2E8F0" };

export default function VehicleFormScreen() {
  const [loading, setLoading] = useState(false);
  
  // Aligning exactly with Prisma DriverProfile schema
  const [carModel, setCarModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats] = useState('4');

  const submitVehicleDetails = async () => {
    if (!carModel.trim() || !plateNumber.trim() || !seats.trim()) {
      return Alert.alert('Missing Fields', 'Please complete all vehicle details.');
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("Firebase session lost");

      await axios.post(`${API_BASE}/driver/complete-profile`, {
          firebaseUid: user.uid,
          carModel,
          plateNumber,
          seats
      });
      
      Alert.alert(
        'Profile Submitted', 
        'Your profile is now PENDING. An admin will review your details before you can accept rides.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(root)/(tabs)/home') }]
      );
    } catch (error) {
      Alert.alert('Submission Failed', 'Could not save vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Vehicle Setup</Text>
          <Text style={styles.subtitle}>Enter the details of the vehicle you will use for Nest Junior routes.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Model (e.g. Toyota Minivan)</Text>
            <TextInput style={styles.input} value={carModel} onChangeText={setCarModel} placeholder="Enter model" />
            
            <Text style={styles.label}>License Plate Number</Text>
            <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} placeholder="e.g. B 12345 AA" autoCapitalize="characters" />
            
            <Text style={styles.label}>Maximum Passenger Seats</Text>
            <TextInput style={styles.input} value={seats} onChangeText={setSeats} placeholder="4" keyboardType="number-pad" maxLength={2} />
          </View>

          <TouchableOpacity style={styles.btn} onPress={submitVehicleDetails} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit for Approval</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { paddingBottom: 20 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 28, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, marginBottom: 32, lineHeight: 22 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'Jakarta-SemiBold', color: Colors.textDark, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, color: Colors.textDark },
  btn: { backgroundColor: Colors.secondaryTeal, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: Colors.backgroundWhite, fontSize: 16, fontFamily: 'Jakarta-Bold' }
});