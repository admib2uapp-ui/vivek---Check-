import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOYgLeA3_QpmgtdHecIhwx9YqOiF5NqY8",
  authDomain: "studio-3790385784-4778c.firebaseapp.com",
  projectId: "studio-3790385784-4778c",
  storageBucket: "studio-3790385784-4778c.firebasestorage.app",
  messagingSenderId: "965898193440",
  appId: "1:965898193440:web:def2abeea77a8c327f8a45"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const resetUserPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export default app;