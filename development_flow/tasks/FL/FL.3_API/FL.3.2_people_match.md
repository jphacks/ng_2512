# FL.3.2 API — POST /ai/people/match

概要
- フレンド範囲での顔一致候補を返すAPI。

依存
- FL.2.1, FL.2.3

成果物
- エンドポイント、OpenAPI、統合テスト（vLLM/DB込み）

受け入れ条件
- asset→顔検出→候補{box, candidates[{user_id, displayName, score}]} を返却し、docs/features/people_match.md の UI 情報を満たす。
- 候補はリクエストユーザーのフレンドかつオプトイン済みユーザーに限定し、設定で OFF の場合は空配列を返す。
- 顔検出/推論の時間・スコアの上限制御、HMAC 署名、リクエストレート制御を実装。
- 監査ログに asset_id, faces_count, filtered_count を記録し、プライバシー配慮（非フレンドや未オプトインはログに残さない）。

手順(推奨)
1) OpenAPI 草案
2) 近傍検索+候補整形
3) 統合テスト（docker-compose.test）

参照
- docs/features/people_match.md
- docs/backend/api-spec.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.3.2 API — POST /ai/people/match

依頼文:
- 顔検出→近傍検索→候補整形の処理を実装し、HMAC 検証/上限制御を含むエンドポイントを提供、compose 統合テストを通してください。

提出物:
- 実装差分、OpenAPI、統合テスト、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）