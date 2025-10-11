# DE.1.0 Demo Mode — Presentation Toggle

概要
- プロダクトデモ時に AI 提案（F12）やテーマサジェスト（F10）などのバックエンド処理をワンタップで起動できる「Demo Mode」フラグを実装する。
- Expo/Flask/Firebase それぞれで `DEMO_MODE` を有効化すると、即時応答用のエンドポイントとテストデータが整う状態を提供する。
- デモ当日にネットワーク遅延や非同期ジョブ待ちが発生しても、再現性の高いシナリオで機能紹介ができるようにする。

依存
- RN.2.1, RN.2.6 （提案/設定画面が実装済みであること）
- RN.3.2, RN.3.3 （API クライアントと通知経路が整備済み）
- FL.3.3, FL.3.4 （AI 提案/ジャーナル API）
- FB.3.5 （通知トリガとドラフト配信の仕組み）

成果物
- `mobile/src/context/SettingsContext.tsx`, `mobile/src/screens/settings/SettingsScreen.tsx` に Demo Mode フラグと制御パネルを追加
- `mobile/src/screens/demo/DemoControlsScreen.tsx`（新規）: デモ用の即時トリガ UI
- `mobile/src/services/apiClient.ts` に Demo API（`/demo/*`）の呼び出しを追加
- `backend/app/demo.py`（新規, Flask Blueprint）および `/demo/trigger_ai_proposal`, `/demo/seed_friends` などのエンドポイント
- `docs/dev/runbooks/demo_mode.md` にオペレーション手順を追記
- `.env.example`, `scripts/start_full_stack.sh` へ `DEMO_MODE` フラグ取り扱いを追加

受け入れ条件
- `DEMO_MODE=1` を設定してアプリを起動すると、設定画面から Demo Controls に遷移でき、AI 提案生成・テーマサジェスト・人物マッチングを任意のタイミングで起動できる。
- Demo Mode で生成されたデータ（提案/テーマ/人物候補）はデモ用スコープに隔離され、本番ユーザーへ通知されない。
- フラグを無効化すると、Demo Controls UI と `/demo/*` エンドポイントはアクセス不可になる。
- Demo Mode 有効時の操作ログが backend 側で `INFO` レベルの構造化ログとして記録される。
- Runbook（docs/dev/runbooks/demo_mode.md）の手順に従って 5 分以内でデモ準備（初期データ投入→アプリ接続）が完了する。

手順(推奨)
1. 共通設定: `.env`, Expo Config, Flask Config に `DEMO_MODE` を追加し、SettingsContext にフラグを伝播させる。
2. Backend: Flask に Demo Blueprint を追加し、AI 提案/テーマ/人物マッチングを即時呼び出す同期エンドポイントとスタブデータ投入スクリプトを実装する。
3. Frontend: Demo Controls 画面を新設し、各操作（提案生成/テーマ生成/人物マッチング/通知送信）ボタンと結果モーダルを実装する。
4. QA: Demo Mode が無効な状態で UI/API がアクセスできないこと、Runbook の手順通りに一連のデモが再現できることを手動確認する。

参照
- docs/features/ai_proposal.md, docs/features/theme_generator.md, docs/features/people_match.md
- docs/dev/runbooks/demo_mode.md（本タスクで新設）
- development_flow/TASK_INDEX.md（本タスク追加後に更新）

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: DE.1.0 Demo Mode — Presentation Toggle

依頼文:
- Demo Mode フラグを追加し、AI 提案/テーマ/人物マッチを任意タイミングで起動できるデモ用 UI と `/demo/*` API を実装してください。

提出物:
- 実装差分、Demo Mode 動作確認ログまたは動画
- フラグ無効化時のアクセス制限が確認できるログ
