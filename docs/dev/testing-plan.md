# テスト計画

最終更新: 2025-09-02 (Asia/Tokyo)

Recall の品質保証のための多層テスト戦略を定義します。各レイヤーでの責務を明確化し、早期検出と安全なリリースを両立します。

---

## 1. 単体テスト（Unit）

対象
- 提案状態遷移（pending → agreed/rejected/canceled）
- 投票集計（ok/maybe/ng）と確定ロジック
- Google id_token 検証（JWK モック）
- DB リポジトリ（SQLAlchemy）: CRUD と制約違反

基準
- 分岐網羅率: 80%以上
- 実行時間: 1 分以内

---

## 2. 統合テスト（Integration）

対象
- `/proposals` 作成→`/reaction`→合意→グループ生成（Tx）
- `/proposals/{id}/slots/vote`→`/groups/{id}/schedule/confirm`
- 画像アップロード→ワーカーで埋め込み→検索 API

手法
- Flask の TestClient + テスト DB（PostgreSQL コンテナ）
- 外部サービスはモック（FCM, S3, LLM）

---

## 3. エンドツーエンド（E2E）

対象
- ログイン→提案作成→Like 合意→チャット表示
- 通知タップ→ディープリンク→詳細画面遷移

手法
- Detox（React Native）
- 事前にモバイルビルド（Debug）とテストサーバを起動

---

## 4. 負荷/性能（Performance）

対象
- 近傍検索: k=20, 10万件
- Push バースト: 1,000 通/分
- 提案一覧: p95 レイテンシ

手法
- Locust/K6 でシナリオ定義
- Bottleneck 特定後にキャッシュ・インデックス調整

---

## 5. セキュリティ/プライバシー

対象
- 権限昇格・間接参照（IDOR）
- ブロック関係のバイパス防止
- 署名URLの漏洩・期限超過ハンドリング

手法
- ZAP/Burp を用いた動的解析（ステージング）
- 重要APIに対する negative テスト

---

## 6. 回帰/リリース判定

ゲート
- 必須ジョブ成功（lint/test/build）
- 重大欠陥 0 件、E2E ハッピーシナリオ成功

ロールアウト
- サーバ: Blue-Green or Traffic Split（Cloud Run 等）
- モバイル: 段階配信（10%→50%→100%）/ ロールバック手順定義
