import firestore from '@react-native-firebase/firestore';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Button, TextInput, Alert, ActivityIndicator, TouchableOpacity, Text, ScrollView, Image } from 'react-native';
import { defaultStyles } from '@/constants/Styles';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { CustomModal } from '@/components/modals';
import Colors from '@/constants/Colors';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import Constants from "expo-constants"
import { driverRegisterLocal, db, loginRecharge } from "@/lib/localDB"; 
import uuid from 'react-native-uuid';
import { useLanguageStore, usePhoneNumberStore } from "@/store";
import { registerTranslations } from "@/lib/translations"
import map from "@/assets/images/onboarding3.png";
import { dynamoDB } from '@/lib/modals'; 
import * as Linking from 'expo-linking';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { createDriver, updateDriver } from "@/lib/utils";
import auth from '@react-native-firebase/auth';
import axios from 'axios' 

const Page = () => {
  const { language, setLanguage } = useLanguageStore();  
 
    const t = registerTranslations[language];
const { phoneNumberStore, setPhoneNumberStore } = usePhoneNumberStore()  
const dbFirestore = getFirestore();
let authModular = getAuth();
let user = authModular.currentUser;
let driverId = user?.uid;

  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(null);
const [expoToken1, setExpoToken1] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recommendedBy, setRecommendedBy] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
const [agreed, setAgreed] = useState(false);

const createDriverEntry = async (driverId, username) => {
  try {
    const params = {
      TableName: "Drivers",
      Item: {
        driverId, username,  karma: 0, age: 0,  followerCount: 0 
      }
    };
    await dynamoDB.put(params).promise();

  } catch (error) {

  }
};

const handlePrivacyPolicy = () => {
  Linking.openURL('https://share-rides.com/share-driver-super-app-privacy-policy/');
};

const handleTermsAndConditions = () => {
  Linking.openURL('https://share-rides.com/driver-terms-and-conditions/');
};

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
      console.warn('Push notification permissions not granted.');
      return null;
  }

// First, try to get the projectId dynamically, like you are already doing.
  let projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  // --- THE FIX: Add a fallback if projectId is still not found ---
  if (!projectId) {
    console.log("Could not infer Project ID from manifest, using hardcoded fallback.");
    // PASTE THE PROJECT ID YOU COPIED FROM YOUR app.json FILE HERE
    projectId = "f8667242-608a-4291-8e2e-ececfefbc33f";
  }
  // --- END FIX ---
  
  if (!projectId) {
      // This is a final check in case the hardcoded value is also missing.
      Alert.alert("Configuration Error", "Could not determine Expo Project ID.");
      return null;
  }

  const tokenData =  (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
  return tokenData
};

const useExpoPushToken = () => {
  let expoPushToken="";

    registerForPushNotifications().then((token) => {
    //  console.log("token:", token)
      if (token) expoPushToken = token;
    });
  return expoPushToken;
};

const expoToken = useExpoPushToken();
const router = useRouter();

