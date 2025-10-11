# Recall Mobile Shell (Expo)

React Native（Expo）によるフロントエンドの下地です。CI1 の Dockerfile タスクに対応し、テストおよび Web 配信用のマルチステージ Dockerfile を用意しています。

## セットアップ
1. ルートで `.env.example` を参考に Expo 向け環境変数を設定します（`EXPO_PUBLIC_API_BASE_URL` など）。
2. Node 20 系で依存関係をインストールします。
   ```bash
   npm install
   ```
3. Expo を起動します。
   ```bash
   npm run start
   ```

## 主なスクリプト
- `npm run start`: Expo Dev Server を起動します。
- `npm run test`: `jest-expo` ベースのテストを実行します。
- `npm run test:web`: Playwright を利用した Web E2E テストを実行します（`mobile/playwright.config.ts`）。
- `npm run lint`: ESLint（@react-native-community）で静的解析します。
- `docker build -f Dockerfile --target test .`: テストターゲットのイメージをビルドし、Jest を実行します。
- `docker build -f Dockerfile --target prod .`: Expo の Web Export を Nginx イメージに含めた本番ターゲットを生成します。

## ディレクトリ構成
- `App.tsx`: Expo のエントリポイント。React Navigation で `Home` スタックをレンダリングします。
- `src/navigation/RootNavigator.tsx`: Stack ナビゲータの設定。
- `src/screens/HomeScreen.tsx`: AI エンドポイントを直接叩き、テーマ/顔マッチ/提案生成の結果を確認できるデバッグ画面。
- `src/hooks/useAppConfig.ts`: Expo Config (`extra`) を参照するユーティリティ。
- `src/hooks/useAiClient.ts`: HMAC 署名付き AI クライアントを生成するカスタムフック。
- `src/services/aiClient.ts`: `/ai/*` エンドポイント向けの薄い API ラッパ。
- `src/utils/hmacAuth.ts`: HMAC-SHA256 署名ヘッダーを生成するユーティリティ。
- `src/components/ui/PrimaryButton.tsx`: 最小 UI コンポーネント（アクセシビリティ対応）。
- `__tests__/App.test.tsx`: `useAppConfig` を通じた設定表示のスモークテスト。

## 環境変数
`app.config.ts` では以下のキーを参照します。Expo の `extra` 経由でテスト/本番の切り替えが可能です。
- `EXPO_PUBLIC_API_BASE_URL`（既定: `http://127.0.0.1:8000`）
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS`（`1` で Firebase Emulator 接続を有効化）
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`（既定: `recall-dev`）
- `EXPO_PUBLIC_AI_API_KEY`（既定: `dev-key`）
- `EXPO_PUBLIC_AI_API_SECRET`（既定: `dev-secret`）

## テストについて
現状はネットワーク制限があるため依存インストールとテスト実行をローカルで確認できていません。Node 20 環境で `npm install` 実行後、`npm test` で `__tests__/App.test.tsx` が成功することを想定しています。同様に Docker ビルドも依存取得が必要です（CI はオンライン環境を前提としてください）。
