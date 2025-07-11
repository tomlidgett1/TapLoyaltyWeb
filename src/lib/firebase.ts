import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions'
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyB_bAVEjBiSLbhAVVyLulwRzU1547AwY4Q",
  authDomain: "tap-loyalty-fb6d0.firebaseapp.com",
  projectId: "tap-loyalty-fb6d0",
  storageBucket: "tap-loyalty-fb6d0",
  messagingSenderId: "1035054543006",
  appId: "1:1035054543006:web:bd0ae160a4bcda6df5cb8f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase with detailed logging
console.log('Initializing Firebase with config:', {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  hasAppId: !!firebaseConfig.appId,
  environment: process.env.NODE_ENV
});

let app;
try {
  if (!getApps().length) {
    console.log('No Firebase apps initialized, creating new app');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('Firebase app already initialized, getting existing app');
    app = getApp();
  }
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  throw error;
}

// Initialize Firebase services with logging
let auth: Auth, db: Firestore, functions: Functions, storage;

try {
  console.log('Initializing Firebase Auth');
  auth = getAuth(app);
  console.log('Firebase Auth initialized');
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
}

try {
  console.log('Initializing Firestore');
  db = getFirestore(app);
  console.log('Firestore initialized');
} catch (error) {
  console.error('Error initializing Firestore:', error);
}

try {
  console.log('Initializing Firebase Functions');
  functions = getFunctions(app);
  console.log('Firebase Functions initialized with region:', functions.region);
} catch (error) {
  console.error('Error initializing Firebase Functions:', error);
}

try {
  console.log('Initializing Firebase Storage');
  storage = getStorage(app);
  console.log('Firebase Storage initialized');
  console.log('Using storage bucket from config:', firebaseConfig.storageBucket);
} catch (error) {
  console.error('Error initializing Firebase Storage:', error);
}

// No emulator connection in production
console.log('Firebase initialization complete');

export { app, auth, db, functions, storage } 