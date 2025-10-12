import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getAlbumImages, AlbumImage } from "@/services/api-client";
import { useUserId } from "@/hooks/use-user-id";
import * as ImagePicker from "expo-image-picker";

interface Photo extends AlbumImage {
  isSelected?: boolean;
  isUploading?: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  isSelected: boolean;
}

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useUserId();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"title" | "sharing">("sharing");
  const [selectionMode, setSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // アルバム情報
  const [albumTitle, setAlbumTitle] = useState("アルバム");
  const [albumSubtitle, setAlbumSubtitle] = useState("読み込み中...");

  // APIから取得する写真データ
  const [photos, setPhotos] = useState<Photo[]>([]);

  // アルバムの写真データを取得する関数
  const fetchAlbumImages = async () => {
    if (!id || Array.isArray(id)) {
      console.error("Invalid album ID:", id);
      return;
    }

    try {
      setLoading(true);
      const albumId = parseInt(id, 10);
      const data = await getAlbumImages(albumId);

      console.log("Album images API response:", data);

      if (data) {
        // データを正規化してPhoto型に変換
        const normalizedPhotos: Photo[] = data.map((image) => ({
          ...image,
          isSelected: false,
          isUploading: false,
        }));

        setPhotos(normalizedPhotos);

        // アルバム情報を更新
        const photoCount = normalizedPhotos.length;
        const sharedUserCount = 1; // TODO: 共有ユーザー数をAPIから取得
        setAlbumSubtitle(`${photoCount}枚 • ${sharedUserCount}人で共有`);
      } else {
        console.error("Failed to fetch album images");
        setPhotos([]);
      }
    } catch (error) {
      console.error("Error fetching album images:", error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbumImages();
  }, [id]);

  // Sample users data
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "田中さん", username: "@tanaka123", isSelected: true },
    { id: "2", name: "佐藤さん", username: "@sato_san", isSelected: true },
    { id: "3", name: "山田さん", username: "@yamada_y", isSelected: true },
    { id: "4", name: "鈴木さん", username: "@suzuki_s", isSelected: false },
    { id: "5", name: "高橋さん", username: "@takahashi_t", isSelected: false },
    { id: "6", name: "伊藤さん", username: "@ito_i", isSelected: false },
    { id: "7", name: "渡辺さん", username: "@watanabe_w", isSelected: false },
    { id: "8", name: "中村さん", username: "@nakamura_n", isSelected: false },
    { id: "9", name: "小林さん", username: "@kobayashi_k", isSelected: false },
    { id: "10", name: "加藤さん", username: "@kato_k", isSelected: false },
  ]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string>("");

  const selectedUserCount = users.filter((user) => user.isSelected).length;

  const handlePhotoPress = (photoId: number) => {
    if (selectionMode) {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.image_id === photoId
            ? { ...photo, isSelected: !photo.isSelected }
            : photo
        )
      );
    } else {
      // 写真の全体表示
      const photo = photos.find((p) => p.image_id === photoId);
      if (photo) {
        setSelectedPhotoUri(photo.image_url);
        setShowPhotoModal(true);
      }
    }
  };

  // 画像選択とアップロード機能
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "権限が必要です",
        "アルバムから写真を選択するために権限が必要です。"
      );
      return false;
    }
    return true;
  };

  const handleImageUpload = async (source: "camera" | "gallery") => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      let result;

      if (source === "camera") {
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== "granted") {
          Alert.alert(
            "権限が必要です",
            "カメラを使用するために権限が必要です。"
          );
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
          allowsMultipleSelection: true,
        });
      }

      if (!result.canceled && result.assets) {
        setShowUploadModal(false);

        // アップロード中の写真を即座に表示
        const newUploadingPhotos = result.assets.map((asset, index) => ({
          image_id: Date.now() + index,
          image_url: asset.uri,
          is_creator: true,
          isSelected: false,
          isUploading: true,
        }));

        setUploadingPhotos(newUploadingPhotos);

        // 実際のアップロード処理をシミュレート（各写真を1秒ずつ遅延）
        for (let i = 0; i < newUploadingPhotos.length; i++) {
          setTimeout(() => {
            const uploadedPhoto = {
              ...newUploadingPhotos[i],
              image_id: Date.now() + i,
              isUploading: false,
              is_creator: true,
            };

            // アップロード完了した写真を写真リストに追加
            setPhotos((prev) => [uploadedPhoto, ...prev]);

            // アップロード中リストから削除
            setUploadingPhotos((prev) =>
              prev.filter(
                (photo) => photo.image_id !== newUploadingPhotos[i].image_id
              )
            );

            // 最後の写真のアップロードが完了したら通知
            if (i === newUploadingPhotos.length - 1) {
              Alert.alert(
                "アップロード完了",
                `${newUploadingPhotos.length}枚の写真がアップロードされました！`
              );
            }
          }, (i + 1) * 1000);
        }
      }
    } catch (error) {
      console.error("画像選択エラー:", error);
      Alert.alert("エラー", "画像の選択に失敗しました");
      setUploadingPhotos([]);
    }
  };

  const handleUserToggle = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, isSelected: !user.isSelected } : user
      )
    );
  };

  const handleSaveSettings = () => {
    setShowSettingsModal(false);
    // Save settings logic here
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <TouchableOpacity
      style={[
        styles.photoContainer,
        {
          marginLeft: index % 3 === 0 ? 0 : 8,
        },
      ]}
      onPress={() => handlePhotoPress(item.image_id)}
      disabled={item.isUploading}
    >
      <Image source={{ uri: item.image_url }} style={styles.photo} />

      {/* アップロード中のオーバーレイ */}
      {item.isUploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingSpinner}>
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
          </View>
          <Text style={styles.uploadingText}>アップロード中...</Text>
        </View>
      )}

      {/* 選択状態のオーバーレイ */}
      {(selectionMode || item.isSelected) && !item.isUploading && (
        <View
          style={[
            styles.selectionOverlay,
            {
              backgroundColor: item.isSelected
                ? "rgba(0,0,0,0.6)"
                : "rgba(0,0,0,0)",
            },
          ]}
        >
          {item.isSelected && (
            <View style={styles.checkButton}>
              <IconSymbol name="checkmark" size={16} color="white" />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={16} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {albumTitle}
            </Text>
            <Text style={styles.subtitle}>{albumSubtitle}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowUploadModal(true)}
          >
            <IconSymbol name="plus" size={16} color="white" />
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <IconSymbol name="ellipsis" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            読み込み中...
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...uploadingPhotos, ...photos]}
          renderItem={renderPhoto}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.image_id.toString()}
        />
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                アルバム設定
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "title" && styles.activeTab]}
              onPress={() => setActiveTab("title")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "title" && styles.activeTabText,
                ]}
              >
                タイトル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "sharing" && styles.activeTab]}
              onPress={() => setActiveTab("sharing")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "sharing" && styles.activeTabText,
                ]}
              >
                共有設定
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "sharing" && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  共有するユーザー
                </Text>
                <View
                  style={[
                    styles.userListContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  <ScrollView
                    style={styles.userList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {users.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.userItem}
                        onPress={() => handleUserToggle(item.id)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: item.isSelected
                                ? "#030213"
                                : "#f3f3f5",
                              borderColor: item.isSelected
                                ? "#030213"
                                : "rgba(0,0,0,0.1)",
                            },
                          ]}
                        >
                          {item.isSelected && (
                            <IconSymbol
                              name="checkmark"
                              size={14}
                              color="white"
                            />
                          )}
                        </View>
                        <View style={styles.userInfo}>
                          <Text
                            style={[styles.userName, { color: colors.text }]}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.userHandle}>{item.username}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <Text
                  style={[
                    styles.selectedCount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedUserCount}人選択中
                </Text>
              </View>
            )}

            {activeTab === "title" && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  アルバムタイトル
                </Text>
                <View
                  style={[
                    styles.titleInputContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.titleInput, { color: colors.text }]}>
                    {albumTitle}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSettings}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUploadModal(false)}
              >
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                写真を追加
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View style={styles.uploadOptions}>
            <TouchableOpacity
              style={[styles.uploadOption, { backgroundColor: colors.surface }]}
              onPress={() => handleImageUpload("camera")}
            >
              <View
                style={[
                  styles.uploadIconContainer,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <IconSymbol name="camera" size={24} color={colors.primary} />
              </View>
              <View style={styles.uploadOptionText}>
                <Text
                  style={[styles.uploadOptionTitle, { color: colors.text }]}
                >
                  カメラで撮影
                </Text>
                <Text
                  style={[
                    styles.uploadOptionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  新しい写真を撮影してアルバムに追加
                </Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadOption, { backgroundColor: colors.surface }]}
              onPress={() => handleImageUpload("gallery")}
            >
              <View
                style={[
                  styles.uploadIconContainer,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <IconSymbol name="photo" size={24} color={colors.accent} />
              </View>
              <View style={styles.uploadOptionText}>
                <Text
                  style={[styles.uploadOptionTitle, { color: colors.text }]}
                >
                  ライブラリから選択
                </Text>
                <Text
                  style={[
                    styles.uploadOptionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  複数の写真を一度に選択可能
                </Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Photo Full View Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity
            style={styles.photoModalBackground}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.photoModalHeader}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => setShowPhotoModal(false)}
              >
                <IconSymbol name="xmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.photoModalImageContainer}>
              <Image
                source={{ uri: selectedPhotoUri }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: "#6a7282",
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ad46ff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "400",
  },
  menuButton: {
    width: 36,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  photoGrid: {
    padding: 16,
  },
  photoContainer: {
    width: "31%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  selectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  checkButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    position: "relative",
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
    backgroundColor: "#f5f5f5",
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ececf0",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "white",
  },
  tabText: {
    fontSize: 14,
    color: "#000",
  },
  activeTabText: {
    color: "#000",
  },
  tabContentContainer: {
    flex: 1,
    minHeight: 300,
    maxHeight: 350,
  },
  tabContent: {
    flex: 1,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  userListContainer: {
    borderWidth: 1,
    borderRadius: 14,
    height: 200,
    marginBottom: 8,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  userHandle: {
    fontSize: 14,
    color: "#6a7282",
    lineHeight: 20,
  },
  selectedCount: {
    fontSize: 14,
  },
  titleInputContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "400",
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
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2b7fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  uploadingSpinner: {
    marginBottom: 8,
  },
  uploadingText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  uploadOptions: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  uploadOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  uploadIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  uploadOptionText: {
    flex: 1,
  },
  uploadOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  uploadOptionSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  headerSpacer: {
    width: 44,
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  photoModalBackground: {
    flex: 1,
  },
  photoModalHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  photoModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  photoModalImage: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
