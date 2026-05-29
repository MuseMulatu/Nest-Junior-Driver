import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Animated, Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import excited from "@/assets/images/driving-gets-him-excited.jpg";
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');
const Welcome = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const isLastSlide = activeIndex === onboarding.length - 1;
    
 const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0,  seconds: 0 });

  // Fetch media URL
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch("https://server-7az0.onrender.com/admin-settings");
        const adminData = await res.json();
        console.log("adminData", adminData)
        const { credit_recharge_modal } = adminData;
        const {welcome_url} = credit_recharge_modal
        setMediaUrl(welcome_url);
        setMediaType(welcome_url?.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image');
      } catch (error) {
       //console .error('Error fetching media:', error);
        setMediaType('image');
      }
    };
    
    fetchMedia();
  }, []);
const CountdownTimer = () => (
  <View className="flex-row justify-center space-x-4 mt-6">
    <CountdownBox value={timeLeft.days || 0} label="Days" />
    <CountdownBox value={timeLeft.hours || 0} label="Hours" />
    <CountdownBox value={timeLeft.minutes || 0} label="Minutes" />
    <CountdownBox value={timeLeft.seconds || 0} label="Seconds" /> 
  </View>
);
  useEffect(() => {
// Update the calculateTimeLeft function
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
    seconds: Math.floor((difference / 1000) % 60)  // Add seconds calculation
  };
};

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const interpolateProgress = progress.interpolate({
    inputRange: [0, onboarding.length - 1],
    outputRange: ['0%', '100%']
  });
  const videoRef = useRef(null);
const FirstSlide = () => (
    <View className="items-center px-6 pt-10">
      {mediaUrl && mediaType === 'video' ? (
<Video
  ref={videoRef}
  source={{ uri: mediaUrl }}
  style={{ width: width - 48, height: 250, borderRadius: 15 }}
  resizeMode="cover"
  isLooping
  shouldPlay 
/>
      ) : (
        <Image 
          source={mediaUrl ? { uri: mediaUrl } : excited}
          className="w-full h-64"
          resizeMode="contain"
          style={{ borderRadius: 20 }}
        />
      )}
       <Text className="text-2xl mx-4 mt-6 mb-2 font-JakartaExtraBold text-orange-400 text-center">
                Drive Smart. Earn More. Stay connected!
              </Text>
              <View className="mt-4 space-y-3">
                <FeatureItem text="Get favorited by riders ⭐" />
                <FeatureItem text="Set your own pricing 💵 " />
                <FeatureItem text="Driver Community In-app Social Media"/>
                <FeatureItem text="In-app road tips & navigation 🗺️ "/>
                <FeatureItem text="Advanced Emergency System 🆘"/>
                <FeatureItem text="And so much more!"/>
              </View>
      </View>
)

  return (
    <LinearGradient 
      colors={['#028686', '#FF7F50']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-6 pt-4">
          <View className="bg-[rgba(255,0,0,0.2)] rounded-full px-4 py-2">
            <Text className="text-white text-center font-JakartaBold">🚖 Share is Coming! 🇪🇹</Text>
          </View>
          <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
            <Text className="text-white font-JakartaSemiBold">Skip</Text>
          </TouchableOpacity>
        </View>

        <Swiper
          ref={swiperRef}
          loop={false}
          showsPagination={false}
          onIndexChanged={(index) => {
            setActiveIndex(index);
            Animated.spring(progress, {
              toValue: index,
              useNativeDriver: false
            }).start();
          }}
        >
          {/* Slide 1 - Main Features */}
          <FirstSlide />

          {/* Slide 2 - Community & Offers */}
          <View className="items-center px-6 pt-10">
            <Image 
        source={{uri: "https://www.autoeasy.com/car-image/mercedes-benz/e-class/2024/hero/front_angle_view.webp"}}
              className="w-full h-64"
              resizeMode="contain"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,1)']}
              className="w-full rounded-3xl p-6 mt-8"
            >
              <View className="bg-orange-500 absolute -top-4 self-center px-4 py-2 rounded-full">
                <Text className="text-white font-JakartaBold">Exclusive Launch Offer 🔥</Text>
              </View>
              <Text className="text-2xl font-JakartaExtraBold text-[#1E293B] text-center mt-4">
                0% Commission for a full month!
              </Text>
              <Text className="text-center text-[#64748B] font-JakartaMedium mt-2">
                You only have to pay 59 Birr once and it's free!
              </Text>
              <CountdownTimer />
            </LinearGradient>
          </View>

          {/* Slide 3 - Final CTA */}
          <View className="items-center px-6 pt-10">
            <Image 
    source={onboarding[1].image}
              className="w-full h-64"
              resizeMode="contain"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,1)']}
              className="w-full rounded-3xl p-6 mt-8 items-center"
            >
              <Text className="text-2xl font-JakartaExtraBold text-[#1E293B] text-center">
                Ready to Earn More? 💸
              </Text>
              <Text className="text-center text-[#64748B] font-JakartaMedium mt-4">
                Join Ethiopia's first driver-centric ride platform
              </Text>
              <View className="w-full mt-6">
                <CustomButton
                  title="Claim Your Spot Now"
                  onPress={() => router.replace("/(auth)/register")}
                  colors={['#FF7F50', '#0286FF']}
                  className="w-full py-4 rounded-xl"
                  textClassName="text-white font-JakartaBold text-lg"
                />
              </View>
            </LinearGradient>
          </View>
        </Swiper>

        {/* Progress & Navigation */}
        <View className="px-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Animated.View 
              style={{ width: interpolateProgress }}
              className="h-1 bg-white rounded-full"
            />
            <View className="absolute w-full h-1 bg-white/20 rounded-full" />
          </View>
          
          <CustomButton
            title={isLastSlide ? "Start Driving" : "Next →"}
            onPress={() => isLastSlide 
              ? router.replace("/(auth)/register") 
              : swiperRef.current?.scrollBy(1)}
            colors={isLastSlide ? ['#FF7F50', '#FFAA00'] : ['transparent', 'transparent']}
            className={`w-full py-4 rounded-xl ${!isLastSlide && 'border-2 border-white'}`}
            textClassName={`font-JakartaBold text-lg ${!isLastSlide && 'text-white'}`}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const FeatureItem = ({ text }) => (
  <View className="flex-row items-center space-x-3 ml-3">
    <View className="w-2 h-2 bg-orange-500 rounded-full" />
    <Text className="text-white text-lg font-JakartaMedium">{text}</Text>
  </View>
);


  const CountdownBox = ({ value, label }: { value: number; label: string }) => (
    <View className="items-center ml-2">
      <View className="bg-[#EE8600] px-4 py-2 rounded-lg">
        <Text className="text-white font-JakartaBold text-xl">
          {String(value).padStart(2, '0')}
        </Text>
      </View>
      <Text className="text-[#64748B] text-xs font-JakartaMedium mt-1">{label}</Text>
    </View>
  );
export default Welcome;