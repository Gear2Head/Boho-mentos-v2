import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type ServiceAccountShape = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): ServiceAccountShape | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountShape>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function getAdminAuth() {
  if (!getApps().length) {
    const sa = parseServiceAccount();
    if (!sa) {
      throw new Error(
        "Missing FIREBASE_SERVICE_ACCOUNT_JSON for server token verification."
      );
    }
    const serviceAccount: ServiceAccount = {
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    };
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getAuth();
}

export async function verifyBearerToken(
  authorizationHeader?: string
): Promise<{ uid: string }> {
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("Missing bearer token");
  }

  const decoded = await getAdminAuth().verifyIdToken(token, true);
  return { uid: decoded.uid };
}
