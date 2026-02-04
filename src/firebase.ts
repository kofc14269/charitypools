
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCW5DcLgmK4HSVF6BqRDMkz1k3Hjt-JaZ4",
  authDomain: "st-bernard-kofc-superbowl-grid.firebaseapp.com",
  projectId: "st-bernard-kofc-superbowl-grid",
  storageBucket: "st-bernard-kofc-superbowl-grid.appspot.com",
  messagingSenderId: "619277918232",
  appId: "1:619277918232:web:4cbdf203d06471d563636d",
  measurementId: "G-1P3RY5S27M"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
