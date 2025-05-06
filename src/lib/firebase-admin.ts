import * as admin from 'firebase-admin'

// Initialize the app with a service account
function getFirebaseAdminApp() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      })
      console.log('Firebase Admin initialized successfully')
    } catch (error) {
      console.error('Firebase admin initialization error', error)
    }
  }

  return {
    auth: admin.auth(),
    db: admin.firestore(),
    admin,
  }
}

export { getFirebaseAdminApp } 