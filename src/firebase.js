import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBde0pG5E2_Xu36Cp-de5AwFRSvhygp-lg",
  authDomain: "braindump-2302.firebaseapp.com",
  projectId: "braindump-2302",
  storageBucket: "braindump-2302.firebasestorage.app",
  messagingSenderId: "254909979794",
  appId: "1:254909979794:web:d073ec9e975ffcf1da1a4b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
