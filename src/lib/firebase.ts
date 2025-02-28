import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyB_bAVEjBiSLbhAVVyLulwRzU1547AwY4Q",
  authDomain: "tap-loyalty-fb6d0.firebaseapp.com",
  projectId: "tap-loyalty-fb6d0",
  storageBucket: "tap-loyalty-fb6d0.appspot.com",
  messagingSenderId: "1035054543006",
  appId: "1:1035054543006:web:bd0ae160a4bcda6df5cb8f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app, 'us-central1')
const storage = getStorage(app)

export { app, auth, db, functions, storage } 