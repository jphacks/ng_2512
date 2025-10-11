# FL.3.3 API — POST /ai/proposal_drafts (F12 自動提案ジョブ I/F)

概要
- F14 ジャーナル投稿で発行された `asset_id`・人物タグ・撮影メタデータを入力に、再会提案ドラフト（タイトル/本文/候補日時/対象候補）を生成する内部 API を提供する。
- 戻り値は Firebase 側が Firestore に `status='draft'` で保存できる JSON スキーマとする。
- ガードレール/テンプレ最適化により、docs/features/ai_proposal.md の体験品質を満たす。

依存
- FL.2.3（CLIP/ArcFace/vLLM サービス）
- FL.2.2（asset 取得/前処理）

成果物
- エンドポイント: `POST /ai/proposal_drafts`
- プロンプト/テンプレ構成と温度/トークン設定値（設定ファイル）
- ユニットテスト（代表的な写真/タグ入力に対する出力検証）

受け入れ条件
- CLIP/ArcFace で抽出した特徴量を用い、参加候補（displayName/uid/確信度）とテーマ/本文/候補日時（最大3件）を出力する。
- 不適切表現フィルタと NG ワードチェックを通過した場合のみ `draft` を返し、それ以外は `reason` を含むエラーを返す。
- プロンプト/テンプレ修正だけで通知文面（タイトル+本文）が docs/features/ai_proposal.md の例と同等品質になる。
- すべてのレスポンスに `source: 'ai'`, `confidence`, `expiresAt`（通知タイミングの目安）を含める。

手順(推奨)
1) 入力スキーマ整理（asset 情報取得、人物 embedding 解決、ヒント正規化）
2) ai_service でタイトル/本文/候補日時を生成し、NG ワード/安全フィルタを通す
3) 生成結果を JSON Schema と単体テストに落とし込む

参照
- docs/features/ai_proposal.md
- development_flow/FL_FlaskAI.md (FL.3.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.3.3 API — POST /ai/proposal_drafts

依頼文:
- F14 ジャーナルのコンテキストを入力に、AI 提案ドラフトを生成する内部 API を実装してください。安全フィルタ、信頼度スコア、JSON スキーマ、単体/統合テストを含めてください。

提出物:
- 実装差分、OpenAPI、テスト、プロンプト方針
- サンプル入力（journalEntry/asset）とレスポンス例
- テスト実行ログ（該当テストを実行した場合はログを添付）
