import { View,Text,Button,StyleSheet, ScrollView, Image,TouchableOpacity,TextInput, Alert } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import auth from '@react-native-firebase/auth';
import { useRouter} from "expo-router";

import React, { useEffect, useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import InputField from "@/components/InputField";
import firestore from '@react-native-firebase/firestore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useCreditbalanceStore, useDriverkmPriceStore, useLanguageStore, useDriverStatsStore} from "@/store";
import { checkAndResetTripCounts, db } from "@/lib/localDB";
import { CustomAlertModal } from "@/components/modals" 
import {rewardTranslations, translation1, modal1, translationB} from "@/lib/translations"
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const Rewards = () => {
const dbFirestore = getFirestore();
const auth = getAuth();
const user = auth?.currentUser;
  const userId = user?.uid

const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});
  const { language, setLanguage } = useLanguageStore();  
  // const t = rewardTranslations[language];
// Add these state variables at the top of your component
const [weeklyNightSoloCount, setWeeklyNightSoloCount] = useState(0);
const [weeklySharedRideCount, setWeeklySharedRideCount] = useState(0);
  const [completedRides, setCompletedRides] = useState([])

useEffect(() => {
checkAndResetTripCounts(userId) 
 }, [userId]); 
 const { dailyTripsCount, dailyFareTotal, weeklyTripsCount, weeklyStreetPickupCount, monthlyTripsCount, weeklyFareTotal, monthlyFareTotal, setDriverStats } = useDriverStatsStore();
  
const {A, B, C ,D , E, F, G, H , I , J, K , L, M, N} = translationB[language]

const sendAdminNotif = async (milestone, count) => {
const adminPushToken = "ExponentPushToken[v8csZ4BRJn3c6ppS_PyhlC]"; 
 const message = {
    to: adminPushToken,
    sound: 'default',
    title: `Driver ${user.displayName} has achieved ${milestone} milestone`,
    body: `Driver ID: ${userId}}, has reached ${count} trips. Please check if they are as a first and no mischievous activities exist. Also keep the date in a safe place`,
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
}
useEffect(() => {
if(weeklyTripsCount >49){
   sendAdminNotif("Top weekly Trips Count", weeklyTripsCount)
}
if(weeklyStreetPickupCount  > 49){
   sendAdminNotif("Top weekly Street Pick-up Trips Count", weeklyStreetPickupCount)
}
if(monthlyTripsCount  > 249 ) {
   sendAdminNotif("Top Monthly Trips Count", monthlyTripsCount)
}
}, []);

useEffect(() => {
    const loadRides = async () => {
    const rides = await fetchRideHistory();
    const processed = processRides(rides);

    setCompletedRides(rides); 
    setWeeklyNightSoloCount(processed.nightSoloCount);
    setWeeklySharedRideCount(processed.sharedRideCount);
 
  };
  loadRides();
  }, []);

const processRides = (rides) => {
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  
  const nightSoloRides = rides.filter(ride => {
    const rideDate = new Date(ride.createdAt);
    const rideTime = ride.createdAt.split('T')[1]?.substring(0,5) || '00:00';
    
    return (
      rideDate >= oneWeekAgo &&
      ride.type === 'solo' &&
      rideTime > '19:30'
    );
  });

  const sharedRides = rides.filter(ride => {
    const rideDate = new Date(ride.createdAt);
    return (
      rideDate >= oneWeekAgo &&
      ride.type === 'corider'
    );
  });
if(nightSoloRides.length > 39 )
  {sendAdminNotif("night incentive", nightSoloRides.length)}
if(sharedRides.length > 39)
{sendAdminNotif("shared incentive", sharedRides.length)}

return {
  nightSoloCount: nightSoloRides.length,
  sharedRideCount: sharedRides.length,
  totalRidesCount: rides.length // Add this if needed
};
};

const fetchRideHistory = async () => {
  try {
    const rides = await db.getAllAsync('SELECT * FROM ride_history ORDER BY createdAt DESC');
    
    // Deduplicate rides using composite key
    const uniqueRidesMap = new Map();
    rides.forEach(ride => {
      // Create a unique key using critical ride properties
      const compositeKey = `${ride.driverId}|${ride.createdAt}|${ride.originAddress}|${ride.destinationAddress}|${ride.farePrice}`;
      if (!uniqueRidesMap.has(compositeKey)) {
        uniqueRidesMap.set(compositeKey, ride);
      }
    });
    
    const uniqueRides = Array.from(uniqueRidesMap.values());
    
    return uniqueRides.map(ride => ({
      ...ride,
      userLocation: JSON.parse(ride.userLocation),
      destinationLocation: JSON.parse(ride.destinationLocation),
      CoriderPickupData: ride.CoriderPickupData ? JSON.parse(ride.CoriderPickupData) : null
    }));
  } catch (error) {
    return [];
  }
};

return (
  <ScrollView 
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
  >
    {/* Header Section */}
    <LinearGradient
      colors={['#0FB1BB', '#0A939B']}
      style={styles.header}
    >
      <Text style={styles.headerTitle}>Your Performance Dashboard</Text>
      <View style={styles.headerBadge}>
        <MaterialIcons name="verified" size={24} color="white" />
        <Text style={styles.headerBadgeText}>Active Driver</Text>
      </View>
    </LinearGradient>

    {/* Stats Grid */}
    <View style={styles.grid}>
      {/* Daily Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="today" size={20} color="#0FB1BB" />
          <Text style={styles.cardTitle}>Daily Summary</Text>
        </View>
        <StatItem label="Trips Completed" value={dailyTripsCount} />
        <StatItem label="Total Earnings" value={`${dailyFareTotal} Birr`} />
        <ProgressBar 
          progress={dailyTripsCount/50}
          label={`${50 - dailyTripsCount} to daily goal`}
        />
      </View>

      {/* Weekly Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="date-range" size={20} color="#0FB1BB" />
          <Text style={styles.cardTitle}>Weekly Summary</Text>
        </View>
        <StatItem label="Total Trips" value={weeklyTripsCount} />
        <StatItem label="Street Pickups" value={weeklyStreetPickupCount} />
        <StatItem label="Total Earnings" value={`${weeklyFareTotal} Birr`} />
        
        {weeklyTripsCount > 49 && (
          <AchievementBadge 
            icon="stars" 
            color="gold"
            text="Top Performer - Weekly Bonus Unlocked!"
          />
        )}
      </View>

      {/* Monthly Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="calendar-month" size={20} color="#0FB1BB" />
          <Text style={styles.cardTitle}>Monthly Summary</Text>
        </View>
        <StatItem label="Total Trips" value={monthlyTripsCount} />
        <StatItem label="Total Earnings" value={`${monthlyFareTotal} Birr`} />
        
        {monthlyTripsCount >= 200 && (
          <ProgressBar 
            progress={monthlyTripsCount/250}
            label={`${250 - monthlyTripsCount} to gold status`}
            color="#FFD700"
          />
        )}
      </View>

      {/* Incentives Section */}
      <View style={styles.incentiveCard}>
        <Text style={styles.incentiveTitle}>Current Incentives</Text>
        <IncentiveItem
          icon="bolt"
          title="Pickup Challenge"
          progress={weeklyTripsCount/50}
          reward={`${weeklyTripsCount}/50 • Special Bonus`}
        />
 <IncentiveItem
    icon="nightlight"
    title="Night Rider Challenge"
    progress={weeklyNightSoloCount/10} // Target 10 night rides
    reward={`${weeklyNightSoloCount}/40 • Bonus`}
  />

  <IncentiveItem
    icon="group"
    title="Shared Ride Bonus"
    progress={weeklySharedRideCount/15} // Target 15 shared rides
    reward={`${weeklySharedRideCount}/50 • Bonus`}
  />

      </View>
    </View>
  </ScrollView>
);
}
// Reusable Components
const StatItem = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ProgressBar = ({ progress, label, color = '#0FB1BB' }) => (
  <View style={styles.progressContainer}>
    <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: color }]} />
    <Text style={styles.progressLabel}>{label}</Text>
  </View>
);

