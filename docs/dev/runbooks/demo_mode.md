# Demo Mode Runbook — 発表用デモ手順

最終更新: 2025-09-05 (Asia/Tokyo)

---

## 1. 目的
- Recall の主要 AI 機能（テーマ生成 F10, 人物マッチ F11, AI 提案 F12）を短時間で再現するためのデモ環境を整える。
- ネットワーク遅延や非同期ジョブ待ちを排除し、クリック→応答まで 5 秒以内で結果を示すプレゼン体験を保証する。

---

## 2. 前提条件
- `scripts/start_full_stack.sh` で起動する Firebase/Flask スタックがローカルで利用可能。
- `.env` に以下の環境変数が定義されている。
  ```dotenv
  DEMO_MODE=1
  DEMO_SEED_EMAIL=demo@example.com
  DEMO_SEED_FRIENDS="taro@example.com,jiro@example.com"
  ```
- Expo Dev Client がインストール済みで、`expo start --dev-client` でアプリを起動できる。

---

## 3. 準備手順
1. **環境変数反映**
   - `.env`（mobile/backend 共通）に `DEMO_MODE=1` を設定。
   - `scripts/start_full_stack.sh` を実行すると Flask 側にも `DEMO_MODE` が伝播することを確認する。
2. **バックエンド起動**
   ```bash
   ./scripts/start_full_stack.sh --demo
   ```
   - `--demo` フラグは Demo Mode 用のシード投入（提案ドラフト, 既存ジャーナル, テストフレンド）を行う。
3. **モバイル起動**
   ```bash
   cd mobile
   expo start --dev-client
   ```
   - アプリ起動後、設定 → 「Demo Controls」 へ遷移できることを確認。
4. **接続確認**
   - Demo Controls 内の `Ping Demo API` をタップし、`200 OK` とレスポンス JSON が即時表示されることを確認。

---

## 4. デモシナリオ（想定 3 分）
| 時間 | 操作 | 説明 |
|------|------|------|
| 0:00 | 設定 → Demo Controls を開く | Demo Mode でのみ表示されることを説明 |
| 0:30 | 「AI 提案を生成」ボタン | `/demo/trigger_ai_proposal` が即時ドラフトを生成し、プッシュ通知をシミュレート |
| 1:30 | 通知を開いてドラフトを確認 | Demo Mode では push を即時にフロントへ挿入 |
| 2:00 | 「テーマサジェスト」ボタン | `/demo/trigger_theme` でテーマ候補を一覧表示 |
| 2:30 | 「人物マッチ」ボタン | `/demo/trigger_people_match` で顔マッチ結果を表示 |
| 3:00 | Demo Mode フラグを無効化した画面を提示 | `DEMO_MODE=0` で UI が非表示になることを示す |

---

## 5. トラブルシューティング
- **Demo Controls に入れない**: SettingsContext が `demoModeEnabled` を取得できていない。`.env` の Expo 再読み込み（`expo r -c`）を実施。
- **AI 提案が生成されない**: Flask ログで `DEMO_MODE disabled` エラーが出ていないか確認。`scripts/minio_setup.sh --demo` でサンプルアセットを再投入。
- **通知が飛ばない**: Demo Mode ではローカル通知を擬似送信する。`mobile/src/services/notifications/demoNotifier.ts` のログを確認。

---

## 6. 後片付け
1. アプリを終了し、`expo start` を停止。
2. `scripts/start_full_stack.sh --stop` でバックエンドを停止。
3. `.env` の `DEMO_MODE` を `0` に戻す。
4. `firebase-debug.log`, `mobile_web.log` などデモ用ログを削除。

---

## 7. 参照
- `development_flow/tasks/DE/DE.1_Demo_Mode/DE.1.0_demo_mode_toggle.md`
- `docs/features/ai_proposal.md`
- `docs/features/theme_generator.md`
- `docs/features/people_match.md`