const registerOrUpdateRider = async (passedToken) => {
  try {

    if (!user) {
      authModular = getAuth();
      user = authModular.currentUser;
    }
    
    if (!user) {

      throw new Error("No authenticated user");
    }

    const driverId = user.uid;
    const formattedPhoneNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : null;
    const formattedRecommendedBy = recommendedBy ? formatPhoneNumber(recommendedBy) : null;

    setPhoneNumberStore(phoneNumber);

 await user.updateProfile({ displayName: name });

  const tokenToUse = passedToken || expoToken1 || "bs";
  const randomDigits = Math.floor(Math.random() * 9000) + 1000;
  const cleanString = (str) => str ? str.replace(/\s+/g, '') : '';
  const author = `@${cleanString(user?.displayName || 'Anonymous')}${randomDigits}`;
  const recommendedByData = { pnumber: formattedRecommendedBy };

  let riderDocExists = false;
  let firestoreData = null;

  // 1. Check Firestore
  const riderRef = doc(dbFirestore, 'drivers', driverId);
  const riderDoc = await getDoc(riderRef);
  if (riderDoc.exists){
    riderDocExists = true;
    firestoreData = riderDoc.data();
  }

  // 2. Check MySQL
  let mysqlDriver = null;
  try {
    if(riderDocExists){
      console.log("firestoreData.pnumber", firestoreData.pnumber)
       const res = await fetch(`https://app.share-rides.com/drivers/by-phone/${firestoreData.pnumber}`);
    if (res.ok) {
      mysqlDriver = await res.json();
    }
    }
    else{
    const res = await fetch(`https://app.share-rides.com/drivers/by-phone/${formattedPhoneNumber}`);
    if (res.ok) {
      mysqlDriver = await res.json();
    }
  }
  } catch (err) {
    console.error("MySQL check failed:", err);
  }

  // 💡 Case 1: Both Firestore & MySQL exist
  if (riderDocExists && mysqlDriver) {
    console.log("Case 1")
    await updateDoc(riderRef, {
      signTime: user.metadata.lastSignInTime,
      expoToken: tokenToUse,
    });
console.log("mysqlDriver", mysqlDriver)
    if (mysqlDriver?.details_filled) {
      await updateDriver(driverId, { expo_token: tokenToUse });

      // if (firestoreData?.approvedRecharge) {
      //   const { rechargeDate, rechargeAmount } = firestoreData.approvedRecharge;
      //   const parsedRecharge = parseFloat(rechargeAmount) || 0;
      //   loginRecharge(driverId, rechargeDate, parsedRecharge);
      // }

      await driverRegisterLocal(driverId, formattedPhoneNumber, 0, 0, author, 0, "noBenefits", tokenToUse);
      router.replace('/(root)/(tabs)/home');
      return;
    }

    // Firestore exists, MySQL exists, but details_filled not set — go to form
    router.replace('/(auth)/form');
    return;
  }

  // 💡 Case 2: Firestore exists, MySQL does NOT
  if (riderDocExists && !mysqlDriver) {
    console.log("Case 2")
    // Create in MySQL
    try {
      await createDriver({
        user_id: driverId,
        licenseNumber: "ABC-12345",
        vehicle_details: {
          make: "Toyota",
          model: "Corolla",
          year: "2018",
          color: "Silver",
          name: name || user.displayName,
        },
        pnumber: formattedPhoneNumber,
        creditAmount: 0,
        referralCommission: 0,
        shareUsername: author,
        tierType: "noBenefits",
        expoToken: tokenToUse,
      });
    } catch (err) {
      console.error("MySQL createDriver failed", err);
    }

    await updateDoc(riderRef, {
      signTime: user.metadata.lastSignInTime,
      expoToken: tokenToUse,
    });

    router.replace('/(auth)/form');
    return;
  }

  // 💡 Case 3: MySQL exists, Firestore does NOT
  if (!riderDocExists && mysqlDriver) {
  console.log("Case 3")
    try {
      await setDoc(riderRef, {
        driverId,
        name: name || user.displayName,
        pnumber: formattedPhoneNumber,
        recommendedBy: recommendedByData,
        expoToken: tokenToUse,
        creditAmount: mysqlDriver.credit_amount || 0,
        referralCommission: mysqlDriver.referral_commission || 0,
        status: "available",
        tierType: mysqlDriver.tier_type || "noBenefits",
      });

      await driverRegisterLocal(driverId, formattedPhoneNumber, 0, 0, author, 0, "noBenefits", tokenToUse);
    } catch (err) {
      console.error("Failed to create Firestore doc from MySQL data", err);
    }

    router.replace('/(auth)/form');
    return;
  }

  // 💡 Case 4: Neither exists — create both
  try {
    console.log("Case 4")
    await createDriver({
      user_id: driverId,
      licenseNumber: "ABC-12345",
      vehicle_details: {
        make: "Toyota",
        model: "Corolla",
        year: "2018",
        color: "Silver",
        name: name || user.displayName,
      },
      pnumber: formattedPhoneNumber,
      creditAmount: 0,
      referralCommission: 0,
      shareUsername: author,
      tierType: "noBenefits",
      expoToken: tokenToUse,
    });
  } catch (err) {
    console.error("createDriver Error", err);
    Alert.alert(
      "Used Credentials",
      "Please use your existing Google account with the phone number you used to create your account."
    );
    return;
  }

  await setDoc(riderRef, {
    driverId,
    name: name || user.displayName,
    pnumber: formattedPhoneNumber,
    recommendedBy: recommendedByData,
    expoToken: tokenToUse,
    creditAmount: 0,
    referralCommission: 0,
    status: "available",
    tierType: "noBenefits",
  });

  await driverRegisterLocal(driverId, formattedPhoneNumber, 0, 0, author, 0, "noBenefits", tokenToUse);
  router.replace('/(auth)/form');

} catch (error) {
  console.error("Signup Error", error);
  Alert.alert("Signup Error", "Something went wrong during registration. Please try again.");
  throw error;
}
};


  GoogleSignin.configure({
    webClientId: '421773572020-8vec80jsioinp00t22kmoesactnrhhn1.apps.googleusercontent.com', // Add your web client ID here
     offlineAccess: true, // Recommended
  });

