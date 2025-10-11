# RN.3.5 Service — Journal Service Enhancements

概要
- ジャーナル投稿の署名 URL 取得、ローカルキャッシュ、VLM スケジュール連携を担うサービス層を整備します。

依存
- RN.2.4 Journal, RN.2.7 Timeline, RN.2.14 Scheduling Helper
- FB.3.4 署名URL, FL.3.5 スケジュール抽出
- docs/features/journal.md

成果物
- `journalService`（想定）: 署名URL発行、アップロード、/ai/schedule/from_image 呼び出し
- React Query ミューテーション/キャッシュ
- 正常/失敗パスのテスト

受け入れ条件
- 画像選択→署名 URL 発行→アップロード→AI 抽出→ジャーナル保存までを一貫して扱う。
- アップロード前後でローカルドラフトを保持し、失敗時に再送キューへ投入。
- `/ai/schedule/from_image` 結果を取得し Scheduling Helper へ渡す。
- エラー/タイムアウト時はユーザーに再試行/手動入力を提示。

手順(推奨)
1) 既存 `journal.ts` や `apiClient` を拡張しサービスを定義。
2) FCM 通知と整合させながらスケジュール抽出結果をキャッシュ。
3) ユニットテストでアップロード成功/失敗/AI失敗/再試行ケースを網羅。

参照
- docs/features/journal.md
- docs/backend/flask-architecture.md
- development_flow/RN_ReactNative.md (RN.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.3.5 Service — Journal Service Enhancements

依頼文:
- ジャーナル投稿～VLM スケジュール抽出までのワークフローを管理する `journalService` を実装し、再試行とキャッシュを含めてテストしてください。

提出物:
- サービス実装と関連テスト
- 実行ログ/メモ（代表シナリオ確認）
