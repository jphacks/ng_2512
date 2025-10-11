# RN.2.6 Screen — Settings/Notifications

概要
- 通知カテゴリ、言語、テーマなどのグローバル設定と通知権限管理に加えて、AI 関連機能（F11/F12）のオプトイン状態を管理する。

依存
- RN.3.3

成果物
- src/app/settings/*

受け入れ条件
- 通知ON/OFFが実際の購読に反映され、docs/features/notification.md のカテゴリ（提案/合意/メッセージ/フレンド/リマインダー/AI）を切り替え可能。AI カテゴリを OFF にした場合、AI ドラフト通知（F12）は受信しない。
- F11 顔マッチングはデフォルト OFF とし、ON にした際に `/users/me/face_embedding` への基準顔登録フローを実行・リトライできる。OFF にすると登録済み埋め込みの削除 API を呼び出す。
- F12 AI 提案通知のトグルは `/proposals/{id}/approve_and_send` を直接呼び出すショートパス（RN.3.3 連携）と連動し、無効時は共有シート経由の AI 解析も起動しないようガードする。
- 言語/テーマ変更が即時適用され、再起動後も保持される。設定値は MMKV/SecureStore（docs/mobile/rn-structure.md）に保存し、起動時に再適用する。
- プライバシー関連の説明（顔認識はオプトイン済み友人に限定、外部AI非使用）と利用規約リンクを表示し、同意チェックが完了するまで F11/F12 の切替ができない。

手順(推奨)
1) 設定画面
2) FCM トークン登録/解除

参照
- docs/features/settings.md
- docs/features/notification.md
- docs/features/people_match.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.6 Screen — Settings/Notifications

依頼文:
- 通知トグル/権限管理/言語/テーマ設定を実装し、通知ON/OFFが購読に反映されることを確認してください。

提出物:
- 実装差分、確認動画orログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
