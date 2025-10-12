import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import CreateProposalScreen from "../create-proposal";
import { getUserId } from "@/utils/user-storage";
import { apiClient, getProposals, Proposal } from "@/services/api-client";

const { width: screenWidth } = Dimensions.get("window");

export default function ProposalsScreen() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // 提案データを取得する関数
  const fetchProposals = async () => {
    try {
      console.log("提案取得リクエスト開始");

      const data = await getProposals();

      console.log("提案取得レスポンス:", data);

      if (data) {
        setProposals(data);
        console.log("提案データ設定完了:", data.length, "件の提案");
      } else {
        console.error("Failed to fetch proposals: データが空");
      }
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 現在のユーザーIDを取得
    const getCurrentUser = async () => {
      const userId = await getUserId();
      setCurrentUserId(userId);
    };
    getCurrentUser();

    // 提案データを取得
    fetchProposals();

    // エントランスアニメーション
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProposals().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${month}月${day}日(${weekday}) ${hours}:${minutes}〜`;
  };

  const isExpired = (proposal: Proposal) => {
    const expiryDate = new Date(proposal.created_at);
    expiryDate.setDate(expiryDate.getDate() + 7);
    return new Date() > expiryDate;
  };

  const handleAccept = async (proposalId: number) => {
    if (!currentUserId) return;

    try {
      const result = await apiClient.update(`/api/proposal/${proposalId}`, {
        user_id: currentUserId,
        status: "accepted",
      });

      if (result.error) {
        console.error("Failed to accept proposal:", result.error);
        return;
      }

      // ローカル状態を更新
      setProposals((prev: Proposal[]) =>
        prev.map((p: Proposal) =>
          p.id === proposalId
            ? {
                ...p,
                participants: p.participants.map((participant) =>
                  participant.user_id === currentUserId
                    ? { ...participant, status: "accepted" as const }
                    : participant
                ),
              }
            : p
        )
      );
      setSelectedProposal(null);
    } catch (error) {
      console.error("Error accepting proposal:", error);
    }
  };

  const handleReject = async (proposalId: number) => {
    if (!currentUserId) return;

    try {
      const result = await apiClient.update(`/api/proposal/${proposalId}`, {
        user_id: currentUserId,
        status: "rejected",
      });

      if (result.error) {
        console.error("Failed to reject proposal:", result.error);
        return;
      }

      // ローカル状態から削除
      setProposals((prev: Proposal[]) =>
        prev.filter((p: Proposal) => p.id !== proposalId)
      );
      setSelectedProposal(null);
    } catch (error) {
      console.error("Error rejecting proposal:", error);
    }
  }; // ヘルパー関数: 承諾数を計算
  const getAcceptedCount = (participants: any[]) => {
    return participants.filter((p) => p.status === "accepted").length;
  };

  // ヘルパー関数: 拒否数を計算
  const getRejectedCount = (participants: any[]) => {
    return participants.filter((p) => p.status === "rejected").length;
  };

  // ヘルパー関数: 現在のユーザーが作成者かどうか
  const isCurrentUserCreator = (creatorId: number) => {
    return currentUserId !== null && creatorId === currentUserId;
  };

  const renderProposalCard = ({
    item,
    index,
  }: {
    item: Proposal;
    index: number;
  }) => {
    const expired = isExpired(item);
    if (expired) return null;

    return null; // このメソッドはもう使用しない
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: "#1E2939" }]}>提案</Text>
            <Text style={[styles.headerSubtitle, { color: "#6A7282" }]}>
              友達からの提案をチェック
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton}>
              <IconSymbol name="magnifyingglass" size={16} color="#6A7282" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton}>
              <IconSymbol name="bell" size={16} color="#6A7282" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <IconSymbol name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.createButtonText}>新しい提案を作成</Text>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.statNumber, { color: "#2B7FFF" }]}>2</Text>
            <Text style={[styles.statLabel, { color: "#4A5565" }]}>
              新着提案
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.statNumber, { color: "#00C950" }]}>1</Text>
            <Text style={[styles.statLabel, { color: "#4A5565" }]}>作成中</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.statNumber, { color: "#AD46FF" }]}>0</Text>
            <Text style={[styles.statLabel, { color: "#4A5565" }]}>
              承認済み
            </Text>
          </View>
        </View>

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: "#1E2939" }]}>
              提案一覧
            </Text>
            <View style={styles.countBadge}>
              <Text style={[styles.countText, { color: "#155DFC" }]}>3件</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.proposalCard}>
              <Text style={[styles.proposalTitle, { color: "#1E2939" }]}>
                読み込み中...
              </Text>
            </View>
          ) : (
            proposals
              .filter((p: Proposal) => !isExpired(p))
              .map((item: Proposal, index: number) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.proposalCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedProposal(item)}
                    activeOpacity={0.7}
                    style={styles.cardTouchable}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <Text
                        style={[styles.proposalTitle, { color: "#1E2939" }]}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.statusBadge}>
                        <Text style={[styles.statusText, { color: "#894B00" }]}>
                          待機中
                        </Text>
                      </View>
                    </View>

                    {/* Card Info */}
                    <View style={styles.cardInfo}>
                      <View style={styles.infoRow}>
                        <IconSymbol name="location" size={16} color="#4A5565" />
                        <Text style={[styles.infoText, { color: "#4A5565" }]}>
                          {item.location}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <IconSymbol name="calendar" size={16} color="#4A5565" />
                        <Text style={[styles.infoText, { color: "#4A5565" }]}>
                          {formatDate(item.event_date)}
                        </Text>
                        {item.participants.length > 1 && (
                          <Text style={[styles.moreText, { color: "#99A1AF" }]}>
                            他{item.participants.length - 1}件
                          </Text>
                        )}
                      </View>
                      <View style={styles.infoRow}>
                        <IconSymbol name="person.2" size={16} color="#4A5565" />
                        <Text style={[styles.infoText, { color: "#4A5565" }]}>
                          {item.participants.length}人
                        </Text>
                        {/* 自分が作成者の場合のみ承認情報を表示 */}
                        {isCurrentUserCreator(item.creator_id) &&
                          getAcceptedCount(item.participants) > 0 && (
                            <Text
                              style={[
                                styles.acceptedInfo,
                                { color: "#155DFC" },
                              ]}
                            >
                              {getAcceptedCount(item.participants)}/
                              {item.participants.length}
                              人が承認
                            </Text>
                          )}
                      </View>
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.timeInfo}>
                        <IconSymbol name="clock" size={12} color="#6A7282" />
                        <Text style={[styles.timeText, { color: "#6A7282" }]}>
                          あと5日
                        </Text>
                      </View>
                      {isCurrentUserCreator(item.creator_id) && (
                        <Text
                          style={[styles.ownProposal, { color: "#155DFC" }]}
                        >
                          自分の提案
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))
          )}
        </View>
      </ScrollView>

      {/* 提案詳細モーダル */}
      <Modal
        visible={selectedProposal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProposal(null)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {selectedProposal && (
            <>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <TouchableOpacity
                    onPress={() => setSelectedProposal(null)}
                    style={styles.closeButton}
                  >
                    <IconSymbol name="xmark" size={18} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedProposal.title}
                  </Text>
                  <View style={styles.headerSpacer} />
                </View>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.detailCard,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <IconSymbol
                        name="calendar"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {formatDate(selectedProposal.event_date)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.accent + "20" },
                      ]}
                    >
                      <IconSymbol
                        name="location"
                        size={20}
                        color={colors.accent}
                      />
                    </View>
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {selectedProposal.location}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.secondary + "20" },
                      ]}
                    >
                      <IconSymbol
                        name="person.2"
                        size={20}
                        color={colors.secondary}
                      />
                    </View>
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      参加者:{" "}
                      {selectedProposal.participants
                        .map((p) => p.display_name)
                        .join(", ")}
                    </Text>
                  </View>
                  {/* 作成者情報は自分が作成者の場合のみ表示 */}
                  {isCurrentUserCreator(selectedProposal.creator_id) && (
                    <View style={styles.detailRow}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: colors.warning + "20" },
                        ]}
                      >
                        <IconSymbol
                          name="person"
                          size={20}
                          color={colors.warning}
                        />
                      </View>
                      <Text style={[styles.detailText, { color: colors.text }]}>
                        作成者: あなた
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons and Status */}
                {!isCurrentUserCreator(selectedProposal.creator_id) && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.rejectButton,
                        { backgroundColor: colors.error },
                      ]}
                      onPress={() => handleReject(selectedProposal.id)}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="xmark" size={20} color="#fff" />
                      <Text style={styles.rejectButtonText}>拒否</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.acceptButton,
                        { backgroundColor: colors.success },
                      ]}
                      onPress={() => handleAccept(selectedProposal.id)}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="checkmark" size={20} color="#fff" />
                      <Text style={styles.acceptButtonText}>承諾</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 自分が作成者の場合のみ承認・拒否統計を表示 */}
                {isCurrentUserCreator(selectedProposal.creator_id) && (
                  <View
                    style={[
                      styles.statusInfo,
                      { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <View style={styles.statusRow}>
                      <View style={styles.statusItem}>
                        <Text
                          style={[
                            styles.statusNumber,
                            { color: colors.success },
                          ]}
                        >
                          {getAcceptedCount(selectedProposal.participants)}
                        </Text>
                        <Text
                          style={[styles.statusLabel, { color: colors.text }]}
                        >
                          承諾
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.statusItem}>
                        <Text
                          style={[styles.statusNumber, { color: colors.error }]}
                        >
                          {getRejectedCount(selectedProposal.participants)}
                        </Text>
                        <Text
                          style={[styles.statusLabel, { color: colors.text }]}
                        >
                          拒否
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Create Proposal Modal */}
      <CreateProposalScreen
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
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
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.33,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 32,
    borderRadius: 44739200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
  notificationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  createButton: {
    backgroundColor: "#2B7FFF",
    backgroundImage: "linear-gradient(45deg, #2B7FFF, #AD46FF)",
    borderRadius: 16,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "400",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    borderWidth: 1.33,
    borderColor: "#E5E7EB",
  },
  statNumber: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "400",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  proposalsSection: {
    marginTop: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  countBadge: {
    backgroundColor: "#EEF4FF",
    borderRadius: 44739200,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  proposalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1.33,
    borderColor: "#E5E7EB",
  },
  cardTouchable: {
    // No additional styles needed, just for touch handling
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  proposalTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: "#FEF9C2",
    borderRadius: 44739200,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  cardInfo: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  acceptedInfo: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  ownProposal: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 4,
  },
  detailText: {
    fontSize: 17,
    color: "#34495E",
    flex: 1,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  statusInfo: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
  },
  createOptions: {
    gap: 20,
    paddingVertical: 24,
  },
  createOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    gap: 16,
  },
  createOptionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    flex: 1,
  },
  createOptionDesc: {
    fontSize: 14,
    color: "#7F8C8D",
    flex: 2,
    lineHeight: 20,
  },
  detailCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  statusNumber: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  statusDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
});
