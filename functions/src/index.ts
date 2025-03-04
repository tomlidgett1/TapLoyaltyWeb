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

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Add CORS middleware
const corsHandler = cors({origin: true});

// This function will make your OpenAI API key available to your app
export const getOpenAIKey = onCall({
  // Make sure this region matches your Firebase project region
  region: "us-central1",
  maxInstances: 10,
  cors: true
}, (request) => {
  // Log the request (optional)
  logger.info("OpenAI API key requested", {
    auth: request.auth ? "Authenticated" : "Unauthenticated"
  });

  // Check if user is authenticated
  if (!request.auth) {
    throw new Error("Unauthenticated. You must be logged in to use this feature.");
  }

  try {
    // Get the API key from config
    const apiKey = functions.config().openai?.api_key;
    
    if (!apiKey) {
      logger.error("OpenAI API key not found in config");
      throw new Error("API key not configured");
    }

    // Return the API key
    return {
      apiKey: apiKey
    };
  } catch (error) {
    logger.error("Error retrieving API key", error);
    throw new Error("Failed to retrieve API key");
  }
});

// Add a simple HTTP function to test
export const hello = onRequest({
  region: "us-central1",
  cors: true
}, (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.status(200).send({ message: "Hello from Firebase Functions!" });
});
