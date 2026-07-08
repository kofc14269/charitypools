import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZF464USpdS6rQNUL1w_-715Rv29GHMw8",
  authDomain: "st-bernard-kofc-superbowl-grid.firebaseapp.com",
  databaseURL: "https://st-bernard-kofc-superbowl-grid-default-rtdb.firebaseio.com",
  projectId: "st-bernard-kofc-superbowl-grid",
  storageBucket: "st-bernard-kofc-superbowl-grid.firebasestorage.app",
  messagingSenderId: "619277918232",
  appId: "1:619277918232:web:4cbdf203d06471d563636d",
  measurementId: "G-1P3RY55Z7M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
