import React, { useState } from 'react';
import { Modal, Text, View, TouchableOpacity, FlatList } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import * as Notifications from 'expo-notifications';
import { db } from "@/lib/localDB"; 

const CancelRideModal = ({ visible, onClose, rideRequestId }) => {
const user = auth().currentUser;
const driverId = user.uid;
const router = useRouter();

  const [selectedReason, setSelectedReason] = useState(null);
  const reasons = ["I changed my mind", "Customer too far out", "Other"];

const handleCancelRide = async (reason) => {
    try {
        await firestore().collection('requests').doc(rideRequestId)
          .update({
            drivers: firestore.FieldValue.arrayRemove(driverId), // Remove this driver's ID
            cancelledBy: { driverId, reason } // Keep track of who cancelled
          });
 await db.runAsync(
      `INSERT INTO ride_cancellations (driverId, rideId, timestamp) VALUES (?, ?, ?);`,
      [driverId, rideRequestId, Date.now()]
    );
  router.replace('/(root)/(tabs)/home'); // Redirect after cancellation
      onClose(); // Close the modal after cancellation      
const adminPushToken = "ExponentPushToken[io9-faAuT0H5M8Z_udwzg2]";
 const message = {
    to: adminPushToken,
    sound: 'default',
    title: `New Driver cancellation by ${user.displayName}`,
    body: `Driver ID: ${driverId}, has cancelled with reason: ${reason}. the ride ID is ${rideRequestId}`,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();

    if (response.status === 200) {
 
      } else {

    }
  } catch (error) {

  }
    } catch (error) {

    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cancel Ride</Text>
          <Text style={styles.modalSubTitle}>Please select a reason for cancellation:</Text>

          <FlatList
            data={reasons}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.reasonButton} onPress={() => handleCancelRide(item)}>
                <Text className="text-center" style={styles.reasonText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: "mon",
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubTitle: {
       fontFamily: "mon",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  reasonButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  reasonText: {
    fontFamily: "mon",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#ff5757',
    padding: 10,
    marginTop: 20,
    fontFamily: "mon-sb",
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
};

export default CancelRideModal;
