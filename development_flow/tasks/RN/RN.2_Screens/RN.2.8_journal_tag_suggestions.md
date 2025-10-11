# RN.2.8 Screen — Journal Tag Suggestions (F11 integration)

概要
- ジャーナル投稿時に F11 の顔マッチ候補を利用してタグ付けを補助し、docs/features/journal.md の「投稿時に自動タグ候補表示」を満たす。

依存
- RN.2.4 Journal（アセットアップロード）
- RN.2.7 Journal Timeline MVP（基本 CRUD 導線）
- RN.3.2 apiClient（/ai/people/match 呼び出し）
- FL.3.4 journal_entries API
- FL.3.2 people_match API

成果物
- ジャーナル投稿 UI に顔マッチ候補の取得・表示を追加
- 候補に対する選択/解除とタグ入力欄への反映
- リトライ/エラー表示、読み込みスピナー
- i18n 文言とユニットテスト（補助ロジック）

受け入れ条件
- 投稿フォームで「タグ候補」取得ボタンまたは自動取得があり、`fetchPeopleMatches` を通じて最新の `asset_id` から候補を取得する
- 候補リストから選択するとタグの配列に追加され、現在の入力値と重複しない
- API 失敗時にユーザーへエラーが表示され、再試行ができる
- 候補がない場合/機能が無効の場合の空状態文言を表示
- Expo/React Native Web 双方で動作

参照
- docs/features/journal.md
- docs/features/people_match.md
- development_flow/tasks/FL/FL.3_API/FL.3.2_people_match.md

---
依頼テンプレート

タスクID: RN.2.8 Screen — Journal Tag Suggestions (F11 integration)

依頼文:
- ジャーナル投稿フォームに顔マッチ候補を表示できるようにし、選択した候補をタグ配列へ反映してください。

提出物:
- 画面差分、ロジック/テスト
- 動作/テストログ
