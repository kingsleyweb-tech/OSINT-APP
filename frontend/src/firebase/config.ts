import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCNkctAc6tY_DGrktREbBSOb2v4wYuO9lI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "osint-application-6405b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "osint-application-6405b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "osint-application-6405b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "374764432466",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:374764432466:web:db61fb73a986cc7231438b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9SYH2YL5FL"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
