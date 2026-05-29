import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SuspensionModal } from "@/lib/modals";
import { useState, useEffect } from "react";
import { useLanguageStore} from "@/store";
import {registerTranslations} from "@/lib/translations"
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export default function UpdateScreen() {
    const { language, setLanguage } = useLanguageStore();  
    const t = registerTranslations[language];
    
  const { type } = useLocalSearchParams(); 
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);

  useEffect(() => {
    console.log(type, "type in update App.tsx")
    if (type === "suspended") {
      setShowSuspensionModal(true);
    }
  }, [type]);

  const title = type === "suspended" ? "Suspended" : "Whoops, you have to update your app!";
  const message = type === "suspended"
    ? "🚨 Your account has been suspended. Please contact support for further details."
    : "To continue using the app, please go to the Play Store and update your app.";

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SuspensionModal visible={showSuspensionModal} />
      <View style={styles.container}>
        <Text style={styles.message}>{message}</Text>
        {type !== "suspended" && (
          <Link href="https://share-rides.com/driver-onboarding/" style={styles.link}>
            <Text style={styles.linkText}>Go to Play Store</Text>
          </Link>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  message: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
    color: "#333",
  },
  link: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  linkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
