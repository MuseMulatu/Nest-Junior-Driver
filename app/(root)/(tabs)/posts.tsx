import AWS from "aws-sdk";
import React, { useRef, useState, useEffect, memo } from "react";
import { Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, Button,  Modal, StyleSheet, TextInput, Alert, RefreshControl, Dimensions, Animated } from "react-native";
import Entypo from '@expo/vector-icons/Entypo';
import { CreatePostModal, CommentsModal } from '@/lib/modals'; // Adjust your AWS config import accordingly
import { useRouter } from 'expo-router';
import { storePostsLocally, fetchCachedPosts, getTotalFetchCount, incrementFetchCount, checkFollowingStatus, followUser, unfollowUser, } from '@/lib/localDB'; 
import { useLanguageStore, usePioneerStore, useCreditbalanceStore, useLocationStore, useShareUsernameStore, useTierLimitsStore, useRateLimitStore, usePhoneNumberStore } from "@/store";
import {postsTranslation} from "@/lib/translations"
import { CustomAlertModal, CreditRechargeModal, FilterBar } from "@/components/modals" 
import { RefillCreditModal } from "@/lib/modals" 
import { getDistance, shuffleArray, driverProfile, updateDriver, haversineDistance } from "@/lib/utils"
import { Picker } from "@react-native-picker/picker";
import auth from '@react-native-firebase/auth';
import * as Notifications from "expo-notifications";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MapView, { Marker, Callout, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import { Share, Linking } from 'react-native';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import axios from 'axios' 
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

AWS.config.update({
  region: process.env.EXPO_PUBLIC_R, 
  accessKeyId: process.env.EXPO_PUBLIC_AI,
  secretAccessKey: process.env.EXPO_PUBLIC_SAI,
      // Disable CRC32 validation to prevent integrity check errors
    dynamoDbCrc32: false,
});
//
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = "CommunityPosts";
const POSTS_LIMIT = 25;

const PostsPage = () => {
  const { language, setLanguage } = useLanguageStore();   
  const { tierType, setTierType} = usePioneerStore()
  const { tierLimits, setTierLimits } = useTierLimitsStore();
const {shareUsername, setShareUsername, socialCount, setSocialCount, setExpoToken, expoToken } = useShareUsernameStore(); 
const { votedComments, addVote, addVoteTimestamp, canVote, canComment, addCommentTimestamp } = useRateLimitStore();
const {profileImageUrl} =  usePhoneNumberStore() 
 const [showRefillModal, setShowRefillModal] = useState(false);
const { creditBalance, setCreditBalance } = useCreditbalanceStore()
const [title, setTitle] = useState(" ");
const [content, setContent] = useState('');
const [mediaInput, setMediaInput] = useState(null)
const [hideTips, setHideTips] = useState(false);
const [ showActionsMenu, setShowActionsMenu ] = useState(false);
const [emergencies, setEmergencies] = useState([]);
  const [region, setRegion] = useState(null);
const [expandedEmergency, setExpandedEmergency] = useState(null);
const [isRefreshing, setIsRefreshing] = useState(false);
const POST_LIMIT = 50; // Maximum posts to keep
  const [expanded, setExpanded] = useState(null);
const PLACEHOLDER_IMAGE = require('@/assets/images/sponsored-ads.jpg');

const [createdPosts, setCreatedPosts] = useState([]);
  const [category, setCategory] = useState(""); // Category state
// Add these constants at the top
const AD_RATIO = 5; // Show 1 ad after every 5 posts
const AD_TABLE_NAME = "DriverAds";
const AD_VIEW_DEDUP_TIME = 3600000; // 1 hour in ms

// Add to component state
const [ads, setAds] = useState([]);
const [shownAdIds, setShownAdIds] = useState([]);
const [eligibleAds, setEligibleAds] = useState([]);
// New fetch function for ads
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
const fetchEligibleAds = async () => {
  try {
    const params = {
      TableName: AD_TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: "active = :active AND expiration > :now",
      ExpressionAttributeValues: {
        ":active": "true",
        ":now": Date.now()
      }
    };

    const result = await dynamoDB.query(params).promise();
 
    // Apply category filtering locally
return result.Items.filter(ad => {
  const categories = ad.targetCategories || ["General"];
  return categories.some(cat => categories.includes(cat));
});
  } catch (error) {

    return [];
  }
};


// Modified merge function with ad insertion
const mergeContent = (posts, ads) => {
 
  const merged = [];
  let adIndex = 0;
  let postsSinceLastAd = 0;
  const availableAds = shuffleArray([...ads]);

  posts.forEach((post, index) => {
    merged.push(post);
    postsSinceLastAd++;

    // Insert ad after every N posts with category matching
    if (postsSinceLastAd >= AD_RATIO && availableAds.length > 0) {
const relevantAds = availableAds.filter(ad => 
  ad.targetCategories?.includes(post.category) && // ← Fixed here
  !shownAdIds.includes(ad.adId)
);
      const adToInsert = relevantAds.length > 0 
        ? relevantAds[0]
        : availableAds[adIndex % availableAds.length];

      merged.push({
        __type: 'ad',
        ...adToInsert,
        viewCount: 0 // Initialize view count
      });

      // Update tracking
      setShownAdIds(prev => [...prev, adToInsert.adId]);
      postsSinceLastAd = 0;
      adIndex++;
    }
  });

  return merged;
};

const isSocialVideo = (url = '') => {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('tiktok.com') ||
    url.includes('vimeo.com') // Add more as needed
  );
};

const isDirectVideoFile = (url = '') => {
  return /\.(mp4|mov|webm|ogg|m4v)$/i.test(url);
};

const getEmbeddableUrl = (url = '') => {
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('youtu.be')) {
    const videoId = url.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('tiktok.com')) {
    return url; // TikTok embeds usually work directly
  }
  return url;
};

// async function isImageFile(url) {
//   // Step 1: Check extension
//   const extensionRegex = /\.(jpeg|jpg|png|gif|webp|bmp|svg)(\?.*)?$/i;
//   if (extensionRegex.test(url.split('?')[0])) return true;

//   // Step 2: Check MIME type if no extension
//   try {
//     const response = await fetch(url, { method: 'HEAD' });
//     return response.headers.get('Content-Type')?.startsWith('image/');
//   } catch {
//     return false;
//   }
// }

