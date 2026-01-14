import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let secondaryApp: FirebaseApp | null = null;

const getSecondaryAuth = () => {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, "secondary-auth");
  }
  return getAuth(secondaryApp);
};

const generateTempPassword = (length = 24) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[values[i] % alphabet.length];
  }
  return out;
};

export const createAuthUserAndSendPasswordResetEmail = async (email: string) => {
  const secondaryAuth = getSecondaryAuth();
  const tempPassword = generateTempPassword();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
  await sendPasswordResetEmail(auth, email);
  await signOut(secondaryAuth);
  return { uid: cred.user.uid };
};

export const resetUserPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export default app;