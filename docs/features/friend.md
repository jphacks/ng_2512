# F15: フレンド（相互承認）

最終更新: 2025-09-02 (Asia/Tokyo)

> 相互承認により対等なフレンド関係を結ぶ機能。申請→承認/却下→確定、の流れを提供し、ブロックや通知と整合します。

---

## 1. 目的
- 相手の同意に基づく安全なつながりを形成
- 提案時の宛先選択や検索での優先表示、連絡体験の向上
- スパム抑止（ブロック・重複申請防止・Rate Limit）

---

## 2. 概要と要件
- 相互承認型: 送り手（requester）が申請、受け手（addressee）が承認で成立
- 申請状態: `pending / accepted / declined / canceled`
- 確定関係: 対等（無向）。重複禁止、対称削除
- ブロック優先: ブロック時は pending 申請をキャンセル、確定関係は解除

---

## 3. UI/UX（React Native）
- FriendListScreen: 確定フレンド一覧（検索、並び替え：最近やり取り順）
- FriendRequestsScreen: 受信/送信タブ、pending を既定で表示
- UserProfileSheet: 「フレンド申請」/「申請取消」/「解除」ボタンの状態切替
- 通知: 申請受信/承認成立の Push（タップで該当画面に遷移）

---

## 4. API 定義（Flask）

詳細は `docs/backend/api-spec.md` を参照。要点のみ抜粋:

1) 申請作成  `POST /friends/requests`
```
{ "addressee_id": 456, "message": "よろしく！" }
→ 201 { "request_id": 123, "status": "pending" }
```
2) 申請一覧  `GET /friends/requests?direction=incoming|outgoing&status=pending`
3) 申請承認  `POST /friends/requests/{id}/accept` → 204（Txで friendships 追加）
4) 申請却下  `POST /friends/requests/{id}/decline` → 204
5) 申請取消  `POST /friends/requests/{id}/cancel` → 204
6) フレンド一覧  `GET /friends`
7) 解除  `DELETE /friends/{user_id}` → 204（対称削除）

制約・エラー
- 自分宛不可、ブロック中は 403/409
- 同一ペア pending 重複は 409（部分ユニークインデックスで保護）
- 権限: 申請操作は当事者のみ、承認/却下は受信側のみ可能

---

## 5. データモデル（抜粋）

`docs/backend/data-model.md` 参照。

```sql
CREATE TABLE friend_requests (... status CHECK IN (...));
CREATE UNIQUE INDEX uniq_pending_friend_request_pair
  ON friend_requests(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
  WHERE (status = 'pending');

CREATE TABLE friendships (
  user_id_a BIGINT NOT NULL,
  user_id_b BIGINT NOT NULL,
  CHECK (user_id_a < user_id_b),
  PRIMARY KEY (user_id_a, user_id_b)
);
```

整合性
- ブロック適用時: pending は `canceled`、friendships は削除
- ユーザ削除時: CASCADE で申請/関係を掃除

---

## 6. 通知（F06連携）
- 申請受信: 「フレンド申請が届きました」→ `FriendRequests` へ遷移
- 承認成立: 「フレンドになりました」→ `FriendList` へ遷移
- 設定: `PUT /notifications/preferences` の `friend` トグルで制御

---

## 7. 受け入れ基準（AC）
- ✅ 同一ペアの pending 申請は同時に1件のみ
- ✅ 受信者のみが承認/却下できる（権限チェック）
- ✅ 承認で `friendships` に1行（対称）作成、重複作成は不可
- ✅ 解除で対称の1行を削除
- ✅ ブロック成立時に pending 自動キャンセル、確定関係は解除
- ✅ 申請/承認時に適切な通知が届き、タップで該当画面に遷移

