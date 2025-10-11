# Task Index (Codex-ready)

最終更新: 2025-09-26

本インデックスは `docs/` の仕様と `development_flow/WBS.md` に基づき、Codex に依頼する単位（1ファイル=1タスク）を整理しています。各タスクファイルには要約/依存/成果物/受け入れ条件/手順/参照を記載済みです。

- Firebase (FB) — docs: `docs/firestore/*.md`, `docs/backend/api-spec.md`
  - FB.2 セキュリティルール
    - tasks/FB/FB.2_Security_Rules/FB.2.1_groups_acl.md
    - tasks/FB/FB.2_Security_Rules/FB.2.2_proposals_acl.md
    - tasks/FB/FB.2_Security_Rules/FB.2.3_presence_write_own.md
  - FB.3 Cloud Functions
    - tasks/FB/FB.3_Cloud_Functions/FB.3.1_proposals_lifecycle.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.2_proposals_agreed_to_groups.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.3_friends_flow.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.4_signed_url.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.5_notifications.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.6_ai_proposal_drafts.md
    - tasks/FB/FB.3_Cloud_Functions/FB.3.7_journal_anniversary_notifications.md
  - FB.4 認証統合
    - tasks/FB/FB.4_Auth/FB.4.0_google_signin.md
  - FB.5 運用
    - tasks/FB/FB.5_Operations/FB.5.0_emulators_deploy_monitor.md

- Flask AI (FL) — docs: `docs/backend/flask-architecture.md`, `docs/backend/flask-vector-arch.md`, `docs/backend/vllm-management.md`
  - FL.2 Service / Repository
    - tasks/FL/FL.2_Service_Layer/FL.2.1_embedding_repo.md
    - tasks/FL/FL.2_Service_Layer/FL.2.2_asset_repo.md
    - tasks/FL/FL.2_Service_Layer/FL.2.3_ai_service.md
    - tasks/FL/FL.2_Service_Layer/FL.2.4_journal_entry_repo.md
    - tasks/FL/FL.2_Service_Layer/FL.2.5_vlm_schedule_service.md
  - FL.3 API (/ai/*)
    - tasks/FL/FL.3_API/FL.3.1_themes_suggest.md
    - tasks/FL/FL.3_API/FL.3.2_people_match.md
    - tasks/FL/FL.3_API/FL.3.3_proposals_auto.md
    - tasks/FL/FL.3_API/FL.3.4_journal_entries.md
    - tasks/FL/FL.3_API/FL.3.5_schedule_from_image.md
  - FL.4 非同期
    - tasks/FL/FL.4_Async/FL.4.0_recompute_backfill.md
  - FL.5 運用
    - tasks/FL/FL.5_Ops/FL.5.1_vllm_management.md
    - tasks/FL/FL.5_Ops/FL.5.2_gunicorn_tls.md

- React Native (RN) — docs: `docs/mobile/*.md`, `docs/features/*.md`
  - RN.1 認証
    - tasks/RN/RN.1_Auth/RN.1.0_firebase_auth.md
    - tasks/RN/RN.1_Auth/RN.1.1_user_profile.md
    - tasks/RN/RN.1_Auth/RN.1.2_sign_out.md
  - RN.2 画面
    - tasks/RN/RN.2_Screens/RN.2.1_proposals.md
    - tasks/RN/RN.2_Screens/RN.2.2_groups_chat.md
    - tasks/RN/RN.2_Screens/RN.2.3_friends.md
    - tasks/RN/RN.2_Screens/RN.2.4_journal.md
    - tasks/RN/RN.2_Screens/RN.2.5_profile_username.md
    - tasks/RN/RN.2_Screens/RN.2.6_settings_notifications.md
    - tasks/RN/RN.2_Screens/RN.2.7_journal_timeline.md
    - tasks/RN/RN.2_Screens/RN.2.8_journal_tag_suggestions.md
    - tasks/RN/RN.2_Screens/RN.2.9_journal_detail_edit.md
    - tasks/RN/RN.2_Screens/RN.2.10_journal_offline_sync.md
    - tasks/RN/RN.2_Screens/RN.2.11_journal_user_flow.md
    - tasks/RN/RN.2_Screens/RN.2.12_ai_assist.md
    - tasks/RN/RN.2_Screens/RN.2.13_journal_face_suggestions_runtime.md
    - tasks/RN/RN.2_Screens/RN.2.14_scheduling_helper.md
  - RN.3 サービス/フック
    - tasks/RN/RN.3_Services_Hooks/RN.3.1_useAuth.md
    - tasks/RN/RN.3_Services_Hooks/RN.3.2_apiClient.md
    - tasks/RN/RN.3_Services_Hooks/RN.3.3_notifications.md
    - tasks/RN/RN.3_Services_Hooks/RN.3.4_presence_typing.md
    - tasks/RN/RN.3_Services_Hooks/RN.3.5_journal_service.md
  - RN.4 その他
    - tasks/RN/RN.4_Others/RN.4.0_i18n_accessibility_state.md

- CI/CD (CI) — docs: `docs/dev/ci-cd.md`, `docs/dev/deploy_server.md`, `docs/mobile-ci-testing.md`
  - tasks/CI/CI.1_Dockerfile.md
  - tasks/CI/CI.2_docker_compose_test.md
  - tasks/CI/CI.3_github_actions.md
  - tasks/CI/CI.4_deploy_server.md
  - tasks/CI/CI.5_production_migration.md
  - tasks/CI/CI.6_mobile_web_e2e.md
  - tasks/CI/CI.7_mobile_docker_compose.md

- Security (SEC) — docs: `docs/features/privacy.md`, `docs/backend/hmac-auth.md`
  - tasks/SEC/SEC.1_firebase_rules_review.md
  - tasks/SEC/SEC.2_api_key_hmac.md
  - tasks/SEC/SEC.3_signed_urls_data_retention.md
  - tasks/SEC/SEC.4_logging_rate_limit.md
  - tasks/SEC/SEC.5_model_access_audit.md

- QA / Testing (QA) — docs: `docs/dev/testing-plan.md`
  - tasks/QA/QA.1_unit.md
  - tasks/QA/QA.2_integration.md
  - tasks/QA/QA.3_e2e_detox.md
  - tasks/QA/QA.4_performance_slo.md
  - tasks/QA/QA.5_rn_test_harness.md
  - tasks/QA/QA.6_full_stack_release.md
    - tasks/QA/QA.7_mobile_stack_diagnostics.md

- Demo / Presentation (DE) — docs: `docs/dev/runbooks/demo_mode.md`
  - DE.1 Demo Mode
    - tasks/DE/DE.1_Demo_Mode/DE.1.0_demo_mode_toggle.md

- Final Distribution (FIN) — docs: `docs/dev/runbooks/fin_general_release.md`
  - FIN.1 General Release Automation
    - tasks/FIN/FIN.1_General_Distribution/FIN.1.0_general_release_automation.md
