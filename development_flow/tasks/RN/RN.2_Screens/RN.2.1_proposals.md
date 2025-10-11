# RN.2.1 Screen — Proposals

概要
- 一覧/詳細/作成/反応 UI と Functions 呼び出しを実装。
- AI ドラフト（`source='ai'`, `status='draft'`）を通知→詳細画面で確認し、その場で `approve_and_send` を呼び出せるようにする。

依存
- docs/firestore/proposals_schema.md
- FB.3.1 Cloud Functions — Proposals Lifecycle

成果物
- src/app/proposals/* コンポーネント/ナビゲーション

受け入れ条件
- 作成→反応→合意の基本フローが成立し、docs/features/proposal.md / user_proposal.md の匿名表示・リアクション要件を満たす。
- AI ドラフトをディープリンクで開いた場合、差分表示（AIが生成した旨、提案文面、候補日時、confidence）と `[送信する]` アクションが提供される。承認フローは docs/features/ai_proposal.md の文言（送信する/詳細を見る/今はしない）と整合する。
- `POST /proposals/{id}/approve_and_send` 実行後は即座に `status='pending'` を反映し、二重送信を防ぐローディング状態とトーストを表示する。送信済みの提案は受信者側に AI 生成であることを表示しない。
- エラー/ローディング/空状態のUX、および `今はしない` 選択時の戻り動作を実装する。
- AI ドラフトは RN.3.3 で受信した通知キューと同期され、未処理数バッジを一覧に表示する。ドラフトを破棄した場合は Firestore 上で `status='dismissed'` に更新して通知を消す。
- 提案一覧にユーザー名検索バーを設け、提案者または宛先のユーザー名で絞り込みできる。
- 宛先指定は RN.2.5 で設定した `@username` を入力/Toggle で行い、UID 入力は不要にする。存在しないユーザー名は送信前に検出してエラー表示する。

手順(推奨)
1) 一覧/詳細/作成フォーム
2) react/cancel 呼び出し
3) ステータス表示/バッジ（draft/pending/agreed...）
4) AI ドラフト詳細の UI（AI ラベル、送信/閉じる）と `approve_and_send` 呼び出し

参照
- docs/features/proposal.md
- docs/features/user_proposal.md
- docs/features/ai_proposal.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.1 Screen — Proposals

依頼文:
- 一覧/詳細/作成/反応 UI と Functions 呼び出しを実装し、作成→反応→合意の基本フローに加えて AI ドラフト承認（通知ディープリンク→`approve_and_send`）まで通してください。

提出物:
- 画面/ナビゲーション/呼出コード、動作確認動画orログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
