import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiClient, withUserId, User } from "@/services/api-client";

interface CreateGroupProps {
  visible: boolean;
  onClose: () => void;
}

interface Friend {
  user_id: number;
  account_id: string;
  display_name: string;
  icon_asset_url?: string;
  isOnline: boolean;
}

export default function CreateGroupScreen({
  visible,
  onClose,
}: CreateGroupProps) {
  const [groupName, setGroupName] = useState("");
  const [member_ids, setMemberIds] = useState<number[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // フレンド一覧を取得
  const fetchFriends = async () => {
    try {
      const result = await withUserId(async (userId) => {
        return apiClient.get<any>("/api/friend", { user_id: userId });
      });

      if (result.data?.friend) {
        setFriends(result.data.friend);
      } else {
        console.error("Failed to fetch friends:", result.error);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchFriends();
    }
  }, [visible]);

  const filteredFriends = friends.filter(
    (friend) =>
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.account_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendUserId: number) => {
    setMemberIds((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("エラー", "グループ名を入力してください");
      return;
    }
    if (member_ids.length === 0) {
      Alert.alert("エラー", "少なくとも1人のメンバーを選択してください");
      return;
    }

    try {
      const result = await apiClient.post("/api/chat/groupe", {
        title: groupName.trim(),
        member_ids: member_ids.map((id) => id.toString()),
      });

      if (result.error) {
        Alert.alert("エラー", "グループの作成に失敗しました");
        return;
      }

      Alert.alert("成功", "グループが作成されました！", [
        {
          text: "OK",
          onPress: () => {
            onClose();
            setGroupName("");
            setMemberIds([]);
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("エラー", "グループの作成に失敗しました");
    }
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              グループ作成
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Name Input */}
          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="person.3" size={20} color={colors.primary} />{" "}
              グループ名
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="グループ名を入力"
              placeholderTextColor={colors.placeholder}
              maxLength={50}
            />
          </View>

          {/* Member Selection */}
          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="person.2" size={20} color={colors.accent} />{" "}
              メンバー選択 ({member_ids.length}人選択中)
            </Text>

            {/* Search */}
            <TextInput
              style={[
                styles.textInput,
                styles.searchInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="フレンドを検索..."
              placeholderTextColor={colors.placeholder}
            />

            {/* Friend List */}
            <View style={styles.friendsList}>
              {filteredFriends.map((friend) => {
                const isSelected = member_ids.includes(friend.user_id);
                return (
                  <TouchableOpacity
                    key={friend.user_id}
                    style={[
                      styles.friendItem,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                      isSelected && {
                        backgroundColor: colors.primary + "10",
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleFriendSelection(friend.user_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendInfo}>
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.avatarText}>
                          {friend.display_name.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.friendDetails}>
                        <Text
                          style={[styles.friendName, { color: colors.text }]}
                        >
                          {friend.display_name}
                        </Text>
                        <Text
                          style={[
                            styles.friendUsername,
                            { color: colors.placeholder },
                          ]}
                        >
                          @{friend.account_id}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected Friends Preview */}
          {member_ids.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={[styles.selectedTitle, { color: colors.text }]}>
                選択されたメンバー ({member_ids.length}人)
              </Text>
              <View style={styles.selectedFriends}>
                {member_ids.map((friendUserId) => {
                  const friend = friends.find(
                    (f: User) => f.user_id === friendUserId
                  );
                  if (!friend) return null;
                  return (
                    <View
                      key={friendUserId}
                      style={[
                        styles.selectedChip,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectedChipText,
                          { color: colors.primary },
                        ]}
                      >
                        {friend.display_name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleFriendSelection(friendUserId)}
                      >
                        <IconSymbol
                          name="xmark"
                          size={12}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor:
                  groupName.trim() && member_ids.length > 0
                    ? colors.primary
                    : colors.placeholder,
              },
            ]}
            onPress={createGroup}
            disabled={!groupName.trim() || member_ids.length === 0}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
            <Text style={styles.createButtonText}>グループを作成</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E2939",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 28,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: -0.2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    marginBottom: 16,
  },
  friendsList: {
    gap: 8,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    color: "#212529",
  },
  friendUsername: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSection: {
    marginTop: 24,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 12,
  },
  selectedFriends: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 14,
    color: "#1976d2",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  createButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
