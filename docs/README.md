# Recall アプリ — 技術仕様書（README）

最終更新: 2025年9月02日

---

## 🔰 0. 概要（What is Recall?）
Recall は「**久しく連絡を取っていない知人**との再接触」を心理的・技術的に支援するアプリケーションです。  
ユーザは気軽な形で提案を出し、**全員が「いいね」した場合のみ**グループが可視化され、会話・日程調整が始まる設計です。  
気まずさの排除、匿名的合意形成、Push通知による予定確定の円滑化などを特徴とします。

---

## 🧩 1. 機能一覧（Features）

| ID   | 機能名                             | 説明 |
|------|------------------------------------|------|
| F01  | 認証                               | Google OAuthによるログインとセッション維持 |
| F02  | 提案（匿名・個人向け）             | 特定メンバーへの非公開提案の作成と配信 |
| F03  | 合意収集                           | 提案に対する「いいね」を集め、全員一致時にグループ化 |
| F04  | グループ & チャット                | 成立したグループでBot導入後にチャットを開始 |
| F05  | 日程調整                           | 候補日時に対する投票→最適な日時を決定 |
| F06  | 通知（Push）                       | 合意成立・予定確定・リマインドなどを通知 |
| F07  | SNS友だちインポート                | 連携SNSからの知人候補取り込み（任意） |
| F08  | プライバシー/通報/ブロック         | 安全性の担保と利用制限処理 |
| F09  | 設定・アクセシビリティ             | 言語/ダークモード/通知設定等 |
| F10  | 遊びテーマ生成（写真共有から）     | 共有された写真から類似コンテキストを抽出しテーマを生成 |
| F11  | 知人マッチング（写真共有から）     | 共有された写真の人物をベクトルで照合し知人候補を提示 |
| F12  | AI提案自動送信（写真共有から）     | 共有された写真からAIが即時提案を生成→Botが自動送信 |
| F13  | ユーザー主導提案（手動作成）       | ユーザーが直接入力して提案を作成（F02連携） |
| F14  | 思い出ジャーナル                   | 写真を投稿・整理し、過去の思い出から再会を提案する |
| F15  | フレンド（相互承認）               | 申請→承認で対等なフレンド関係を確立 |

---

## 🏗️ 2. 技術構成（Architecture）

```
React Native (Expo)
├── React Navigation / React Query / React Context
├── Firebase Messaging（通知）
└── MMKV + SecureStore（セッション）

Firebase Server（独立運用）
├── Cloud Functions（Presence/Realtime/軽ロジック）
├── Firestore/RTDB（リアルタイム配信, Typing/Presence）
└── Firebase Auth（Custom Token 経由で認証）

Flask (Python API Server)
├── SQLAlchemy + PostgreSQL + pgvector
├── ローカルAI: CLIP / ArcFace 埋め込み・chatgpt-oss-20b 生成（外部API不使用）
└── AI REST (/ai/*) とベクトルDB参照専用

Object Storage（画像/S3）
Queue（RQ/Celery）
```
- フロント: React Native (iOS/Android 両対応)
- サーバAI: Flask 上でローカルモデルを実行（外部AIに依存しない）
- 通知: Firebase Cloud Messaging（FCM） + APNs

---

## 🔒 2.1 サービス境界（責務分担）

- React Native（モバイルクライアント）: 画面/状態管理/各サーバへのAPI呼び出し/ローカル保存。
- Firebase Server（独立）: リアルタイム機能（メッセージ配信、Typing/Presence）、軽量集計。FireStore への書込/購読。FunctionsでACL補強。
- Flask AI サービス（個人サーバ）: データベース（PostgreSQL/pgvector）に保存された画像/顔のベクトルを取得し、ローカルAI（CLIP/ArcFace/chatgpt-oss-20b）を実行して結果を返す役割に特化（AIマイクロサービス）。
- Firebase バックエンド: 認証、アプリ業務データ、リアルタイム配信の権威。Functions/Firestore/Rules を運用。
- 同期: アプリ業務データは Firebase が権威。Flask は埋め込み/アセット関連のDBのみを参照・更新。
- 通信: RN→Flask は HTTPS REST（Bearer）。RN→Firebase は Firebase Auth（Custom Token）で Firestore/Functions へ。

