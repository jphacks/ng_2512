# QA.2 Testing — Integration (compose + vLLM)

概要
- docker-compose.test で API+DB+Redis+vLLM を起動し統合テスト。

依存
- CI.2, FL.3.*

成果物
- tests/integration/*, 起動/待機ユーティリティ
- テストログ（JUnit/pytest/compose）: `development_flow/logs/qa2/`

受け入れ条件
- /ai/* のハッピーパス/エラー系が再現性高く通過し、docs/features/theme_generator.md / people_match.md / ai_proposal.md のシナリオをカバーする。
- Firestore/Firebase エミュレータと連携し、AIドラフト通知まで一連のフローがシミュレーションされる。
- テストログ（JUnit/pytest/compose）がアーティファクトとして保存され、CI で参照できる。

手順(推奨)
1) compose 起動/ヘルス待ち
2) テスト実行/アーティファクト保存

ログ保存（実行方法）
- 便利スクリプト: `scripts/qa/run_qa2.sh`
  - pytest ログ: `development_flow/logs/qa2/pytest.log`
  - JUnit XML: `development_flow/logs/qa2/junit.xml`
  - Compose ログ: `development_flow/logs/qa2/compose.logs.txt`
  - ストリームログ: `development_flow/logs/qa2/compose.up.stream.log`

備考
- `docker-compose.test.yml` の `api` サービスは上記ログディレクトリを `/app/artifacts` としてマウントし、pytest の `--junitxml` と `--log-file` 出力を保存します。

- docs/features/theme_generator.md
- docs/features/people_match.md
- docs/features/ai_proposal.md
- development_flow/QA_Testing.md (QA.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.2 Testing — Integration (compose + vLLM)

依頼文:
- compose で API+DB+Redis+vLLM を起動し、/ai/* のハッピーパス/エラー系統合テストを実行できる仕組みを整備してください。

提出物:
- テスト、起動/待機ユーティリティ、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
