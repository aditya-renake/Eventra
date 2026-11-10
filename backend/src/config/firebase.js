import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let database;

export function getFirestore() {
  if (database) return database;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const options = projectId ? { projectId } : {};
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    const account = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : { project_id: projectId, client_email: process.env.FIREBASE_CLIENT_EMAIL, private_key: process.env.FIREBASE_PRIVATE_KEY };
    if (account.private_key) {
      account.private_key = account.private_key.replace(/\\n/g, '\n');
      if (projectId && account.project_id !== projectId) throw new Error('Firebase credential project mismatch');
      options.credential = cert(account);
    } else {
      options.credential = applicationDefault();
    }
  }
  database = adminFirestore(getApps()[0] || initializeApp(options));
  database.settings({ ignoreUndefinedProperties: true, preferRest: !process.env.FIRESTORE_EMULATOR_HOST });
  return database;
}

export const initFirebase = getFirestore;
