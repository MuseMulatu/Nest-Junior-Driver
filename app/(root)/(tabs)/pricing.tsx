import { Image, ScrollView, Text, View, TouchableOpacity, Modal, Button, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {translation1, modal1, translationA} from "@/lib/translations"
import { useLocationStore, useLanguageStore, useDriverkmPriceStore, useDrivernightkmPriceStore, usePriceLogStore } from "@/store";
import { useState, useEffect, useRef } from "react";
import { updatePrices } from "@/lib/localDB";
import { useRideStore } from '@/firebaseconf'; 
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export const prices = [4, 4.5, 5,5.5,6,6.5,7,7.5,8, 8.5, 9, 9.5, 10, 10.5, 11,11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18,18.5, 19,19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23,23.5, 24, 24.5,25,25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5, 31];
export const nightPrices = [10, 10.5, 11,11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18,18.5, 19,19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23,23.5, 24, 24.5,25,25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5, 31];

const Prices = () => {
const { rideRequests } = useRideStore();
const { language, setLanguage } = useLanguageStore();    
const {A, B, C ,D , E, F, G, H , I , J, K , L, M, N, pricingHeader} = translationA[language];  
const { kmPriceStore, setKmPriceStore } = useDriverkmPriceStore();
const { nightkmPriceStore, setNightkmPriceStore } = useDrivernightkmPriceStore();
const [priceUpdateLog, setPriceUpdateLog] = usePriceLogStore(state => [state.priceUpdateLog, state.setPriceUpdateLog]);
const [kilometerPrice, setKilometerPrice] = useState(null);
const [nightKilometerPriceHome, setNightKilometerPriceHome] = useState(null);
const [visibleField, setVisibleField] = useState(null);
//
const db = getFirestore();
const auth = getAuth();
const user = auth.currentUser;
const driverId = user?.uid;

useEffect(() => {
    // Clean up listener on component unmount
return () => {
useRideStore.getState().clearRideRequests();
};
}, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header Section */}
      <View className="px-6 pb-8 pt-9 mt-7 bg-gray-700 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center mb-4">
          <Ionicons name="cash-outline" size={28} color="white" />
          <Text className="ml-3 text-white font-JakartaBold text-2xl">{K}</Text>
        </View>
        <Text className="text-orange-50 font-JakartaMedium text-base leading-5">
          {pricingHeader}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={{paddingHorizontal: 20, paddingVertical: 24}}
        showsVerticalScrollIndicator={false}
      >
        {/* Pricing Cards */}
        <View className="space-y-6">
          {/* Day Price Card */}
          <View className="bg-white rounded-2xl p-6 shadow-sm shadow-black/10">
            <View className="flex-row items-center mb-4">
              <Ionicons name="sunny-outline" size={20} color="#Ef9615" />
              <Text className="ml-2 text-orange-600 font-JakartaSemiBold text-lg">{M}</Text>
            </View>

            <PriceSelector
              label={kmPriceStore ? `${kmPriceStore} ETB` : 'Select Day Price'}
              visible={visibleField === 'kilometerPrice'}
              onPress={() => setVisibleField(visibleField === 'kilometerPrice' ? null : 'kilometerPrice')}
              prices={prices}
              selectedPrice={kilometerPrice || kmPriceStore}
              onSelect={(price) => {
                setKilometerPrice(price);
                setKmPriceStore(price);
                setVisibleField(null);
                updatePrices({
                  price,
                  type: "day",
                  other: nightkmPriceStore,
                  updateLog: priceUpdateLog,
                  setUpdateLog: setPriceUpdateLog,
                  driverId,
                });
              }}
              color="#4f46e5"
            /> 
          </View>

          {/* Night Price Card */}
          <View className="bg-white rounded-2xl p-6 shadow-sm shadow-black/10">
            <View className="flex-row items-center mb-4">
              <Ionicons name="moon-outline" size={20} color="#4f46e5" />
              <Text className="ml-2 text-indigo-600 font-JakartaSemiBold text-lg">{L}</Text>
            </View>
            <PriceSelector
              label={nightkmPriceStore ? `${nightkmPriceStore} ETB` : 'Select Night Price'}
              visible={visibleField === 'nightKilometerPriceHome'}
              onPress={() => setVisibleField(visibleField === 'nightKilometerPriceHome' ? null : 'nightKilometerPriceHome')}
              prices={nightPrices}
              selectedPrice={nightKilometerPriceHome || nightkmPriceStore}
              onSelect={(price) => {
                setNightKilometerPriceHome(price);
                setNightkmPriceStore(price);
                setVisibleField(null);
                updatePrices({
                  price,
                  type: "night",
                  other: kmPriceStore,
                  updateLog: priceUpdateLog,
                  setUpdateLog: setPriceUpdateLog,
                  driverId,
                });
              }}
              color="#1e293b"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Price Selector Component
const PriceSelector = ({ label, visible, onPress, prices, selectedPrice, onSelect, color }) => (
  <>
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row justify-between items-center bg-slate-100 rounded-xl px-4 py-3.5"
    >
      <Text className={`font-JakartaMedium ${selectedPrice ? 'text-slate-800' : 'text-slate-500'}`}>
        {label}
      </Text>
      <Ionicons 
        name={visible ? "chevron-up" : "chevron-down"} 
        size={18} 
        color={selectedPrice ? color : "#64748b"} 
      />
    </TouchableOpacity>

    {visible && (
      <View className="flex-row flex-wrap gap-3 mt-4">
        {prices.map((price) => (
          <TouchableOpacity
            key={price}
            onPress={() => onSelect(price)}
            className={`px-4 py-2.5 rounded-full ${
              selectedPrice === price 
                ? `bg-[${color}]/10 border border-[${color}]`
                : 'bg-slate-50 border border-slate-200'
            }`}
            style={{ minWidth: 80 }}
          >
            <Text 
              className={`font-JakartaMedium ${
                selectedPrice === price ? `text-[${color}]` : 'text-slate-600'
              }`}
            >
              {price} ETB
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </>
);

export default Prices;
