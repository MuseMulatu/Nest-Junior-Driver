import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const API_BASE = 'https://api.zabiya.com/api/nest-junior/auth';
const TELEGRAM_BOT_URL = 'https://t.me/YourNewNestJuniorBot'; // Update to your bot link

const Colors = { primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C", textMedium: "#4A5568", backgroundWhite: "#FFFFFF", borderLight: "#E2E8F0" };

type Step = 'GOOGLE_AUTH' | 'DETAILS' | 'OTP';

export default function DriverRegisterScreen() {
  const [step, setStep] = useState<Step>('GOOGLE_AUTH');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '421773572020-8vec80jsioinp00t22kmoesactnrhhn1.apps.googleusercontent.com', // Match your Firebase config
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No idToken found");

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      setName(userCredential.user.displayName || '');
      setStep('DETAILS');
    } catch (error: any) {
      Alert.alert('Sign-In Failed', 'Could not authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  const requestTelegramOtp = async () => {
    if (!name.trim() || phone.length < 9) return Alert.alert('Invalid Input', 'Please enter your full name and phone number.');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/send-telegram-otp`, { phone, name });
      setStep('OTP');
    } catch (error) {
      Alert.alert('Error', 'Ensure you have started our Telegram Bot first.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndRegister = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("Firebase session lost");

      // CALLS THE DRIVER-SPECIFIC ENDPOINT
      await axios.post(`${API_BASE}/driver/verify-otp-and-register`, {
          firebaseUid: user.uid,
          name,
          phone,
          otp
      });
      
      // Move to Vehicle Registration Form
      router.replace('/(auth)/form');
    } catch (error) {
      Alert.alert('Invalid OTP', 'The code you entered is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step === 'OTP' ? setStep('DETAILS') : router.back()}>
              <Ionicons name="arrow-back" size={28} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Driver Portal</Text>
          
          {step === 'GOOGLE_AUTH' && <Text style={styles.subtitle}>Nest Junior CareDriver Sign In.</Text>}
          {step === 'DETAILS' && <Text style={styles.subtitle}>Confirm your legal name and contact number.</Text>}
          {step === 'OTP' && <Text style={styles.subtitle}>Enter the code sent to {phone} via Telegram.</Text>}

          {step === 'GOOGLE_AUTH' && (
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.textDark} /> : (
                <><FontAwesome name="google" size={20} color={Colors.secondaryTeal} style={styles.googleIcon} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text></>
              )}
            </TouchableOpacity>
          )}

          {step === 'DETAILS' && (
            <View>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full Legal Name" />
              <TextInput style={styles.input} placeholder="Phone Number (e.g. 0911...)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              
              <TouchableOpacity onPress={() => Linking.openURL(TELEGRAM_BOT_URL)} style={{ marginBottom: 20 }}>
                 <Text style={styles.botLinkText}>👉 Tap here to open Telegram Bot first</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btn} onPress={requestTelegramOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Request OTP</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'OTP' && (
            <View>
              <TextInput style={styles.input} placeholder="Enter 6-Digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
              <TouchableOpacity style={styles.btn} onPress={verifyOtpAndRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Continue</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reuse the exact same clean styles from your parent app here.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { paddingBottom: 20 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 28, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, marginBottom: 32, lineHeight: 22 },
  botLinkText: { fontSize: 13, fontFamily: 'Jakarta-Bold', color: Colors.secondaryTeal, textAlign: 'center' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundWhite, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, elevation: 2 },
  googleIcon: { marginRight: 12 },
  googleBtnText: { color: Colors.textDark, fontSize: 16, fontFamily: 'Jakarta-Bold' },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: Colors.textDark },
  btn: { backgroundColor: Colors.secondaryTeal, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: Colors.backgroundWhite, fontSize: 16, fontFamily: 'Jakarta-Bold' }
});