const formatPhoneNumber = (number) => {
  if (number.startsWith('0')) {
    return '+251' + number.slice(1); // Remove '0' and replace with '+251'
  }
  return number; // Return as is if already formatted
};

// Function to validate the phone number
const validatePhoneNumber = (number) => {
  const regex = /^(09|07)[0-9]{8}$/; // Starts with 09 or 07, followed by 8 digits
  return regex.test(number);
};


// Function to validate required fields
const validateFields = () => {
  if (!name.trim()) {
    Alert.alert("Whoops,", t.nameRequired); // Translated alert
    return false;
  }

  if (!validatePhoneNumber(phoneNumber)) {
    Alert.alert("Whoops,", t.invalidPhoneNumber); // Translated alert
    return false;
  }

  return true;
};

async function onGoogleButtonPress() {
  try {
    await GoogleSignin.signOut(); // Clean slate
    setLoading(true);

    GoogleSignin.configure({
      webClientId: '421773572020-8vec80jsioinp00t22kmoesactnrhhn1.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo?.data || {};

    if (!idToken) {
      throw new Error("No idToken received from Google Sign-In");
    }

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(googleCredential);

    const user = auth().currentUser;
    if (!user) throw new Error("Failed to get authenticated user after sign-in");

    let token = null;
    for (let i = 0; i < 10; i++) {
      token = await registerForPushNotifications();
      if (token) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!token) {
      throw new Error("Failed to retrieve Expo push token");
    }

    setExpoToken1(token);
    await retryWithBackoff(() => registerOrUpdateRider(token));
// await registerOrUpdateRider(token); // If this fails, auth is signed out inside

  } catch (error) {
    try {
      await auth().signOut(); // Ensure user is not partially signed in
    } catch (signOutErr) {
  console.error("signOutErr Failed",  signOutErr  )
    }
    setLoading(false);
  Alert.alert("Login Failed", "Something went wrong during registration. Please try again.");
    console.error("Login Failed",  error?.message || error )
  }
}

async function retryWithBackoff(fn, retries = 5, delay = 300) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      const wait = delay * Math.pow(2, attempt); // exponential backoff
      console.warn(`Retry attempt ${attempt + 1} failed. Retrying in ${wait}ms...`, error);
      await new Promise(res => setTimeout(res, wait));
      attempt++;
    }
  }
  throw new Error('Operation failed after maximum retries');
}

  async function signInWithPhoneNumber(phoneNumber) {
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber); // Send SMS
      setConfirm(confirmation);
     // console.log(confirmation, "confirmation")
    } catch (error) {

      setModalMessage("Failed to send verification code. Please try again.");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  }

