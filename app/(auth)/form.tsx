import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, Alert, ScrollView, Text, TouchableOpacity, Image } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { db, fetchLocalDriverData } from "@/lib/localDB"; 
import { useLanguageStore, usePhoneNumberStore} from "@/store";
import {formTranslations} from "@/lib/translations"
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@react-native-firebase/storage';
import { updateRide } from "@/lib/utils";
import { Picker } from "@react-native-picker/picker";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { updateDriver } from "@/lib/utils";

const DriverProfileUpdate = () => {
const storage = getStorage();
const dbFirestore = getFirestore();
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;
const { phoneNumberStore, setPhoneNumberStore } = usePhoneNumberStore()  
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  if (!user) return;
const router = useRouter();
    const { language, setLanguage } = useLanguageStore();  
    const t = formTranslations[language];
const colors = ['Red', 'Blue', 'White', 'Black', 'Silver', 'Yellow', 'Pink', 'Purple'];
const genders = ['Male', 'Female'];

  const [carColor, setCarColor] = useState('');
  const [carModel, setCarModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
    const [gender, setGender] = useState('');
  const [languages, setLanguages] = useState([]);
  const [kilometerPrice, setKilometerPrice] = useState('');
  const [nightKilometerPrice, setNightKilometerPrice] = useState('');
const ETHIOPIAN_STATE_CODES = ['AA', 'OR', 'AM', 'TI', 'SO', 'AF', 'SI', 'BE', 'GA', 'DD', 'HA', 'CE'];
const PLATE_CODES = ['01', '02', '03'];
const letter_CODES = ['A', 'B', 'C', 'D', 'NONE'];

const [selectedState, setSelectedState] = useState('AA');
const [selectedCode, setSelectedCode] = useState(PLATE_CODES[0]);
const [selectedLetter, setSelectedLetter] = useState('A');
const [inputDigits, setInputDigits] = useState([0,0,0,0,0]);
const [plateDigits, setPlateDigits] = useState("00000");
const [visiblePad, setVisiblePad] = useState(false);

const [visibleField, setVisibleField] = useState(null);
  const models = ['Lada', 'Toyota 2000 Corolla', 'Toyota 2005 Corolla Altis', 'Toyota 2010 Corolla XRS', 'Toyota 2020 Corolla Hybrid', 'Toyota 2005 Vitz RS', 'Toyota 2010 Vitz', 'Toyota 2015 Vitz Hybrid', 'Toyota 2020 Vitz',
  	'Executive 2006 Camry', 'Executive 2010 Avalon', 'Executive 2015 Camry Hybrid', 'Executive 2020 Avalon TRD', '2008 Dzire', '2015 Dzire', '2020 Dzire or after', 'Suzuki 2005 Swift', 'Suzuki 2010 Swift Sport', 'Suzuki 2018 Swift Hybrid', 'Suzuki 2020 Swift or after', 'Wuling 7 seat', 'Suzuki 7 seat', 'Other'];
  const seats = [4, 5, 6, 7];
  const languageOptions = ['Amharic', 'English', 'Oromo', 'Tigrinya', 'Arabic', 'French', 'Spanish', 'Somali', 'Swahili', 'Guraghe', 'Harari', ];
  const prices = [8, 8.5, 9, 9.5, 10, 10.5, 11,11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18,18.5, 19,19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23,23.5, 24, 24.5,25,25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5, 31];
  const nightPrices = [10, 10.5, 11,11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18,18.5, 19,19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23,23.5, 24, 24.5,25,25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5, 31];
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';

    const [userDB, setUserDB] = useState(null);
    const [profileImage, setProfileImage] = useState(null);

    const [profileImageUrl, setProfileImageUrl] = useState(null);    
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
const [isSignedIn, setIsSignedIn] = useState('');

const handleImagePicker = async () => {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
     Alert.alert(t.error, t.permissionRequired);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });
 ; // ✅ Correct
        if (!result.cancelled) {
      const source = result?.assets[0].uri;
      setProfileImage(result?.assets[0].uri || source);
      await uploadImage(source);
    }
  };

 const uploadImage = async () => {
  if (!profileImage) return;

  const fileName = `${phoneNumberStore || driverId}.jpg`; // Unique + reusable filename

  const formData = new FormData();
  formData.append('file', {
    uri: profileImage,
    name: fileName,
    type: 'image/jpeg', // use jpeg for consistency
  });

  try {
    const response = await fetch('https://share-rides.com/upload.php', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        'X-Upload':  'JamaJama_1879_Majabangasto',
        // 'Content-Type' intentionally omitted
      },
    });

    const result = await response.json();
   //console .log("result", result, "result.url", result.url);

    if (response.ok && result.url) {
      setProfileImageUrl(result.url);
      await updateDriver(driverId, { profile_image: result.url });
      Alert.alert('Uploaded', '✅ Your profile image has been updated!');
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (err) {
    Alert.alert('No Upload', err.message);
  }
};

   const toggleLanguage = (lang) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

 const updateDriverProfile = async () => {

const plateNumber = `${selectedState}-${selectedCode}-${inputDigits.join('')}`;

  if (
    !carColor ||
    !carModel ||
    !plateNumber ||
    !seatNumber ||
    languages.length === 0 ||
    !gender
  ) {
Alert.alert(t.error, t.fillFields);
    return;
  }

  try {
 
const selectedCarModel = carModel === "Lada" ? "lada" : (seatNumber === 6 || seatNumber === 7) ? "minivan" : carModel;

await updateDoc(doc(dbFirestore, 'drivers', user.uid), {
  carColor,
  carModel,
  plateNumber,
  gender,
  seatType: seatNumber,
  profileImage: profileImageUrl || user?.photoURL,
  languagesSpoken: languages,
  kmPrice: 18,
  nightKilometerPrice: 21,
  detailsFilled: true,
  documentsSent: false,
  pioneer: false,
});

updateDriver(user.uid, {
  vehicle_details:
  { color: carColor,
  model: carModel,
  plate_number: plateNumber,  
  seat_type: seatNumber,
  name: user?.displayName},
  gender,
  profile_image: profileImage || user?.photoURL,
  languages_spoken: languages,
prices: JSON.stringify({
  kmPrice: 19,
  nightKilometerPrice: 21
}),
  details_filled: true,
  documents_sent: false,
  pioneer: false,
})

await db.runAsync(
  `UPDATE driver_stats SET
    kmPrice = ?,
    nightKilometerPrice = ?,
    weeklyFareTotal = ?,
    weeklyTripsCount = ?,
    weeklyStreetPickupCount = ?,
    monthlyTripsCount = ?,
    monthlyFareTotal = ?
  WHERE driverId = ?`,
  [18.5, 21.5, 0, 0, 0, 0, 0, user.uid] // ✅ Corrected parameter array
);

    router.replace("/(root)/(tabs)/home");
Alert.alert(t.success, t.profileUpdatedSuccess);
  } catch (error) {

        Alert.alert(t.error, 'Failed to update profile!');
  }
};
// Updated renderOptions function
const renderOptions = (items, setValue, fieldName) => (
  <View className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
    {items.map((item, index) => (
      <TouchableOpacity
        key={item}
        onPress={() => {
          setValue(item);
          setVisibleField(null);
 
        }}
        className={`p-4 bg-white ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}
      >
        <Text className="text-center font-JakartaMedium text-gray-800">
          {item}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const FormField = ({ label, value, onPress, icon, isActive }) => (
  <View className="mb-4">
    <Text className="text-gray-600 font-JakartaMedium mb-2">{label}</Text>
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between bg-gray-100 rounded-lg px-4 py-3"
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={20} color="orange" style={{ marginRight: 8 }} />
        <Text className="text-gray-800 font-JakartaMedium">{value}</Text>
      </View>
      <Ionicons 
        name={isActive ? "chevron-up" : "chevron-down"} 
        size={20} 
        color="silver" 
      />
    </TouchableOpacity>
  </View>
);

const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  icon,
  inputRef // Add this prop
}) => (
  <View className="mb-4">
    <Text className="text-gray-600 font-JakartaMedium mb-2">{label}</Text>
    <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
      <Ionicons name={icon} size={20} color="#6b7280" className="mr-2" />
      <TextInput
        ref={inputRef} // Pass the ref
        className="flex-1 font-JakartaMedium text-gray-800"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        onFocus={() => setVisibleField(null)} // Close dropdowns when typing
      />
    </View>
  </View>
);

const NumberPad = ({ onPress }) => (
  <View className="flex-row flex-wrap justify-center gap-2">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
      <TouchableOpacity
        key={num}
        onPress={() => onPress(num)}
        className="w-1/4 bg-gray-100 rounded-lg p-3 items-center"
      >
        <Text className="text-lg font-JakartaSemiBold">{num}</Text>
      </TouchableOpacity>
    ))}
  </View>
);



  return (
    <ScrollView contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none" 
              keyboardDismissMode="none">
   {/* Profile Header */}
    <View className="items-center py-8 ">
      <Text className="text-2xl font-JakartaBold text-orange-600 mb-4">
        {t.completeProfile}
      </Text>
  {/* Avatar Section */}
      <View className="items-center">
        <TouchableOpacity onPress={handleImagePicker}>
          <View className="relative">
            <Image
              source={{ uri: profileImage || DEFAULT_AVATAR }}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg shadow-black/20"
            />
            <View className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full">
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </View>
        </TouchableOpacity>
        
        <Text className="text-xl font-JakartaBold text-gray-800 mt-4">
          {user.displayName}
        </Text>
      </View>
    </View>

      {/* Form Container */}
    <View className="px-4 space-y-6">
      {/* Vehicle Details Card */}
      <View className="bg-white rounded-2xl p-6 shadow-sm shadow-black/10">
        <Text className="text-lg font-JakartaBold text-gray-800 mb-4">
          Vehicle Information
        </Text>

             {/* Car Color */}
        <FormField
  label={t.carColor}
  value={carColor || t.selectCarColor}
  onPress={() => setVisibleField('carColor')}
  icon="color-palette"
  isActive={visibleField === 'carColor'}
/>
{visibleField === 'carColor' && renderOptions(colors, setCarColor, 'carColor')}


        {/* Car Model */}
        <FormField
          label={t.carModel}
          value={carModel || t.selectCarModel}
          onPress={() => setVisibleField('carModel')}
          icon="car-sport"
            isActive={visibleField === 'carModel'}
        />
        {visibleField === 'carModel' && renderOptions(models, setCarModel, 'carModel')}

        {/* Seat Number */}
        <FormField
          label={t.seatNumber}
          value={seatNumber || t.selectSeatNumber}
          onPress={() => setVisibleField('seatNumber')}
          icon="people"
            isActive={visibleField === 'seatNumber'}
        />
        {visibleField === 'seatNumber' && renderOptions(seats, setSeatNumber, 'seatNumber')}
      </View>

      {/* License Details Card */}
<View className="bg-white rounded-2xl pt-4 shadow-sm shadow-black/10">
  <Text className="text-lg font-JakartaBold text-gray-800  pl-6">
    Plate Number (የሰሌዳ ቁጥር)
  </Text>

  {/* Display final plate number */}
  <Text className="text-center text-sm font-JakartaSemiBold text-gray-700 bg-gray-300 py-2 my-4">
    {selectedState}-{selectedCode}-{selectedLetter}{inputDigits}
  </Text>
  <View className="flex-row justify-between items-center mb-4 mx-2">
    {/* State Code Picker */}
    <View className="flex-1 mr-2">
      <Text className="text-sm font-JakartaMedium text-gray-600 mb-1">State Code</Text>
      <Picker
        selectedValue={selectedState}
        onValueChange={setSelectedState}
        className="bg-gray-100 rounded-lg p-1">
        {ETHIOPIAN_STATE_CODES.map(code => (
          <Picker.Item key={code} label={code} value={code} />
        ))}
      </Picker>
    </View>

    {/* Plate Code Picker */}
    <View className="flex-1 mx-2">
      <Text className="text-sm font-JakartaMedium text-gray-600 mb-1">Plate Code</Text>
      <Picker
        selectedValue={selectedCode}
        onValueChange={setSelectedCode}
        className="bg-gray-100 rounded-lg p-1">
        {PLATE_CODES.map(code => (
          <Picker.Item key={code} label={code} value={code} />
        ))}
      </Picker>
    </View>

    {/* Plate Code Picker */}
    <View className="">
      <Text className="text-sm font-JakartaMedium text-gray-600 mb-1">Letter</Text>
      <Picker
        selectedValue={selectedLetter}
        onValueChange={(itemValue) => {
  setSelectedLetter(itemValue === 'NONE' ? '' : itemValue);
}}
        className="bg-gray-200 rounded-lg p-1">
        {letter_CODES.map(code => (
          <Picker.Item key={code} label={code} value={code} />
        ))}
      </Picker>
    </View>

  {/* Number Input */}
<View className="flex-1 ml-2">
  <Text className="text-sm font-JakartaMedium text-gray-600 mb-1">Plate Number</Text>
  <TouchableOpacity
    onPress={() => {
      setVisiblePad(true);
      setInputDigits([]);
    }}
    className="bg-gray-100 rounded-lg p-2"
  >
    <Text className="text-center text-sm font-JakartaSemiBold">
      {inputDigits.join('')}
    </Text>
  </TouchableOpacity>
</View>

{visiblePad && inputDigits.length < 5 && (
  <NumberPad onPress={(num) => {
    setInputDigits(prev => [...prev, num].slice(-5));
  }} />
)}
</View>
</View>
      {/* Personal Details Card */}
      <View className="bg-white rounded-2xl p-6 shadow-sm shadow-black/10">
        <FormField
          label={t.gender}
          value={gender || t.selectGender}
          onPress={() => setVisibleField('gender')}
          icon="person"
            isActive={visibleField === 'gender'}
        />
        {visibleField === 'gender' && renderOptions(genders, setGender, 'gender')}

        {/* Language Selection */}
        <View className="mt-4">
          <Text className="text-gray-600 font-JakartaMedium mb-3">
            {t.selectLanguages}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {languageOptions.map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => toggleLanguage(lang)}
                className={`px-4 py-2 rounded-full ${
                  languages.includes(lang)
                    ? 'bg-orange-500'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-JakartaMedium ${
                    languages.includes(lang)
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
{/* Submit Button */}
      <TouchableOpacity
        onPress={updateDriverProfile}
        className="bg-gradient-to-r from-orange-500 bg-black to-amber-500 rounded-xl py-4 shadow-lg shadow-orange-500/30"
      >
        <Text className="text-center text-white text-lg font-JakartaBold">
          {t.updateProfile}
        </Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  }
});

export default DriverProfileUpdate;