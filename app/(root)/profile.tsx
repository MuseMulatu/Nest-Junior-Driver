import { View,Text,Button,StyleSheet, ScrollView, Image,TouchableOpacity,TextInput, Alert, Modal, FlatList} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import auth from '@react-native-firebase/auth';
import { useRouter} from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import InputField from "@/components/InputField";
import firestore from '@react-native-firebase/firestore';
import { useCreditbalanceStore, useDriverkmPriceStore, useWeeklyTripsCountStore, useCreditStore, usePioneerStore,
useWeeklyStreetPickupCountStore, useMonthlyTripsCountStore, useWeeklyFareTotalStore, usePhoneNumberStore } from "@/store";
import { icons, images } from "@/constants";
import * as Notifications from 'expo-notifications';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { fetchUserDataRecharge, getDriverPerformance, db } from "@/lib/localDB";  
import { useLanguageStore} from "@/store";
import {profileTranslations} from "@/lib/translations"
import { CustomAlertModal, CreditRechargeModal } from "@/components/modals" 
import { Linking } from "react-native";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { encode } from 'base-64';
import RNFetchBlob from 'react-native-blob-util';
import { updateDriver } from "@/lib/utils";

const Profile = () => {
  const { language, setLanguage } = useLanguageStore();  
  const router = useRouter();
const auth = getAuth();
const user = auth.currentUser;
const driverId =  user ? user.uid : "logged out"

  const [userDB, setUserDB] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
const [isSignedIn, setIsSignedIn] = useState('');
const [creditRechargesDB, setCreditRechargesDB] = useState(null);
  const [showRechargeHistory, setShowRechargeHistory] = useState(false);
const t = profileTranslations[language];
const [currentBio, setCurrentBio] = useState('');
const [editingBio, setEditingBio] = useState(false);

const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});
const [completionRate, setCompletionRate] = useState(0); 

const {phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, profileImageUrl, bio, setprofileDetails } =  usePhoneNumberStore() 
 const [modalVisible, setModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeDataLocal, setRechargeDataLocal] = useState(null);

  const [transactionId, setTransactionId] = useState('');
  const upperThreshold = 5000; // Set your upper threshold here
  const lowerThreshold = 249;  // Set your lower threshold here
const { creditBalance, setCreditBalance } = useCreditbalanceStore()
const {setIsPioneer, isPioneer, tierType, setTierType} = usePioneerStore()

const { adminAlertText, adminCreditAmount,  setAdminAlertText, setAdminCreditAmount, adminCbeAccount, setAdminCbeAccount, setAdminTelebirr, adminTelebirr } = useCreditStore();

