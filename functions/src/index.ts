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
    origin: ['https://taployalty.com.au', 'https://www.taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app', 'http://localhost:3000', 'http://localhost:3001'],
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
  
  // Set CORS headers - use a more specific approach
  const allowedOrigins = [
    'https://taployalty.com.au',
    'https://www.taployalty.com.au',
    'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  } else {
    // For development, you might want to allow all origins
    response.set('Access-Control-Allow-Origin', '*');
  }
  
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

// This function will proxy calls to the OpenAI API
export const callOpenAI = onCall({
  region: "us-central1",
  cors: {
    origin: ['https://taployalty.com.au', 'https://www.taployalty.com.au', 'https://taptap--tap-loyalty-fb6d0.us-central1.hosted.app', 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      logger.error("Unauthenticated request to OpenAI API");
      throw new Error("Unauthenticated. You must be logged in to use this feature.");
    }

    // Get the API key from config
    const apiKey = functions.config().openai?.api_key;
    
    if (!apiKey) {
      logger.error("OpenAI API key not found in config");
      throw new Error("API key not configured");
    }

    // Initialize OpenAI client with the correct API key
    const openai = new OpenAI.OpenAI({ apiKey });

    // Get the endpoint and params from the request
    const { endpoint, params } = request.data;
    
    if (!endpoint) {
      throw new Error("No endpoint specified");
    }

    logger.info(`Calling OpenAI API endpoint: ${endpoint}`, { params });

    // Parse the endpoint to determine which API to call
    const [namespace, resource, method, subresource] = endpoint.split('.');

    // Only allow beta.assistants.* endpoints
    if (namespace !== 'beta') {
      throw new Error("Only beta namespace is supported");
    }

    let result;

    // Handle different API endpoints
    try {
      switch (`${resource}.${method}${subresource ? `.${subresource}` : ''}`) {
        case 'assistants.retrieve':
          result = await openai.beta.assistants.retrieve(params.assistant_id);
          break;
        case 'threads.create':
          result = await openai.beta.threads.create();
          break;
        case 'threads.messages.create':
          result = await openai.beta.threads.messages.create(
            params.thread_id,
            {
              role: params.role,
              content: params.content
            }
          );
          break;
        case 'threads.runs.create':
          result = await openai.beta.threads.runs.create(
            params.thread_id,
            {
              assistant_id: params.assistant_id
            }
          );
          break;
        case 'threads.runs.retrieve':
          result = await openai.beta.threads.runs.retrieve(
            params.thread_id,
            params.run_id
          );
          break;
        case 'threads.messages.list':
          result = await openai.beta.threads.messages.list(
            params.thread_id
          );
          break;
        default:
          throw new Error(`Unsupported endpoint: ${endpoint}`);
      }
      
      logger.info(`OpenAI API call successful: ${endpoint}`, { resultType: typeof result });
      return result;
    } catch (apiError) {
      logger.error(`Error in OpenAI API call to ${endpoint}:`, apiError);
      throw new Error(`OpenAI API error in ${endpoint}: ${apiError.message}`);
    }
  } catch (error: any) {
    logger.error(`Error calling OpenAI API: ${error.message}`, error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
});