const AchievementBadge = ({ icon, color, text }) => (
  <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
    <MaterialIcons name={icon} size={20} color={color} />
    <Text style={[styles.badgeText, { color }]}>{text}</Text>
  </View>
);

const IncentiveItem = ({ icon, title, progress, reward }) => (
  <View style={incentivestyles.container}>
    <View style={incentivestyles.leftSection}>
      <View style={incentivestyles.iconContainer}>
        <MaterialIcons name={icon} size={20} color="#0FB1BB" />
      </View>
      <View style={incentivestyles.textContainer}>
        <Text style={incentivestyles.title}>{title}</Text>
        <View style={incentivestyles.progressBarBackground}>
          <View 
            style={[
              incentivestyles.progressBarFill,
              { width: `${Math.min(progress * 100, 100)}%` }
            ]}
          />
        </View>
      </View>
    </View>
    <Text style={incentivestyles.rewardText}>{reward}</Text>
  </View>
);


const incentivestyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    backgroundColor: '#E6F7F8',
    borderRadius: 8,
    padding: 8,
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 4
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0FB1BB',
    borderRadius: 3
  },
  rewardText: {
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 12,
    color: '#0FB1BB',
    marginLeft: 12
  }
});

// Styles
const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
    paddingBottom: 75
  },
  header: {
    padding: 24,
    paddingTop: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    color: 'white',
    textAlign: 'center'
  },
  grid: {
    padding: 16,
    gap: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  cardTitle: {
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 18,
    color: '#1E293B'
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  statLabel: {
    fontFamily: 'Jakarta-Medium',
    color: '#64748B'
  },
  statValue: {
    fontFamily: 'Jakarta-Bold',
    color: '#1E293B',
    fontSize: 16
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 16
  },
  progressBar: {
    height: '100%',
    borderRadius: 4
  },
  progressLabel: {
    fontFamily: 'Jakarta-Medium',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 16
  },
  badgeText: {
    fontFamily: 'Jakarta-Medium',
    flexShrink: 1
  }
});

export default Rewards;