const convertToReadableFormat = (epochTime) => {
  // Ensure the epoch time is in milliseconds
  const date = new Date(epochTime * 1000);
// Fetch recharge history from local DB when component mounts
 

  const toggleRechargeHistory = () => {
    setShowRechargeHistory(prev => !prev);
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24-hour format
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};


useEffect(() => {
    const fetchCompletionData = async () => {
        // Add `await` here to resolve the Promise
      const {completionPercentage} = await getDriverPerformance(user.uid); // ✅ Now returns a number

      setCompletionRate( completionPercentage );
}
fetchCompletionData()
}, []);  


const handleBioUpdate = async () => {
  if (currentBio.length > 100) {
    setModalData({
      title: "Too long",
      message: "Bio must be 100 characters or less",
      imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
    });
    setAlertModalVisible(true);
    return;
  }

  try {
    setprofileDetails({bio: currentBio}) 
    // Update Firestore database
    const driverDocRef = firestore().collection("drivers").doc(driverId);
    await driverDocRef.update({ driverBio: currentBio });
updateDriver(driverId, {
    bio: currentBio
})

    setEditingBio(false);
  } catch (error) {

  }
};

useEffect(() => {
  const fetchRechargeData = async () => {
    try {
     const result = await fetchUserDataRecharge();
     setCreditRechargesDB(result);
    } catch (error) {

    }
  };

  fetchRechargeData();
    const currentUser = auth.currentUser;

    if (currentUser) {
      setIsSignedIn(true);
      setName(currentUser.displayName);
    } else {
      Alert.alert(t.signInFirst); // Translated alert
      router.replace('/login');
      setIsSignedIn(false);
    }
  }, []);

const renderItem = ({ item }) => (
  <View style={styles.itemContainer}>
    <Text className="font-JakartaBold" style={styles.amountText}>
      Amount: {item.rechargeAmount} ETB
    </Text>
    <Text className="text-green-500" style={styles.statusText}>
      Status: {item.status || "Approved"}
    </Text>
    <Text style={styles.dateText}>
      Date: {convertToReadableFormat(item.rechargeDate)}
    </Text>
  </View>
);

const handleLogOut = () => {
  Alert.alert(
    "Confirm Logout",
    "Are you sure you want to sign out?",
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Yes, Logout",
        onPress: async () => {
          try {
            await auth.signOut(); // or await auth.signOut() depending on your auth import
            Alert.alert(t.signOutSuccess);
            setIsSignedIn(false);
            router.replace('/(auth)/welcome');
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        }
      }
    ],
    { cancelable: true }
  );
};

  const toggleRechargeHistory = () => {
    setShowRechargeHistory(prev => !prev);
  };

    const updateUserNameInFirestore = async (name) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Update Firebase Auth displayName
        await currentUser.updateProfile({ displayName: name });
      }
    } catch (error) {

    }
  };

  const handleUpdateProfile = () => {
    updateUserNameInFirestore(name);
    setEdit(false); // Close edit mode after saving
  };

const username = "ProfilePictures";
const appPassword = "6Aju YdEi ws5c dLiZ WQp9 4tO2";
const authHeader = 'Basic ' + btoa(`${username}:${appPassword}`);

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
        if (!result.cancelled) {
      const source = result?.assets[0].uri;
      setProfileImage(result?.assets[0].uri || source);
      await uploadImage(source);
    }
  };

