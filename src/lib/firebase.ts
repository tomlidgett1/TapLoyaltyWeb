import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app)
const storage = getStorage(app)

// Connect to emulator ONLY in development and when running locally
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('Connecting to Firebase emulators in development mode')
  connectFunctionsEmulator(functions, 'localhost', 5001)
}

export { app, auth, db, functions, storage } 