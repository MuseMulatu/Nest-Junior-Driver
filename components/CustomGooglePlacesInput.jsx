import React, { useState, useEffect } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { useLocationStore, useLanguageStore } from "@/store";
import AntDesign from '@expo/vector-icons/AntDesign';
import {geohashForLocation } from "geofire-common";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY; 

const CustomGooglePlacesInput = ({
  placeholder = "Search location",
  saveLocation,
}) => {
  const { language } = useLanguageStore();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const translations = {
    ENG: { box: "Search destination" },
    ORM: { box: "Bakka itti geessan barbaadi" },
    AMH: { box: "መድረሻ ይፈልጉ" },
  };

  const fetchAddressSuggestions = async (query) => {
    if (query.length < 3) return;
    setLoading(true);
    const locationBias = "location=9.03,38.74&radius=20000";
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_PLACES_API_KEY}&${locationBias}&components=country:et`;
    try {
      const response = await axios.get(url);
      setSuggestions(response.data.predictions);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = async (placeId) => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}`;
    try {
      const response = await axios.get(url);
      const { lat, lng } = response.data.result.geometry.location;
      const formattedAddress = response.data.result.formatted_address;
      const placeName = response.data.result.name;
      const detailedAddress = `${placeName}, ${formattedAddress}`;

  const hash = geohashForLocation([lat, lng]);

      const location = {
        latitude: lat,
        longitude: lng,
        address: detailedAddress,
        hash,
      };

      if (saveLocation) saveLocation(location);

      setInput("");
      setSuggestions([]);
    } catch (error) {

    }
  };

  const handleInputChange = (text) => {
    setInput(text);
    fetchAddressSuggestions(text);
  };

  const clearInput = () => {
    setInput("");
    setSuggestions([]);
  };

  const { box } = translations[language];

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          className="text-base font-Jakarta"
          value={input}
          onChangeText={handleInputChange}
          placeholder={placeholder || `${box} ...`}
          style={styles.input}
        />
        <TouchableOpacity onPress={clearInput} className="mr-3" style={styles.clearButton}>
          <AntDesign name="delete" size={24} color="#0F62BA" />
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item.place_id)}
              >
                <Text className="text-sm font-Jakarta text-gray-700">{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
      {loading && <Text style={styles.loadingText}>Loading suggestions...ቦታዎችን በማግኘት ላይ</Text>}
    </View>
  );
};



const styles = {
  container: {
    paddingHorizontal: 15,
    width: "100%"
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: "100%"
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: "100%"
  },
  clearButton: {
    position: 'absolute',
    right: 10, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#888',
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
  },
};

export default CustomGooglePlacesInput;
