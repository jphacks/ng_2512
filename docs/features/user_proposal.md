# F13: ユーザー主導提案（手動作成）— 詳細仕様

最終更新: 2025-09-02 (Asia/Tokyo)

> 本機能は **ユーザーが自分で内容を入力して提案を作成** するフローを提供する。  
> バックエンドAPIは F02（/proposals）を共用し、UI/バリデーション/テンプレート支援を追加する。  
> F12（AI自動送信）と並走可能で、ユーザーは **手動 or 自動** を選べる。

---

## 1. 目的
- AIに依存せず、ユーザーの意図を直接反映した提案を素早く作成。
- **匿名性の原則**は維持（合意成立まで提案者は公開されない）。
- 入力支援（テンプレート/候補生成）により手動でも負担を軽減。

---

## 2. 画面/UX（React Native）

### 2.1 画面構成
- `ManualProposalScreen`（Composer）
  - 入力: タイトル、本文（テーマ）、場所、日時候補（1〜6件）、締切、対象（audience）
  - 入力支援: テンプレート挿入（夜カフェ/ボードゲーム/昼散歩など）、候補時間のクイック追加（今週末/来週の夜）
  - バリデーション即時表示（締切・候補の重複/過去日時）
  - 送信: `作成して送る` → F02へ

- `ProposalsListScreen` / `ProposalDetailScreen` は F02 と同一

### 2.2 UX要件
- **匿名UI**：提案カードに提案者名は表示しない（成立後のみチャットで可視化）。
- 直前に作成したテンプレート/入力はローカルに自動保存（ドラフト）。
- 既存候補テンプレ（事前定義 JSON）をすぐ挿入できる。

---

## 3. API（F02 共用）

### 3.1 作成
`POST /proposals`  
入力スキーマは F02 に同じ。例：
```json
{
  "audience_ids": [123,456],
  "title": "近況ゆるっと夜カフェ",
  "theme": "軽くコーヒーで近況交換しませんか？",
  "place": "渋谷〜恵比寿",
  "slots": [
    {"start":"2025-09-06T18:30:00","end":"2025-09-06T20:30:00"},
    {"start":"2025-09-07T19:00:00","end":"2025-09-07T21:00:00"}
  ],
  "expires_at":"2025-09-04T20:00:00",
  "idempotency_key":"ulid-..."
}
```

### 3.2 取得/反応/ステータス/取消
- `GET /proposals`, `GET /proposals/{id}`, `POST /proposals/{id}/reaction`, `GET /proposals/{id}/status`, `POST /proposals/{id}/cancel`  
  → すべて F02 と同一

---

## 4. バリデーション（フロント + サーバ）
- audience: 2〜20（推奨2〜8）。**自分自身は含めない**。
- slots: 1〜6、`end > start`、未来時刻、ISO8601（UTC推奨）。
- 締切: 24時間〜14日以内。`expires_at < 最短slot.start` の場合は警告（送信は可）。
- ブロック関係（F08）が含まれていれば 400。

---

## 5. セキュリティ/プライバシー
- 提案者IDは公開レスポンスに含めない（内部のみ）。
- audience は **同意済み連絡先** のみを候補表示（端末の権限を明示）。
- モデレーション: 禁止語/個人情報の自動検知（サーバで非同期レビュー）。

---

## 6. テンプレート & ショートカット
- テンプレの分類例: 「夜カフェ」「昼ピクニック」「ボドゲ」「銭湯→餃子」「映画→夜カフェ」
- ショートカット: 「今週末」「来週の夜」「平日19時〜」をタップで複数slot追加
- 将来: ユーザー保存テンプレ（クラウド同期）

---

## 7. RN実装（TypeScript）
- Hook: `useManualProposalComposer()`（フォーム管理、idempotency_key発行、サーバエラー連携）
- `react-hook-form` + Zod バリデーション、`@tanstack/react-query` で保存/送信
- コンポーネント: `AudiencePicker`, `SlotQuickAdd`, `TemplatePicker`

---

## 8. テレメトリ / SLO
- `manual_proposal_open`, `manual_proposal_created`, `proposal_converted`
- SLO: 作成API p95 ≤ 400ms、反応API p95 ≤ 200ms

---

## 9. 受け入れ基準（AC）
- ✅ 入力必須項目がそろえば**1ステップで送信**できる
- ✅ 提案者は合意成立まで匿名のまま
- ✅ ブロック関係を含むaudienceでは作成できない
- ✅ 送信後は F02 の `pending` 提案として一覧に反映

---

## 10. Codex / Copilot プロンプト
- 「RN: `ManualProposalScreen` を作り、テンプレ/ショートカット/フォーム検証を実装」
- 「Flask: F02の`POST /proposals`に対するスキーマ検証（pydantic）を実装」
- 「E2E: Detoxで“手動作成→受信者2名でLike→成立（F03）”の自動テスト」

---