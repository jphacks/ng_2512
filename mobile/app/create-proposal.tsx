import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const { width: screenWidth } = Dimensions.get("window");

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

// モックフレンドデータ
const mockFriends: Friend[] = [
  { id: "1", name: "田中太郎" },
  { id: "2", name: "佐藤花子" },
  { id: "3", name: "鈴木一郎" },
  { id: "4", name: "山田美香" },
  { id: "5", name: "高橋健太" },
  { id: "6", name: "渡辺さくら" },
];

export default function CreateProposalScreen() {
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const filteredFriends = mockFriends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = () => {
    if (
      !title.trim() ||
      !datetime.trim() ||
      !location.trim() ||
      selectedFriends.length === 0
    ) {
      Alert.alert("エラー", "すべての項目を入力してください。");
      return;
    }

    Alert.alert("成功", "提案が作成されました！", [
      {
        text: "OK",
        onPress: () => {
          // ここで実際の作成処理を行う
          router.back(); // 前の画面に戻る
        },
      },
    ]);
  };

  const handleAIGenerate = () => {
    // AI生成のモック実装
    setTitle("おしゃれなカフェでまったり時間");
    setDatetime("2025年10月20日 14:00");
    setLocation("表参道カフェ街");
    setSelectedFriends(["1", "2"]); // 最初の2人を自動選択
    Alert.alert("AI生成完了", "AIがあなたの好みに合わせて提案を生成しました！");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surfaceSecondary }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          提案を作成
        </Text>
        <TouchableOpacity style={styles.aiButton} onPress={handleAIGenerate}>
          <IconSymbol name="wand.and.stars" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="pencil" size={20} color={colors.primary} />{" "}
              タイトル
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
              value={title}
              onChangeText={setTitle}
              placeholder="例: 新宿でカフェ巡り"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="calendar" size={20} color={colors.accent} />{" "}
              日時候補
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
              value={datetime}
              onChangeText={setDatetime}
              placeholder="例: 10月15日 14:00〜"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="location" size={20} color={colors.secondary} />{" "}
              場所
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
              value={location}
              onChangeText={setLocation}
              placeholder="例: 新宿駅周辺"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={[
              styles.section,
              styles.formCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <IconSymbol name="person.2" size={20} color={colors.warning} />{" "}
              参加者を選択
            </Text>
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
            <View style={styles.friendsList}>
              {filteredFriends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleFriendSelection(friend.id)}
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
                        {friend.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.friendName, { color: colors.text }]}>
                      {friend.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selectedFriends.includes(friend.id)
                          ? colors.primary
                          : colors.border,
                      },
                      selectedFriends.includes(friend.id) && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    {selectedFriends.includes(friend.id) && (
                      <IconSymbol name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {selectedFriends.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              選択された参加者 ({selectedFriends.length}人)
            </Text>
            <View style={styles.selectedFriends}>
              {selectedFriends.map((friendId) => {
                const friend = mockFriends.find((f) => f.id === friendId);
                return (
                  <View key={friendId} style={styles.selectedFriend}>
                    <Text style={styles.selectedFriendName}>
                      {friend?.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleFriendSelection(friendId)}
                    >
                      <IconSymbol name="xmark" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
          <Text style={styles.createButtonText}>提案を作成</Text>
        </TouchableOpacity>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  aiButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  friendName: {
    fontSize: 16,
    color: "#212529",
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
  checkboxSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
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
  selectedFriend: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedFriendName: {
    fontSize: 14,
    color: "#1976d2",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
