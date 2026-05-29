import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator,  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Dimensions} from 'react-native';
import uuid from 'react-native-uuid';
import { useLocalSearchParams } from 'expo-router';
import { useShareUsernameStore, useRateLimitStore, usePioneerStore, useTierStore, useTierLimitsStore } from '@/store'; // Assuming store is correctly set up
import AWS from 'aws-sdk';
import { getTotalFetchCount, incrementFetchCount } from '@/lib/localDB'; 
import { dynamoDB } from '@/lib/modals';
import Entypo from '@expo/vector-icons/Entypo';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CustomAlertModal } from "@/components/modals" 
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';

const TABLE_NAME = 'DriverComments';
const generateShortUUID = () => {
  const fullUUID = uuid.v4();
  return fullUUID.split('-').slice(0, 2).join('-'); // Take first two segments
};


const PostDetailsPage = () => {

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
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  //
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
const { 
    votedComments, addVote, addVoteTimestamp, canVote, canComment, addCommentTimestamp
  } = useRateLimitStore();
const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});
const [parsedMediaUrls, setParsedMediaUrls] = useState([ ])
  const { tierLimits, setTierLimits } = useTierLimitsStore();
 const bottomSheetRef = useRef(null);
const { tierType, setTierType } = usePioneerStore();
  const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];

const [loading, setLoading] = useState(false);
  const { shareUsername } = useShareUsernameStore();
  const { postAuthor, postTitle, postContent, createdAt, currentKarma, postDate, authorAvatar, mediaUrls } = useLocalSearchParams();
 

useEffect(() => {
  if (typeof mediaUrls === "string") {
    try {
      const parsed = JSON.parse(mediaUrls);
      if (Array.isArray(parsed) && parsed.some(url => url.trim?.() !== "")) {
        setParsedMediaUrls(parsed);
      }
    } catch (e) {

      setParsedMediaUrls([]);
    }
  }
}, [mediaUrls]);
 
  // Convert createdAt and currentKarma to numbers (if not already)
  const numericCreatedAt = Number(createdAt);
  const numericCurrentKarma = Number(currentKarma);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [karma, setKarma] = useState(numericCurrentKarma);

  // Debug log the incoming parameters
  useEffect(() => {
    if (createdAt) {
      fetchComments();
    }
  }, [createdAt]);

 
// Fetch comments from DynamoDB
const fetchComments = async () => {
const totalFetches = await getTotalFetchCount("posts");
  if (totalFetches >= maxPostFetches) {
    Alert.alert('Limit Reached', 'No new comments for you.');
    return;
  }

  setLoading(true);
const postId = `${postAuthor}_${createdAt}`;
  const params = {
    TableName: 'DriverComments',
    Key: { postId },
    ProjectionExpression: 'comments' // Fetch only the comments field
  };

  try {

    const data = await dynamoDB.get(params).promise();
    
    const postComments = data.Item?.comments || [];

    setComments(postComments);
    await incrementFetchCount("posts"); // Track fetch count
   
 
  } catch (error) {

    Alert.alert('Weak Internet', 'Failed to load comments.');
  } finally {
    setLoading(false);
  }
};

  const handleVote = async (pos, type) => {
const postId = `${postAuthor}_${createdAt}`;    
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
    title: "Notice",
    message: t.alreadyVoted(type),
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
      return;
    }
 let newKarma = type === "upvote" ? Number(karma) + 1 : Number(karma) - 1;
    setKarma(newKarma);
    setKarma(newKarma);
   addVote(voteKey);
      addVoteTimestamp();
  
    const totalFetches = await getTotalFetchCount("posts");
        const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];
        
    if (totalFetches >= maxPostFetches) {
      return;}

    const params = {
        TableName: TABLE_NAME,
        Key: { communityPost: "communityPost", createdAt: Number(createdAt) }, // Ensure createdAt is a number
        UpdateExpression: "SET karma = if_not_exists(karma, :zero) + :inc",
        ExpressionAttributeValues: {
            ":inc": type === "upvote" ? 1 : -1,
            ":zero": 0 // Ensures karma exists
        },
        ReturnValues: "UPDATED_NEW",
    };

    try {
   //     await dynamoDB.update(params).promise();

    } catch (error) {

    }
};

