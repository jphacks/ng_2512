# Recall モバイル UI ガイド

最終更新: 2025-09-02 (Asia/Tokyo)

Recall モバイルアプリの主要画面と遷移を整理し、UX ドキュメントとの整合を保つためのガイドです。

---

## 1. 目的

- プロトタイプ時点で実装予定の画面を一覧化してチーム内の共通認識を作る
- 画面間の遷移パターンを明確化し、ナビゲーション実装の前提を固定する
- UX パターン集 (`docs/mobile/ux-patterns.md`) と連携し、詳細挙動の参照元を定義する

---

## 2. 画面インベントリ

| ID | 画面名 | 主な目的 | キーアクション | 代表コンポーネント |
|----|--------|----------|----------------|--------------------|
| 2.1.1 | 「提案」タブ（Main Choice） | 初回表示で提案作成の入口を提示 | AI 提案/手動作成の選択、提案タップ | `ProposalsListScreen`、`PrimaryChoiceCard` |
| 2.1.2 | Friend Selector | 提案に招待する友人を選択 | チェックボックス選択、検索、決定 | `FriendSelectModal`、`UserCheckboxList` |
| 2.1.3 | Proposal Creation Form | 新規提案の詳細入力 | タイトル・場所入力、候補日時追加、送信 | `ProposalForm`、`DateTimePicker` |
| 2.2.1 | "Chat" Tab - Main List | 参加チャットの一覧確認 | チャットタップ、グループ作成ボタン | `ChatListScreen`、`ChatListItem` |
| 2.2.2 | Received Proposal in Chat | チャット内の提案カード対応 | 承諾/辞退ボタン、提案詳細確認 | `ProposalCardInChat`、`ReactionButtons` |
| 2.2.3 | Standard Chat View | グループでの会話・共有 | メッセージ送信、写真添付、既読確認 | `ChatScreen`、`MessageComposer` |
| 2.3.1 | "アルバム" タブ - Gallery | フォトライブラリ全体の閲覧 | タブ切り替え、写真タップ | `AlbumGalleryScreen`、`PhotoGrid` |
| 2.3.2 | 「個人アルバム」タブ | 個人写真の閲覧と共有準備 | 写真選択、共有導線タップ | `PersonalAlbumGrid`、`PhotoTile` |
| 2.3.3 | 「共有アルバム」タブ | 共有済み写真の確認 | グループ別カードタップ、写真閲覧 | `SharedAlbumList`、`GroupThumbnailCard` |
| 2.3.4 | Photo Selection Mode | 複数写真選択と共有操作 | 複数選択、友達と共有ボタン | `PhotoSelectionOverlay`、`BulkActionBar` |

---

## 3. 画面遷移（アロー図）

```
常時表示: [Proposal] [Chat] [Album]
     |         |        |
     v         v        v
 2.1.1      2.2.1    2.3.1
 「提案」   "Chat"    "アルバム"
 タブ      Tab       タブ

Proposal フロー
 2.1.1 「提案」タブ（Main Choice）
   ├─手動作成──> 2.1.2 Friend Selector
   │                 └─入力完了──> 2.1.3 Proposal Creation Form
   └─AI提案───> 2.1.3 Proposal Creation Form
                           └─送信/投稿──> 2.2.1 "Chat" Tab - Main List

Chat フロー
 2.2.1 "Chat" Tab - Main List
   └─提案カードを開く──> 2.2.2 Received Proposal in Chat
         └─リアクション/詳細──> 2.2.3 Standard Chat View

Album フロー
 2.3.1 "アルバム" タブ - Gallery
   ├─個人タブ──> 2.3.2 「個人アルバム」タブ
   │               └─写真選択──> 2.3.4 Photo Selection Mode
   │                                 └─共有ボタン──> 2.1.2 Friend Selector
   └─共有タブ──> 2.3.3 「共有アルバム」タブ
                     └─サムネタップ──> 2.1.2 Friend Selector
                                         └─既存グループ選択──> 2.2.3 Standard Chat View

どの画面にいても下部ナビゲーションから Proposal / Chat / Album に戻れる。
```

---

## 4. 補足メモ

- コード参照: `mobile/src/navigation/RootNavigator.tsx`
- UX 状態詳細は `docs/mobile/ux-patterns.md` の該当セクションを参照。
- 画面 ID は Figma のページ名と一致させる。
