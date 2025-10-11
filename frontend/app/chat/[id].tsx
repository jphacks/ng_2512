import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}

// モックメッセージデータ
const mockMessages: { [key: string]: Message[] } = {
  "1": [
    {
      id: "1",
      text: "こんにちは！映画の件、どうでしたか？",
      sender: "田中さん",
      timestamp: new Date("2025-10-11T14:30:00"),
      isOwn: false,
    },
    {
      id: "2",
      text: "新宿の映画館で14時からはどうですか？",
      sender: "田中さん",
      timestamp: new Date("2025-10-11T14:31:00"),
      isOwn: false,
    },
    {
      id: "3",
      text: "いいですね！参加します😊",
      sender: "あなた",
      timestamp: new Date("2025-10-11T14:32:00"),
      isOwn: true,
    },
  ],
  "2": [
    {
      id: "4",
      text: "みんな明日の14時で大丈夫？",
      sender: "佐藤さん",
      timestamp: new Date("2025-10-11T12:15:00"),
      isOwn: false,
    },
    {
      id: "5",
      text: "はい、大丈夫です！",
      sender: "あなた",
      timestamp: new Date("2025-10-11T12:16:00"),
      isOwn: true,
    },
  ],
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>(
    mockMessages[id || "1"] || []
  );
  const [inputText, setInputText] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const flatListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // チャット情報を取得（実際のアプリでは API から取得）
  const getChatInfo = () => {
    const chatMap: {
      [key: string]: {
        name: string;
        isOnline?: boolean;
        type: "individual" | "group";
      };
    } = {
      "1": { name: "田中さん", isOnline: true, type: "individual" },
      "2": { name: "週末映画グループ", type: "group" },
      "3": { name: "山田さん", isOnline: false, type: "individual" },
      "4": { name: "読書会メンバー", type: "group" },
      "5": { name: "佐藤さん", isOnline: true, type: "individual" },
    };
    return chatMap[id || "1"] || { name: "チャット", type: "individual" };
  };

  const chatInfo = getChatInfo();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // メッセージ追加時に最下部にスクロール
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        sender: "あなた",
        timestamp: new Date(),
        isOwn: true,
      };
      setMessages([...messages, newMessage]);
      setInputText("");

      // 新しいメッセージを送信後、最下部にスクロール
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const formatTime = (date: Date) => {
    return `${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showSender =
      index === 0 || messages[index - 1].sender !== item.sender;

    return (
      <View
        style={[
          styles.messageContainer,
          item.isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!item.isOwn && showSender && (
          <Text style={[styles.senderName, { color: colors.text }]}>
            {item.sender}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            item.isOwn
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: item.isOwn ? "#FFFFFF" : colors.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
        <Text style={[styles.messageTime, { color: colors.placeholder }]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#6A7282" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerContent}>
            <View
              style={[
                styles.headerAvatar,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text
                style={[styles.headerAvatarText, { color: colors.primary }]}
              >
                {chatInfo.name.charAt(0)}
              </Text>
              {chatInfo.type === "individual" &&
                chatInfo.isOnline !== undefined && (
                  <View
                    style={[
                      styles.headerOnlineIndicator,
                      {
                        backgroundColor: chatInfo.isOnline
                          ? colors.success
                          : colors.placeholder,
                      },
                    ]}
                  />
                )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerName, { color: "#1E2939" }]}>
                {chatInfo.name}
              </Text>
              {chatInfo.type === "individual" && (
                <Text style={[styles.headerStatus, { color: "#6A7282" }]}>
                  {chatInfo.isOnline ? "オンライン" : "オフライン"}
                </Text>
              )}
              {chatInfo.type === "group" && (
                <Text style={[styles.headerStatus, { color: "#6A7282" }]}>
                  グループチャット
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <IconSymbol name="ellipsis" size={20} color="#6A7282" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={[styles.inputWrapper, { backgroundColor: "#FFFFFF" }]}>
          <View style={[styles.inputRow, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを入力..."
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim()
                    ? colors.primary
                    : colors.placeholder,
                },
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <IconSymbol name="paperplane.fill" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerOnlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 12,
    opacity: 0.7,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
    opacity: 0.7,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "100%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
