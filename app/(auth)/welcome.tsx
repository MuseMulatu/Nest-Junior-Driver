import React, { useRef, useState, useEffect } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { Animated, Dimensions, Image, Text, TouchableOpacity, View, FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import excited from "@/assets/images/driving-gets-him-excited.jpg";
//import { useVideoPlayer, VideoView } from 'expo-video';
import nestJuniorLogo from "@/assets/images/nest-junior-logo.png";

const { width } = Dimensions.get('window');

const Welcome = () => {
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const isLastSlide = activeIndex === 2;
    
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch("https://api.zabiya.com/api/v1/settings/onboarding");
        const json = await res.json();
        
        if (json.success && json.data) {
          const { welcomeMediaUrl } = json.data;
          setMediaUrl(welcomeMediaUrl);
          setMediaType(welcomeMediaUrl?.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image');
        }
      } catch (error) {
        console.warn("Could not fetch remote media, falling back to local logo.");
        setMediaType('image');
      }
    };
    
    fetchMedia();
  }, []);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: activeIndex,
      useNativeDriver: false
    }).start();
  }, [activeIndex]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDate = new Date('2025-08-12');
      
      if (now > new Date('2025-08-17')) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      if (now > targetDate) {
        targetDate = new Date('2025-08-27');
      }

      const difference = targetDate.getTime() - now.getTime();
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const interpolateProgress = progress.interpolate({
    inputRange: [0, 2],
    outputRange: ['0%', '100%']
  });

  // Reusable Shadow Style for Cards
  const cardShadow = Platform.OS === 'ios' ? {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  } : { elevation: 10 };

  const SlideOne = () => (
    <View style={{ width }} className="items-center px-6 pt-10">
      <View style={cardShadow} className="w-full bg-white rounded-3xl p-2 mb-6">
        <Image 
          source={mediaUrl ? { uri: mediaUrl } : nestJuniorLogo}
          className="w-full h-56 rounded-2xl"
          resizeMode="cover"
        />
      </View>
      
      <View style={cardShadow} className="w-full bg-white/95 rounded-3xl p-6 pt-8">
        <View className="bg-[#0FB1BB]/10 absolute -top-4 self-center px-5 py-2 rounded-full border border-[#0FB1BB]/20">
          <Text className="text-[#028686] font-JakartaBold text-sm">Welcome to Nest Junior</Text>
        </View>
        <Text className="text-2xl font-JakartaExtraBold text-[#1E293B] text-center mb-6 leading-tight">
          Make a Difference.{"\n"}
          <Text className="text-[#0FB1BB]">Earn Consistently.</Text>
        </Text>
        <View className="space-y-4">
          <FeatureItem text="Scheduled daily school runs 📅" />
          <FeatureItem text="Premium fares for certified drivers 💵" />
          <FeatureItem text="Rigorous safety & live monitoring 🛡️" />
          <FeatureItem text="Direct parent-driver trust 🤝" />
          <FeatureItem text="Advanced Emergency Protocol 🆘" />
        </View>
      </View>
    </View>
  );

  const SlideTwo = () => (
    <View style={{ width }} className="items-center px-6 pt-10">
      <View style={cardShadow} className="w-full bg-white rounded-3xl p-2 mb-6">
        <Image 
          source={{uri: "https://www.autoeasy.com/car-image/mercedes-benz/e-class/2024/hero/front_angle_view.webp"}} 
          className="w-full h-56 rounded-2xl bg-gray-50"
          resizeMode="contain"
        />
      </View>

      <View style={cardShadow} className="w-full bg-white/95 rounded-3xl p-6 pt-8">
        <View className="bg-orange-500 absolute -top-4 self-center px-5 py-2 rounded-full shadow-sm">
          <Text className="text-white font-JakartaBold text-sm">Fast-Track Certification 🛡️</Text>
        </View>
        <Text className="text-2xl font-JakartaExtraBold text-[#1E293B] text-center mb-3">
          Become a Certified CareDriver
        </Text>
        <Text className="text-center text-[#64748B] font-JakartaMedium mb-6 leading-relaxed">
          Join the elite fleet of trusted child logistics experts in Addis Ababa. Limited onboarding window!
        </Text>
        
        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row justify-between">
          <CountdownBox value={timeLeft.days || 0} label="Days" />
          <Text className="text-[#0FB1BB] font-JakartaBold text-2xl self-start mt-2">:</Text>
          <CountdownBox value={timeLeft.hours || 0} label="Hours" />
          <Text className="text-[#0FB1BB] font-JakartaBold text-2xl self-start mt-2">:</Text>
          <CountdownBox value={timeLeft.minutes || 0} label="Mins" />
          <Text className="text-[#0FB1BB] font-JakartaBold text-2xl self-start mt-2">:</Text>
          <CountdownBox value={timeLeft.seconds || 0} label="Secs" /> 
        </View>
      </View>
    </View>
  );

  const SlideThree = () => (
    <View style={{ width }} className="items-center px-6 pt-10">
      <View style={cardShadow} className="w-full bg-white rounded-3xl p-2 mb-6">
        <Image 
          source={onboarding[1]?.image || excited}
          className="w-full h-56 rounded-2xl"
          resizeMode="cover"
        />
      </View>

      <View style={cardShadow} className="w-full bg-white/95 rounded-3xl p-6 pt-8 items-center">
        <View className="bg-[#028686] absolute -top-4 self-center px-5 py-2 rounded-full shadow-sm">
          <Text className="text-white font-JakartaBold text-sm">Start Earning 🚀</Text>
        </View>
        <Text className="text-2xl font-JakartaExtraBold text-[#1E293B] text-center mb-3">
          Ready to Drive the Future?
        </Text>
        <Text className="text-center text-[#64748B] font-JakartaMedium mb-6 leading-relaxed">
          Provide safe, reliable transport for students and secure your income today. Join the community.
        </Text>
        
        <View className="w-full">
          <CustomButton
            title="Start Certification Process"
            onPress={() => router.replace("/(auth)/register")}
            colors={['#0FB1BB', '#028686']} 
            className="w-full py-4 rounded-xl shadow-lg"
            textClassName="text-white font-JakartaBold text-lg"
          />
        </View>
      </View>
    </View>
  );

  const slides = [<SlideOne key="1" />, <SlideTwo key="2" />, <SlideThree key="3" />];

  const handleNext = () => {
    if (isLastSlide) {
      router.replace("/(auth)/register");
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <LinearGradient 
      colors={['#028686', '#FF7F50']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-2">
          <View className="bg-white/20 rounded-full px-4 py-2 border border-white/30 backdrop-blur-md">
            <Text className="text-white text-center font-JakartaBold text-sm tracking-wide">
              🛡️ Nest Junior is Here! 🇪🇹
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.replace("/(auth)/register")}
            className="px-3 py-1 bg-black/10 rounded-full"
          >
            <Text className="text-white font-JakartaSemiBold text-sm">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Sliders */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item }) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(_, index) => index.toString()}
        />

        {/* Progress & Navigation */}
        <View className="px-6 pb-8 bg-transparent">
          <View className="flex-row items-center justify-between mb-6">
            <View className="relative w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
              <Animated.View 
                style={{ 
                  width: interpolateProgress,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                }}
                className="bg-white rounded-full"
              />
            </View>
          </View>
          
          <CustomButton
            title={isLastSlide ? "Get Certified Now" : "Continue"}
            onPress={handleNext}
            colors={isLastSlide ? ['#FF8C00', '#FF7F50'] : ['transparent', 'transparent']}
            className={`w-full py-4 rounded-xl ${!isLastSlide && 'border-2 border-white bg-white/10'}`}
            textClassName={`font-JakartaBold text-lg ${!isLastSlide ? 'text-white' : 'text-white'}`}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// --- MINI COMPONENTS ---

const FeatureItem = ({ text }) => (
  <View className="flex-row items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
    <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-3">
      <View className="w-2.5 h-2.5 bg-[#0FB1BB] rounded-full" />
    </View>
    <Text className="text-[#334155] flex-1 text-sm font-JakartaSemiBold leading-5">
      {text}
    </Text>
  </View>
);

const CountdownBox = ({ value, label }) => (
  <View className="items-center flex-1">
    <View className="bg-white border border-teal-100 shadow-sm w-full py-3 rounded-xl items-center justify-center">
      <Text className="text-[#0FB1BB] font-JakartaExtraBold text-2xl">
        {String(value).padStart(2, '0')}
      </Text>
    </View>
    <Text className="text-[#64748B] text-[10px] uppercase tracking-wider font-JakartaBold mt-2">
      {label}
    </Text>
  </View>
);

export default Welcome;