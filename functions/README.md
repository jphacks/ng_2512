# Firebase Functions — Proposals Lifecycle (FB.3.1)

This is a minimal scaffold for Cloud Functions handling proposals lifecycle:
- proposalsCreate (callable)
- proposalsReact (callable)
- proposalsCancel (callable)
- proposalsUpdateStatus (callable)
- proposalsApproveAndSend (callable)

Notes
- Region: asia-northeast1
- Auth required for all callables
- Actual Firestore writes, ACL enforcement, and transitions should follow:
  - docs/features/proposal.md
  - docs/features/ai_proposal.md
  - development_flow/tasks/FB/FB.2_Security_Rules/FB.2.2_proposals_acl.md

Dev
- Build: (optional) `npm --prefix functions i && npm --prefix functions run build`
- Emulate: `firebase emulators:start --only functions,firestore,auth`
