//   const driverSnap = await firestore()
//     .collection('drivers')
//     .where('pnumber', '==', pnumber)
//     .get();

//   if (driverSnap.empty) throw new Error("Driver not found");

//   const driverDoc = driverSnap.docs[0].ref;

//   await driverDoc.update({
//   //  documentsSent: true,
//     pioneer: pioneerValue,
//     tierType,
//     approvedRecharge: {
//       rechargeAmount: 499,
//       rechargeDate: Date.now()
//     }
//   });

//   console.log("Driver onboarded successfully");
// };

// const suspendDriver = async (pnumber, days) => {
//   const suspensionUntil = new Date();
//   suspensionUntil.setDate(suspensionUntil.getDate() + days);

// updateDriver(pnumber, {
//   status: "suspended",
//   suspension_until: suspensionUntil
// })
//   const driverSnap = await firestore()
//     .collection('drivers')
//     .where('pnumber', '==', pnumber)
//     .get();

//   if (driverSnap.empty) throw new Error("Driver not found");

//   const driverDoc = driverSnap.docs[0].ref;

//   await driverDoc.update({
//     status: "suspended",
//     suspensionUntil: suspensionUntil.getTime() // store as timestamp
//   });

//   console.log("Driver suspended until", suspensionUntil.toDateString());
// };

import { View, Text, Button, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Alert, Modal, FlatList, Switch } from 'react-native';
import { updateDriver } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '@react-native-community/datetimepicker';

const AdminPanel = () => {
  const [pnumber, setPnumber] = useState('');
  const [driverData, setDriverData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suspensionDays, setSuspensionDays] = useState(3);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editMode, setEditMode] = useState({});
const [localEdits, setLocalEdits] = useState({});
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';
const formatPhoneNumber = (number) => {
  if (number.startsWith('0')) {
    return '+251' + number.slice(1); // Remove '0' and replace with '+251'
  }
  return number; // Return as is if already formatted
};
  const fetchDriver = async () => {
    console.log("pnumber", pnumber)
const formattedPhoneNumber = formatPhoneNumber(pnumber)
    setIsLoading(true);
    try {
      const res =await axios.get(`https://server-7az0.onrender.com/drivers/by-phone/${formattedPhoneNumber}`, {
  headers: {
    "Content-Type": "application/json",
  }
});
      console.log("res...................", res.data)
      setDriverData(res.data);
    } catch (err) {
      console.error(err)
      alert("Driver not found.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (driverData?.approved_recharge?.rechargeAmount) {
      validateTierConsistency();
    }
  }, [driverData?.tier_type, driverData?.approved_recharge?.rechargeAmount]);

  const validateTierConsistency = () => {
    const amount = parseFloat(driverData.approved_recharge.rechargeAmount);
    const currentTier = driverData.tier_type;
    
    let expectedTier = 'noBenefits';
    if (amount > 600) expectedTier = 'premium';
    else if (amount > 450) expectedTier = 'standard';
    else if (amount >= 350) expectedTier = 'basic';

    if (currentTier !== expectedTier) {
      Alert.alert(
        'Inconsistency Detected',
        `Recharge amount ${amount} suggests tier should be ${expectedTier.toUpperCase()}, but current tier is ${currentTier.toUpperCase()}`,
        [{ text: 'OK' }]
      );
    }
  };

  const updateField = async (path, value) => {
    try {
      const paths = path.split('.');
      const updatedData = { ...driverData };
      let current = updatedData;
      
      for (let i = 0; i < paths.length - 1; i++) {
        current = current[paths[i]] = { ...current[paths[i]] };
      }
current[paths[paths.length - 1]] = value;

// If rechargeAmount is being updated, also set rechargeDate to current epoch time
if (path === 'approved_recharge.rechargeAmount') {
  if (!updatedData.approved_recharge) {
    updatedData.approved_recharge = {};
  }
  updatedData.approved_recharge.rechargeDate = Date.now(); // epoch format
}

const res = await updateDriver(driverData.user_id, updatedData);

      setDriverData(res);
      Alert.alert('Update Successful');
    } catch (err) {
      Alert.alert('Update Failed', err.message);
    }
  };

  const handleSuspend = async () => {
    const suspensionUntil = new Date();
    suspensionUntil.setDate(suspensionUntil.getDate() + suspensionDays);
    
    try {
      const updated = {
        status: 'suspended',
        suspension_until: suspensionUntil.toISOString()
      };
      const res = await updateDriver(driverData.user_id, updated);
      setDriverData(res);
      Alert.alert(`Driver suspended until ${res.suspension_until}`);
    } catch (err) {
      Alert.alert('Suspension Failed', err.message);
    }
  };

