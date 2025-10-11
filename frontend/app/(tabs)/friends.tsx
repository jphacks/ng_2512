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
  apiClient,
  withUserId,
  FriendData as ApiFriendData,
  User,
} from "@/services/api-client";

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [friendData, setFriendData] = useState<ApiFriendData>({
    friend: [],
    friend_requested: [],
    friend_recommended: [],
    friend_requesting: [],
    friend_blocked: [],
  });
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  // フレンドデータを取得する関数
  const fetchFriendData = async () => {
    try {
      const result = await withUserId(async (userId) => {
        return apiClient.get<ApiFriendData>("/api/friend", { user_id: userId });
      });

      if (result.data) {
        setFriendData(result.data);
      } else {
        console.error("Failed to fetch friend data:", result.error);
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

  const handleFriendRequest = (userId: number, action: "accept" | "reject") => {
    // API呼び出し処理をここに実装
    Alert.alert(
      action === "accept" ? "フレンド申請承認" : "フレンド申請拒否",
      `${action === "accept" ? "承認" : "拒否"}しました`
    );
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // API呼び出し処理をここに実装
      Alert.alert("検索", `"${searchQuery}" で検索しました`);
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
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>検索</Text>
            </TouchableOpacity>
          </View>

          {/* Recommended Friends */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              おすすめのユーザー
            </Text>
            <FlatList
              data={friendData.friend_recommended}
              renderItem={renderFriend}
              keyExtractor={(item) => item.user_id.toString()}
              showsVerticalScrollIndicator={false}
            />
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
});
