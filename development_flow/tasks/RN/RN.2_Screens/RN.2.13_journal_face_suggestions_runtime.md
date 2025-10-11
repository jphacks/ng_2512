# RN.2.13 Screen — Journal Face Suggestions Runtime UX

概要
- docs/features/journal.md (F14) の「投稿時に自動タグ候補を表示」をモバイル実装に反映し、顔マッチ候補の取得と UI 表示を実装する。
- RN.2.8 で設計された F11 連携の具体的な実装を仕上げ、ユーザーが写真を選択した瞬間に候補を確認できるようにする。

依存
- RN.2.4 Journal（アセットアップロード基盤）
- RN.2.7 Journal Timeline MVP
- RN.2.8 Journal Tag Suggestions (設計)
- RN.3.2 apiClient（HMAC サイン）
- FL.3.2 people_match API

成果物
- Journal 投稿フォームで assetId 選択時に `/ai/people/match` を呼び出す処理
- 候補ユーザーの表示/選択 UI とアクセシビリティ調整
- エラー時のリトライ、空状態文言、i18n 追加
- 候補の採用・解除時のタグ配列更新処理

受け入れ条件
- 写真を選択すると自動的に顔マッチ候補の取得が始まり、ローディング/エラー表示が行われる
- 表示された候補をタップするとタグに追加され、重複は除去される
- 候補が存在しない場合は空状態文言を表示する
- HMAC API 呼び出しが失敗した場合でもユーザーが再試行できる
- Expo（Web）とネイティブ双方で動作し、VoiceOver/TalkBack で候補の読み上げが行える

参照
- docs/features/journal.md
- docs/features/people_match.md
- development_flow/tasks/RN/RN.2_Screens/RN.2.8_journal_tag_suggestions.md
- development_flow/tasks/FL/FL.3_API/FL.3.2_people_match.md
