import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, View, Text, Animated } from "react-native";
import rewardsIcon from '@/assets/icons/rewards2.png';
import { useLanguageStore } from "@/store";
import { useEffect, useRef } from 'react';
import { Ionicons, FontAwesome6, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

import { icons } from "@/constants";
export const translation1 = {
    ENG: {
    Home: "Home",
    Rides: "Rides",
    Stats: "Stats",
    Posts: "Posts",
    Profile: "Your Price",
  },
  ORM: {
    Home: "Mana",
    Rides: "Seenaa",
    Stats: "Sadarkaa",
    Posts: "Odeeffannowwan",
    Profile: "Gatiin kee.",
  },
  AMH: {
   Home: "ዋና",
    Rides: "ታሪክ",
    Stats: "ቁጥሮች",
    Posts: "መረጃዎች",
    Profile: "ዋጋዎት",
  },
}

const TabIcon = ({ focused, special, iconConfig }: { 
  focused: boolean;
  special?: boolean;
  iconConfig: {
    lib: any;
    filled: string;
    outline: string;
  };
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const IconComponent = iconConfig.lib;

  useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.2 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <View className={`items-center justify-center ${special ? '-mt-8' : ''}`}>
      <Animated.View 
        className={`${
          special 
            ? 'bg-gradient-to-b from-[#0FB1BB] to-[#0A939B] p-4 rounded-full shadow-xl'
            : ''
        }`}
        style={{ 
          transform: [{ scale: scaleValue }],
          shadowColor: special ? '#0FB1BB' : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <IconComponent
          name={focused ? iconConfig.filled : iconConfig.outline}
          size={28}
          color={
            special ? 'white' : 
            focused ? '#0FB1BB' : '#A0AEC0'
          }
        />
      </Animated.View>
    </View>
  );
};

export default function Layout() {
  const { language } = useLanguageStore();
  const { Home, Rides, Stats, Posts, Profile } = translation1[language];

  const tabsConfig = [
    { 
      name: 'home',
      iconConfig: {
        lib: FontAwesome6,
        filled: 'house-chimney',
        outline: 'house'
      },
      label: Home
    },
    { 
      name: 'rides',
      iconConfig: {
        lib: Ionicons,
        filled: 'car-sport',
        outline: 'car-sport-outline'
      },
      label: Rides
    },
    { 
      name: 'posts',
      iconConfig: {
        lib: Ionicons,
        filled: 'chatbubbles',
        outline: 'chatbubbles-outline'
      },
      label: Posts
    },
    { 
      name: 'stats',
      iconConfig: {
        lib: Ionicons,
        filled: 'stats-chart',
        outline: 'stats-chart-outline'
      },
      label: Stats,
    },
    { 
      name: 'pricing',
      iconConfig: {
        lib: FontAwesome6,
        filled: 'money-bill-wave',
        outline: 'money-bill-1'
      },
      label: Profile
    },
  ];

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#0FB1BB',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Jakarta-SemiBold",
          fontSize: 12,
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          borderTopWidth: 0,
          height: 84,
          paddingHorizontal: 16,
          paddingTop: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
      }}
    >
      {tabsConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon 
                focused={focused} 
                special={tab.special}
                iconConfig={tab.iconConfig}
              />
            ),
            tabBarLabel: tab.label,
          }}
        />
      ))}
    </Tabs>
  );
}