# RN.2.14 Screen — Scheduling Helper

概要
- VLM 抽出結果（予定候補・メンバー候補）をグループチャット/提案フローで提示し、ユーザーが編集・確定できる UI を実装します。

依存
- RN.2.2 Groups & Chat
- FL.3.5 API, FB.3.1/3.2（スケジュール連携）
- docs/features/scheduling.md, docs/features/proposal.md

成果物
- 新規画面または既存コンポーネント拡張（Scheduling Helper パネル）
- React Query / Context 連携
- ユニット・スナップショットテスト

受け入れ条件
- `/ai/schedule/from_image` のレスポンスから候補リストを表示し、編集（ON/OFF, 文言修正）できる。
- 編集内容を Firebase Functions（提案/日程確定）に送れる。
- メンバー候補は顔写真/名前/信頼スコア付きで表示、ユーザーがマニュアルで追加・削除可能。
- バックエンド失敗時はオフライン扱いでローカルドラフト保存。
- アクセシビリティ: VoiceOver/大きな文字サイズに対応、i18n も考慮。

手順(推奨)
1) FL.3.5 のレスポンス型を API クライアントに追加。
2) Groups / Proposals 画面に Scheduling Helper パネルを埋め込み。
3) 編集アクションを Context/Mutation で実装し、日程確定 API/Firebase へ渡す。
4) UI テストとスナップショットで主要ケース（候補あり/なし/エラー）を確認。

参照
- docs/features/scheduling.md
- docs/backend/flask-architecture.md（VLM）
- development_flow/RN_ReactNative.md (RN.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.14 Screen — Scheduling Helper

依頼文:
- `/ai/schedule/from_image` の結果を表示・編集できる Scheduling Helper UI を実装し、日程決定フローと連携してください。

提出物:
- 画面/コンポーネント実装
- テスト結果（UI/logic）と動作確認メモ