// validation function
async function validateMediaUrls(urlsString, tierType) {
  // Handle input types
  const urls = Array.isArray(urlsString) 
    ? urlsString
    : typeof urlsString === 'string' 
      ? urlsString.split(',').map(url => url.trim()).filter(url => url)
      : [];

  const validMedia = [];
  const mediaTypes = {};

  // Validate each URL
  for (const url of urls) {
    // Length check
    if (url.length >= 120) continue;

    // Content type check
    const type = await getMediaType(url);
    if (!type) continue;

    validMedia.push({ url, type });
    mediaTypes[type] = true;
  }

  // Apply video priority
  const filteredMedia = mediaTypes.video
    ? validMedia.filter(entry => entry.type === 'video')
    : validMedia.filter(entry => entry.type === 'image');

  // Extract URLs and types
  const filteredUrls = filteredMedia.map(entry => entry.url);
  const videoCount = filteredMedia.filter(m => m.type === 'video').length;
  const imageCount = filteredMedia.length - videoCount;

  // Tier-based validation
  let isValid = true;
  if (tierType === 'premium') {
    isValid = (videoCount <= 1 && imageCount === 0) || (videoCount === 0 && imageCount <= 3);
  } else {
    isValid = filteredUrls.length === 0;
  }

  return { isValid, filteredMedia: filteredUrls };
}

async function getMediaType(url) {
  try {
    let contentType;
    // Try HEAD request first
    try {
      const headResponse = await fetch(url, { method: 'HEAD' });
      contentType = headResponse.headers.get('Content-Type');
    } catch {
      // Fallback to partial GET request
      const getResponse = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      contentType = getResponse.headers.get('Content-Type');
    }

    // Classify as image, video, or invalid
    if (contentType?.startsWith('image/')) return 'image';
    if (isSocialVideo(url) || isDirectVideoFile(url)) return 'video';
    return null;
  } catch (error) {

    return null;
  }
}

// Ad Component
const { width } = Dimensions.get('window');

const AdComponent = ({ ad }) => {
if (!ad || !ad.adId) {return null};
  const scaleValue = new Animated.Value(1);
  const MAX_TEXT_LENGTH = 150;
  const displayText = showFullText 
    ? ad.longText 
    : (ad.longText?.substring(0, MAX_TEXT_LENGTH) || '');
  const shouldShowExpand = ad.longText?.length > MAX_TEXT_LENGTH;

  // Button animation handlers
  const animateButton = (toValue) => {
    Animated.spring(scaleValue, {
      toValue,
      useNativeDriver: true,
    }).start();
  };

  const videoRef = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
const mediaUrls = Array.isArray(ad.mediaUrl)
  ? ad.mediaUrl
  : typeof ad.mediaUrl === 'string'
  ? [ad.mediaUrl]
  : [];


useEffect(() => {
  const timeout = setTimeout(async () => {
    try {
      // Initialize ad if not exists
      await axios.post('https://server-7az0.onrender.com/ads', { ad_id: ad.adId });
      
      // Update view count
      await axios.patch(`https://server-7az0.onrender.com/ads/${ad.adId}?action=view`);
    } catch (error) {

    }
  }, 2000);

  return () => clearTimeout(timeout);
}, [ad.adId]);

const handlePress = async () => {
  try {
    // Update click count
    await axios.patch(`https://server-7az0.onrender.com/ads/${ad.adId}?action=click`);
    Linking.openURL(ad.targetUrl);
  } catch (err) {

  }
};

const renderImage = ({ item }) => (
    <View className="relative justify-center items-center">

      <Image
        source={{ uri: item }}
        style={{ width: width -60, height: 350, borderRadius: 12 }}
        resizeMode="cover"
        onError={() => {

          setImageLoading(false);
        }}
      />
    </View>
  );

  const renderVideoLoader = () => (
    videoLoading && (
      <View className="absolute inset-0 justify-center items-center bg-black/20">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    )
  );

  const onScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentImageIndex(index);
  };

   return (
    <View className="bg-white rounded-2xl p-4 mb-4 mt-1 border-2 border-blue-100 shadow-lg">
      {/* Company Header */}
       <TouchableOpacity 
          onPress={handlePress}>     
          <View className="flex-row items-center mb-4">
        <Image
          source={{ uri: ad.companyLogo || "https://cdn.mos.cms.futurecdn.net/v2/t:0,l:0,cw:1000,ch:562,q:80,w:1000/8stH5QZQriowRdziYpK6SY.jpg" }}
          className="w-12 h-12 rounded-full mr-3"
          resizeMode="contain"
        />
    <View className="flex-1">
              <View className="flex-row items-center">  
                <Text className="font-JakartaBold text-lg text-gray-900">
                  {ad.companyName || "Coca-Cola"} 
                </Text>
                {(ad?.premium || 3 > 2) && ( 
                  <MaterialIcons 
                    name="verified"
                    size={18} 
                    color="#3b82f6" 
                    className="ml-1"
                    style={{ marginTop: 4, marginLeft: 1}}
                  />
                )}
              </View>   
          <Text className="text-gray-500 font-JakartaMedium text-sm">
            Sponsored Content
          </Text>
        </View>

      </View>
        </TouchableOpacity>
{ad.mediaType === 'video' ? (
  isDirectVideoFile(ad.mediaUrl) ? (
    <View className="relative">
      {renderVideoLoader()}
      <Video
        ref={videoRef}
        source={{ uri: ad.mediaUrl }}
        style={{ height: 250, borderRadius: 12 }}
        resizeMode="cover"
        isLooping
        shouldPlay
        useNativeControls
        onLoad={() => setIsVideoReady(true)}
        onError={(e) => console.error("Video error:", e)}
      />
    </View>
  ) :
isSocialVideo(ad.mediaUrl) ? (
          <WebView
            source={{ uri: getEmbeddableUrl(ad.mediaUrl) }}
            style={{ height: 400, borderRadius: 12 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <Text className="text-red-500 text-center mt-2">Unsupported video URL</Text>
        )
) : (
  <View>
    {mediaUrls.length > 0 ? (
      <View>
        <FlatList
          data={mediaUrls}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          renderItem={renderImage}
          style={{ borderRadius: 12 }}
        />
        {mediaUrls.length > 1 && (
          <View className="flex-row justify-center mt-2 space-x-1">
            {mediaUrls.map((_, i) => (
              <View
                key={i}
                className={`h-2 w-2 rounded-full ${i === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'}`}
              />
            ))}
          </View>
        )}
      </View>
    ) : (
      <Text className="text-red-500 text-center mt-2">No media available</Text>
    )}
  </View>
)}


<View className="mt-4">
        <TouchableOpacity 
          onPress={handlePress}>
<Text className="font-JakartaBold text-xl text-gray-900 mb-2">
          {ad.title}
        </Text>
        <Text className="text-gray-600 font-JakartaMedium leading-5 ">
          {showFullText ? ad?.sponsoredText : ad?.sponsoredText.substring(0, 100)}
          {!showFullText && '...'}
        </Text>
        </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowFullText(!showFullText)}
            className="self-start"
          >
            <Text className="text-blue-600 font-JakartaMedium">
              {showFullText ? 'Show Less' : 'Show More'}
            </Text>
          </TouchableOpacity>
      </View>

      {/* Animated Learn More Button */}
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity 
          onPressIn={() => animateButton(0.95)}
          onPressOut={() => animateButton(1)}
          onPress={handlePress}
          className="bg-blue-600 py-3 rounded-lg mt-4"
          style={styles.buttonShadow}
          activeOpacity={0.9}
        >
          <Text className="text-white font-JakartaBold text-center">
            Learn More →
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

  const categories = [
    "General",
    "Car Maintenance",
    "Road Closed",
    "Rent/Sell/Buy Car",
    "Traffic Jam",
    "New Regulations",
    "Fuel Available",
    "Road Opened",
  ];

const [selectedPost, setSelectedPost] = useState(null);
const [showReportModal, setShowReportModal] = useState(false);
const [reportReasons, setReportReasons] = useState([
  'Spam', 'Harassment', 'False Information', 'Inappropriate Content', 'Other'
]);

  const { setUserLocation, setDestinationLocation, userLatitude, userLongitude, userAddress } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [votedPosts, setVotedPosts] = useState({}); // { postId: 'upvote' | 'downvote' }
  const [voteTimestamps, setVoteTimestamps] = useState([]); // Array of Unix epoch timestamps
  const router = useRouter();
  const [karma, setKarma] = useState(Number(0)); // Ensure karma is a number
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [sortByKarma, setSortByKarma] = useState(false); // Toggle sorting method
  const [showCreateModal, setShowCreateModal] = useState(false);
    const [lastKey, setLastKey] = useState(null); // For pagination
    const [isLoadingMore, setIsLoadingMore] = useState(false);
 const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [showFollowModal, setShowFollowModal] = useState(false);

const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});

