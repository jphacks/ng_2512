import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Friend {
  id: string;
  name: string;
  username: string;
  isOnline: boolean;
}

// モックフレンドデータ
const mockFriends: Friend[] = [
  { id: "1", name: "田中さん", username: "@tanaka123", isOnline: true },
  { id: "2", name: "佐藤さん", username: "@sato_san", isOnline: false },
  { id: "3", name: "山田さん", username: "@yamada_y", isOnline: false },
  { id: "4", name: "鈴木さん", username: "@suzuki_s", isOnline: true },
  { id: "5", name: "高橋さん", username: "@takahashi_t", isOnline: false },
  { id: "6", name: "伊藤さん", username: "@ito_i", isOnline: true },
];

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const filteredFriends = mockFriends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("エラー", "グループ名を入力してください");
      return;
    }
    if (selectedFriends.length === 0) {
      Alert.alert("エラー", "少なくとも1人のメンバーを選択してください");
      return;
    }

    // グループ作成のロジック（実際のアプリでは API コール）
    Alert.alert("成功", "グループが作成されました！", [
      {
        text: "OK",
        onPress: () => router.back(),
      },
    ]);
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.friendCard,
          { backgroundColor: colors.surface },
          isSelected && {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary,
            borderWidth: 2,
          },
        ]}
        onPress={() => toggleFriendSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.friendInfo}>
          <View
            style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.name.charAt(0)}
            </Text>
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
          </View>
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text
              style={[styles.friendUsername, { color: colors.placeholder }]}
            >
              {item.username}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.placeholder },
            isSelected && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          {isSelected && (
            <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
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
        <Text style={[styles.headerTitle, { color: "#1E2939" }]}>
          グループ作成
        </Text>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor:
                groupName.trim() && selectedFriends.length > 0
                  ? colors.primary
                  : colors.placeholder,
            },
          ]}
          onPress={createGroup}
          disabled={!groupName.trim() || selectedFriends.length === 0}
        >
          <Text style={styles.createButtonText}>作成</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Group Name Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            グループ名
          </Text>
          <View
            style={[styles.inputContainer, { backgroundColor: colors.surface }]}
          >
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="グループ名を入力"
              placeholderTextColor={colors.placeholder}
              maxLength={50}
            />
          </View>
        </View>

        {/* Selected Members Count */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            メンバー選択 ({selectedFriends.length}人選択中)
          </Text>

          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <IconSymbol
              name="magnifyingglass"
              size={16}
              color={colors.placeholder}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="フレンドを検索"
              placeholderTextColor={colors.placeholder}
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

        {/* Selected Friends Preview */}
        {selectedFriends.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={[styles.selectedTitle, { color: colors.text }]}>
              選択中のメンバー
            </Text>
            <View style={styles.selectedFriends}>
              {selectedFriends.map((friendId) => {
                const friend = mockFriends.find((f) => f.id === friendId);
                if (!friend) return null;
                return (
                  <View
                    key={friendId}
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
                      {friend.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleFriendSelection(friendId)}
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

        {/* Friends List */}
        <View style={styles.friendsList}>
          <FlatList
            data={filteredFriends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  selectedSection: {
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  selectedFriends: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  friendsList: {
    flex: 1,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 12,
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 8,
  },
});