const renderEditableField = (label, path, inputType = 'text') => {
  const originalValue = path.split('.').reduce((obj, key) => obj?.[key], driverData) ?? '';
  const value = localEdits[path] !== undefined ? localEdits[path] : originalValue;

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}:</Text>
      {editMode[path] ? (
        <>
          {inputType === 'picker' ? (
            <Picker
              selectedValue={value}
              onValueChange={(val) => setLocalEdits({...localEdits, [path]: val})}
              style={styles.input}>
              <Picker.Item label="No Benefits" value="noBenefits" />
              <Picker.Item label="Basic" value="basic" />
              <Picker.Item label="Standard" value="standard" />
              <Picker.Item label="Premium" value="premium" />
            </Picker>
          ) : inputType === 'statusPicker' ? (
            <Picker
              selectedValue={value}
              onValueChange={(val) => setLocalEdits({...localEdits, [path]: val})}
              style={styles.input}>
              <Picker.Item label="Available" value="available" />
              <Picker.Item label="Suspended" value="suspended" />
              <Picker.Item label="Offline" value="offline" />
            </Picker>
          ) : inputType === 'number' ? (
<TextInput
  style={styles.input}
  value={String(localEdits[path] ?? value)}  // Use localEdits if available
  keyboardType="numeric"
  onChangeText={(val) => {
    setLocalEdits({
      ...localEdits,
      [path]: val === '' ? '' : parseFloat(val)
    });
  }}
/>
          ) : (
            <TextInput
              style={styles.input}
              value={String(value)}
              onChangeText={(val) => setLocalEdits({...localEdits, [path]: val})}
            />
          )}
          <Button
            title="✓"
            onPress={async () => {
              await updateField(path, value);
              setEditMode({...editMode, [path]: false});
              setLocalEdits({...localEdits, [path]: undefined});
            }}
          />
        </>
      ) : (
        <TouchableOpacity onPress={() => setEditMode({...editMode, [path]: true})}>
          <Text style={styles.valueText}>{String(originalValue)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const renderSwitchField = (label, path) => {
  const originalValue = path.split('.').reduce((obj, key) => obj?.[key], driverData) ?? false;
  const value = localEdits[path] !== undefined ? localEdits[path] : originalValue;

  return (
    <View style={styles.switchContainer}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(val) => setLocalEdits({...localEdits, [path]: val})}
      />
      <Button
        title="✓"
        onPress={async () => {
          await updateField(path, value);
          setLocalEdits({...localEdits, [path]: undefined});
        }}
      />
    </View>
  );
};


  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter driver phone number"
          value={pnumber}
          onChangeText={setPnumber}
        />
        <Button 
          title="Search" 
          onPress={fetchDriver} 
          disabled={isLoading} 
        />
      </View>

      {driverData && (
        <>
              <Image
        className="w-14 h-14 rounded-full border-2 border-white"
        source={{ uri: driverData.profile_image || DEFAULT_AVATAR }}
        resizeMode="cover"
      />
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Account Details</Text>
  {renderEditableField('Tier Type', 'tier_type', 'picker')}
  {renderEditableField('Credit Amount', 'credit_amount', 'number')}
  {renderEditableField('Recharge Amount', 'approved_recharge.rechargeAmount', 'number')}
  {renderEditableField('Phone Number', 'pnumber')}
  {renderEditableField('Status', 'status', 'statusPicker')}
</View>

<View style={styles.section}>
  <Text style={styles.sectionTitle}>Boolean Fields</Text>
  {renderSwitchField('Details Filled', 'details_filled')}
  {renderSwitchField('Documents Sent', 'documents_sent')}
  {renderSwitchField('Pioneer', 'pioneer')}
</View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            {renderEditableField('Name', 'vehicle_details.name')}
            {renderEditableField('Vehicle Model', 'vehicle_details.model')}
            {renderEditableField('License Plate', 'vehicle_details.plate_number')}
            {renderEditableField('Languages', 'languages_spoken')}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suspension Control</Text>
            <View style={styles.suspensionControl}>
              <Text>Suspend for:</Text>
              <Picker
                selectedValue={suspensionDays}
                onValueChange={setSuspensionDays}
                style={styles.suspensionPicker}>
                <Picker.Item label="3 days" value={3} />
                <Picker.Item label="7 days" value={7} />
                <Picker.Item label="30 days" value={30} />
              </Picker>
              <Button title="Suspend Driver" onPress={handleSuspend} color="#ff4444" />
            </View>
            
            {driverData.suspension_until && (
              <Text style={styles.suspensionText}>
                Currently suspended until: {new Date(driverData.suspension_until).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Add more sections for other data as needed */}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  searchInput: { flex: 1, borderWidth: 1, padding: 8, borderRadius: 8 },
  section: { marginBottom: 24, backgroundColor: '#f8f9fa', padding: 16, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  fieldContainer: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, padding: 8, borderRadius: 8, flex: 1 },
  valueText: { padding: 8, backgroundColor: '#e9ecef', borderRadius: 8 },
  suspensionControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suspensionPicker: { flex: 1 },
  suspensionText: { color: '#dc3545', marginTop: 8 }
});

export default AdminPanel;