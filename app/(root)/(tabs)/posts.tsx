import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { emergencyButton, timeFromNow } from "@/lib/utils";

// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';

// dayjs.extend(relativeTime);
const Colors = { teal: "#0FB1BB", dark: "#1A202C", gray: "#718096", lightBg: "#F7FAFC", orange: "#FF8C00" };

export default function BulletinsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firestore 'announcements' collection
    const unsubscribe = firestore()
      .collection('announcements')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot) => {
          if (snapshot) {
            const fetchedPosts = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setAnnouncements(fetchedPosts);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching bulletins:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push({ pathname: '/posts-detail', params: { id: item.id } })}
    >
<View style={styles.cardHeader}>
        <View style={styles.badge}>
          <MaterialCommunityIcons 
            name={item.type === 'alert' ? "alert-circle" : "message-bulleted"} 
            color="#FFF" 
            size={16} 
          />
          <Text style={styles.badgeText}>
            {item.type === 'alert' ? 'URGENT ALERT' : 'DISPATCH UPDATE'}
          </Text>
        </View>
        <Text style={styles.timeText}>
          {item.createdAt ? timeFromNow(item.createdAt.toDate()) : ''}
        </Text>
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.readMore}>Tap to read full details & acknowledge</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.teal} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dispatch Bulletins</Text>
        <Text style={styles.headerSubtitle}>Official Nest Junior Updates & Alerts</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No recent bulletins from dispatch.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightBg },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.dark },
  headerSubtitle: { fontSize: 14, color: Colors.gray, marginTop: 4 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', backgroundColor: Colors.teal, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center', gap: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  timeText: { fontSize: 12, color: Colors.gray },
  title: { fontSize: 18, fontWeight: 'bold', color: Colors.dark, marginBottom: 8 },
  content: { fontSize: 14, color: '#4A5568', lineHeight: 20, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F7FAFC', paddingTop: 12 },
  readMore: { fontSize: 12, color: Colors.teal, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, color: Colors.gray, fontSize: 16 }
});