import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";

try { admin.app(); } catch { admin.initializeApp(); }
setGlobalOptions({ region: "asia-northeast1" });

// Shared helpers
function requireAuth(context: any) {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
}

export const proposalsCreate = onCall(async (request) => {
  const uid = requireAuth(request);
  // TODO: Validate input, create proposal doc (status='pending' or 'draft') per docs/features/proposal.md
  return { ok: true, message: "proposals.create stub", uid };
});

export const proposalsReact = onCall(async (request) => {
  const uid = requireAuth(request);
  // TODO: Add/replace reaction for the caller per docs/features/proposal.md
  return { ok: true, message: "proposals.react stub", uid };
});

export const proposalsCancel = onCall(async (request) => {
  const uid = requireAuth(request);
  // TODO: Author cancels pending proposal
  return { ok: true, message: "proposals.cancel stub", uid };
});

export const proposalsUpdateStatus = onCall(async (request) => {
  const uid = requireAuth(request);
  // TODO: Transition status with validation (pending -> agreed/rejected)
  return { ok: true, message: "proposals.updateStatus stub", uid };
});

export const proposalsApproveAndSend = onCall(async (request) => {
  const uid = requireAuth(request);
  // TODO: Author-only: draft -> pending, enqueue notifications (FB.3.5)
  return { ok: true, message: "proposals.approve_and_send stub", uid };
});
