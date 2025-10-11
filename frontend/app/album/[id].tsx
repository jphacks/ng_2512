import React, { useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Photo {
  id: string;
  uri: string;
  isSelected: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
  isSelected: boolean;
}

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"title" | "sharing">("sharing");
  const [selectionMode, setSelectionMode] = useState(false);

  // Sample album data
  const albumTitle = "夏の思い出";
  const albumSubtitle = "12枚 • 3人で共有";

  // Sample photos data
  const [photos, setPhotos] = useState<Photo[]>([
    {
      id: "1",
      uri: "https://picsum.photos/200/200?random=1",
      isSelected: false,
    },
    {
      id: "2",
      uri: "https://picsum.photos/200/200?random=2",
      isSelected: false,
    },
    {
      id: "3",
      uri: "https://picsum.photos/200/200?random=3",
      isSelected: false,
    },
    {
      id: "4",
      uri: "https://picsum.photos/200/200?random=4",
      isSelected: false,
    },
    {
      id: "5",
      uri: "https://picsum.photos/200/200?random=5",
      isSelected: false,
    },
    {
      id: "6",
      uri: "https://picsum.photos/200/200?random=6",
      isSelected: false,
    },
    {
      id: "7",
      uri: "https://picsum.photos/200/200?random=7",
      isSelected: false,
    },
    {
      id: "8",
      uri: "https://picsum.photos/200/200?random=8",
      isSelected: false,
    },
    {
      id: "9",
      uri: "https://picsum.photos/200/200?random=9",
      isSelected: false,
    },
    {
      id: "10",
      uri: "https://picsum.photos/200/200?random=10",
      isSelected: false,
    },
    {
      id: "11",
      uri: "https://picsum.photos/200/200?random=11",
      isSelected: false,
    },
    {
      id: "12",
      uri: "https://picsum.photos/200/200?random=12",
      isSelected: false,
    },
  ]);

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

  const selectedUserCount = users.filter((user) => user.isSelected).length;

  const handlePhotoPress = (photoId: string) => {
    if (selectionMode) {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? { ...photo, isSelected: !photo.isSelected }
            : photo
        )
      );
    } else {
      // Navigate to photo detail view - placeholder for future implementation
      console.log(`Navigate to photo ${photoId} in album ${id}`);
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
      onPress={() => handlePhotoPress(item.id)}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {(selectionMode || item.isSelected) && (
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
          <TouchableOpacity style={styles.addButton}>
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
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        numColumns={3}
        contentContainerStyle={styles.photoGrid}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
      />

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
});