const handleAddComment = async () => {
  const totalFetches = await getTotalFetchCount("posts");
  if (totalFetches >= maxPostFetches) {
    Alert.alert('Limit Reached', 'You cannot add comments due to your fetch limit.');
    return;
  }

  if (!canComment()) {
    Alert.alert('Limit Reached', 'Please wait an hour before attempting to comment again');
    return;
  }

  if (!newComment || !newComment.trim()) {
    Alert.alert('Oops,', 'Comment cannot be empty.');
    return;
  }

  const forbiddenPattern = /[<>$%]/;
  if (forbiddenPattern.test(newComment)) {
    Alert.alert('Uh-oh,', 'Comment contains invalid characters.');
    return;
  }

  if (comments.length >= 50) {
    Alert.alert('Limit Reached', 'This post has reached the max comment limit (50).');
    return;
  }

  const newCommentData = {
    author: shareUsername || "Anonymous",
    content: newComment,
    createdAt: Math.floor(Date.now() / 1000),
    karma: 0,
  };
   setComments([...comments, newCommentData]); // Update UI immediately
  try {

    const totalFetches = await getTotalFetchCount("posts");
        const { maxPostFetches, maxPostsPerHour } = tierLimits[tierType];
        
    if (totalFetches >= maxPostFetches) {
        addCommentTimestamp(); 
      return;}
const postId = `${postAuthor}_${createdAt}`;
    const params = {
      TableName: "DriverComments",
      Key: { postId },
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :emptyList), :newComment)",
      ExpressionAttributeValues: {
        ":newComment": [newCommentData], // List containing the new comment
        ":emptyList": [], // If the comments field doesn’t exist, initialize it as an empty list
      },
      ReturnValues: "UPDATED_NEW",
    };
    const result = await dynamoDB.update(params).promise();
    setNewComment('');
    addCommentTimestamp(); // Ensure the timestamp is updated
  } catch (error) {

    Alert.alert("Error", "Failed to add comment.");
  }
};

  const renderMedia = () => {
    if (!mediaUrls) return null
      console.log("mediaUrls", mediaUrls)
   if (!mediaUrls.length || mediaUrls.length < 1 ) { return null } ;
  if (mediaUrls.length === 1 && mediaUrls[0].trim() === ""){return null}
  const onScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentImageIndex(index);
  };
    const firstMedia = parsedMediaUrls[0];
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
          ) : (
            <WebView
              source={{ uri: getEmbeddableUrl(firstMedia) }}
              style={{ height: 400, borderRadius: 12 }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          ) 
        ) : (
          <View>
            <FlatList
              data={parsedMediaUrls}
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
            {parsedMediaUrls.length > 1 && (
              <View className="flex-row justify-center mt-2 space-x-1">
                {parsedMediaUrls.map((_, i) => (
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

const VoteButton = ({ type, onPress, disabled, isActive }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`p-2 rounded-lg flex-row items-center space-x-2 ${
      isActive ? 'bg-orange-100' : 'bg-gray-100'
    } ${disabled ? 'opacity-50' : ''}`}
  >
    {type === 'up' ? (
      <MaterialIcons 
        name={isActive ? "thumb-up" : "thumb-up-off-alt"} 
        size={20} 
        color={isActive ? "#f97316" : "#6b7280"} 
      />
    ) : (
      <MaterialIcons 
        name={isActive ? "thumb-down" : "thumb-down-off-alt"} 
        size={20} 
        color={isActive ? "#f97316" : "#6b7280"} 
      />
    )}
    <Text className={`font-JakartaMedium ${
      isActive ? 'text-orange-600' : 'text-gray-600'
    }`}>
      {type === 'up' ? "Vote" : "Downvote"}
    </Text>
  </TouchableOpacity>
);

const postId = `${postAuthor}_${createdAt}`;

return (
  <View className="flex-1 bg-white pt-7">
   <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      className="flex-1 bg-gray-50"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 pb-4">
          {/* Loading State */}
          {loading ? (
            <View className="flex-1 justify-center">
              <ActivityIndicator size="large" color="#f97316" />
            </View>
          ) : (
            <>
              {/* Main Content */}
              <FlatList
                data={comments}
                ListHeaderComponent={
                  <>
                    {/* Post Card */}
                    <View className="bg-white mx-4 mt-4 p-6 rounded-2xl shadow-sm shadow-black/10">
            <View className="flex-row items-center mb-4">
            {( !authorAvatar && 
              <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                <Text className="text-orange-500 font-JakartaBold text-sm">
                  {postAuthor[1]}
                </Text>
              </View> )}

            {( authorAvatar &&
            <Image
            source={{ uri: authorAvatar }}
            className="w-10 h-10 rounded-full mr-3"
          />)}
              <View>
                <Text className="font-JakartaBold text-gray-800">{postAuthor}</Text>
                <Text className="text-gray-500 text-xs font-JakartaMedium">
{createdAt
                ? new Date(createdAt * 1000).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Date Unknown"}{" "}
                </Text>
              </View>
            </View>

            <Text className="text-xl font-JakartaBold text-gray-900 mb-3">
              {postTitle}
            </Text>
            <Text className="text-gray-600 font-Jakarta leading-5">
              {postContent}
            </Text>
        {mediaUrls && renderMedia()}
            {/* Voting Controls */}
            <View className="flex-row items-center justify-between mt-6">
              <View className="flex-row items-center space-x-4">
                <VoteButton
                  type="up"
                onPress={() => handleVote(postId, 'upvote')}
                  disabled={!canVote() || votedComments.has(`upvote-${postId}`)}
                  isActive={votedComments.has(`upvote-${postId}`)}
                />
                
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="font-JakartaBold text-gray-800">{karma}</Text>
                </View>

                <VoteButton
                  type="down"
                onPress={() => handleVote(postId, 'downvote')}
                  disabled={!canVote() || votedComments.has(`downvote-${postId}`)}
                  isActive={votedComments.has(`downvote-${postId}`)}
                />
              </View>
            </View>
          </View>      
                    {/* Comments Header */}
                    <View className="px-4 mt-6 mb-4">
                      <Text className="text-lg font-JakartaBold text-gray-800">
                        Comments ({comments.length})
                      </Text>
                    </View>
                  </>
                }
                renderItem={({ item }) => (
                  <View className="bg-white mx-4 mb-3 p-4 rounded-xl shadow-sm shadow-black/10">
                    <View className="flex-row items-center mb-2">
                      <View className="w-6 h-6 bg-teal-200 rounded-full items-center justify-center mr-2">
                        <Text className="text-teal-900 text-xs font-JakartaBold">
                          {item.author[1]}
                        </Text>
                      </View>
                      <Text className="font-JakartaSemiBold ">
                        {item.author}
                      </Text>
                    </View>
                    <Text className="text-gray-600 font-Jakarta mb-2">
                      {item.content}
                    </Text>
                    <Text className="text-gray-400 text-xs font-JakartaMedium">
                      {new Date(item.createdAt * 1000).toLocaleDateString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}
                keyExtractor={(item) => `${item.createdAt}-${item.author}`}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              />

              {/* Fixed Comment Input */}
              <View className="bg-white pt-4 px-4 border-t border-gray-100 absolute bottom-0 w-full">
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2">
                  <TextInput
                    className="flex-1 font-Jakarta text-gray-800"
                    placeholder="Add a comment..."
                    placeholderTextColor="#9ca3af"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity 
                    onPress={handleAddComment}
                    disabled={!canComment()}
                    className={`ml-2 px-4 py-2 rounded-lg ${
                      canComment() ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <Text className="text-white font-JakartaMedium">
                      {canComment() ? "Send" : "Limit Reached"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </View>
);

}

export default PostDetailsPage;

const styles = StyleSheet.create({
 container: {
    paddingBottom: 80 // Space for fixed comment input
  },
  commentInput: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  postContainer: { marginTop:5, marginBottom: 10, padding: 10, paddingBottom:20, backgroundColor: '#ededed', borderRadius: 10 },
  postTitle: { fontSize: 22, marginBottom: 5 },
  postContent: { fontSize: 16, marginBottom: 10 },
  postKarma: { fontSize: 14, color: '#777', marginRight: 10 },
  karmaButtons: { flexDirection: 'row', marginTop: 5, alignItems: 'center' },
  voteButton: {
    marginRight: 10,
    padding: 2,
    paddingRight: 15,
    backgroundColor: '#000',
    borderRadius: 5,
    width: '35%',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
     opacity: 1,
  },
  voteText: { fontSize: 16, color: '#fff' },
  commentsContainer: { flex: 1, backgroundColor: '#ececec' },
  commentsTitle: { fontSize: 20, marginBottom: 5, marginLeft: 15 },
  commentItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  commentContent: { fontSize: 16 },
  commentTimestamp: { fontSize: 12, color: '#777' },
  // inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 8, marginRight: 8 },
    listContent: {
    paddingBottom: 80 // Space for input field
  },
  inputRow: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 5 },
  sendButton: { padding: 12, backgroundColor: '#007AFF', borderRadius: 5, marginLeft: 7 },
  sendButtonText: { color: '#fff',},
   disabledButton: {
    opacity: 0.5,
    backgroundColor: '#cccccc',
  },
  limitText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  }
});