---

## 🛠️ 2.2 デプロイ（個人サーバ想定）

- Flask: 個人サーバ（Ubuntu）で Gunicorn + systemd。役割はベクトルDB参照とローカルAI実行に限定。
- AI: chatgpt-oss-20b は vLLM を同居サーバで提供（GPU/量子化は環境に応じ選択）。
- Firebase: プロジェクト単位で独立運用（Functions/Firestore/Rules のデプロイ）。
- 詳細: `backend/flask-architecture.md` と `dev/ci-cd.md` のセルフホスト節を参照。

---

## 📁 3. 仕様書の配置
```
docs/
├── README.md
├── features/
│   ├── auth.md            (F01)
│   ├── proposal.md        (F02)
│   ├── agreement.md       (F03)
│   ├── group.md           (F04)
│   ├── scheduling.md      (F05)
│   ├── notification.md    (F06)
│   ├── contacts.md        (F07)
│   ├── privacy.md         (F08)
│   ├── settings.md        (F09)
│   ├── theme_generator.md (F10)
│   ├── people_match.md    (F11)
│   ├── ai_proposal.md     (F12)
│   ├── user_proposal.md   (F13)
│   ├── journal.md         (F14)
│   └── friend.md          (F15)
├── backend/
│   ├── api-spec.md
│   ├── data-model.md
│   ├── flask-architecture.md
│   └── flask-vector-arch.md
├── mobile/
│   ├── rn-structure.md
│   └── firebase-architecture.md
└── dev/
    ├── ci-cd.md
    └── testing-plan.md
```

---


## 📌 4. ドキュメント利用の流れ

1. `README.md`（本書）で全体像と構成を確認  
2. `features/` から関心のある機能仕様へアクセス  
3. `backend/` でAPI仕様やデータ設計を確認  
4. `mobile/` でReact Native構成や画面仕様を確認  
5. `dev/` で開発支援・自動生成・CI/CD戦略を確認

---

## 📈 5. 非機能要件（抜粋）

| 項目         | 目標値 |
|--------------|--------|
| アプリ起動時間 | ≤ 2.5秒 |
| 通知到達時間 | ≤ 20秒（p95） |
| 類似画像検索 | ≤ 150ms（k=20） |
| グループ重複 | 不可（Tx保証） |
| クラッシュ率 | < 1.0% |
| 画像流出     | 不可（署名URL） |

---

## 🔐 6. セキュリティとプライバシー

- 生画像/顔情報は同意ユーザに限定
- 全データに対する削除請求権の明示
- JWT署名鍵のKMS保管、証明書ピン留め（任意）
- 提案者情報は一貫して**非公開（提案UI非開示）**

---

## 🧪 7. テストと品質保証

- 単体テスト: 投票集計/Like集計/提案期限判定ロジック
- 統合テスト: グループ生成Tx、スケジュール確定
- E2Eテスト: Detox（RN）で「ログイン→いいね→日程調整」一連フロー
- 負荷テスト: Vector検索10万件 p95、Push同時発火 etc.

---

## 🤖 8. 自動生成（AI補助）

開発支援のためのプロンプト/スニペット集（別途追加予定）:
- `useAuth()` をReact Nativeで実装
- `/ai/themes/suggest` をベクトル類似+LLMで実装（サーバ）
- 顔照合 `/ai/people/match` と基準顔登録を実装（サーバ）

---

## 📤 9. 将来拡張（vNext）

- WebSocket通知、@メンション、いいねランキング
- 提案テンプレの学習（A/B テーマ生成）
- 自動キャンセル処理（期限自動管理）

---
