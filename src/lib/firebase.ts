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

// Initialize Firebase with detailed logging
console.log('Initializing Firebase with config:', {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  // Don't log storage bucket for security
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
let auth, db, functions, storage;

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
  
  // The correct format should be the one in the firebaseConfig
  // No need to override it as it's already set correctly
  console.log('Using storage bucket:', firebaseConfig.storageBucket);
} catch (error) {
  console.error('Error initializing Firebase Storage:', error);
}

// No emulator connection in production
console.log('Firebase initialization complete');

export { app, auth, db, functions, storage } 