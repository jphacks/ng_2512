# RN.4.0 Others — i18n/Accessibility/State

概要
- i18n, アクセシビリティ、React Context/React Query 構成を整備。

依存
- RN 基盤

成果物
- i18n 初期化、アクセシビリティ設定、状態管理レイヤ

受け入れ条件
- 言語切替・フォントスケールで破綻なし（docs/features/settings.md に準拠）。
- VoiceOver/TalkBack、コントラスト設定で主要画面が操作可能である。
- React Query/Context 構成が RN.2.* / RN.3.* と統合できるように設計される。

手順(推奨)
1) i18n 設定
2) 状態管理スケルトン
3) アクセシビリティ検証

参照
- docs/features/settings.md
- docs/mobile/ux-patterns.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.4.0 Others — i18n/Accessibility/State

依頼文:
- i18n 初期化、状態管理スケルトン、アクセシビリティ設定を整備し、言語切替/フォントスケールで破綻しないことを確認してください。

提出物:
- 実装差分、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）