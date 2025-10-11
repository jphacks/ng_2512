import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useUserId } from "@/hooks/use-user-id";
import { removeUserId } from "@/utils/user-storage";
import { router } from "expo-router";
import { BackHandler } from "react-native";
import { appEvents, APP_EVENTS } from "@/utils/app-events";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { userId, loading, error } = useUserId();
  const [showEditModal, setShowEditModal] = useState(false);
  const [notifications, setNotifications] = useState({
    proposals: true,
    messages: true,
    friendRequests: true,
    reminders: false,
  });

  const [userProfile, setUserProfile] = useState({
    name: "山田太郎",
    bio: "こんにちは！友達と楽しい時間を過ごすのが大好きです。カフェ巡りや映画鑑賞が趣味です。",
    avatar: null,
  });

  const handleLogout = () => {
    Alert.alert("ログアウト", "本当にログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          try {
            await removeUserId();
            // ログアウトイベントを送信してルートレイアウトに状態更新を促す
            appEvents.emit(APP_EVENTS.USER_LOGOUT);
            Alert.alert(
              "ログアウト完了",
              "ログアウトしました。初回セットアップ画面に戻ります。"
            );
          } catch (error) {
            console.error("ログアウトに失敗しました:", error);
            Alert.alert("エラー", "ログアウトに失敗しました");
          }
        },
      },
    ]);
  };

  const NotificationToggle = ({
    label,
    description,
    value,
    onValueChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationLabel,
            { color: Colors[colorScheme ?? "light"].text },
          ]}
        >
          {label}
        </Text>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#f4f3f4", true: "#2b7fff" }}
        thumbColor={value ? "#ffffff" : "#ffffff"}
      />
    </View>
  );

  const SettingsButton = ({
    icon,
    title,
    onPress,
    style,
  }: {
    icon: any;
    title: string;
    onPress: () => void;
    style?: any;
  }) => (
    <TouchableOpacity style={[styles.settingsButton, style]} onPress={onPress}>
      <View style={styles.buttonContent}>
        <View style={[styles.iconContainer, style?.iconContainer]}>
          <IconSymbol
            name={icon as any}
            size={20}
            color={style?.iconColor || Colors[colorScheme ?? "light"].text}
          />
        </View>
        <Text
          style={[
            styles.buttonText,
            { color: Colors[colorScheme ?? "light"].text },
          ]}
        >
          {title}
        </Text>
      </View>
      <IconSymbol
        name="chevron.right"
        size={20}
        color={Colors[colorScheme ?? "light"].icon}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: Colors[colorScheme ?? "light"].background },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.headerTitle,
              { color: Colors[colorScheme ?? "light"].text },
            ]}
          >
            設定
          </Text>
          <Text style={styles.headerSubtitle}>アカウントとアプリの設定</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <IconSymbol
              name="bell"
              size={16}
              color={Colors[colorScheme ?? "light"].icon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <IconSymbol
              name="bell"
              size={16}
              color={Colors[colorScheme ?? "light"].icon}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <View style={styles.profileContainer}>
            <Image
              source={{
                uri: "https://via.placeholder.com/64x64/cccccc/ffffff?text=User",
              }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text
                style={[
                  styles.profileName,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {userProfile.name}
              </Text>
              <Text style={styles.profileUserId}>
                ユーザーID:{" "}
                {loading
                  ? "読み込み中..."
                  : error
                  ? "エラー"
                  : userId || "未設定"}
              </Text>
              <Text style={styles.profileBio} numberOfLines={2}>
                {userProfile.bio}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
          >
            <IconSymbol name="pencil" size={16} color="#ffffff" />
            <Text style={styles.editButtonText}>ユーザー情報を編集</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: Colors[colorScheme ?? "light"].text },
            ]}
          >
            通知設定
          </Text>
          <View style={styles.notificationContainer}>
            <NotificationToggle
              label="提案の通知"
              description="新しい提案が届いたときに通知します"
              value={notifications.proposals}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, proposals: value }))
              }
            />
            <View style={styles.separator} />
            <NotificationToggle
              label="メッセージの通知"
              description="新しいメッセージが届いたときに通知します"
              value={notifications.messages}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, messages: value }))
              }
            />
            <View style={styles.separator} />
            <NotificationToggle
              label="フレンド申請の通知"
              description="フレンド申請が届いたときに通知します"
              value={notifications.friendRequests}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, friendRequests: value }))
              }
            />
            <View style={styles.separator} />
            <NotificationToggle
              label="リマインダー"
              description="予定のリマインダーを通知します"
              value={notifications.reminders}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, reminders: value }))
              }
            />
          </View>
        </View>

        {/* Other Settings */}
        <View
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <SettingsButton
            icon="bell.fill"
            title="通知履歴"
            onPress={() => console.log("通知履歴")}
            style={{
              iconContainer: { backgroundColor: "#dbeafe" },
              iconColor: "#3b82f6",
            }}
          />
          <View style={styles.separator} />
          <SettingsButton
            icon="shield.fill"
            title="プライバシー設定"
            onPress={() => console.log("プライバシー設定")}
            style={{
              iconContainer: { backgroundColor: "#faf5ff" },
              iconColor: "#8b5cf6",
            }}
          />
          <View style={styles.separator} />
          <SettingsButton
            icon="doc.text.fill"
            title="利用規約"
            onPress={() => console.log("利用規約")}
            style={{
              iconContainer: { backgroundColor: "#f0fdf4" },
              iconColor: "#22c55e",
            }}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            name="rectangle.portrait.and.arrow.right.fill"
            size={16}
            color="#e7000b"
          />
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>バージョン 1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: Colors[colorScheme ?? "light"].background },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
            >
              <IconSymbol
                name="xmark"
                size={16}
                color={Colors[colorScheme ?? "light"].icon}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              ユーザー情報の編集
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Avatar Section */}
            <View style={styles.formSection}>
              <Text
                style={[
                  styles.formLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                アイコン写真
              </Text>
              <View style={styles.avatarEditContainer}>
                <Image
                  source={{
                    uri: "https://via.placeholder.com/80x80/cccccc/ffffff?text=User",
                  }}
                  style={styles.editAvatar}
                />
                <TouchableOpacity style={styles.changePhotoButton}>
                  <IconSymbol
                    name="photo.fill"
                    size={16}
                    color={Colors[colorScheme ?? "light"].text}
                  />
                  <Text
                    style={[
                      styles.changePhotoText,
                      { color: Colors[colorScheme ?? "light"].text },
                    ]}
                  >
                    写真を変更
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.formDescription}>
                プロフィールに表示されるアイコン画像です
              </Text>
            </View>

            {/* Name Section */}
            <View style={styles.formSection}>
              <Text
                style={[
                  styles.formLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                表示名
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].tabIconDefault,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={userProfile.name}
                onChangeText={(text) =>
                  setUserProfile((prev) => ({ ...prev, name: text }))
                }
                placeholder="表示名を入力"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
              />
            </View>

            {/* Face Photo Section */}
            <View style={styles.formSection}>
              <Text
                style={[
                  styles.formLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                顔写真
              </Text>
              <View style={styles.facePhotoContainer}>
                <View style={styles.facePhotoPlaceholder}>
                  <IconSymbol
                    name="person.fill"
                    size={32}
                    color={Colors[colorScheme ?? "light"].tabIconDefault}
                  />
                </View>
                <TouchableOpacity style={styles.uploadButton}>
                  <IconSymbol
                    name="square.and.arrow.up.fill"
                    size={16}
                    color={Colors[colorScheme ?? "light"].text}
                  />
                  <Text
                    style={[
                      styles.uploadButtonText,
                      { color: Colors[colorScheme ?? "light"].text },
                    ]}
                  >
                    写真をアップロード
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.formDescription}>
                本人確認用の顔写真です（他のユーザーには表示されません）
              </Text>
            </View>

            {/* Bio Section */}
            <View style={styles.formSection}>
              <Text
                style={[
                  styles.formLabel,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                プロフィール文章
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].background,
                    borderColor: Colors[colorScheme ?? "light"].tabIconDefault,
                    color: Colors[colorScheme ?? "light"].text,
                  },
                ]}
                value={userProfile.bio}
                onChangeText={(text) =>
                  setUserProfile((prev) => ({ ...prev, bio: text }))
                }
                placeholder="自己紹介を入力してください"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {userProfile.bio.length}/200
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: Colors[colorScheme ?? "light"].tabIconDefault },
              ]}
              onPress={() => setShowEditModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                setShowEditModal(false);
                // 保存処理を実装
                console.log("プロフィールを保存しました");
              }}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.33,
    borderBottomColor: "#e5e5e5",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6a7282",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#fb2c36",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    borderWidth: 1.33,
    borderColor: "#e5e5e5",
  },
  profileContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileUserId: {
    fontSize: 12,
    color: "#6a7282",
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: "#6a7282",
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: "#2b7fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  editButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  notificationContainer: {
    gap: 0,
  },
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: "#6a7282",
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 8,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1.33,
    borderColor: "#ffc9c9",
    paddingVertical: 10,
    marginTop: 16,
    gap: 8,
  },
  logoutText: {
    color: "#e7000b",
    fontSize: 14,
    fontWeight: "500",
  },
  versionText: {
    textAlign: "center",
    fontSize: 14,
    color: "#99a1af",
    marginTop: 20,
    marginBottom: 32,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  placeholder: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  avatarEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1.33,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    minHeight: 36,
  },
  facePhotoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  facePhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1.33,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  characterCount: {
    textAlign: "right",
    fontSize: 14,
    color: "#6a7282",
    marginTop: 8,
  },
  formDescription: {
    fontSize: 14,
    color: "#6a7282",
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1.33,
    paddingVertical: 9,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2b7fff",
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});
