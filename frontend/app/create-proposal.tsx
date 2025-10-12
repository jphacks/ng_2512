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
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserId } from "@/hooks/use-user-id";
import {
  apiClient,
  withUserId,
  User,
  generateAIProposal,
  AIProposalData,
} from "@/services/api-client";

const { width: screenWidth } = Dimensions.get("window");

interface CreateProposalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateProposalScreen({
  visible,
  onClose,
}: CreateProposalProps) {
  const { userId } = useUserId();
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const [participant_ids, setParticipantIds] = useState<number[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // 日付フォーマット用のヘルパー関数
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  // 日付表示用のヘルパー関数
  const formatDisplayDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

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

  const filteredFriends = friends.filter((friend: User) =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendUserId: number) => {
    setParticipantIds((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim() || !location.trim() || participant_ids.length === 0) {
      Alert.alert("エラー", "すべての項目を入力してください。");
      return;
    }

    if (!userId) {
      Alert.alert("エラー", "ユーザーIDが取得できません。");
      return;
    }

    try {
      // 自身のuser_idを含めたparticipant_idsを作成
      const allParticipantIds = [...participant_ids, userId];

      console.log("提案作成リクエスト:", {
        user_id: userId,
        title: title.trim(),
        event_date: formatDate(selectedDate),
        location: location.trim(),
        participant_ids: allParticipantIds.map((id) => id.toString()),
      });

      const result = await apiClient.post("/api/proposal", {
        user_id: userId,
        title: title.trim(),
        event_date: formatDate(selectedDate),
        location: location.trim(),
        participant_ids: allParticipantIds.map((id) => id.toString()),
      });

      console.log("提案作成レスポンス:", result);

      if (result.error) {
        console.error("提案作成エラー:", result.error);
        Alert.alert("エラー", "提案の作成に失敗しました");
        return;
      }

      Alert.alert("成功", "提案が作成されました！", [
        {
          text: "OK",
          onPress: () => {
            setTitle("");
            setSelectedDate(new Date());
            setLocation("");
            setParticipantIds([]);
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating proposal:", error);
      Alert.alert("エラー", "提案の作成に失敗しました");
    }
  };

  const closeModal = () => {
    onClose();
  };

  const handleAIGenerate = async () => {
    if (!userId) {
      Alert.alert("エラー", "ユーザーIDが取得できません。");
      return;
    }

    try {
      console.log("AI生成リクエスト開始:", { user_id: userId });

      const aiData = await generateAIProposal();

      if (aiData) {
        console.log("AI生成成功:", aiData);
        setTitle(aiData.title);

        // event_dateをDateオブジェクトに変換
        try {
          const eventDate = new Date(aiData.event_date);
          setSelectedDate(eventDate);
        } catch (error) {
          console.error("日付の解析に失敗:", error);
          // デフォルトで現在時刻を設定
          setSelectedDate(new Date());
        }

        setLocation(aiData.location);

        // participant_idsを数値配列に変換し、自身のuser_idを含める
        const participantIds = aiData.participant_ids.map((id: string) =>
          parseInt(id, 10)
        );
        // 自身のuser_idが含まれていない場合は追加
        if (!participantIds.includes(userId)) {
          participantIds.push(userId);
        }
        setParticipantIds(participantIds);

        Alert.alert(
          "AI生成完了",
          "AIがあなたの好みに合わせて提案を生成しました！"
        );
      } else {
        console.error("AI生成失敗: データが空");
        Alert.alert("エラー", "AI生成に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("AI生成エラー:", error);
      Alert.alert("エラー", "AI生成に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModal}
    >
      <SafeAreaView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              提案を作成
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* AI Generate Button */}
        <View style={styles.aiGenerateContainer}>
          <TouchableOpacity
            style={[
              styles.aiGenerateButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleAIGenerate}
          >
            <IconSymbol name="wand.and.stars" size={20} color="#fff" />
            <Text style={styles.aiGenerateText}>AIで提案を生成</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          showsVerticalScrollIndicator={false}
        >
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
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <IconSymbol name="calendar" size={16} color={colors.text} />
                <Text style={[styles.datePickerText, { color: colors.text }]}>
                  {formatDisplayDate(selectedDate)}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.section,
                styles.formCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <IconSymbol
                  name="location"
                  size={20}
                  color={colors.secondary}
                />{" "}
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
                {filteredFriends.map((friend: User) => (
                  <TouchableOpacity
                    key={friend.user_id}
                    style={[
                      styles.friendItem,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
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
                      <Text style={[styles.friendName, { color: colors.text }]}>
                        {friend.display_name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: participant_ids.includes(friend.user_id)
                            ? colors.primary
                            : colors.border,
                        },
                        participant_ids.includes(friend.user_id) && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                    >
                      {participant_ids.includes(friend.user_id) && (
                        <IconSymbol name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          {participant_ids.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedTitle}>
                選択された参加者 ({participant_ids.length}人)
              </Text>
              <View style={styles.selectedFriends}>
                {participant_ids.map((friendUserId) => {
                  const friend = friends.find(
                    (f: User) => f.user_id === friendUserId
                  );
                  return (
                    <View key={friendUserId} style={styles.selectedFriend}>
                      <Text style={styles.selectedFriendName}>
                        {friend?.display_name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleFriendSelection(friendUserId)}
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

        {/* Footer */}
        <View style={styles.actionButtons}>
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

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View
              style={[
                styles.datePickerModal,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text
                    style={[styles.datePickerButton, { color: colors.text }]}
                  >
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                  日時を選択
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text
                    style={[styles.datePickerButton, { color: colors.primary }]}
                  >
                    完了
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <Text style={[styles.datePickerLabel, { color: colors.text }]}>
                  日付を選択してください
                </Text>
                <View style={styles.dateTimePickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateTimeButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => {
                      // 簡易的な日付選択（実際の実装では外部ライブラリを使用）
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setSelectedDate(tomorrow);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateTimeButtonText,
                        { color: colors.text },
                      ]}
                    >
                      明日
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateTimeButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setSelectedDate(nextWeek);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateTimeButtonText,
                        { color: colors.text },
                      ]}
                    >
                      来週
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateTimeButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => {
                      const nextWeekend = new Date();
                      const daysUntilWeekend = 6 - nextWeekend.getDay();
                      nextWeekend.setDate(
                        nextWeekend.getDate() + daysUntilWeekend
                      );
                      setSelectedDate(nextWeekend);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateTimeButtonText,
                        { color: colors.text },
                      ]}
                    >
                      今度の土曜日
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timePickerContainer}>
                  <Text
                    style={[styles.timePickerLabel, { color: colors.text }]}
                  >
                    時間を選択
                  </Text>
                  <View style={styles.timeButtons}>
                    {["10:00", "14:00", "18:00", "19:00"].map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeButton,
                          { backgroundColor: colors.surface },
                        ]}
                        onPress={() => {
                          const [hours, minutes] = time.split(":").map(Number);
                          const newDate = new Date(selectedDate);
                          newDate.setHours(hours, minutes, 0, 0);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            { color: colors.text },
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  modalTitle: {
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
  aiGenerateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiGenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  aiGenerateText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  container: {
    flex: 1,
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
  // Date Picker Styles
  datePickerButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
  },
  datePickerText: {
    fontSize: 16,
    marginLeft: 8,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  datePickerContent: {
    paddingVertical: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  dateTimePickerContainer: {
    marginBottom: 24,
  },
  dateTimeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  timePickerContainer: {
    marginTop: 16,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  timeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
