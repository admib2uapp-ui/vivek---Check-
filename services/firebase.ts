import { getApp, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOYgLeA3_QpmgtdHecIhwx9YqOiF5NqY8",
  authDomain: "studio-3790385784-4778c.firebaseapp.com",
  projectId: "studio-3790385784-4778c",
  storageBucket: "studio-3790385784-4778c.firebasestorage.app",
  messagingSenderId: "965898193440",
  appId: "1:965898193440:web:def2abeea77a8c327f8a45"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const getSecondaryAuth = () => {
  const secondaryApp = getApps().find((a) => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
  return getAuth(secondaryApp);
};

const generateTempPassword = () => {
  // We never show this password to the user; we immediately send a reset link.
  // Must satisfy Firebase's minimum length requirements.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const length = 24;
  const bytes = new Uint8Array(length);

  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

export const provisionAuthUserAndSendPasswordSetupEmail = async (email: string) => {
  const secondaryAuth = getSecondaryAuth();
  const tempPassword = generateTempPassword();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);

  // Send the password setup/reset email via the primary auth instance (does not affect current session)
  await sendPasswordResetEmail(auth, email);

  // Clean up secondary auth state
  await signOut(secondaryAuth);
  return cred.user;
};

export const resetUserPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export default app;