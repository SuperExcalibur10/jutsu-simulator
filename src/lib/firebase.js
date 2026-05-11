import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCVPGJeGc69Ae9dbhbyG0GQTvoicuJmMGQ",
  authDomain: "jutsu-simulator.firebaseapp.com",
  projectId: "jutsu-simulator",
  storageBucket: "jutsu-simulator.firebasestorage.app",
  messagingSenderId: "283508932353",
  appId: "1:283508932353:web:18ea3888ffaf561d79e500",
  measurementId: "G-5NLNYSLKRW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