const t = postsTranslation[language];

  const fetchData = async () => {
    console.log("fetchData start")
    try {
       const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];
      setLoading(true);
      const totalFetches = await getTotalFetchCount("posts");
      if (totalFetches >= maxPostFetches && creditBalance < 50) {
      console.log("totalFetches", totalFetches)
      console.log("tierLimits", tierLimits, "tierType", tierType)
        return;
      }
      if (totalFetches >= maxPostFetches) {
console.log("cached, fetchData", fetchData)
        const cached = await fetchCachedPosts();
        if (cached.length > 0) setPosts(cached);
        return;
      }
    console.log("fetchPosts() called 1")
    const posts = await fetchPosts();
    console.log("Afte fetchPosts() called 1")
    //const eligibleAdsDelala = await fetchEligibleAds();
    //setEligibleAds(eligibleAdsDelala)
   // const mergedContent = mergeContent(posts, eligibleAdsDelala);
     //setPosts(mergedContent);
    setPosts(posts)
    } catch (error) {
console.log("fetchData() error", error)
    } finally {
      setLoading(false); // Always runs after try/catch
    }
  };

useEffect(() => {
  fetchData();
}, []);

// useEffect(() => {
// console.log("posts after being merged with ads", posts)
// }, [posts]);
/**
 * Fetch posts from the "communityPosts" table.
 *
 * Best Practices Implemented:
 * - Uses asynchronous operations with proper error handling.
 * - Logs errors for easier debugging.
 * - Sorts posts by createdAt in descending order (if applicable) to show the most recent posts first.
 * - Provides a base for implementing pagination if needed.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of post items.
 */


// Fetch the initial follow status
const fetchFollowStatus = async (author) => {
  const isFollowing = await checkFollowingStatus(author);
  setFollowing(isFollowing);
};

const handleBlockUser = (username) => {
  Alert.alert(
    `Block ${username}?`,
    'You won\'t see their posts or messages',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => {setPosts(prev => prev.filter(post => post.author !== username));} }
    ]
  );
};

const toggleFollow = async (expoToken) => {
 
  if (!selectedPoster || !selectedPoster.user_id) return;
  const { author, driverId, followerCount } = selectedPoster;

  try {
    if (following) {
      await unfollowUser(author);
        const driverData = await driverProfile(selectedPoster.user_id, "user_id")
        const followers = driverData.social_count
      await updateDriver(selectedPoster.user_id, {social_count: parseInt(followers) - 1})
      setFollowerCount(followers - 1);
    } else {
      await followUser(author);
              const driverData = await driverProfile(selectedPoster.user_id, "user_id")
        const followers = driverData.social_count
      await updateDriver(selectedPoster.user_id, {social_count: parseInt(followers) + 1})
      setFollowerCount(followers + 1);
      // Reconstruct the token only if necessary
      let reconstructedToken = expoToken; // Default to the original token

      if (expoToken && !expoToken.startsWith("ExponentPushToken[")) {
        reconstructedToken = `ExponentPushToken[${expoToken}]`;
      }

      // Skip sending notification if expoToken doesn't exist
      if (!expoToken) {

      } else {
        // Send notification to the poster
        await sendFollowNotification(reconstructedToken, followerCount + 1);
      }
    }
    setFollowing(!following);
  } catch (error) {

  }
};

const sendFollowNotification = async (expoToken, newFollowerCount) => {
  if (!expoToken) return;
const db = getFirestore();
const auth = getAuth();
const user = auth.currentUser;

  try {
    const message = {
      to: expoToken,
      sound: "default", // Uses system sound if no custom file is provided
      channelId: 'ride_notifications_happy',
      title: "✨🥳 Congratulations, you have a new follower!",
      body: `Congratulations, the user ${ shareUsername || user?.displayName } has just followed you on Share rides! Continue using Share to get more followers.`,
      data: { type: "new_follower" },
      ios: { sound: "./assets/sounds/new_follower.mp3" }, // iOS Custom Sound
      android: { sound: "new_follower.m4a", priority: "high" }, // Android Custom Sound
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

  } catch (error) {

  }
}

const handleDeletePost = async (createdAt) => {
  try {
 
    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: {
        communityPost: "communityPost", // static partition key
        createdAt: createdAt,           // dynamic sort key
      },
    }).promise();
    setPosts(prev => prev.filter(post => post.createdAt !== createdAt));

  } catch (error) {

    // Optionally: show error to the user
  }
};


let paginationCount = 0;

const fetchPosts = async (startKey = null, isRefresh = false) => {
console.log("inside fetchPosts")
  try {
    const cachedPosts = (await fetchCachedPosts()) || [];

    const totalFetches = await getTotalFetchCount("posts");

    const { maxPostFetches } = tierLimits[tierType];

    if (totalFetches >= maxPostFetches) {

      if (cachedPosts.length > 0) {

        setPosts(cachedPosts);
        console.log("cachedPosts", cachedPosts)
      }
      setLoading(false);
      return;
    }

    if (startKey && paginationCount >= 5) {
      console.log("📌 Pagination limit reached | startKey:", startKey, "| paginationCount:", paginationCount);
      if (cachedPosts.length > 0) {
        console.log("✅ Returning merged cached posts:", cachedPosts);
        setPosts(prevPosts => mergeAndSortPosts(prevPosts || [], cachedPosts));
        setLoading(false);
        return cachedPosts;
      }
      return;
    }
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pkVal",
      ExpressionAttributeNames: { "#pk": "communityPost" },
      ExpressionAttributeValues: { ":pkVal": "communityPost" },
      Limit: POSTS_LIMIT,
      ScanIndexForward: false, // 🔽 Descending by date (most recent first)
      ...(startKey && { ExclusiveStartKey: startKey }),
    };

    const data = await dynamoDB.query(params).promise();
    setLastKey(data.LastEvaluatedKey || null);

    let fetchedPosts = data.Items || [];

    if (!Array.isArray(fetchedPosts)) {
      fetchedPosts = [];
    }
if (isRefresh) {
      paginationCount = 0;
      await storePostsLocally(fetchedPosts);
      incrementFetchCount("posts");
      return handlePostsMerge([], fetchedPosts, true);
    }
    console.log("fetchPosts()")
    console.log("fetchPosts", fetchPosts)
    incrementFetchCount("posts");
    setLoading(false);
    paginationCount ++
    return handlePostsMerge(posts, fetchedPosts);
  } catch (error) {
console.error("fetchPosts error", error)
  } finally {
    setLoading(false);
  }
};

