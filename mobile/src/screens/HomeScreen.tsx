import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useAppConfig } from "@/hooks/useAppConfig";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useAiClient } from "@/hooks/useAiClient";
import type { FaceCandidate, FaceMatchResponse, ProposalDraftResponse, ThemeSuggestionResponse } from "@/services/aiClient";

const HomeScreen = (): JSX.Element => {
  const config = useAppConfig();
  const aiClient = useAiClient();

  const [assetId, setAssetId] = useState("asset-main");
  const [themeHints, setThemeHints] = useState("カフェ");
  const [topK, setTopK] = useState("3");
  const [themeResult, setThemeResult] = useState<ThemeSuggestionResponse | null>(null);
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const [requesterId, setRequesterId] = useState("1");
  const [friendUserIds, setFriendUserIds] = useState("2");
  const [perFaceLimit, setPerFaceLimit] = useState("3");
  const [matchResult, setMatchResult] = useState<FaceMatchResponse | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [audienceHints, setAudienceHints] = useState("2,3");
  const [contextNotes, setContextNotes] = useState("ランチがしたい");
  const [proposalResult, setProposalResult] = useState<ProposalDraftResponse | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const emulatorLabel = config.useFirebaseEmulators ? "Emulators enabled" : "Emulators disabled";

  const parseNumberList = (value: string): number[] =>
    value
      .split(",")
      .map((part) => parseInt(part.trim(), 10))
      .filter((num) => !Number.isNaN(num));

  const perFaceLimitValue = useMemo(() => {
    const trimmed = perFaceLimit.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [perFaceLimit]);

  const handleSuggestThemes = async () => {
    setThemeLoading(true);
    setThemeError(null);
    try {
      const hints = themeHints
        .split(",")
        .map((hint) => hint.trim())
        .filter((hint) => hint.length > 0);
      const trimmedTopK = topK.trim();
      const topKValue = trimmedTopK.length > 0 ? parseInt(trimmedTopK, 10) : undefined;
      const response = await aiClient.suggestThemes({
        assetId,
        hints: hints.length > 0 ? hints : undefined,
        topK: typeof topKValue === "number" && !Number.isNaN(topKValue) ? topKValue : undefined
      });
      setThemeResult(response);
    } catch (error) {
      setThemeError((error as Error).message);
      setThemeResult(null);
    } finally {
      setThemeLoading(false);
    }
  };

  const handleMatchPeople = async () => {
    const parsedRequester = parseInt(requesterId.trim(), 10);
    if (Number.isNaN(parsedRequester)) {
      setMatchError("requesterId を整数で入力してください");
      return;
    }

    const friends = parseNumberList(friendUserIds);
    if (friends.length === 0) {
      setMatchError("friendUserIds をカンマ区切りの整数で入力してください");
      return;
    }

    setMatchLoading(true);
    setMatchError(null);
    try {
      const response = await aiClient.matchPeople({
        assetId,
        requesterId: parsedRequester,
        friendUserIds: friends,
        perFaceLimit: perFaceLimitValue
      });
      setMatchResult(response);
    } catch (error) {
      setMatchError((error as Error).message);
      setMatchResult(null);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    setProposalLoading(true);
    setProposalError(null);
    try {
      const hints = parseNumberList(audienceHints);
      const notes = contextNotes
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const response = await aiClient.generateProposal({
        assetId,
        audienceHints: hints.length > 0 ? hints : undefined,
        contextNotes: notes.length > 0 ? notes : undefined
      });
      setProposalResult(response);
    } catch (error) {
      setProposalError((error as Error).message);
      setProposalResult(null);
    } finally {
      setProposalLoading(false);
    }
  };

  const renderFaceCandidates = (candidates: FaceCandidate[]): string =>
    candidates.map((candidate) => `${candidate.display_name} (${candidate.score.toFixed(2)})`).join(", ");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Recall Prototype</Text>
      <Text style={styles.subtitle}>AI サービスの疎通をモバイルから確認できます。</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>API Base URL</Text>
        <Text testID="api-base-url" style={styles.cardValue}>
          {config.apiBaseUrl}
        </Text>
        <Text style={styles.cardValue}>API Key: {config.aiApiKey}</Text>
        <Text style={styles.cardEmulatorHint}>{emulatorLabel}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>共通入力</Text>
        <TextInput
          style={styles.input}
          placeholder="asset_id"
          value={assetId}
          onChangeText={setAssetId}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>テーマサジェスト</Text>
        <TextInput
          style={styles.input}
          placeholder="ヒント (カンマ区切り)"
          value={themeHints}
          onChangeText={setThemeHints}
        />
        <TextInput
          style={styles.input}
          placeholder="top_k (例: 3)"
          value={topK}
          onChangeText={setTopK}
          keyboardType="numeric"
        />
        <PrimaryButton label="テーマを取得" onPress={() => void handleSuggestThemes()} />
        {themeLoading && <ActivityIndicator />}
        {themeError && <Text style={styles.errorText}>{themeError}</Text>}
        {themeResult && (
          <View style={styles.resultPanel}>
            <Text style={styles.resultLabel}>候補:</Text>
            {themeResult.themes.map((theme) => (
              <Text key={theme} style={styles.resultValue}>
                {theme}
              </Text>
            ))}
            <Text style={styles.resultLabel}>説明: {themeResult.description}</Text>
            <Text style={styles.resultMeta}>Model: {themeResult.model}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>顔マッチ</Text>
        <TextInput
          style={styles.input}
          placeholder="requester_id"
          value={requesterId}
          onChangeText={setRequesterId}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="friend_user_ids (カンマ区切り)"
          value={friendUserIds}
          onChangeText={setFriendUserIds}
        />
        <TextInput
          style={styles.input}
          placeholder="per_face_limit (任意)"
          value={perFaceLimit}
          onChangeText={setPerFaceLimit}
          keyboardType="numeric"
        />
        <PrimaryButton label="顔マッチを実行" onPress={() => void handleMatchPeople()} />
        {matchLoading && <ActivityIndicator />}
        {matchError && <Text style={styles.errorText}>{matchError}</Text>}
        {matchResult && (
          <View style={styles.resultPanel}>
            <Text style={styles.resultLabel}>候補:</Text>
            {matchResult.matched_faces.map((face, index) => (
              <Text key={`${face.box.join("-")}-${index}`} style={styles.resultValue}>
                #{index + 1} {renderFaceCandidates(face.candidates)}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>提案ドラフト</Text>
        <TextInput
          style={styles.input}
          placeholder="audience_hints (カンマ区切り)"
          value={audienceHints}
          onChangeText={setAudienceHints}
        />
        <TextInput
          style={styles.input}
          placeholder="context_notes (カンマ区切り)"
          value={contextNotes}
          onChangeText={setContextNotes}
        />
        <PrimaryButton label="提案を生成" onPress={() => void handleGenerateProposal()} />
        {proposalLoading && <ActivityIndicator />}
        {proposalError && <Text style={styles.errorText}>{proposalError}</Text>}
        {proposalResult && (
          <View style={styles.resultPanel}>
            <Text style={styles.resultLabel}>タイトル: {proposalResult.draft.title}</Text>
            <Text style={styles.resultValue}>本文: {proposalResult.draft.body}</Text>
            <Text style={styles.resultLabel}>
              宛先: {proposalResult.draft.audience_user_ids.join(", ")}
            </Text>
            {proposalResult.draft.slots.length > 0 && (
              <Text style={styles.resultValue}>
                スロット: {JSON.stringify(proposalResult.draft.slots)}
              </Text>
            )}
            <Text style={styles.resultMeta}>Model: {proposalResult.model}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f4f8",
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1f2933"
  },
  subtitle: {
    fontSize: 16,
    textAlign: "left",
    color: "#52606d"
  },
  card: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 6
  },
  cardLabel: {
    fontSize: 14,
    color: "#7b8794"
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "500",
    color: "#102a43"
  },
  cardEmulatorHint: {
    fontSize: 12,
    color: "#7b8794"
  },
  section: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#102a43"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fdfefe"
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14
  },
  resultPanel: {
    gap: 6
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#102a43"
  },
  resultValue: {
    fontSize: 15,
    color: "#334e68"
  },
  resultMeta: {
    fontSize: 13,
    color: "#7b8794"
  }
});

export default HomeScreen;
