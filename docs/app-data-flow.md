# アプリ全体のデータフロー概要

React Native クライアントと Firebase/Flask コンポーネントの責務を、`docs/mobile/rn-structure.md` の方針に沿って整理した概略図です。

```mermaid
flowchart TB
    subgraph Mobile[React Native App (Expo)]
        RN[Recall Mobile Client]
    end

    subgraph Firebase[Firebase Platform]
        Auth[Firebase Auth]
        FS[Firestore\n(proposals, groups, presence, etc.)]
        CF[Cloud Functions]
        FCM[FCM / APNs]
    end

    subgraph AI[Flask AI Stack]
        Flask[Flask /ai Service]
        Redis[(Redis + RQ Workers)]
        PG[(PostgreSQL + pgvector)]
        S3[(S3-Compatible Object Storage)]
        Models[Local Models\n(CLIP / ArcFace / vLLM)]
    end

    subgraph Observability[Observability]
        Prom[Prometheus / Logs / Sentry]
    end

    RN -->|Google Sign-In| Auth
    Auth -->|Firebase Session Tokens| RN

    RN -->|Realtime reads & presence updates| FS
    RN -->|Callable HTTPS (proposal ops, groups, settings)| CF
    FS -->|Snapshot listeners| RN
    CF -->|Validated writes & fan-out| FS

    CF -->|Notification payload| FCM -->|Push alerts| RN

    CF -->|Issue signed upload URLs| RN
    RN -->|Upload assets| S3
    CF -->|Asset metadata & triggers| FS

    CF -->|AI job trigger / webhook| Flask
    Flask -->|Download assets| S3
    Flask -->|Enqueue processing| Redis -->|Run inference| Models -->|Persist embeddings/results| PG
    Flask -->|Store/query vectors| PG
    Flask -->|Analysis result webhook| CF -->|Write AI outputs (drafts, suggestions)| FS

    CF -->|Metrics & structured logs| Prom
    Flask -->|Metrics & inference stats| Prom
```

## 補足
- **クライアント責務**: 認証は Google Sign-In + Firebase Auth。アプリは Firestore を購読し、Cloud Functions の callable API 経由で書き込みを委譲します。AI サービスを直接呼び出さない点が `docs/mobile/rn-structure.md` の前提です。
- **AI パイプライン**: 署名付き URL を介してアップロードされたアセットを Cloud Functions が検知し、Flask AI サービスへジョブを渡します。結果は PostgreSQL + pgvector に保存され、Webhook で Cloud Functions に返されて Firestore に反映されます。
- **通知**: Cloud Functions がイベント（提案、合意、チャット、AI ドラフトなど）を監視し、FCM/APNs を通じてプッシュ通知を送信します。
- **運用監視**: Flask と Cloud Functions の両方がメトリクスや構造化ログを出力し、Prometheus やログ基盤で監視します。
```
