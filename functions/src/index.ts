/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {onCall} from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import * as cors from 'cors';
import * as admin from 'firebase-admin';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Add CORS middleware
const corsHandler = cors({origin: true});

// Initialize Firebase Admin
admin.initializeApp();

// This function will make your OpenAI API key available to your app
export const getOpenAIKey = onCall({
  region: "us-central1",
  cors: true
}, (request) => {
  logger.info("OpenAI API key requested", {
    auth: request.auth ? "Authenticated" : "Unauthenticated"
  });

  // For testing, return a hardcoded value
  return {
    apiKey: "test-key-for-debugging"
  };
});

// Add a simple HTTP function to test
export const hello = onRequest({
  region: "us-central1",
  cors: true
}, (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.status(200).send({ message: "Hello from Firebase Functions!" });
});
