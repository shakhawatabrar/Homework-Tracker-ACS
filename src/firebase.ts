import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZdTy515H01NZu0h57TQNa0FKLGi-rhgk",
  authDomain: "student-homework-system-2532f.firebaseapp.com",
  projectId: "student-homework-system-2532f",
  storageBucket: "student-homework-system-2532f.firebasestorage.app",
  messagingSenderId: "757074374127",
  appId: "1:757074374127:web:8c2308a020075850851a1a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
