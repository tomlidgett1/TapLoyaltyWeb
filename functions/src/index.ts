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
  cors: {
    origin: ['https://taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, (request) => {
  logger.info("OpenAI API key requested", {
    auth: request.auth ? "Authenticated" : "Unauthenticated",
    requestData: request.data,
    requestTime: new Date().toISOString()
  });

  // Check if user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request for API key");
    throw new Error("Unauthenticated. You must be logged in to use this feature.");
  }

  try {
    logger.info("Retrieving API key from config");
    
    // Get the API key from config - ONLY look in one place
    const apiKey = functions.config().openai?.api_key;
    
    if (!apiKey) {
      logger.error("OpenAI API key not found in config");
      throw new Error("API key not configured");
    }

    logger.info("API key retrieved successfully");
    
    // Return the API key
    return {
      apiKey: apiKey,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error retrieving API key", error);
    throw new Error("Failed to retrieve API key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
});

// HTTP version of the getOpenAIKey function with explicit CORS handling
export const getOpenAIKeyHttp = onRequest({
  region: "us-central1"
}, (request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', 'https://taployalty.com.au');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  // Check authentication
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    response.status(401).send({ error: 'Unauthorized' });
    return;
  }
  
  // Verify Firebase token
  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    response.status(401).send({ error: 'Invalid authorization format' });
    return;
  }
  
  admin.auth().verifyIdToken(token)
    .then((decodedToken) => {
      // Token is valid, proceed with getting the API key
      try {
        logger.info("HTTP API key request received from user:", decodedToken.uid);
        
        // Get the API key from config - ONLY look in one place
        const apiKey = functions.config().openai?.api_key;
        
        if (!apiKey) {
          logger.error("OpenAI API key not found in config");
          response.status(500).send({ error: 'API key not configured' });
          return;
        }

        logger.info("API key retrieved successfully");
        
        // Return the API key
        response.status(200).send({
          apiKey: apiKey,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error("Error retrieving API key", error);
        response.status(500).send({ 
          error: 'Failed to retrieve API key',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
    .catch((error) => {
      logger.error("Error verifying token:", error);
      response.status(401).send({ error: 'Invalid token' });
    });
});

// Add a simple HTTP function to test
export const hello = onRequest({
  region: "us-central1",
  cors: {
    origin: ['https://taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, (request, response) => {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  response.status(200).send({ message: "Hello from Firebase Functions!" });
});
