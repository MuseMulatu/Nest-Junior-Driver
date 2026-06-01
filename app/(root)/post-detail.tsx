import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const Colors = { teal: "#0FB1BB", dark: "#1A202C", gray: "#718096", lightBg: "#F7FAFC" };

export default function BulletinDetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const doc = await firestore().collection('announcements').doc(id).get();
        if (doc.exists) {
          setPost(doc.data());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleSendQuestion = async () => {
    if (!comment.trim()) return;
    setSending(true);
    
    try {
      const driver = auth().currentUser;
      // Saves the driver's question to a subcollection in Firestore
      await firestore().collection('announcements').doc(id).collection('questions').add({
        text: comment,
        driverId: driver?.uid || 'unknown',
        driverEmail: driver?.email || 'unknown',
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      
      Alert.alert("Sent", "Dispatch has received your message.");
      setComment('');
    } catch (error) {
      Alert.alert("Error", "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 100 }} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulletin Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{post?.title}</Text>
          <Text style={styles.content}>{post?.content}</Text>
        </View>

        <Text style={styles.instruction}>Need clarification? Send a direct message to dispatch.</Text>
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask dispatch a question..."
            placeholderTextColor={Colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !comment.trim() && { opacity: 0.5 }]} 
            onPress={handleSendQuestion}
            disabled={!comment.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightBg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.dark },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.dark, marginBottom: 12 },
  content: { fontSize: 16, color: '#4A5568', lineHeight: 24 },
  instruction: { textAlign: 'center', color: Colors.gray, marginTop: 24, fontSize: 14 },
  inputArea: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightBg, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, maxHeight: 100, fontSize: 16, color: Colors.dark },
  sendBtn: { backgroundColor: Colors.teal, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }
});