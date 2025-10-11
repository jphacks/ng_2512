# FB.5.0 Operations — Emulators/Deploy/Monitor

概要
- エミュレータでのローカル検証、Functions/Rules のデプロイと監視整備。

依存
- FB.2〜4

成果物
- firebase.json, emulator config, deploy scripts, monitoring 手順

受け入れ条件
- エミュレータで主要フローの e2e 確認が可能
- 本番/開発プロジェクト切替が安全

手順(推奨)
1) emulator: firestore/functions/auth 設定
2) deploy: 対象指定・プレビュー運用
3) monitoring: エラー/レイテンシ可視化

参照
- docs/dev/ci-cd.md
- development_flow/FB_Firebase.md (FB.5)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.5.0 Operations — Emulators/Deploy/Monitor

依頼文:
- エミュレータ構成/デプロイ/監視の最小構成を整備し、主要フローのe2e確認がローカルで可能な状態にしてください。

提出物:
- firebase.json, emulator 設定, デプロイスクリプト, 手順書
- テスト実行ログ（該当テストを実行した場合はログを添付）
