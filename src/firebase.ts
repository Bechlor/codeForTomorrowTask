import admin from "firebase-admin";
import { env } from "./config";

function initializeFirebase(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as admin.ServiceAccount;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: env.FIREBASE_PROJECT_ID
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: env.FIREBASE_PROJECT_ID
  });
}

initializeFirebase();
export const firestore = admin.firestore();
export { admin };