const handlePostsMerge = async (existing, newPosts, isRefresh = false) => {
  const merged = mergeAndSortPosts(
    isRefresh ? newPosts : [...existing, ...newPosts], 
    []
  );
  
  // Enforce post limit
  if (merged.length > POST_LIMIT) {
    const excess = merged.length - POST_LIMIT;
    return merged.slice(excess); // Keep most recent
  }
  setPosts(merged);
  await storePostsLocally(newPosts);
  return merged;
};

// Helper function to merge, remove duplicates, and sort posts
const mergeAndSortPosts = (newPosts, existingPosts) => {
  const combinedPosts = [...newPosts, ...existingPosts];
  const uniquePosts = Array.from(
    new Map(combinedPosts.map(post => [post.createdAt, post])).values()
  );

  // Apply filters
  let filteredPosts = uniquePosts.filter(post => {
    const dateValid = filters.dateRange === 'all' ||
      isInDateRange(post.createdAt, filters.dateRange);
    const authorValid = !filters.onlyMyPosts || 
      post.author === shareUsername;
    let nearMeValid = true;

    if (filters.nearMe) {
      const postLat = post.lat || post.coordinates?.[0];
      const postLon = post.lon || post.coordinates?.[1];

      if (postLat != null && postLon != null) {
        const dist = haversineDistance(
          { latitude: userLatitude, longitude: userLongitude },
          { latitude: postLat, longitude: postLon }
        );
        nearMeValid = dist <= 6; // within 5 km
      } else {
        nearMeValid = false; // discard if no coordinates
      }
    }

    return dateValid && authorValid && nearMeValid;
  });

  // Apply sorting
  if (filters.byKarma) {
    return filteredPosts.sort((a, b) => (b.karma || 0) - (a.karma || 0));
  }

  return filteredPosts.sort((a, b) => {
    const distA = haversineDistance(
      { latitude: userLatitude, longitude: userLongitude },
      { latitude: a.lat || a.coordinates?.[0], longitude: a.lon || a.coordinates?.[1] }
    );
    const distB = haversineDistance(
      { latitude: userLatitude, longitude: userLongitude },
      { latitude: b.lat || b.coordinates?.[0], longitude: b.lon || b.coordinates?.[1] }
    );
    return distA - distB || b.createdAt - a.createdAt;
  });
};


const [filters, setFilters] = useState({
  dateRange: 'all',
  byKarma: false,
  onlyMyPosts: false,
  nearMe: false, // NEW
});

const isInDateRange = (postDate, range) => {
  // Handle invalid postDate gracefully
  if (!postDate || typeof postDate !== 'number') {
    return false;
  }

  // Convert UNIX timestamp (seconds) to milliseconds
  const postTime = new Date(postDate * 1000);
  const now = new Date();

  // Helper for clean date comparison
  const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();
  const isSameMonth = (d1, d2) => isSameYear(d1, d2) && d1.getMonth() === d2.getMonth();

  switch (range) {
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0); // Start of day
      
      console.log('Date Check:', {
        postDate,
        postTime: postTime.toISOString(),
        weekAgo: weekAgo.toISOString(),
        isWithinWeek: postTime >= weekAgo
      });
      
      return postTime >= weekAgo;
    }

    case 'month':
      return isSameMonth(postTime, now);

    case 'year':
      return isSameYear(postTime, now);

    case 'lastYear': {
      const lastYear = new Date().getFullYear() - 1;
      return postTime.getFullYear() === lastYear;
    }

    default: // 'all'
      return true;
  }
};

useEffect(() => {
  const applyFilters = async () => {
    let cachedPosts = []
     const totalFetches = await getTotalFetchCount("posts");
    const { maxPostFetches } = tierLimits[tierType];
        if (totalFetches >= maxPostFetches) {
      cachedPosts = await fetchCachedPosts();
    }
    const merged = mergeAndSortPosts(posts, cachedPosts || []);
    setPosts(merged);
  };
  applyFilters();
 
}, [filters]);

  // When the user scrolls near the bottom, load more posts
const handleLoadMore = async () => {
  if (!lastKey || isLoadingMore) return; // No more data 
    const totalFetches = await getTotalFetchCount("posts");

    const { maxPostFetches } = tierLimits[tierType];

    if (totalFetches >= maxPostFetches) {
      return;
    }
  try {
    setIsLoadingMore(true);
    const newPosts = await fetchPosts(lastKey);
    if (!posts)
      {return posts}
    // Filter out duplicates that might already be in state
    const uniqueNewPosts = newPosts.filter(
      newPost => !posts.some(existingPost => 
        existingPost.createdAt === newPost.createdAt
      )
    );
    const merged = mergeAndSortPosts(uniqueNewPosts, posts || []);
    const mergedContent = mergeContent(merged, eligibleAds);
         setPosts(prev => {
      return mergedContent > 55 ? mergedContent.slice(-55) : mergedContent;
    });
  } catch (error) {

  } finally {
    setIsLoadingMore(false);
  }
};

// Add loading indicator at bottom
const renderFooter = () => (
  isLoadingMore ? (
    <View className="py-4">
      <ActivityIndicator size="small" color="#f97316" />
    </View>
  ) : null
);

 const openCommentsModal = (postAuthor, postTitle, postContent, createdAt, currentKarma, authorAvatar, mediaUrls) => {
 
 const isValidMediaUrls = Array.isArray(mediaUrls) && mediaUrls.some(url => url.trim?.() !== "");
const mediaUrlsToSend = isValidMediaUrls ? JSON.stringify(mediaUrls) : null;

  router.push({pathname: "/(root)/post-detail",
      params: { 
                postAuthor,
                postTitle,
                postContent,
                createdAt, 
                currentKarma,
                authorAvatar,
                mediaUrls: mediaUrlsToSend,
      },
    })

    setSelectedPostId(createdAt);
 
 
  };

