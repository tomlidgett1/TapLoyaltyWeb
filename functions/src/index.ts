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
import * as OpenAI from 'openai';

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
    origin: ['https://taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, async (request) => {
  try {
    logger.info("OpenAI API key requested", {
      auth: request.auth ? "Authenticated" : "Unauthenticated",
      uid: request.auth?.uid || 'none',
      requestData: request.data,
      requestTime: new Date().toISOString()
    });

    // Check if user is authenticated
    if (!request.auth) {
      logger.error("Unauthenticated request for API key");
      throw new Error("Unauthenticated. You must be logged in to use this feature.");
    }

    logger.info("Retrieving API key from config");
    
    // Log all available config for debugging
    const configKeys = Object.keys(functions.config());
    logger.info("Available config:", {
      hasOpenai: !!functions.config().openai,
      openaiKeys: functions.config().openai ? Object.keys(functions.config().openai) : [],
      allConfigKeys: configKeys
    });
    
    // Get the API key from config - ONLY look in one place
    const apiKey = functions.config().openai?.api_key;
    
    logger.info("API key retrieval result:", {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0
    });
    
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
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to retrieve API key: ${error.message}`,
        { stack: error.stack }
      );
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to retrieve API key: Unknown error',
        { error }
      );
    }
  }
});

// HTTP version of the getOpenAIKey function with explicit CORS handling
export const getOpenAIKeyHttp = onRequest({
  region: "us-central1"
}, (request, response) => {
  // Log request details
  logger.info("getOpenAIKeyHttp request received", {
    method: request.method,
    headers: request.headers,
    origin: request.headers.origin || 'unknown',
    path: request.path,
    ip: request.ip
  });
  
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*'); // Temporarily allow all origins for debugging
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    logger.info("Handling OPTIONS preflight request");
    response.status(204).send('');
    return;
  }
  
  // Check authentication
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    logger.error("No authorization header present");
    response.status(401).send({ 
      error: 'Unauthorized',
      message: 'No authorization header provided'
    });
    return;
  }
  
  // Verify Firebase token
  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    logger.error("Invalid authorization format");
    response.status(401).send({ 
      error: 'Invalid authorization format',
      message: 'Authorization header must be in format: Bearer <token>'
    });
    return;
  }
  
  logger.info("Verifying token");
  admin.auth().verifyIdToken(token)
    .then((decodedToken) => {
      // Token is valid, proceed with getting the API key
      try {
        logger.info("HTTP API key request received from user:", decodedToken.uid);
        
        // Log all available config for debugging
        logger.info("Available config:", {
          hasOpenai: !!functions.config().openai,
          openaiKeys: functions.config().openai ? Object.keys(functions.config().openai) : [],
          allConfigKeys: Object.keys(functions.config())
        });
        
        // Get the API key from config - ONLY look in one place
        const apiKey = functions.config().openai?.api_key;
        
        logger.info("API key retrieval result:", {
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey?.length || 0
        });
        
        if (!apiKey) {
          logger.error("OpenAI API key not found in config");
          response.status(500).send({ 
            error: 'API key not configured',
            message: 'The OpenAI API key is not configured on the server'
          });
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
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    })
    .catch((error) => {
      logger.error("Error verifying token:", error);
      response.status(401).send({ 
        error: 'Invalid token',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
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

// Add a function to check the config
export const checkConfig = onRequest({
  region: "us-central1",
  cors: true
}, (request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  try {
    // Get all config keys (without exposing values)
    const configKeys = Object.keys(functions.config());
    const openaiKeys = functions.config().openai ? Object.keys(functions.config().openai) : [];
    
    response.status(200).send({
      configKeys: configKeys,
      hasOpenai: configKeys.includes('openai'),
      openaiKeys: openaiKeys,
      hasApiKey: openaiKeys.includes('api_key'),
      apiKeyExists: !!functions.config().openai?.api_key,
      apiKeyLength: functions.config().openai?.api_key?.length || 0
    });
  } catch (error) {
    logger.error("Error checking config", error);
    response.status(500).send({
      error: 'Failed to check config',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a function to check the environment
export const checkEnvironment = onRequest({
  region: "us-central1",
  cors: true
}, (request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  try {
    // Get environment information
    const environment = {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || 'unknown',
      functionRegion: process.env.FUNCTION_REGION || 'unknown',
      functionName: process.env.FUNCTION_NAME || 'unknown',
      functionTarget: process.env.FUNCTION_TARGET || 'unknown',
      gcloudProject: process.env.GCLOUD_PROJECT || 'unknown',
      firebaseConfig: process.env.FIREBASE_CONFIG ? 'present' : 'missing',
      k8sService: process.env.K_SERVICE || 'unknown',
      k8sRevision: process.env.K_REVISION || 'unknown',
      k8sConfiguration: process.env.K_CONFIGURATION || 'unknown',
      memoryAvailable: process.env.FUNCTION_MEMORY_MB || 'unknown',
      cpuCount: require('os').cpus().length,
      totalMemory: Math.round(require('os').totalmem() / (1024 * 1024)) + ' MB',
      freeMemory: Math.round(require('os').freemem() / (1024 * 1024)) + ' MB',
      uptime: Math.round(process.uptime()) + ' seconds',
      timestamp: new Date().toISOString()
    };
    
    response.status(200).send(environment);
  } catch (error) {
    logger.error("Error checking environment", error);
    response.status(500).send({
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Function to call OpenAI API
export const callOpenAI = onCall({
  region: "us-central1",
  cors: {
    origin: ['https://taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, async (request) => {
  try {
    logger.info("OpenAI API call requested", {
      auth: request.auth ? "Authenticated" : "Unauthenticated",
      uid: request.auth?.uid || 'none',
      endpoint: request.data.endpoint,
      requestTime: new Date().toISOString()
    });

    // Check if user is authenticated
    if (!request.auth) {
      logger.error("Unauthenticated request for OpenAI API call");
      throw new Error("Unauthenticated. You must be logged in to use this feature.");
    }

    // Get the API key from config
    const apiKey = functions.config().openai?.api_key;
    
    logger.info("API key retrieval result:", {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0
    });
    
    if (!apiKey) {
      logger.error("OpenAI API key not found in config");
      throw new Error("API key not configured");
    }

    // Initialize OpenAI client
    const openai = new OpenAI.OpenAI({
      apiKey: apiKey
    });

    // Get the endpoint and params from the request
    const { endpoint, params } = request.data;
    
    if (!endpoint) {
      logger.error("No endpoint specified");
      throw new Error("No endpoint specified");
    }

    logger.info(`Calling OpenAI API endpoint: ${endpoint}`);
    
    // Call the OpenAI API using the endpoint path
    const path = endpoint.split('.');
    let method: any = openai;
    
    // Navigate through the OpenAI object to find the right method
    for (const segment of path) {
      if (!method[segment]) {
        logger.error(`Invalid endpoint segment: ${segment}`);
        throw new Error(`Invalid endpoint segment: ${segment}`);
      }
      method = method[segment];
    }
    
    // Call the method with the provided parameters
    if (typeof method !== 'function') {
      logger.error(`Endpoint ${endpoint} is not a function`);
      throw new Error(`Endpoint ${endpoint} is not a function`);
    }
    
    logger.info(`Calling OpenAI API with params:`, params);
    const result = await method(params);
    logger.info(`OpenAI API call successful`);
    
    return result;
  } catch (error) {
    logger.error("Error calling OpenAI API", error);
    
    if (error instanceof Error) {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to call OpenAI API: ${error.message}`,
        { stack: error.stack }
      );
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to call OpenAI API: Unknown error',
        { error }
      );
    }
  }
});
