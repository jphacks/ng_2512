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

interface ChatRoom {
  id: string;
  name: string;
  type: "individual" | "group";
  participants: string[];
  lastMessage: {
    text: string;
    sender: string;
    timestamp: Date;
    isRead: boolean;
  };
  unreadCount: number;
  isOnline?: boolean;
  avatar?: string;
}

// モックデータ
const mockChatRooms: ChatRoom[] = [
  {
    id: "1",
    name: "田中さん",
    type: "individual",
    participants: ["田中さん"],
    lastMessage: {
      text: "映画の件、どうでしたか？",
      sender: "田中さん",
      timestamp: new Date("2025-10-11T14:30:00"),
      isRead: false,
    },
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "2",
    name: "週末映画グループ",
    type: "group",
    participants: ["田中さん", "佐藤さん", "鈴木さん"],
    lastMessage: {
      text: "みんな明日の14時で大丈夫？",
      sender: "佐藤さん",
      timestamp: new Date("2025-10-11T12:15:00"),
      isRead: true,
    },
    unreadCount: 0,
    isOnline: undefined,
  },
  {
    id: "3",
    name: "山田さん",
    type: "individual",
    participants: ["山田さん"],
    lastMessage: {
      text: "お疲れ様でした！",
      sender: "あなた",
      timestamp: new Date("2025-10-10T18:45:00"),
      isRead: true,
    },
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "4",
    name: "読書会メンバー",
    type: "group",
    participants: ["高橋さん", "伊藤さん", "松本さん"],
    lastMessage: {
      text: "次回の本はこれにしましょう📖",
      sender: "高橋さん",
      timestamp: new Date("2025-10-09T20:30:00"),
      isRead: false,
    },
    unreadCount: 1,
    isOnline: undefined,
  },
  {
    id: "5",
    name: "佐藤さん",
    type: "individual",
    participants: ["佐藤さん"],
    lastMessage: {
      text: "ありがとうございました😊",
      sender: "佐藤さん",
      timestamp: new Date("2025-10-09T16:20:00"),
      isRead: true,
    },
    unreadCount: 0,
    isOnline: true,
  },
];

export default function ChatScreen() {
  const [chatRooms, setChatRooms] = useState(mockChatRooms);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    // エントランスアニメーション
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // モックリフレッシュ
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${date.getHours()}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    } else if (diffInHours < 24 * 7) {
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      return `${weekdays[date.getDay()]}曜日`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const filteredChatRooms = chatRooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatRoom = ({
    item,
    index,
  }: {
    item: ChatRoom;
    index: number;
  }) => {
    const isUnread = item.unreadCount > 0;

    return (
      <Animated.View
        style={[
          styles.chatRoomCard,
          { backgroundColor: colors.surface, opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.chatRoomTouchable}
          activeOpacity={0.7}
          onPress={() => {
            router.push({
              pathname: "/chat/[id]",
              params: { id: item.id },
            });
          }}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.type === "individual" ? (
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.name.charAt(0)}
                </Text>
                {item.isOnline !== undefined && (
                  <View
                    style={[
                      styles.onlineIndicator,
                      {
                        backgroundColor: item.isOnline
                          ? colors.success
                          : colors.placeholder,
                      },
                    ]}
                  />
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <IconSymbol
                  name="person.2.fill"
                  size={20}
                  color={colors.accent}
                />
              </View>
            )}
          </View>

          {/* Chat Info */}
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
                {item.name}
              </Text>
              <Text style={[styles.timestamp, { color: colors.placeholder }]}>
                {formatTime(item.lastMessage.timestamp)}
              </Text>
            </View>

            <View style={styles.messagePreview}>
              <Text
                style={[
                  styles.lastMessage,
                  { color: colors.icon },
                  isUnread && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.lastMessage.sender === "あなた" ? "あなた: " : ""}
                {item.lastMessage.text}
              </Text>
              {item.unreadCount > 0 && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Group participants preview */}
            {item.type === "group" && (
              <Text
                style={[
                  styles.participantsPreview,
                  { color: colors.placeholder },
                ]}
                numberOfLines={1}
              >
                {item.participants.join(", ")}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const totalUnreadCount = chatRooms.reduce(
    (sum, room) => sum + room.unreadCount,
    0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: "#1E2939" }]}>
              チャット
            </Text>
            <Text style={[styles.headerSubtitle, { color: "#6A7282" }]}>
              メッセージをチェック
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.headerIconButton,
                { backgroundColor: Colors.light.tint, marginRight: 8 },
              ]}
              onPress={() => {
                router.push("/chat/create-group");
              }}
            >
              <IconSymbol name="plus.circle" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton}>
              <IconSymbol name="square.and.pencil" size={16} color="#6A7282" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton}>
              <IconSymbol name="ellipsis" size={16} color="#6A7282" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <IconSymbol
            name="magnifyingglass"
            size={16}
            color={colors.placeholder}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="チャットを検索"
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol
                name="xmark.circle.fill"
                size={16}
                color={colors.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat Rooms List */}
      <View style={styles.chatListContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: "#1E2939" }]}>
            チャット一覧
          </Text>
          {totalUnreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={[styles.countText, { color: "#FF6B6B" }]}>
                {totalUnreadCount}件の未読
              </Text>
            </View>
          )}
        </View>

        <FlatList
          data={filteredChatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
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
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  chatListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  countText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 20,
  },
  chatRoomCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chatRoomTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  unreadChatName: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  messagePreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    opacity: 0.8,
  },
  unreadMessage: {
    fontWeight: "500",
    opacity: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  participantsPreview: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
  separator: {
    height: 8,
  },
});
