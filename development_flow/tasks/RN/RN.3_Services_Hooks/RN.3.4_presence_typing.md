# RN.3.4 Service — Presence/Typing

概要
- presence 更新と typingIn の更新/購読ロジックを実装。

依存
- docs/firestore/presence_schema.md
- FB.2.3 Firestore Rules — Presence Write Own

成果物
- src/services/presence.ts

受け入れ条件
- 接続/切断/バックグラウンドでの状態整合。
参照
- docs/features/group.md の typing 表示/既読表示要件を満たし、presence の TTL/バックグラウンド更新を実装する。
- 自身以外の presence は購読のみ（書き込み禁止）、ネットワーク断復帰時に再同期する。

手順(推奨)
1) on/offline ハンドリング
2) typingIn のスロットリング

- docs/features/group.md
- development_flow/RN_ReactNative.md (RN.3.4)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.3.4 Service — Presence/Typing

依頼文:
- presence 更新と typingIn 更新/購読ロジックを実装し、接続/切断/バックグラウンド時の整合を確認してください。

提出物:
- 実装差分、テスト/確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
