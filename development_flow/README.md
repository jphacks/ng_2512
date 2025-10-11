# Development Flow — Operating Guide

最終更新: 2025-09-26 (Asia/Tokyo)

本ディレクトリは、`docs/` 配下の仕様書を起点に Recall 開発の段取りを整理する「運用ハブ」です。領域ごとの実装/検証フローをまとめ、`tasks/` 配下の Codex 向け依頼粒度へ橋渡しします。

## Baseline Knowledge（docs/ クロスウォーク）
- **Product & Features** — `docs/README.md`, `docs/features/*.md` で機能要件と F01–F15 の詳細を把握。
- **Backend AI** — `docs/backend/flask-architecture.md`, `docs/backend/flask-vector-arch.md`, `docs/backend/api-spec.md`, `docs/backend/vllm-management.md` が Flask + pgvector + vLLM の責務を規定。
- **Firebase Core** — `docs/firestore/README.md` と各スキーマドキュメントで提案/グループ/プレゼンスのデータモデルと ACL を定義。
- **Mobile App** — `docs/mobile/rn-structure.md`, `docs/mobile/firebase-architecture.md`, `docs/mobile/ux-patterns.md` で Expo プロジェクト構成と UX 規約を確認。
- **DevOps & Quality** — `docs/dev/ci-cd.md`, `docs/dev/deploy_server.md`, `docs/dev/testing-plan.md`, `docs/mobile-ci-testing.md` が CI/CD・セルフホスト・テストストラテジを統括。

各領域の開発フローはこれら docs を変更権威として参照し、差異が生じた場合は docs 更新を優先します。

## Delivery Streams（領域別アクティビティ）
- **Firebase Delivery** — `FB_Firebase.md` を起点に Firestore スキーマ → ルール → Functions → Auth 運用の順で実施。関連 docs: `docs/firestore/*.md`, `docs/features/*`。
- **Flask AI Delivery** — `FL_FlaskAI.md` と新設の VLM 実装節（`docs/backend/flask-architecture.md` 内）を参照し、DB/サービス/REST/API → 非同期 → vLLM 運用を推進。
- **React Native Delivery** — `RN_ReactNative.md` で画面/フック/サービスの優先順位を整理。docs の画面仕様・UX パターンを随時取り込む。
- **CI/CD & Ops** — `CI_CICD.md` と `docs/dev/ci-cd.md` を同期し、Docker ベースのテスト→ビルド→個人サーバ配備の手順を管理。
- **Security & QA** — `SEC_Security.md`, `QA_Testing.md` を土台に、docs/dev/testing-plan.md の観点でゲートを設定。
- **Task Indexing** — `TASK_INDEX.md` が Codex 依頼単位の索引。docs の更新に追随する形で粒度と依存を維持します。

## Flow Visualization（Mermaid）

```mermaid
flowchart TB
  subgraph DOCS [docs Alignment]
    DOCS1[Features (F01-F15)]
    DOCS2[Backend AI Specs]
    DOCS3[Firestore Schemas]
    DOCS4[RN UX & Structure]
    DOCS5[CI/CD & QA]
  end

  subgraph FB [Firebase Delivery]
    FB2[FB.2 Rules]
    FB3[FB.3 Functions]
    FB4[FB.4 Auth]
  end

  subgraph FL [Flask AI Delivery]
    FL2[FL.2 Services]
    FL3[FL.3 APIs]
    FL4[FL.4 Async]
    FL5[FL.5 Ops]
  end

  subgraph RN [React Native Delivery]
    RN1[RN.1 Auth]
    RN2[RN.2 Screens]
    RN3[RN.3 Hooks/Services]
    RN4[RN.4 Accessibility/i18n]
  end

  subgraph CI [CI/CD & Ops]
    CI1[CI.1 Dockerfile]
    CI2[CI.2 Compose Test]
    CI3[CI.3 GH Actions]
    CI4[CI.4 Deploy]
    CI5[CI.5 Migration]
  end

  subgraph QA [Security & QA]
    QA1[SEC Rules]
    QA2[QA Integration]
    QA3[QA E2E]
  end

  DOCS1 --> FB2
  DOCS2 --> FL2
  DOCS3 --> FB2
  DOCS4 --> RN2
  DOCS5 --> CI1
  DOCS5 --> QA2

  FB3 --> RN2
  FB4 --> RN1
  FL3 --> RN3
  CI4 --> FL5

  RN2 --> QA3
  FB3 --> QA2
  FL3 --> QA2
```

## Artefacts & Tools
- **adm.dot / status.json** — 依存関係とステータスの単一ソース。`python tools/taskflow.py status` で DOT 自動更新。
- **WBS.md** — docs ベースの作業分解構成。変更時は docs とタスクの両方を確認。
- **TASK_INDEX.md** — Codex 依頼単位の参照。アサイン時は docs の該当節を併読する。
- **領域別ブリーフ** — `FB_Firebase.md`, `FL_FlaskAI.md`, `RN_ReactNative.md`, `CI_CICD.md`, `SEC_Security.md`, `QA_Testing.md`。

## Taskflow 運用（ショートリファレンス）
- `python tools/taskflow.py status` — 最新の着手可タスクを抽出し、`adm.dot` を彩色。
- `python tools/taskflow.py mark <ID> <state>` — 依存グラフの状態更新（`pending|in_progress|done`）。
- `dot -Tpng development_flow/adm.dot -o development_flow/adm.png` — 図版生成（任意）。
- GitHub Actions (`.github/workflows/taskflow.yml`) — PR/push 時に `adm.dot` と PNG を自動再生成し、Job Summary に assignable タスクを表示。

### 注意事項
- docs 側の仕様更新があった場合は WBS/TASK_INDEX/adm.dot を同歩更新する。
- 依存エッジの変更は `adm.dot` を先に直し、CLI で彩色版を再生成する。
- 末端の `FIN` エッジは最終レビュー用ダミー。完了チェック時に確認する。