async function confirmCode() {
  if (!confirm) {
    setModalMessage("Please request a verification code first.");
    setModalVisible(true);
    return;
  }
  setLoading(true);
  try {
    await confirm.confirm(code); // Confirm code
    if (user) {

        let retries = 0;
      let token = null;
      
      // Retry logic
      while (!token && retries < 10) {
        token = await registerForPushNotifications();
        if (token) {
          setExpoToken1(token); // Set state once token is retrieved
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 1 second
        retries++;
      }

     // console.log("expoToken inside confirmCode is", token);
        await registerOrUpdateRider(token); // Pass the retrieved token
        router.replace('/(auth)/form'); // Navigate to home
    }
  } catch (error) {

    setModalMessage("Invalid verification code. Please try again.");
    setModalVisible(true);
  } finally {
    setLoading(false);
  }
}


  const handleSignUpOption = async (option) => {
  //   if (!agreed) {
  //   setModalMessage(t.agreeToTermsError);
  //   setModalVisible(true);
  //   return;
  // }
  
    if (!validateFields()) return;
const formattedPhoneNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : null;

  if (option === 'phone') {
    await signInWithPhoneNumber(formattedPhoneNumber); // Trigger phone number verification
  }  // Trigger phone number verification
    else if (option === 'google') {
      await onGoogleButtonPress();
    } else if (option === 'facebook') {
      await onFacebookButtonPress();
    }
  }

  return (
  <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.contentContainer}>
      {/* Language Selector */}
      <View style={styles.languageContainer}>
        {['ENG', 'AMH', 'ORM'].map((lang) => (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[
              styles.languageButton,
              language === lang && styles.activeLanguage
            ]}
          >
            <Text style={[
              styles.languageText,
              language === lang && styles.activeLanguageText
            ]}>
              {lang}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header Section */}
      <Image 
        source={map} 
        style={styles.headerImage}
      />
      <Text style={styles.title}>{t.signInToShare}</Text>

      {/* Form Section */}
      <View style={styles.formContainer}>
        <TextInput
          placeholder={t.namePlaceholder}
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#999"
        />

        {!confirm ? (
          <>
            <Text style={styles.inputLabel}>{t.enterPhoneNumber}</Text>
            <TextInput
              placeholder={t.phoneNumberPlaceholder}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </>
        ) : (
          <TextInput
            placeholder={t.enterCode}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor="#999"
          />
        )}
<View style={styles.disclaimerContainer}>
  <TouchableOpacity 
    onPress={() => setAgreed(!agreed)}
    style={styles.checkboxContainer}
  >
    <Ionicons style={{marginRight: 5}}
      name={agreed ? "checkbox-outline" : "square-outline"} 
      size={20} 
      color={agreed ? "#f97316" : "#666"} 
    />
    <Text className="font-JakartaMedium" style={styles.disclaimerText}>
      {t.iAgreeTo}
    </Text>
  </TouchableOpacity>
  
  <View style={styles.linksContainer}>
       <TouchableOpacity onPress={handlePrivacyPolicy}>
      <Text style={styles.linkText}>{t.privacyPolicy}</Text>
    </TouchableOpacity>
    <Text style={styles.disclaimerText}>{t.and}</Text>
 <TouchableOpacity onPress={handleTermsAndConditions}>
      <Text style={styles.linkText}>{t.termsOfService}</Text>
    </TouchableOpacity>
  </View>
</View>
        {/* Action Buttons */}
        {loading && <ActivityIndicator size="large" color="orange" />}
        
        {!confirm ? (
          <>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => handleSignUpOption('google')}
            >
              <FontAwesome style={{marginTop: 3}} name="google" size={19} color="#DB4437" />
              <Text style={styles.googleButtonText}>{t.continueWithGoogle}</Text>
            </TouchableOpacity>

            <Text style={styles.recommendationText}>{t.recommendedByText}</Text>
            <TextInput
              placeholder={t.recommendedByPlaceholder}
              value={recommendedBy}
              onChangeText={setRecommendedBy}
              style={styles.input}
              keyboardType="number-pad"
              placeholderTextColor="#999"
            />
          </>
        ) : (
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={confirmCode}
          >
            <Text style={styles.buttonText}>{t.confirmCode}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>

    <CustomModal
      visible={modalVisible}
      message={modalMessage}
      onClose={() => setModalVisible(false)}
    />
  </ScrollView>
);
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 50,
    gap: 8,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeLanguage: {
    backgroundColor: '#FF7F50',
    borderColor: '#FF7F50',
  },
  languageText: {
    fontFamily: 'Jakarta-SemiBold',
    color: '#64748B',
  },
  activeLanguageText: {
    color: 'white',
  },
  headerImage: {
    width: 200,
    height: 160,
    alignSelf: 'center',
    marginVertical: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Jakarta-ExtraBold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontFamily: 'Jakarta-Medium',
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#FF7F50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButton: {
        justifyContent: 'center',
        gap: 12,
        flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 16,
    marginLeft: 18
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  separatorText: {
    fontFamily: 'Jakarta-Medium',
    color: '#64748B',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#929890',
    borderRadius: 12,
    marginTop: 15,
    padding: 16,
  },
  googleButtonText: {
    color: '#eee',
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 18,
        marginLeft: 18,
        alignSelf: "center",
  },
  recommendationText: {
    fontFamily: 'Jakarta-Medium',
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  disclaimerContainer: {
  marginTop: 0,
  alignItems: 'center',
},
checkboxContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 5,
},
disclaimerText: {
  fontSize: 12,
  color: '#666',
  marginLeft: 0,
},
linksContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
},
linkText: {
  color: '#f97316',
  fontSize: 12,
  textDecorationLine: 'underline',
  marginHorizontal: 5,
},
});

export default Page;