const handleReportPost = async (post, reason) => {
  try {
    const now = Math.floor(Date.now() / 1000); // seconds precision

    await dynamoDB.put({
      TableName: "ReportedDriverPosts",
      Item: {
        reportedPost: "reportedPost", // static partition key
        reportedAt: now,              // dynamic sort key (current time)
        originalAuthor: post?.author || "Unknown",
        // originalContent: post?.content || "",
        // originalTitle: post?.title || "Untitled",
        originalCreatedAt: post?.createdAt || 0,
        // originalPosterLocation: post?.posterLocation || "Unknown",
        reportReason: reason,
      },
    }).promise();
Alert.alert("Success", "Post reported successfully.");

    // Optionally show success feedback to user
  } catch (error) {

    // Optionally show error feedback to user
  }
};


const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';

const handleVote = async (postId, createdAt, currentKarma, type) => {
  if (!canVote()) {
       setModalData({
    title: "Limit Reached",
    message: "You can only vote a few times an hour",
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
      return;
    }
     const voteKey = `${type}-${postId}`;
    if (votedComments.has(voteKey)) {
        setModalData({
    title: "Uh-oh",
    message: t.alreadyVoted(type),
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
      return;
    }

  let newKarma = type === "upvote" ? Number(currentKarma) + 1 : Number(currentKarma) - 1;

   addVote(voteKey);
      addVoteTimestamp();//

    setPosts(prevPosts =>
        prevPosts.map(post => post.createdAt === createdAt ? { ...post, karma: newKarma } : post)
    );

    setVotedPosts(prev => ({ ...prev, [createdAt]: type }));
    setVoteTimestamps(prev => [...prev, Math.floor(Date.now() / 1000)]);
    setKarma(newKarma);

    const totalFetches = await getTotalFetchCount("posts");
        const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];
        
    if (totalFetches >= maxPostFetches) {
      return;}

const params = {
    TableName: TABLE_NAME,
    Key: {
      communityPost: "communityPost",            // 🔑 Static partition key
      createdAt: createdAt,           // 🔑 Sort key (ISO string or number)
    },
    UpdateExpression: "SET karma = if_not_exists(karma, :zero) + :inc",
    ExpressionAttributeValues: {
      ":inc": type === "upvote" ? 1 : -1,
      ":zero": 0
    },
    ReturnValues: "UPDATED_NEW"
  };

  try {
    await dynamoDB.update(params).promise();

    } catch (error) {

    }
};
const tierLengthLimits = {
  premium: {
    maxTitleLength: 120,
    maxContentLength: 2000,
  },
  standard: {
    maxTitleLength: 80,
    maxContentLength: 800,
  },
  noBenefits: {
    maxTitleLength: 60,
    maxContentLength: 600,
  },
};

  // Create a new post
const handleCreatePost = async () => {
  //console.log("title, content, category", title, content, category)
const { maxTitleLength, maxContentLength } = tierLengthLimits[tierType] || tierLengthLimits.noBenefits;
  const now = Math.floor(Date.now() / 1000);
  const recentPosts = createdPosts.filter(post => now - post.createdAt < 3600);
          const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];
  //console.log("maxPostFetches, maxPostsPerHour", maxPostFetches, maxPostsPerHour, tierType)
  if (recentPosts.length >= maxPostsPerHour) {
 Alert.alert("Limit Reached", "Please wait an hour to post again.");
      console.error("Limit ")

    setShowCreateModal(false)
    return;
  }
  if (!title.trim() || !content.trim() || !category.trim()) {
     Alert.alert("Empty Fields", t.emptyFieldsError);
    setShowCreateModal(false)
     console.error("Empty Fields")
    return;
  }
 // console.log("maxTitleLength, maxContentLength", maxTitleLength, maxContentLength)
if (title.length > maxTitleLength || content.length > maxContentLength) {
  Alert.alert(
    "Post Too Long",
    `Your tier (${tierType}) allows up to ${maxTitleLength} characters in the title and ${maxContentLength} in the content.`
  );
  console.error(    "Post Too Long")
  setShowCreateModal(false);
  return;
}

  try {
const user = auth().currentUser;
 // const postId = `${category}-${uuid.v4().substring(0, 6)}`;
  const createdAt = Math.floor(Date.now() / 1000);
  const author = shareUsername || user?.displayName;
  const coordinates = [userLatitude || 0, userLongitude || 0]; // 🔥 Combine lat & lon into an array
  const posterLocation = userAddress.substring(0, 33);
const posterId = user.uid
const token = expoToken.match(/\[(.*?)\]/) ? expoToken.match(/\[(.*?)\]/)[1] : expoToken;
const authorAvatar = profileImageUrl || user?.photoURL
  const newPost = {
    communityPost: "communityPost",
    createdAt,
    author,
    title,
    content,
    karma: 0,
    coordinates, // 🔥 Store combined lat/lon array
    posterLocation,
    category,
    followerCount: socialCount,
    expoToken: token,
    authorAvatar,
    // media: []
  };
 // console.log("mediaInput", mediaInput)
  // Process media URLs
  const mediaUrls = mediaInput ? mediaInput
    .split(',')
    .map(url => url.trim())
    .filter(url => url) : null;
let isValid, filteredMedia; 
filteredMedia = []
//console.log("mediaUrls, mediaInput", mediaUrls, mediaInput)
  // Validate media URLs and check tier compliance
if (mediaUrls) {
const result = await validateMediaUrls(mediaUrls, tierType);
isValid = result.isValid;
filteredMedia = result.filteredMedia;
if (!isValid) {
    Alert.alert(
      "Invalid Media", 
      tierType === 'premium' 
        ? "Max 3 images or 1 video. Use valid URLs."
        : "Upgrade to Premium to post media"
    );
      console.error("Invalid Media")
    return;
  }
}
const filteredMediaCheck = filteredMedia.length < 1 ? [" "] : filteredMedia
  // Add validated media to post
  newPost.media = filteredMediaCheck;
    // Save post to DynamoDB
    const params = {
      TableName: "CommunityPosts",
      Item: newPost,
    };
    await dynamoDB.put(params).promise(); // 🔥 Save post to DynamoDB
    // Update UI state
    setPosts([newPost , ...posts]);//
    setCreatedPosts([...recentPosts, newPost]);
    setShowCreateModal(false);
  } catch (error) {
          console.error("Failed to create post. Please try again.", error)
    Alert.alert("Error", "Failed to create post. Please try again.");
  }
};

// Fetch emergencies from last 24 hours
  const fetchEmergencies = async () => {
    try {
const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;
const params = {
  TableName: "DriverEmergency",
  KeyConditionExpression: "communityPost = :postType AND createdAt > :timestamp",
  ExpressionAttributeValues: {
    ":postType": "emergency",
    ":timestamp": twentyFourHoursAgo
  }
};
const result = await dynamoDB.query(params).promise();
console.log("fetchEmergencies result", result)
  setEmergencies(result.Items || []);
//console.log("Emergencies ", emergencies, "..............", result.Items)
      // Set map region to first emergency location
      if (result.Items?.[0]?.coordinates) {
       // console.log("coordinates ", result.Items?.[0]?.coordinates, "..............", result.Items?.[0]?.coordinates[0], result.Items?.[0]?.coordinates[1])
        setRegion({
          latitude: result.Items[0].coordinates[0],
          longitude: result.Items[0].coordinates[1],
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
      
    } catch (error) {
  //    Alert.alert("Error", "Failed to load emergency data");
    } 
  };

  useEffect(() => {
    console.log("saasasassasd")
    fetchEmergencies();
  }, []);

// const handleRefresh = async () => {
//       const totalFetches = await getTotalFetchCount("posts");

//     const { maxPostFetches } = tierLimits[tierType];

//     if (totalFetches >= maxPostFetches) {
//       return;
//     }
//   setIsRefreshing(true);
//   try {
//   const result = await fetchPosts(null, true);
//     const eligibleAdsDelala = await fetchEligibleAds();
//     setEligibleAds(eligibleAdsDelala)
//     const mergedContent = mergeContent(result, eligibleAdsDelala);
//      setPosts(mergedContent);
//   } finally {
//     setIsRefreshing(false);
//   }
// };

const handleRefresh = async () => {

  setIsRefreshing(true);
  try {
  const result = await fetchPosts(null, true);
     setPosts(result);
  } finally {
    setIsRefreshing(false);
  }
};

handleFollow = async (item) => {
if (!item.author) {return; }
//setLoading(true)
  setSelectedPoster(item);
  fetchFollowStatus(item.author, item.followerCount || 0);
  const driverData = await driverProfile(item.author, "username")
  if(driverData){
    setFollowerCount(driverData.social_count);
    setSelectedPoster({
  ...item, user_id: driverData.user_id
});   
  }
//setLoading(false)
  setShowFollowModal(true);
}

// Modified Emergency Item component
const EmergencyItem = ({ emergency, index }) => {
  const isExpanded = expandedEmergency === index;
  const handleShare = async () => {
    try {
      const coordinates = `${emergency.coordinates[0]},${emergency.coordinates[1]}`;
      const message = `Emergency Report by ${emergency.author}:\n
      Time: ${new Date(emergency.createdAt * 1000).toLocaleTimeString()}\n
      Plate Number: ${emergency.plateNumber}\n
      Location: ${emergency.posterLocation}\n
      Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
      await Share.share({
        message,
        title: 'Emergency Alert'
      });
    } catch (error) {

    }
  };

  // Open in Google Maps
  const openGoogleMaps = () => {
    const coordinates = `${emergency.coordinates[0]},${emergency.coordinates[1]}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
    Linking.openURL(mapsUrl).catch(err => 
      console.error("Failed to open maps:", err)
    );
  };


  return (
    <TouchableOpacity 
      className="bg-white p-4 rounded-xl mb-2 shadow-sm"
      onPress={() => setExpandedEmergency(isExpanded ? null : index)}
      activeOpacity={0.9}
    >
      <View className="flex-row items-center">
        <Image
          source={{ uri: emergency.authorAvatar }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="font-JakartaBold text-gray-900">
            {emergency.author}
          </Text>
          <Text className="text-gray-600 font-JakartaMedium text-sm">
          {emergency.createdAt ? dayjs(emergency.createdAt * 1000).fromNow() : 'Recently'} - 
            {emergency.posterLocation}
          </Text>
          <Text className="text-teal-600 font-JakartaMedium text-sm">
          Plate Number: {emergency.plateNumber || "00000"}
          </Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </View>

      {isExpanded && (
        <View className="mt-3 h-40 rounded-lg overflow-hidden border border-gray-100">
          <MapView
            className="flex-1"
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={false}
            liteMode={false}
            initialRegion={{
              latitude: emergency.coordinates[0],
              longitude: emergency.coordinates[1],
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
          >
            <Marker
              coordinate={{
                latitude: emergency.coordinates[0],
                longitude: emergency.coordinates[1]
              }}
            >
              <View className="bg-red-500 p-2 rounded-full border-2 border-white">
                <Ionicons name="warning" size={17} color="white" />
              </View>
            </Marker>
          </MapView>
          <View className="flex-row justify-between mt-3 space-x-2">
            <TouchableOpacity
              className="flex-1 bg-blue-50 p-3 rounded-lg flex-row items-center justify-center"
              onPress={openGoogleMaps}
            >
              <Ionicons name="map" size={18} color="#3b82f6" />
              <Text className="text-blue-600 font-JakartaMedium ml-2">
                Open in Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-gray-100 p-3 rounded-lg flex-row items-center justify-center"
              onPress={handleShare}
            >
              <Ionicons name="share-social" size={18} color="#4b5563" />
              <Text className="text-gray-700 font-JakartaMedium ml-2">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const MemoizedEmergencyItem = memo(EmergencyItem);


return (
  <View className="flex-1 bg-gray-50">
    {/* Header */}
    <View className="bg-white pb-4 shadow-sm shadow-black/10">
      <Text className="text-2xl font-JakartaBold text-center text-gray-900 mt-8">
        {t.communityPosts}
      </Text>
    </View>
    {/* Empty State */}
    {(!posts && creditBalance < 50) && (
      <View className="items-center px-6 mt-8">
        <View className="bg-white p-6 rounded-2xl shadow-sm shadow-black/10 items-center w-full">
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text className="text-lg font-JakartaBold text-gray-800 mt-4">
            Free Posts Limit Reached
          </Text>
          <Text className="text-gray-600 font-JakartaMedium text-center mt-2">
            Continue engaging with the community by topping up your balance.
          </Text>
          <TouchableOpacity 
            className="bg-orange-500 rounded-xl py-3 px-6 mt-4"
            onPress={() => Linking.openURL('https://t.me/shareDriverSupport')}
          >
            <Text className="text-white font-JakartaBold">Add Credit</Text>
          </TouchableOpacity>
        </View>
      </View>
    )} 

 <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />
      
    {/* Create Post FAB */}
<TouchableOpacity 
  style={{
    position: "absolute",
    bottom: "50%", // Distance from the bottom
    left: "95%", // Start from the center
    transform: [{ translateX: -32 }], // Move it left by half its width
    zIndex: 1, // Ensures it's above other content
    elevation: 3, // Adds shadow on Android
  }}
  className="bg-gradient-to-r from-orange-500 to-amber-500 w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-orange-500/30"
  onPress={() => setShowCreateModal(true)}
>
  <Ionicons name="add-circle" size={32} color="black" />
</TouchableOpacity>

    {loading && (
      <View className="mt-8">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    )}
<View className="bg-white sticky top-0 z-10">
  <FilterBar filters={filters} setFilters={setFilters} />
</View>

 {/* Posts List */}
    <FlatList
      refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor="#f97316"
    />
  }
      data={Array.isArray(posts) ? posts : []}
      keyExtractor={(item, index) => item?.createdAt ? item?.createdAt : index}
      contentContainerStyle={{paddingHorizontal: 16, paddingTop: 4, paddingBottom: 150}}
      initialNumToRender={20}
      removeClippedSubviews
      getItemLayout={(data, index) => ({
        length: 200,
        offset: 200 * index,
        index,
      })}
 onEndReached={handleLoadMore}
  onEndReachedThreshold={0.1}
  ListFooterComponent={renderFooter}
  windowSize={7}
  maxToRenderPerBatch={10}
renderItem={({ item }) => {
  if (item.__type === 'ad') {
    return <AdComponent ad={item} />;
  }

  const mediaUrls = Array.isArray(item.media) ? 
    item.media : 
    (typeof item.media === 'string' ? [item.media] : []);
  const onScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentImageIndex(index);
  };

 const renderMedia = () => {
    if (!mediaUrls) return null
     // console.log("mediaUrls", mediaUrls)
   if (!mediaUrls.length || mediaUrls.length < 1 ) { return null } ;
  if (mediaUrls.length === 1 && mediaUrls[0].trim() === "") {
  return null;}
    const firstMedia = mediaUrls[0];
    const isVideo = isSocialVideo(firstMedia) || isDirectVideoFile(firstMedia);
    const { width } = Dimensions.get('window');
return (
      <View className="my-4">
        {isVideo ? (
          isDirectVideoFile(firstMedia) ? (
            <Video
              source={{ uri: firstMedia }}
              style={{ height: 350, borderRadius: 12 }}
              resizeMode="cover"
              paused={true}
              controls
            />
          ) : isSocialVideo(firstMedia) ? (
          <WebView
            source={{ uri: getEmbeddableUrl(firstMedia) }}
            style={{ height: 400, borderRadius: 12 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <Text className="text-red-500 text-center mt-2">Unsupported video URL</Text>
        )
        ) : (
          <View>
            <FlatList
              data={mediaUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width: width-60, height: 300, borderRadius: 12 }}
                  resizeMode="cover"
                />
              )}
              keyExtractor={(item, index) => index.toString()}
            />
            {mediaUrls.length > 1 && (
              <View className="flex-row justify-center mt-2 space-x-1">
                {mediaUrls.map((_, i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rounded-full ${i === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'}`}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };
  return (
    <View className="bg-white rounded-2xl p-4 mb-2 shadow-sm shadow-black/10">
        {/* Author Header */}
  <View className="flex-row justify-between items-start">
        <TouchableOpacity
          onPress={() => {
            handleFollow(item)
          }}
          className="flex-row items-center flex-1 mb-3"
        >
            {( !item.authorAvatar && 
              <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-1">
                <Text className="text-gray-900 font-JakartaBold text-sm">
                  {item.author ? item.author[1] : "S"}
                </Text>
              </View> )}

            {( item.authorAvatar &&
            <Image
            source={{ uri: item.authorAvatar }}
            className="w-10 h-10 rounded-full mr-1"
          />)}
                <View className="ml-3">
                    <View className="flex-row items-center">
                        <Text className="font-JakartaBold text-gray-800">
                            {item?.author || "Unknown"}
                        </Text>
{item?.premium && (
    <MaterialIcons 
        name="verified" style={{marginTop: 3, marginLeft: 3}}
        size={18} 
        color="#3b82f6" 
        className="ml-1"
    />
)}
                    </View>
                    <Text className="text-gray-500 font-JakartaMedium text-xs">
                        {item.createdAt ? dayjs(item.createdAt * 1000).fromNow() : 'Recently'}{" "}
                        📍{item?.posterLocation || "Location Unknown"}
                    </Text>
                </View>
        </TouchableOpacity>
    <TouchableOpacity
      className="pl-2"
      onPress={() => {
        setSelectedPost(item);
        setShowActionsMenu(!showActionsMenu);
      }}
    >
      <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
    </TouchableOpacity>
  </View>
{ selectedPost?.createdAt === item.createdAt && showActionsMenu && (
    <View className="absolute right-2 top-10 bg-white rounded-lg shadow-lg z-10">
      <TouchableOpacity
        className="px-6 py-3 border-b border-gray-100"
        onPress={() => {
          setShowReportModal(true);
          setSelectedPost(item);
        }}
      >
        <Text className="font-JakartaMedium text-red-600">Report Post</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="px-6 py-3"
      onPress={() => {handleBlockUser(item.author); setShowActionsMenu(false);
          }}  >
        <Text className="font-JakartaMedium text-gray-800">Block User</Text>
      </TouchableOpacity>
      { selectedPost.author === shareUsername && (
              <TouchableOpacity
        className="px-6 py-3"
      onPress={() => {handleDeletePost(item?.createdAt); setShowActionsMenu(false);
          }}  >
        <Text className="font-JakartaMedium text-gray-800">Delete Post</Text>
      </TouchableOpacity>)}
    </View>
  )}

        {/* Post Content */}
        <TouchableOpacity
          onPress={() =>
            openCommentsModal(
              // item?.postId || "",
              item?.author || "Unknown",
              item?.title || "Untitled",
              item?.content || "",
              item?.createdAt || 0,
              item?.karma || 0,
              item?.authorAvatar || null,
              item.media || [" "]
            )
          }
        >
          <Text className="font-JakartaBold text-gray-900 text-lg mb-2">
            {item?.title || "Untitled"}
          </Text>
          <Text className="font-Jakarta text-gray-700 leading-5">
            {item?.content
              ? item.content.length > 300
                ? `${item.content.substring(0, 300)}...`
                : item.content
              : "No content available"} <Text className="font-JakartaSemiBold text-blue-600"> {item.content.length > 300 ? "See More →" : " " } </Text>
          </Text>
        </TouchableOpacity>
            {renderMedia()}
        {/* Post Actions */}
        <View className="flex-row items-center justify-between mt-4">
          {/* Voting */}
          <View className="flex-row items-center">
            <TouchableOpacity
              className="flex-row items-center bg-gray-100 rounded-lg px-3 py-1"
              onPress={() => {
                if (!item?.createdAt) return;
                handleVote(item.createdAt, item.createdAt || 0, item.karma || 0, "upvote");
              }}
            >
              <Entypo name="arrow-up" size={16} color="#22c5ae" />
              <Text className="font-JakartaBold text-gray-700 ml-1">
                {item?.karma ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-2 bg-gray-100 rounded-lg px-3 py-1"
              onPress={() => {
                if (!item?.createdAt) return;
                handleVote(item.createdAt, item.createdAt || 0, item.karma || 0, "downvote");
              }}
            >
              <Entypo name="arrow-down" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() =>
              openCommentsModal(
               // item?.postId || "",
                item?.author || "Unknown",
                item?.title || "Untitled",
                item?.content || "",
                item?.createdAt || 0,
                item?.karma || 0,
                item?.authorAvatar || null,
                item.media || [" "]
              )
            }
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#22c5ae" />
            <Text className="font-JakartaMedium text-gray-600 ml-1">
              Show comments
            </Text>
          </TouchableOpacity>
        </View>
      </View>
        )
}}
    />
<BottomSheet
  index={0}
  snapPoints={["16%", "55%", "90%"]}
  backgroundComponent={({ style }) => (
    <View 
      style={style} 
      className="bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-xl"
    />
  )}
>
  <View className="flex-1">
    {/* Emergency List - Scrollable */}
    <BottomSheetScrollView 
      className="px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text className="text-xl text-red-500 font-JakartaBold mb-4 ml-5">
        Recent Emergencies ({emergencies.length})
      </Text>
      
      {emergencies.length > 0 ? (
        emergencies.map((emergency, index) => (
          <MemoizedEmergencyItem 
            key={index} 
            emergency={emergency} 
            index={index}
          />
        ))
      ) : (
        <View className="bg-amber-50 p-4 rounded-xl mx-2">
          <Text className="text-center text-amber-700 font-JakartaMedium">
            No emergency reports in the last 24 hours
          </Text>
        </View>
      )}
    </BottomSheetScrollView>
  </View>
</BottomSheet>

    {/* Create Post Modal */}
    <Modal visible={showCreateModal} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-white w-[90%] max-w-md rounded-2xl p-6">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-JakartaBold">Create Post</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
              <Text className="font-JakartaMedium text-gray-600 mb-1">Title</Text>
          {/* Form Inputs */}
          <TextInput
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            multiline
            className="bg-gray-100 rounded-xl px-4 py-3 font-JakartaMedium mb-4"
            placeholderTextColor="#9ca3af"
          />

          <TextInput
            placeholder="Write your post..."
            value={content}
            onChangeText={setContent}
            multiline
            className="bg-gray-100 rounded-xl px-4 py-3 h-32 font-JakartaMedium mb-4"
            placeholderTextColor="#9ca3af"
          />

           {/* Media Input with Premium Blur */}
      <View className="relative mb-4">
        <TextInput
          placeholder={
            tierType === 'premium' 
              ? "Media URLs (comma separated, max 3 images or 1 video)"
              : "Upgrade to Premium to add media"
          }
          value={mediaInput}
          onChangeText={setMediaInput}
          className={`bg-gray-100 rounded-xl px-4 py-3 font-JakartaMedium ${
            tierType !== 'premium' ? 'blur-[2px]' : ''
          }`}
          placeholderTextColor="#9ca3af"
          editable={tierType === 'premium'}
          multiline
        />

        {tierType !== 'premium' && (

            <Text className="text-blue-600 font-JakartaMedium text-center">
              Upgrade to Premium for Media Support
            </Text>
        )}
      </View>

          {/* Category Picker */}
          <View className="bg-gray-100 rounded-xl">
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              dropdownIconColor="#6b7280"
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity 
              className="flex-1 bg-orange-500 rounded-xl py-3 items-center"
              onPress={handleCreatePost}
            >
              <Text className="text-white font-JakartaBold">
                {loading ? 'Posting...' : 'Publish'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
              onPress={() => setShowCreateModal(false)}
            >
              <Text className="text-gray-700 font-JakartaBold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
<Modal
  visible={showReportModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowReportModal(false)}
>
  <View className="flex-1 justify-center items-center bg-black/60">
    <View className="bg-white w-80 p-4 rounded-xl">
      <Text className="text-lg font-JakartaBold mb-4">Report Post</Text>
      {reportReasons.map(reason => (
        <TouchableOpacity
          key={reason}
          className="py-3 border-b border-gray-100"
          onPress={() => {
            handleReportPost(selectedPost, reason);
            setShowReportModal(false);
          }}
        >
          <Text className="text-gray-800">{reason}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        className="mt-4 self-end"
        onPress={() => setShowReportModal(false)}
      >
        <Text className="text-blue-500">Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    {/* Follow Modal */}
    {showFollowModal && (
      <Modal visible={showFollowModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white w-[80%] rounded-2xl p-6">
            {/* Profile Info */}
            <View className="items-center mb-4">
              <Image
                source={{ uri: selectedPoster?.authorAvatar || DEFAULT_AVATAR }}
                className="w-16 h-16 rounded-full mb-3"
              />
              <Text className="text-lg font-JakartaBold">
                {selectedPoster?.author}
              </Text>
              <Text className="text-gray-600 font-JakartaMedium">
                {followerCount} followers
              </Text>
            </View>

            {/* Action Buttons */}
            {selectedPoster.user_id && (
            <TouchableOpacity 
              className={`rounded-xl py-3 items-center ${
                following ? 'bg-gray-200' : 'bg-orange-500'
              }`}
              onPress={() => toggleFollow(selectedPoster.expoToken)}
            >
              <Text className={`font-JakartaBold ${
                following ? 'text-gray-700' : 'text-white'
              }`}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
)}
            <TouchableOpacity 
              className="mt-3 rounded-xl py-3 items-center bg-gray-100"
              onPress={() => setShowFollowModal(false)}
            >
              <Text className="font-JakartaBold text-gray-700">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )}
  </View>
)}

const styles = StyleSheet.create({
   overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  profileModalContainer: { width: 300, padding: 20, backgroundColor: "white", borderRadius: 10, alignItems: "center" },
  profileModalTitle: { fontSize: 20, marginBottom: 10 },
  // Modal container
  modalContainer: {
    width: '90%', // Responsive width
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Modal title
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  // Input fields
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  // Category dropdown container
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  // Buttons
  modbutton: {
    backgroundColor: '#007BFF', // Primary button color
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  modbuttonText: {
    color: '#FFF',
    fontSize: 16,
  },
  // Cancel button
  modcancelButton: {
    backgroundColor: '#6c757d', // Secondary button color
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  // Loading state for button
  disabledButton: {
    backgroundColor: '#ccc', // Disabled button color
  },
  // Create post button outside modal
  container: {
    width: "85%",
    paddingHorizontal: 0,
    marginVertical: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    padding: 3,
    paddingRight: 9,
    borderRadius: 5,
    // fontSize: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upvoteButton: {
    backgroundColor: '#FF4500', // Reddit orange
  },
  downvoteButton: {
    backgroundColor: '#7193FF', // Complementary blue
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 13,
  },
  karmaText: {
    marginHorizontal: 6,
    fontWeight: 'bold',
    fontSize: 16,
  },
   createButton: {
    backgroundColor: "#FF4500",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 80,
  },
  createButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  commentButton: {
    backgroundColor: '#ccc',
    padding: 3,
    borderRadius: 5,
flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  commentText: {
    color: '#333',
    fontSize: 13,
  },
   followerCount: { fontSize: 16, marginBottom: 10 },
  followButton: { backgroundColor: "#007bff", padding: 10, paddingHorizontal:25, borderRadius: 5, marginBottom: 10 },
  followButtonText: { color: "white",},
  cancelButton: { backgroundColor: "gray", padding: 10, borderRadius: 5 },
  cancelButtonText: { color: "white"},
  carouselIndicator: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center'
  },
  buttonShadow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  }
});

export default PostsPage;
