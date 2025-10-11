# React Native 構成（Expo）

最終更新: 2025-09-02 (Asia/Tokyo)

Recall モバイルクライアントの推奨ディレクトリ構成、主要レイヤー、設計上の約束事を記載します。

---

## 1. ディレクトリ構成

```
app/
  app.config.ts
  src/
    app.tsx
    navigation/
      RootNavigator.tsx
      AuthStack.tsx
      MainTabs.tsx
    screens/
      Auth/
        SignInScreen.tsx
      Proposals/
        ProposalsListScreen.tsx
        ProposalDetailScreen.tsx
        ManualProposalScreen.tsx
      Groups/
        GroupsScreen.tsx
        ChatScreen.tsx
      Scheduling/
        SlotVoteScreen.tsx
      Journal/
        JournalListScreen.tsx
        PhotoUploadScreen.tsx
      Settings/
        SettingsScreen.tsx
    components/
      ui/ (Button, Avatar, Badge, Empty, ErrorState)
      forms/
    hooks/
      useAuth.ts, useApi.ts, useTheme.ts
    context/  (React Context providers: e.g., AuthProvider)
    services/
      apiClient.ts
      notifications.ts
      storage.ts (MMKV/SecureStore)
    i18n/
      index.ts, ja.json, en.json
    theme/
      index.ts, dark.ts, light.ts
```

---

## 2. 技術スタック

- Expo（Bare でない Managed 前提でも可）
- Navigation: React Navigation v6（Stack + Bottom Tabs）
- 状態管理: React Context（セッション/軽量 UI state） + React Query（データ）
- ストレージ: MMKV（アクセストークン）、SecureStore（Refresh）
- コンポーネント: RN-Paper or Tamagui（任意）
  

---

## 3. API クライアント

`services/apiClient.ts`
- `Authorization` ヘッダを自動付与
- 401 時のリフレッシュ/リトライ
- `Idempotency-Key` 生成（ULID）
- 共通エラーハンドラ（トースト/ログ）

---

## 4. サーバAI連携

- 画像アップロード: 署名URLで S3 に直接アップロード→`asset_id` をサーバに渡す
- 類似検索/生成はバックエンド（Flask + Functions）がトリガーし、RN から直接 `/ai/*` を叩かない。
- AI 結果は Cloud Functions 経由で Firestore/通知に反映し、RN は既存データ更新やプッシュ通知から表示する。

注意: React Native アプリは純粋なクライアントです。認証/業務データ/リアルタイムは Firebase、AI 推論は Flask が担当し、ユーザー操作としての AI 画面は存在しません。

---

## 5. Firebase 連携（独自サーバ）

- 認証: Google Sign-In → `signInWithCredential`（Firebase Auth）
- 購読: `groupMessages/{groupId}/messages` を購読してリアルタイム受信
- Presence: `presence/{userId}` を定期更新、Typingは画面遷移に合わせて groupId を書込
- ルール: Firestore ルールでグループメンバーのみ読み取り可能（詳細は `mobile/firebase-architecture.md`）

---

## 6. アクセシビリティ & i18n

- すべてのボタン/インタラクティブ要素に `accessibilityLabel`
- フォーカス順序と大きめタップ領域（44pt）
- i18n は `i18n/` にキー定義、テキスト直書きを避ける

---

## 7. テスト

- Unit: hooks/utils を Jest で
- E2E: Detox（ログイン→提案→Like→合意→チャット）
- Storybook or Expo Router の `screens` をスナップショット

---

## 8. 品質基準

- 初回起動 ≤ 2.5 秒
- 主要操作は 2 タップ以内（Like、投票）
- エラー/空状態/ローディングの 3 状態を必ず実装
