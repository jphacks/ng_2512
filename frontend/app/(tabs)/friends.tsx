import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import {
  getFriends,
  searchFriends,
  sendFriendRequest,
  respondToFriendRequest,
  User,
  FriendData,
} from "@/services/api-client";

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [friendData, setFriendData] = useState<FriendData>({
    friend: [],
    friend_requested: [],
    friend_recommended: [],
    friend_requesting: [],
    friend_blocked: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  // フレンドデータを取得する関数
  const fetchFriendData = async () => {
    try {
      const data = await getFriends();
      if (data) {
        setFriendData(data);
      } else {
        console.error("Failed to fetch friend data");
      }
    } catch (error) {
      console.error("Error fetching friend data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendData();
  }, []);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestTab, setRequestTab] = useState<"received" | "sent">("received");

  const textColor = Colors[colorScheme ?? "light"].text as string;
  const backgroundColor = Colors[colorScheme ?? "light"].background as string;

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: Colors.light.tint + "20" },
            ]}
          >
            <Text style={[styles.avatarText, { color: Colors.light.tint }]}>
              {item.display_name.charAt(0)}
            </Text>
          </View>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[styles.friendName, { color: textColor }]}>
            {item.display_name}
          </Text>
          <Text style={styles.username}>@{item.account_id}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.actionButton}>
        <IconSymbol name="bubble.left" size={16} color={Colors.light.tint} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: Colors.light.tint + "20" },
            ]}
          >
            <Text style={[styles.avatarText, { color: Colors.light.tint }]}>
              {item.display_name.charAt(0)}
            </Text>
          </View>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[styles.friendName, { color: textColor }]}>
            {item.display_name}
          </Text>
          <Text style={styles.username}>@{item.account_id}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.friendRequestButton,
          { backgroundColor: Colors.light.tint },
        ]}
        onPress={() => handleSendFriendRequest(item)}
      >
        <IconSymbol name="person.badge.plus" size={16} color="white" />
        <Text style={styles.friendRequestButtonText}>申請</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendRequest = ({ item }: { item: User }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: Colors.light.tint + "20" },
            ]}
          >
            <Text style={[styles.avatarText, { color: Colors.light.tint }]}>
              {item.display_name.charAt(0)}
            </Text>
          </View>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[styles.friendName, { color: textColor }]}>
            {item.display_name}
          </Text>
          <Text style={styles.username}>@{item.account_id}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: Colors.light.tint }]}
          onPress={() => handleFriendRequest(item.user_id, "accept")}
        >
          <IconSymbol name="checkmark" size={14} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleFriendRequest(item.user_id, "reject")}
        >
          <IconSymbol name="xmark" size={14} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleFriendRequest = async (
    userId: number,
    action: "accept" | "reject"
  ) => {
    try {
      const success = await respondToFriendRequest(userId, action);
      if (success) {
        Alert.alert(
          action === "accept" ? "フレンド申請承認" : "フレンド申請拒否",
          `${action === "accept" ? "承認" : "拒否"}しました`
        );

        // フレンドデータを再取得してUIを更新
        await fetchFriendData();
      } else {
        Alert.alert("エラー", "処理に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("Friend request response error:", error);
      Alert.alert("エラー", "処理に失敗しました。もう一度お試しください。");
    }
  };

  const handleSendFriendRequest = async (user: User) => {
    try {
      const success = await sendFriendRequest(user.user_id);
      if (success) {
        Alert.alert(
          "フレンド申請送信",
          `${user.display_name}さんにフレンド申請を送信しました`
        );
        // 検索結果から削除（既に申請済みとして扱う）
        setSearchResults((prev) =>
          prev.filter((u) => u.user_id !== user.user_id)
        );
      } else {
        Alert.alert("エラー", "フレンド申請の送信に失敗しました");
      }
    } catch (error) {
      console.error("Friend request error:", error);
      Alert.alert("エラー", "フレンド申請の送信に失敗しました");
    }
  };

  const handleSearch = async () => {
    console.log("handleSearch called with query:", searchQuery);
    if (searchQuery.trim()) {
      console.log("Starting search for:", searchQuery.trim());
      setSearchLoading(true);
      try {
        const results = await searchFriends(searchQuery.trim());
        console.log("Search results:", results);
        if (results) {
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search failed:", error);
        Alert.alert("エラー", "検索に失敗しました");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      console.log("Search query is empty");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: textColor }]}>フレンド</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowUserSearch(true)}
            >
              <IconSymbol name="magnifyingglass" size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.requestButton]}
              onPress={() => setShowFriendRequests(true)}
            >
              <IconSymbol name="person.2" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Friends List */}
      <FlatList
        data={friendData.friend}
        renderItem={renderFriend}
        keyExtractor={(item) => item.user_id.toString()}
        style={styles.friendsList}
        showsVerticalScrollIndicator={false}
      />

      {/* User Search Modal */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserSearch(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUserSearch(false)}
              >
                <IconSymbol name="xmark" size={18} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                ユーザー検索
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInput}>
              <IconSymbol name="magnifyingglass" size={16} color="#666" />
              <TextInput
                placeholder="ユーザーIDまたは名前で検索"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchTextInput}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[
                styles.searchButton,
                { backgroundColor: Colors.light.tint },
              ]}
              onPress={() => {
                console.log("Search button pressed");
                handleSearch();
              }}
            >
              <Text style={styles.searchButtonText}>検索</Text>
            </TouchableOpacity>
          </View>

          {/* Search Results or Recommended Friends */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {searchQuery.trim() ? "検索結果" : "おすすめのユーザー"}
            </Text>
            {searchLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: textColor }]}>
                  検索中...
                </Text>
              </View>
            ) : (
              <FlatList
                data={
                  searchQuery.trim()
                    ? searchResults
                    : friendData.friend_recommended
                }
                renderItem={
                  searchQuery.trim() ? renderSearchResult : renderFriend
                }
                keyExtractor={(item) => item.user_id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  searchQuery.trim() ? (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, { color: textColor }]}>
                        検索結果が見つかりませんでした
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Friend Requests Modal */}
      <Modal
        visible={showFriendRequests}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriendRequests(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFriendRequests(false)}
              >
                <IconSymbol name="xmark" size={18} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                フレンド申請
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                requestTab === "received" && styles.activeTab,
              ]}
              onPress={() => setRequestTab("received")}
            >
              <Text
                style={[
                  styles.tabText,
                  requestTab === "received" && styles.activeTabText,
                ]}
              >
                受信済み
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, requestTab === "sent" && styles.activeTab]}
              onPress={() => setRequestTab("sent")}
            >
              <Text
                style={[
                  styles.tabText,
                  requestTab === "sent" && styles.activeTabText,
                ]}
              >
                送信済み
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              requestTab === "received"
                ? friendData.friend_requested
                : friendData.friend_requesting
            }
            renderItem={renderFriendRequest}
            keyExtractor={(item) => item.user_id.toString()}
            style={styles.requestsList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsers}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBlockedUsers(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowBlockedUsers(false)}
              >
                <IconSymbol name="xmark" size={18} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                ブロック済みユーザー
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <FlatList
            data={friendData.friend_blocked}
            renderItem={renderFriend}
            keyExtractor={(item) => item.user_id.toString()}
            style={styles.blockedList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  requestButton: {
    backgroundColor: "#ad46ff",
  },
  friendsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  friendInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: "#666",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 36,
  },
  searchContainer: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#ad46ff",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#ad46ff",
    fontWeight: "600",
  },
  requestsList: {
    flex: 1,
  },
  blockedList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  friendRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  friendRequestButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
