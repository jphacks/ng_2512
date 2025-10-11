# FB.2.3 Firestore Rules — Presence Write Own

概要
- presence/{userId} は本人のみ write 可、他者は read のみ。

依存
- docs/firestore/presence_schema.md

成果物
- firestore.rules の presence セクション
- ルール単体テスト

受け入れ条件
- userId==auth.uid の write のみ許可
- 他は read のみ、list 制限

手順(推奨)
1) presence/* への条件実装
2) エミュレータテスト（本人/他人）

参照
- docs/firestore/presence_schema.md
- docs/mobile/firebase-architecture.md
- development_flow/FB_Firebase.md (FB.2.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.2.3 Firestore Rules — Presence Write Own

依頼文:
- presence/{userId} は本人のみ write、他は read のみとなるルールを実装し、本人/他人のテストケースを用意してください。

提出物:
- ルール差分、テスト、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
