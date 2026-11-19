
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from './firebase-config';

let app;
if (firebaseConfig && firebaseConfig.projectId) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

const db = app ? getFirestore(app) : undefined;

export { db };
