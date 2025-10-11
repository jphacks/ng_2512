# SEC.2 Design — API Key/HMAC (/ai/*)

概要
- RN→Flask 間の署名方式（timestamp/nonce/HMAC）を設計し実装。

依存
- FL.3.*（API面の契約/ルート定義。契約先行）

成果物
- サーバ側検証ミドルウェア、クライアント署名ユーティリティ

受け入れ条件
- リプレイ攻撃防止、クロックずれ許容、キー管理手順（ローテーション/失効）を定義。
参照
- docs/features/theme_generator.md / people_match.md / ai_proposal.md のリクエストを署名対象に含め、監査ログ（requestId, timestamp, clientId）を記録する。
- 改ざん/期限切れ/nonce 再利用の負テストを整備し、CI に組み込む。

手順(推奨)
1) 署名仕様書（canonical string）
2) サーバ検証/クライアント実装
3) 負テスト（改ざん/期限切れ）

- docs/features/theme_generator.md
- docs/features/people_match.md
- docs/features/ai_proposal.md
- development_flow/SEC_Security.md (SEC.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: SEC.2 Design — API Key/HMAC (/ai/*)

依頼文:
- 署名仕様（canonical string）を策定し、サーバ検証ミドルウェアとクライアント署名ユーティリティを実装。改ざん/期限切れの負テストを通してください。

提出物:
- 実装差分、仕様書、テスト、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）