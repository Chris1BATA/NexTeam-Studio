import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const FIRESTORE_EMULATOR_HOST = String(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "").trim();
const FIRESTORE_EMULATOR_PORT = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 0);
const FIREBASE_AUTH_EMULATOR_URL = String(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || "").trim();

let firestoreEmulatorConnected = false;
let authEmulatorConnected = false;

if (FIRESTORE_EMULATOR_HOST && FIRESTORE_EMULATOR_PORT > 0 && !firestoreEmulatorConnected) {
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  firestoreEmulatorConnected = true;
}

if (FIREBASE_AUTH_EMULATOR_URL && !authEmulatorConnected) {
  connectAuthEmulator(auth, FIREBASE_AUTH_EMULATOR_URL, { disableWarnings: true });
  authEmulatorConnected = true;
}
