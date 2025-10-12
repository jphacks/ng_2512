import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  apiClient,
  withUserId,
  getAlbums,
  Album as ApiAlbum,
} from "@/services/api-client";

export default function AlbumScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [albums, setAlbums] = useState<ApiAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [createAlbumVisible, setCreateAlbumVisible] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");

  // アルバム一覧を取得する関数
  const fetchAlbums = async () => {
    try {
      const data = await getAlbums();
      if (data) {
        setAlbums(data);
      } else {
        console.error("Failed to fetch albums");
      }
    } catch (error) {
      console.error("Error fetching albums:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreateAlbum = async () => {
    if (!albumTitle.trim()) return;

    try {
      const result = await withUserId(async (userId) => {
        return apiClient.post("/api/album", {
          user_id: userId,
          title: albumTitle.trim(),
        });
      });

      if (result.error) {
        console.error("Failed to create album:", result.error);
        return;
      }

      // アルバム一覧を再取得
      await fetchAlbums();

      // モーダルを閉じてリセット
      setCreateAlbumVisible(false);
      setAlbumTitle("");
    } catch (error) {
      console.error("Error creating album:", error);
    }
  };

  const isCreateEnabled = albumTitle.trim().length > 0;

  const handleAlbumPress = (album: ApiAlbum) => {
    // アルバム詳細画面への遷移
    router.push({
      pathname: "/album/[id]",
      params: { id: album.album_id.toString() },
    });
  };

  const renderAlbumCard = ({ item }: { item: ApiAlbum }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => handleAlbumPress(item)}
    >
      <View style={styles.albumImageContainer}>
        <Image
          source={{ uri: item.last_uploaded_image_url }}
          style={styles.albumImage}
        />
        <View style={styles.photoCountBadge}>
          <IconSymbol name="photo" size={12} color="white" />
          <Text style={styles.photoCountText}>{item.image_num || 0}</Text>
        </View>
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle}>{item.title}</Text>
        <View style={styles.sharedInfo}>
          <IconSymbol name="person.2" size={16} color={colors.textSecondary} />
          <Text style={styles.sharedText}>
            {item.shared_user_num || 0}人で共有
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              アルバム
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              思い出を共有しよう
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <IconSymbol name="bell" size={16} color={colors.text} />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        style={styles.content}
        showsVerticalScrollIndicator={false}
        data={albums}
        renderItem={renderAlbumCard}
        keyExtractor={(item) =>
          item.album_id?.toString() || `album-${Math.random()}`
        }
        numColumns={2}
        columnWrapperStyle={styles.albumRow}
        ListHeaderComponent={
          <View>
            {/* Create Album Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setCreateAlbumVisible(true)}
            >
              <IconSymbol name="plus" size={16} color="white" />
              <Text style={styles.createButtonText}>新しいアルバムを作成</Text>
            </TouchableOpacity>

            {/* Statistics */}
            <View style={styles.statsContainer}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={styles.statNumber}>{albums.length}</Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  アルバム
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.statNumber, { color: "#f6339a" }]}>
                  {albums.reduce(
                    (total, album) => total + (album.image_num || 0),
                    0
                  )}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  写真
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.statNumber, { color: "#2b7fff" }]}>
                  {albums.reduce(
                    (total, album) => total + (album.shared_user_num || 0),
                    0
                  )}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  共有中
                </Text>
              </View>
            </View>

            {loading && (
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  読み込み中...
                </Text>
              </View>
            )}

            {/* Albums Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                アルバム一覧
              </Text>
              <View style={styles.albumCountBadge}>
                <Text style={styles.albumCountText}>{albums.length}個</Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.albumGrid}
      />

      {/* Create Album Modal */}
      <Modal
        visible={createAlbumVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateAlbumVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCreateAlbumVisible(false)}
            >
              <IconSymbol name="xmark" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              新しいアルバムを作成
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Album Title Input */}
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  アルバムタイトル
                </Text>
                <Text style={styles.requiredMark}>*</Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                  },
                ]}
                placeholder="例: 夏の思い出"
                placeholderTextColor={colors.textSecondary}
                value={albumTitle}
                onChangeText={setAlbumTitle}
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCreateAlbumVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createActionButton,
                !isCreateEnabled && styles.createActionButtonDisabled,
              ]}
              onPress={handleCreateAlbum}
              disabled={!isCreateEnabled}
            >
              <Text style={styles.createActionButtonText}>作成</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 1,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#fb2c36",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "400",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ad46ff",
    borderRadius: 16,
    height: 36,
    marginTop: 16,
    marginBottom: 24,
    gap: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "400",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "400",
    color: "#ad46ff",
    textAlign: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  albumCountBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 22,
  },
  albumCountText: {
    fontSize: 12,
    color: "#9810fa",
    fontWeight: "400",
  },
  albumGrid: {
    gap: 12,
  },
  albumRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  albumCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    width: "48%",
  },
  albumImageContainer: {
    position: "relative",
    height: 160,
  },
  albumImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  photoCountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "400",
  },
  albumInfo: {
    padding: 16,
    gap: 8,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#1e2939",
  },
  sharedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sharedText: {
    fontSize: 14,
    color: "#6a7282",
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
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  headerSpacer: {
    width: 32,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  requiredMark: {
    fontSize: 14,
    color: "#fb2c36",
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "400",
  },
  uploadStatus: {
    fontSize: 14,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  createActionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2b7fff",
    alignItems: "center",
    justifyContent: "center",
  },
  createActionButtonDisabled: {
    opacity: 0.5,
  },
  createActionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
});
