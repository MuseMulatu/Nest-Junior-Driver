import React from 'react';
import { Modal, View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView} from 'react-native';
import { Picker } from "@react-native-picker/picker";
import AntDesign from '@expo/vector-icons/AntDesign';
import { Linking } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { translation1 } from "@/lib/translations"

const CustomModal = ({ visible, message, onClose }) => {
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>{message}</Text>
          <Button style={styles.modal} title="OK" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

export const TipModal = ({ modalVisible, setModalVisible, submitTip }) => {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState(""); // Category state
  const categories = [
    "Road Closed",
    "Parking Not Allowed",
    "Traffic Jam",
    "Strict Enforcement",
    "New Regulations",
    "Fuel Available",
    "Road Opened",
  ];

  const handleSubmit = () => {
    if (!title || !details || !category) {
      alert("Please fill in all fields!");
      return;
    }

    submitTip({ title, details, category });
    setModalVisible(false);
    setTitle("");
    setDetails("");
    setCategory("");
  };

  return (
    <Modal visible={modalVisible} animationType="slide" transparent={true}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ width: 300, padding: 20, backgroundColor: "white", borderRadius: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Add Tip</Text>

          {/* Title Input */}
          <TextInput
            placeholder="Enter tip title"
            value={title}
            onChangeText={setTitle}
            style={{ borderBottomWidth: 1, marginBottom: 10, padding: 5 }}
          />

          {/* Details Input */}
          <TextInput
            placeholder="Enter tip details"
            value={details}
            onChangeText={setDetails}
            style={{ borderBottomWidth: 1, marginBottom: 10, padding: 5 }}
            multiline
          />

          {/* Category Dropdown */}
          <Text style={{ marginBottom: 5 }}>Select Category:</Text>
          <View style={{ borderWidth: 1, borderRadius: 5, marginBottom: 10 }}>
            <Picker selectedValue={category} onValueChange={(itemValue) => setCategory(itemValue)}>
              <Picker.Item label="Select a category" value="" />
              {categories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: "#007bff", padding: 10, borderRadius: 5 }}>
              <Text style={{ color: "white", fontWeight: "bold" }}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ backgroundColor: "red", padding: 10, borderRadius: 5 }}>
              <Text style={{ color: "white", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const CustomAlertModal = ({ visible, title, message, imageSource, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 w-4/5 items-center shadow-lg">
          {/* Close Button */}
          <TouchableOpacity
            // variant="ghost"
            className="absolute top-2 right-2"
            onPress={onClose}
          >
            <AntDesign name="closesquare" size={24} color="black" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-xl font-JakartaBold text-gray-800 mb-4 text-center">
            {title}
          </Text>

          {/* Image/GIF */}
          {imageSource && (
            <Image
              source={{ uri: imageSource }} // Ensure it's wrapped in an object
              className="w-40 h-32 mb-4"
              resizeMode="contain"
            />
          )}

          {/* Message */}
          <Text className="font-JakartaMedium text-gray-600 mb-4">{message}</Text>

          {/* Dismiss Button */}
          <TouchableOpacity className="w-full" onPress={onClose}>
         <Text className="font-JakartaBold text-center ">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const CreditRechargeModal = ({ visible, onClose, adminCbeAccount, creditRechargeModalContent }) => {
  if (!creditRechargeModalContent) return null;
  const { headerText, tiers } = creditRechargeModalContent;
  return (
    <Modal visible={visible} transparent animationType="slide">
        <ScrollView>
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-2xl w-[90%] shadow-lg">
          {/* Title */}
          <Text className="text-xl font-JakartaBold text-gray-900 text-center mb-4">
            {headerText}
          </Text>

          {/* Image or GIF */}
          <Image
            source={{ uri: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif" }}
            className="w-36 h-36 mx-auto mb-4"
            resizeMode="contain"
          />

          {/* Benefit Tiers */}
          <View className="space-y-4">
            {/* Premium Tier */}
            <View className="bg-gray-100 p-4 rounded-lg border-l-8 border-purple-500">
              <Text className="text-lg font-JakartaBold text-center mb-1 ">💎 {tiers.premium.title}</Text>
              {tiers.premium.benefits.map((b, i) => (
                 <Text key={i} className="text-gray-700 font-JakartaMedium">{b}</Text>
                ))}
            </View>

            {/* Standard Tier */}
            <View className="bg-green-100 p-4 rounded-lg border-l-4 border-green-500">
              <Text className="text-lg font-JakartaBold text-gray-700 text-center mb-1">{tiers.standard.title}</Text>
              {tiers.standard.benefits.map((b, i) => (
                 <Text key={i} className="text-gray-700 font-JakartaMedium">{b}</Text>
                ))}
            </View>

            {/* Basic Tier */}
            <View className="bg-gray-300 p-4 rounded-lg border-l-4 border-gray-500">
              <Text className="text-lg font-JakartaBold text-gray-500 text-center ">{tiers.basic.title}</Text>
              {tiers.basic.benefits.map((b, i) => (
                 <Text key={i} className="text-gray-700 font-JakartaMedium">{b}</Text>
                ))}
            </View>
          </View>

          {/* Admin Account Info */}
          <Text className="text-center text-gray-800 font-JakartaBold mt-6">
            Deposit to: {adminCbeAccount}
          </Text>

          {/* Buttons */}
          <View className="flex-row justify-between mt-6">

<TouchableOpacity
className="flex-1 bg-blue-600 p-3 rounded-lg mr-2 items-center"
onPress={() => Linking.openURL('https://t.me/shareDriverSupport')}
>
  <Text className="text-white font-JakartaMedium">📤 Send Screenshot</Text>
</TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-red-600 p-3 rounded-lg items-center" onPress={onClose}>
              <Text className="text-white font-JakartaSemiBold">❌ Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
  </ScrollView>
</Modal>
  );
};

export const StatusNotices = ({
  isOnline,
  isDocumentsSent,
  showDocumentsNotice,
  onCloseDocumentsNotice,
  language
}) => {
  if (!isOnline && !isDocumentsSent) return null;
const {actionRequired, startAcceptingRides, driversLicense, vehicleInsurance, carPicture, librePaper, tinRegistration, submitDocuments, offlineMode, offlineModeTxt} = translation1[language]
  return (
    <View className="absolute top-20 w-full z-50 px-4">
      {!isOnline && (
        <View className="bg-amber-50 rounded-xl border-l-4 border-amber-400 mb-3 shadow-sm">
          <View className="p-4">
            <Text className="text-base font-JakartaSemiBold text-amber-900">
              {offlineMode}
            </Text>
            <Text className="text-sm font-JakartaMedium text-amber-800 mt-1">
              {offlineModeTxt}
            </Text>
          </View>
        </View>
      )}

      { 2>3 && !isDocumentsSent && showDocumentsNotice && (
        <View className="bg-blue-50 rounded-xl border-l-4 border-teal-500 shadow-lg">
          <View className="flex-row justify-between items-start p-4">
            <TouchableOpacity 
              className="p-2 -m-2"
              onPress={onCloseDocumentsNotice}
            >
              <Ionicons name="close" size={20} color="#3B82F6" />
            </TouchableOpacity>

            <View className="flex-1 ml-2">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={20} color="#1D4ED8" />
                <Text className="text-base font-JakartaSemiBold text-blue-900 ml-2">
                 {actionRequired}
                </Text>
              </View>

<ScrollView className="max-h-60">
            <Text className="text-sm font-JakartaMedium text-teal-800">
             {startAcceptingRides}
            </Text>
            <View className="ml-4 mt-2">
              <View className="flex-row items-center mb-2">
                <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                <Text className="text-sm font-JakartaMedium text-gray-800 ml-2">
                 {driversLicense}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                <Text className="text-sm font-JakartaMedium text-gray-800 ml-2">
                  {vehicleInsurance}
                </Text>
              </View>
                <View className="flex-row items-center mb-2">
                <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                <Text className="text-sm font-JakartaMedium text-gray-800 ml-2">
                {carPicture}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                <Text className="text-sm font-JakartaMedium text-gray-800 ml-2">
                 {librePaper}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                <Text className="text-sm font-JakartaMedium text-gray-800 ml-2">
                 {tinRegistration}
                </Text>
              </View>
              {/* Add other document items */}
            </View>
          </ScrollView>

              <TouchableOpacity 
                className="mt-3 flex-row items-center justify-end"
                onPress={() => Linking.openURL('https://t.me/shareDriverSupport')}
              >
                <Text className="text-blue-600 font-JakartaSemiBold mr-2">
                 {submitDocuments}
                </Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
export const FilterBar = ({ filters, setFilters }) => {
  const DATE_OPTIONS = [
    { value: 'all', label: 'All Time', icon: '🕒' },
    { value: 'week', label: 'Week', icon: '📅' },
    { value: 'month', label: 'Month', icon: '🗓️' },
    { value: 'year', label: 'Year', icon: '📆' },
    { value: 'lastYear', label: 'Last Year', icon: '⏮️' }
  ];

  return (
    <View className="bg-white px-4 py-3 shadow-sm border-b border-gray-100">
      {/* Date Filter Row */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="mb-3"
      >
        {DATE_OPTIONS.map(({ value, label, icon }) => (
          <TouchableOpacity
            key={value}
            className={`px-4 py-2 mr-2 rounded-full ${
              filters.dateRange === value 
                ? 'bg-blue-500' 
                : 'bg-gray-100'
            }`}
            onPress={() => setFilters(p => ({ ...p, dateRange: value }))}
          >
            <View className="flex-row items-center">
              <Text className={`text-sm ${
                filters.dateRange === value ? 'text-white' : 'text-gray-600'
              }`}>
                {icon} {label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Toggle Row */}
      <View className="flex-row justify-between items-center">
        <FilterToggle
          label="Top votes"
          icon="bonfire-outline"
          active={filters.byKarma}
          onPress={() => setFilters(p => ({ ...p, byKarma: !p.byKarma }))}
        />
        <FilterToggle
  label="Near Me"
  icon="location"
  active={filters.nearMe}
  onPress={() => setFilters(p => ({ ...p, nearMe: !p.nearMe }))}
 />
        <FilterToggle
          label="My Posts"
          icon="person"
          active={filters.onlyMyPosts}
          onPress={() => setFilters(p => ({ ...p, onlyMyPosts: !p.onlyMyPosts }))}
        />
      </View>
    </View>
  );
};

const FilterToggle = ({ label, active, onPress, icon }) => (
  <TouchableOpacity
    className={`flex-row items-center px-4 py-2 rounded-lg ${
      active ? 'bg-[#F0F7FF] border border-blue-200' : 'bg-gray-50'
    }`}
    onPress={onPress}
  >
    <Ionicons 
      name={icon} 
      size={16} 
      color={active ? '#3B82F6' : '#6B7280'} 
      className="mr-2"
    />
    <Text className={`text-sm font-medium ${
      active ? 'text-blue-600' : 'text-gray-600'
    }`}>
      {label}
    </Text>
  </TouchableOpacity>
);


const styles = StyleSheet.create({
   container: {
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  button: {
    padding: 8,
    margin: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  text: {
    color: '#333',
    fontSize: 14,
  },
  activeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBtn: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'grey',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'mon-sb'
  },
});

export {CustomModal};
