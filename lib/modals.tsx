import { Link, Stack } from "expo-router";
import React, { useState, useEffect }  from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, FlatList} from 'react-native';
import { useRouter } from 'expo-router';
import uuid from 'react-native-uuid';
import auth from '@react-native-firebase/auth';
import { Picker } from "@react-native-picker/picker";

/** * Refill Credit Modal
 * Motivates/informs the driver to refill credit by highlighting the value of services offered.
 */
export const RefillCreditModal = ({ visible, onRefillPress }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Refill Credit Required</Text>
          <Text style={styles.modalMessage}>
            To continue enjoying our premium features such as community posts, road tips, and real-time radar control, please refill your credit. This helps us maintain a high-quality service for everyone.
          </Text>
          <TouchableOpacity onPress={onRefillPress} style={styles.button}>
            <Text style={styles.buttonText}>Refill Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Suspension Modal
 * Informs the driver that their account has been suspended.
 * Optionally, routes to an authentication form to resolve issues.
 */
export const SuspensionModal = ({ visible }) => {
  const router = useRouter();
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Account Suspended</Text>
          <Text style={styles.modalMessage}>
            Your account has been suspended until further notice. If you believe this is a mistake, please reach out to our support team.
          </Text>
          {/* Option to route to a support/authentication form */}
          <Link href="https://t.me/sharedriverssupport" style={styles.link}>
            <Text style={styles.linkText}>Contact Support</Text>
          </Link>
          {/* Alternatively, you can remove the button to lock the user out entirely. */}
        </View>
      </View>
    </Modal>
  );
};

/**
 * Update App Modal
 * Forces the user to update the app by displaying a non-dismissible message.
 */
export const UpdateAppModal = ({ visible }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Required</Text>
          <Text style={styles.modalMessage}>
            A new version of the app is available. Please update now to continue using the service.
          </Text>
          {/* No dismiss button provided to enforce the update */}
        </View>
      </View>
    </Modal>
  );
};


const CreatePostModal = ({ visible, onClose, onPostCreated }) => {
  const user = auth().currentUser;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(''); // Added to prevent Picker crash
  const [loading, setLoading] = useState(false); 

  const categories = ["General", "Traffic Jam", "Road Closed", "Alerts"]; // Mock categories

  // Basic validation: disallow certain characters
  const validateText = (text) => {
    const forbiddenPattern = /[<>$%]/;
    return text && !forbiddenPattern.test(text);
  };

  const handleCreatePost = async () => {
    if (!title || !content) {
      Alert.alert('Whoops', 'Title and content cannot be empty.');
      return;
    }
    if (title.trim() === '' || content.trim() === '') {
      Alert.alert('Whoops', 'Title and content cannot be empty.');
      return;
    }
    if (title.length > 100) {
      Alert.alert('Whoops', 'Title exceeds maximum length of 100 characters.');
      return;
    }
    if (content.length > 300) {
      Alert.alert('Whoops', 'Content exceeds maximum length of 300 characters.');
      return;
    }
    if (!validateText(title) || !validateText(content)) {
      Alert.alert('Whoops', 'Title or content contains invalid characters.');
      return;
    }

    setLoading(true); 

    const postId = uuid.v4();
    const createdAt = Math.floor(Date.now() / 1000);
    const randomDigits = Math.floor(Math.random() * 9000) + 1000;
    const author = `@${user?.displayName || 'Anonymous'}${randomDigits}`;

    const newPost = {
      postId,
      createdAt,
      author,
      title,
      content,
      category,
      karma: 0,
      comments: 0,
    };

    try {
      // MOCK: Simulate network delay instead of saving to DynamoDB
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("MOCK: Post created successfully", newPost);
      
      Alert.alert('Success', 'Post created successfully.');

      // Reset input fields
      setTitle('');
      setContent('');
      setCategory('');

      // Ensure UI updates properly
      if (onPostCreated) onPostCreated();

      // Close modal only after all state updates
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 200); 

    } catch (error) {
      Alert.alert('Error', 'Failed to create post.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>Create a Post</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={modalStyles.input}
            placeholder="Write something..."
            value={content}
            onChangeText={setContent}
            multiline
          />
         {/* Category Dropdown */}
          <Text style={{ marginBottom: 5 }}>Select Category:</Text>
          <View style={{ borderWidth: 1, borderRadius: 5, marginBottom: 10 }}>
            <Picker selectedValue={category} onValueChange={(itemValue) => setCategory(itemValue)}>
              <Picker.Item label="Select a category:" value="" />
              {categories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
          
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity style={modalStyles.button} onPress={handleCreatePost} disabled={loading}>
              <Text style={modalStyles.buttonText}>{loading ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={onClose}>
              <Text style={modalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CommentsModal = ({ visible, onClose, postId }) => {
  const user = auth().currentUser;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Fetch comments - MOCKED
  const fetchComments = async () => {
    try {
      console.log("MOCK: Fetching comments for postId:", postId);
      // Simulating database response with a dummy comment
      setComments([{
        postId,
        commentId: 'mock-comment-1',
        author: '@ShareCommunity007',
        content: 'This is a mocked comment! Everything is working visually.',
        createdAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load comments.');
    }
  };

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
  }, [visible, postId]); 

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }

    const forbiddenPattern = /[<>$%]/;
    if (forbiddenPattern.test(newComment)) {
      Alert.alert('Error', 'Comment contains invalid characters.');
      return;
    }

    const commentId = uuid.v4(); 
    const createdAt = Math.floor(Date.now() / 1000);
    const randomDigits = Math.floor(Math.random() * 9000) + 1000;
    const author = `@${user?.displayName || 'Anonymous'}${randomDigits}`;

    const addedComment = {
      postId,
      commentId,
      author,
      content: newComment,
      createdAt,
    };

    try {
      // MOCK: Bypass DynamoDB entirely and just push to local React state
      console.log("MOCK: Comment submitted successfully", addedComment);
      
      setComments([addedComment, ...comments]);
      setNewComment('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>Comments</Text>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.commentId}
            renderItem={({ item }) => (
              <View style={localStyles.commentItem}>
                <Text style={localStyles.commentAuthor}>{item.author}</Text>
                <Text style={localStyles.commentContent}>{item.content}</Text>
                <Text style={localStyles.commentTimestamp}>
                  {new Date(item.createdAt * 1000).toLocaleString()}
                </Text>
              </View>
            )}
          />

          <View style={localStyles.inputRow}>
            <TextInput
              style={[modalStyles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity style={localStyles.sendButton} onPress={handleAddComment}>
              <Text style={localStyles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton, { marginTop: 15 }]} onPress={onClose}>
            <Text style={modalStyles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export { CreatePostModal, CommentsModal };

const modalStyles = StyleSheet.create({
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#FF4500',
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0F52BA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  linkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

// Added to prevent crashing from missing styles in snippet
const localStyles = StyleSheet.create({
  commentItem: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  commentContent: {
    color: '#555',
    marginBottom: 5,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  sendButton: {
    backgroundColor: '#0F52BA',
    padding: 10,
    borderRadius: 5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});