const uploadImage = async () => {
  //console .log("profileImage", profileImage)
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
        'X-Upload': 'JamaJama_1879_Majabangasto',
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

  const uploadImageToFirebase = async (imageUri) => {
    try {
      const currentUser = auth.currentUser;
      const storageRef = storage().ref(`profileImages/${currentUser.uid}.jpg`);
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await storageRef.put(blob);
      const downloadURL = await storageRef.getDownloadURL();
      await firestore().collection('drivers').doc(currentUser.uid).set(
        { profileImage: downloadURL },
        { merge: true }
      );

  setModalData({
    title: "Success",
    message: t.profilePictureUpdated,
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
    } catch (error) {

    }
  };


  const handleRefillCredit = () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount < adminCreditAmount ) {
  setModalData({
    title: t.invalidAmount,
    message: `${user.displayName}, ${adminAlertText}.`,
    imageSource: "https://i.gifer.com/7F5y.gif",
  });
  setAlertModalVisible(true);
      return;
    }
    setModalVisible(true);
  };

return (
  <SafeAreaView className="flex-1 bg-gray-50">
    <ScrollView contentContainerStyle={{paddingBottom: 100}}>
      <View className="px-6 pt-5 pb-4 bg-white shadow-sm shadow-black/10">
        <View className="flex-row justify-between items-center">
          <Text className="text-3xl font-JakartaBold text-gray-800">{t.myProfile}</Text>
          <TouchableOpacity 
            className="p-2 bg-gray-100 rounded-full"
            onPress={() =>router.replace("(root)/(tabs)/home")}
          >
          <AntDesign name="back"  size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>


      </View>

      <View className="px-6 pt-6">

        <View className="items-center mb-6">
          <TouchableOpacity 
            onPress={handleImagePicker}
            className="relative"
          >
            <Image 
              source={{ uri: profileImage || profileImageUrl || user?.photoURL || "https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg", }}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg shadow-black/20"
            />
            <View className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full">
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>

          <View className="mt-4 flex-row items-center">
            {edit ? (
              <>
                <TextInput
                  placeholder={t.yourName}
                  value={name}
                  onChangeText={setName}
                  className="border-b-2 border-orange-500 pb-1 text-xl font-JakartaBold flex-1"
                  autoFocus
                />
                <TouchableOpacity 
                  onPress={handleUpdateProfile}
                  className="ml-3 bg-orange-500 p-1 rounded-full"
                >
                  <Ionicons name="checkmark" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-2xl font-JakartaBold text-gray-800">{name}</Text>
                <TouchableOpacity 
                  onPress={() => setEdit(true)}
                  className="ml-3"
                >
                  <Ionicons name="pencil" size={20} color="#6b7280" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
 <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />
      
        <View className="flex-row justify-between mb-6">
          <View className="bg-white p-4 rounded-xl shadow-sm shadow-black/10 flex-1 mr-2">
            <Text className="font-JakartaMedium text-gray-500 text-sm">{t.creditBalance}</Text>
            <Text className="text-2xl font-JakartaBold text-orange-600 mt-1">
       ETB {creditBalance}
            </Text>
          </View>

          <View className="bg-white p-4 rounded-xl shadow-sm shadow-black/10 flex-1 ml-2">
            <Text className="font-JakartaMedium text-gray-500 text-sm">Tier Status</Text>
            <View className="flex-row items-center mt-1">
              {tierType === "premium" && (
                <Ionicons name="diamond" size={20} color="#3b82f6" className="mr-1" />
              )}
              <Text className="text-xl font-JakartaBold text-gray-800">
                {tierType || "-"}
              </Text>
            </View>
          </View>
        </View>

  
        <View className="bg-white p-4 rounded-xl shadow-sm shadow-black/10 mb-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-JakartaMedium text-gray-700">Completion Rate</Text>
            {completionRate >= 80 ? (
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            ) : (
              <Ionicons name="warning" size={24} color="#ef4444" />
            )}
          </View>
          
          <Text className={`text-3xl font-JakartaBold mt-2 ${
            completionRate >= 80 ? "text-green-600" : "text-red-600"
          }`}>
            {completionRate?.toFixed(1) || 0}%
          </Text>

          {completionRate < 80 ? (
            <Text className="text-red-500 font-JakartaMedium mt-2">
              Your completion rate is almost below our service standards. Please improve your 
              performance within 7 days to maintain full access to ride requests. If you fall below 70% completion rate, you may automatically be suspended.
            </Text>
          ) : (
            <Text className="text-green-600 font-JakartaMedium mt-2">
              Excellent performance! Maintain this level to receive priority 
              access to premium ride requests.
            </Text>
          )}
        </View>

<View className="bg-white p-4 rounded-xl shadow-sm shadow-black/10 mb-6">
  <View className="flex-row justify-between items-center mb-3">
    <Text className="font-JakartaBold text-gray-800 text-lg">Driver Bio</Text>
    {!editingBio && (
      <TouchableOpacity onPress={() => setEditingBio(true)}>
        <Ionicons name="pencil" size={20} color="#6b7280" />
      </TouchableOpacity>
    )}
  </View>

  {editingBio ? (
    <>
      <TextInput
        multiline
        value={currentBio}
        onChangeText={setCurrentBio}
        placeholder="Tell passengers about yourself..."
        className="border-b-2 border-orange-500 pb-2 font-JakartaMedium text-gray-800"
        maxLength={100}
      />
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-gray-500 text-sm">
          {currentBio.length}/100 characters
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => setEditingBio(false)}
            className="bg-gray-100 px-4 py-2 rounded-lg"
          >
            <Text className="font-JakartaMedium">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleBioUpdate}
            className="bg-orange-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-JakartaMedium">Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  ) : (
    <Text className="text-gray-600 font-JakartaMedium">
      {bio || "No bio added yet. Tap the edit icon to add one!"}
    </Text>
  )}
</View>

        <View className="bg-white p-5 rounded-xl shadow-sm shadow-black/10">
          <Text className="font-JakartaBold text-gray-800 text-lg mb-4">
            Account Top-up
          </Text>
          
          <TextInput
            placeholder="Enter amount in ETB"
            placeholderTextColor="#9ca3af"
            value={rechargeAmount}
            onChangeText={setRechargeAmount}
            keyboardType="numeric"
            className="border-b-2 border-gray-200 pb-2 font-JakartaMedium text-lg"
          />

          <TouchableOpacity
            onPress={handleRefillCredit}
            className="bg-orange-500 rounded-lg py-4 mt-6 shadow-lg shadow-orange-500/20"
          >
            <Text className="text-center font-JakartaBold text-white text-lg">
              Add Credit
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={toggleRechargeHistory}
          className="flex-row justify-between items-center bg-gray-100 p-4 rounded-lg mt-6"
        >
          <Text className="font-JakartaMedium text-gray-700">
            {showRechargeHistory ? t.hideRechargeHistory : t.showRechargeHistory}
          </Text>
          <Ionicons 
            name={showRechargeHistory ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleLogOut}
          className="flex-row justify-between items-center bg-gray-100 p-4 rounded-lg mt-6"
        >
          <Text className="font-JakartaMedium text-gray-700">
            Log out
          </Text>
          <FontAwesome5 
            name="door-open"     size={24}    color="#6b7280" />
        </TouchableOpacity>

        {showRechargeHistory && (
          <FlatList
            data={creditRechargesDB}
            renderItem={renderRechargeItem}
            keyExtractor={(item, index) => `${item.rechargeDate}-${index}`}
            scrollEnabled={false}
            contentContainerStyle={{paddingTop: 16}}
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white w-[85%] rounded-2xl p-6">
            <Text className="font-JakartaBold text-xl text-gray-800 mb-4">
              {t.depositDetails}
            </Text>
            
            <View className="bg-blue-50 p-4 rounded-xl mb-6">
              <Text className="font-Jakarta text-blue-800">
                {t.depositInstructions}
              </Text>
              <Text className="font-JakartaBold text-blue-900 text-lg mt-3">
                {adminCbeAccount}
              </Text>
            </View>

            <View className="flex-row justify-between space-x-3">
              <TouchableOpacity 
                className="flex-1 bg-blue-600 p-4 rounded-xl items-center"
                onPress={() => Linking.openURL('https://t.me/shareDriverSupport')}
              >
                <Text className="text-white font-JakartaBold">Send Proof</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-700 font-JakartaBold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  </SafeAreaView>
);

const renderRechargeItem = ({ item }) => (
  <View className="bg-white p-4 rounded-xl shadow-sm shadow-black/10 mb-3">
    <View className="flex-row justify-between items-center mb-2">
      <Text className="font-JakartaBold text-gray-800">
        {item.rechargeAmount} ETB
      </Text>
      <View className={`px-2 py-1 rounded-full ${
        item.status === 'Approved' ? 'bg-green-100' : 'bg-amber-100'
      }`}>
        <Text className={`text-xs font-JakartaMedium ${
          item.status === 'Approved' ? 'text-green-700' : 'text-amber-700'
        }`}>
          {item.status || "Pending"}
        </Text>
      </View>
    </View>
    <Text className="text-gray-500 text-sm">
      {convertToReadableFormat(item.rechargeDate)}
    </Text>
  </View>
);
}
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  txt: {
    fontFamily: 'mon',
    color: 'black',
    fontSize: 14,
  },
  txtsm: {
    fontFamily: 'mon',
    color: 'black',
    fontSize: 12,
  },
  header: {
    fontFamily: 'mon-b',
    fontSize: 24,
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {
      width: 1,
      height: 2,
    },
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#444444'
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  inputField: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  container: {
    padding: 10,
  },
  itemContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  amountText: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
    toggleButton: {
    backgroundColor: "orange",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 40
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
export default Profile;
