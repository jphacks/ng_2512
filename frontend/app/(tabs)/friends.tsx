import React, { useState } from "react";
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

interface Friend {
  id: string;
  name: string;
  username: string;
  status: "online" | "offline" | "away";
  avatar?: string;
}

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  timestamp: Date;
  type: "received" | "sent";
  status: "pending" | "cancelled";
  avatar?: string;
}

// モックデータ
const mockFriends: Friend[] = [
  {
    id: "1",
    name: "田中さん",
    username: "@tanaka123",
    status: "online",
  },
  {
    id: "2",
    name: "佐藤さん",
    username: "@sato_san",
    status: "offline",
  },
  {
    id: "3",
    name: "山田さん",
    username: "@yamada_y",
    status: "away",
  },
  {
    id: "4",
    name: "鈴木さん",
    username: "@suzuki_s",
    status: "online",
  },
  {
    id: "5",
    name: "高橋さん",
    username: "@takahashi_t",
    status: "offline",
  },
  {
    id: "6",
    name: "伊藤さん",
    username: "@ito_i",
    status: "online",
  },
];

const mockFriendRequests: FriendRequest[] = [
  {
    id: "1",
    name: "斎藤次郎",
    username: "@saito_jiro",
    timestamp: new Date("2023-10-11T00:00:00"),
    type: "sent",
    status: "pending",
  },
  {
    id: "2",
    name: "松本太郎",
    username: "@matsumoto_taro",
    timestamp: new Date("2023-10-10T00:00:00"),
    type: "received",
    status: "pending",
  },
  {
    id: "3",
    name: "佐々木花子",
    username: "@sasaki_hanako",
    timestamp: new Date("2023-10-09T00:00:00"),
    type: "received",
    status: "pending",
  },
];

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestTab, setRequestTab] = useState<"received" | "sent">("received");

  const textColor = Colors[colorScheme ?? "light"].text as string;
  const backgroundColor = Colors[colorScheme ?? "light"].background as string;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "#00C950";
      case "offline":
        return "#99A1AF";
      case "away":
        return "#F0B100";
      default:
        return "#99A1AF";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "オンライン";
      case "offline":
        return "オフライン";
      case "away":
        return "離席中";
      default:
        return "オフライン";
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
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
              {item.name.charAt(0)}
            </Text>
          </View>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
        </View>
        <View style={styles.friendDetails}>
          <Text style={[styles.friendName, { color: textColor }]}>
            {item.name}
          </Text>
          <View style={styles.friendStatus}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.statusDot}>•</Text>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity style={styles.actionButton}>
          <IconSymbol name="message" size={16} color="#6A7282" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <IconSymbol name="phone" size={16} color="#6A7282" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleFriendRequest = (
    requestId: string,
    action: "accept" | "decline"
  ) => {
    Alert.alert(
      action === "accept" ? "フレンド申請を承認" : "フレンド申請を拒否",
      action === "accept"
        ? "この申請を承認しますか？"
        : "この申請を拒否しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: action === "accept" ? "承認" : "拒否",
          onPress: () => {
            Alert.alert(
              "完了",
              action === "accept"
                ? "フレンド申請を承認しました"
                : "フレンド申請を拒否しました"
            );
          },
        },
      ]
    );
  };

  const renderFriendRequest = (request: FriendRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <View
          style={[styles.avatar, { backgroundColor: Colors.light.tint + "20" }]}
        >
          <Text style={[styles.avatarText, { color: Colors.light.tint }]}>
            {request.name.charAt(0)}
          </Text>
        </View>
        <View style={styles.requestDetails}>
          <Text style={[styles.requestName, { color: textColor }]}>
            {request.name}
          </Text>
          <Text style={styles.requestUsername}>{request.username}</Text>
          <Text style={styles.requestTime}>365日前</Text>
        </View>
      </View>
      {request.type === "received" ? (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestButton, styles.declineButton]}
            onPress={() => handleFriendRequest(request.id, "decline")}
          >
            <IconSymbol name="xmark" size={16} color="#FB2C36" />
            <Text style={[styles.buttonText, { color: "#FB2C36" }]}>拒否</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => handleFriendRequest(request.id, "accept")}
          >
            <IconSymbol name="checkmark" size={16} color="#00C950" />
            <Text style={[styles.buttonText, { color: "#00C950" }]}>承認</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sentRequestActions}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>待機中</Text>
          </View>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const receivedRequests = mockFriendRequests.filter(
    (req) => req.type === "received"
  );
  const sentRequests = mockFriendRequests.filter((req) => req.type === "sent");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: "#1E2939" }]}>
              フレンド
            </Text>
            <Text style={[styles.headerSubtitle, { color: "#6A7282" }]}>
              フレンドとつながろう
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton}>
              <IconSymbol name="magnifyingglass" size={16} color="#6A7282" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowFriendRequests(true)}
            >
              <IconSymbol name="bell" size={16} color="#6A7282" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 機能ボタン */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.featureButton, styles.searchButton]}
            onPress={() => setShowUserSearch(true)}
          >
            <IconSymbol name="magnifyingglass" size={16} color="#fff" />
            <Text style={styles.buttonLabel}>ユーザー検索</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.featureButton, styles.friendRequestButton]}
            onPress={() => setShowFriendRequests(true)}
          >
            <IconSymbol name="bell" size={16} color="#fff" />
            <Text style={styles.buttonLabel}>申請管理</Text>
            <View style={styles.buttonBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.featureButton, styles.blockButton]}
            onPress={() => setShowBlockedUsers(true)}
          >
            <IconSymbol name="xmark.circle" size={16} color="#fff" />
            <Text style={styles.buttonLabel}>ブロック管理</Text>
          </TouchableOpacity>
        </View>

        {/* 統計 */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.light.tint }]}>
              10
            </Text>
            <Text style={styles.statLabel}>フレンド</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#00C950" }]}>4</Text>
            <Text style={styles.statLabel}>オンライン</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#FB2C36" }]}>2</Text>
            <Text style={styles.statLabel}>申請</Text>
          </View>
        </View>

        {/* フレンド一覧 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              フレンド一覧
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>10人</Text>
            </View>
          </View>
          <FlatList
            data={mockFriends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>もっと表示 (4人)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ユーザー検索モーダル */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowUserSearch(false)}
            >
              <IconSymbol name="xmark" size={16} color="#6A7282" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ユーザー検索</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ユーザー名で検索"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>ユーザーを検索してください</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* フレンド申請モーダル */}
      <Modal
        visible={showFriendRequests}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFriendRequests(false)}
            >
              <IconSymbol name="xmark" size={16} color="#6A7282" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>フレンド申請</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* タブ */}
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
              {receivedRequests.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {receivedRequests.length}
                  </Text>
                </View>
              )}
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
              {sentRequests.length > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: Colors.light.tint },
                  ]}
                >
                  <Text style={styles.tabBadgeText}>{sentRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.requestList}>
            {(requestTab === "received" ? receivedRequests : sentRequests).map(
              renderFriendRequest
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ブロック管理モーダル */}
      <Modal
        visible={showBlockedUsers}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBlockedUsers(false)}
            >
              <IconSymbol name="xmark" size={16} color="#6A7282" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ブロックユーザー管理</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>ブロック中のユーザーはいません</Text>
          </View>
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
    borderBottomColor: "#E9ECEF",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FB2C36",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
    marginBottom: 24,
  },
  featureButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    position: "relative",
  },
  searchButton: {
    backgroundColor: Colors.light.tint,
  },
  blockButton: {
    backgroundColor: "#FB2C36",
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  buttonBadge: {
    position: "absolute",
    top: -8,
    right: -4,
    backgroundColor: "#FB2C36",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#4A5565",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    backgroundColor: Colors.light.tint + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: "500",
  },
  friendCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E9ECEF",
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  friendStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  username: {
    fontSize: 14,
    color: "#6A7282",
  },
  statusDot: {
    fontSize: 14,
    color: "#6A7282",
  },
  statusText: {
    fontSize: 14,
    color: "#6A7282",
  },
  friendActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  separator: {
    height: 8,
  },
  showMoreButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
    marginTop: 16,
  },
  showMoreText: {
    color: "#1E2939",
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E2939",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchInput: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6A7282",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6A7282",
  },
  activeTabText: {
    color: "#1E2939",
  },
  tabBadge: {
    backgroundColor: "#FB2C36",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  requestList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requestDetails: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  requestUsername: {
    fontSize: 14,
    color: "#6A7282",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: "#99A1AF",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  requestButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  friendRequestButton: {
    backgroundColor: "#00C950",
  },
  declineButton: {
    backgroundColor: "#FFE6E6",
  },
  acceptButton: {
    backgroundColor: "#E6F9E6",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sentRequestActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  statusBadgeText: {
    color: "#A65F00",
    fontSize: 12,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#4A5565",
    fontSize: 14,
    fontWeight: "500",
  },
});
