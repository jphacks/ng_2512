import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import CreateGroupScreen from "../chat/create-group";
import { apiClient, withUserId, ChatGroup } from "@/services/api-client";

export default function ChatScreen() {
  const [chatRooms, setChatRooms] = useState<ChatGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // チャットルーム一覧を取得する関数
  const fetchChatRooms = async () => {
    try {
      const result = await withUserId(async (userId) => {
        return apiClient.get<ChatGroup[]>("/api/chat", { user_id: userId });
      });

      if (result.data) {
        setChatRooms(result.data);
      } else {
        console.error("Failed to fetch chat rooms:", result.error);
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatRooms();

    // エントランスアニメーション
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChatRooms().finally(() => {
      setRefreshing(false);
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInDays === 1) {
      return "昨日";
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else {
      return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredChatRooms = chatRooms.filter(
    (room) =>
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedChatRooms = [...filteredChatRooms].sort((a, b) => {
    return (
      new Date(b.last_message_date).getTime() -
      new Date(a.last_message_date).getTime()
    );
  });

  const renderChatRoom = ({
    item,
    index,
  }: {
    item: ChatGroup;
    index: number;
  }) => {
    const isUnread = item.new_chat_num > 0;

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.chatRoomCard,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: "/chat/[id]",
              params: { id: item.chat_groupe_id.toString() },
            })
          }
        >
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: Colors.light.tint + "20" },
              ]}
            >
              <Text style={[styles.avatarText, { color: Colors.light.tint }]}>
                {item.title.charAt(0)}
              </Text>
            </View>
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text
                style={[
                  styles.chatName,
                  { color: colors.text },
                  isUnread && styles.unreadChatName,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  { color: colors.textSecondary },
                  isUnread && { color: Colors.light.tint },
                ]}
              >
                {formatTime(item.last_message_date)}
              </Text>
            </View>
            <View style={styles.messageContainer}>
              <Text
                style={[
                  styles.lastMessage,
                  { color: colors.textSecondary },
                  isUnread && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.last_message}
              </Text>
              {item.new_chat_num > 0 && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: Colors.light.tint },
                  ]}
                >
                  <Text style={styles.unreadCount}>
                    {item.new_chat_num > 99 ? "99+" : item.new_chat_num}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>チャット</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateGroup(true)}
        >
          <IconSymbol name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <IconSymbol
            name="magnifyingglass"
            size={16}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="チャットを検索"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol
                name="xmark.circle.fill"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={sortedChatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.chat_groupe_id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.chatList}
      />

      {/* Create Group Modal */}
      <CreateGroupScreen
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ad46ff",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  chatList: {
    flex: 1,
  },
  chatRoomCard: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  unreadChatName: {
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: "500",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
