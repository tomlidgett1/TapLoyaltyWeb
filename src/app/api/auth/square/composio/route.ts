import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

// Square Composio auth config ID
const SQUARE_AUTH_CONFIG_ID = "ac_6fzSMFX36-8j";
// Composio API key
const COMPOSIO_API_KEY = "smwbexfl2lqlcy3wb0cq3";

// Helper function that uses direct fetch API approach
async function initiateSquareConnection(userId: string, authConfigId: string) {
  console.log(`initiateSquareConnection called with userId: ${userId}, authConfigId: ${authConfigId}`);
  
  try {
    // Log the request body for debugging
    const requestBody = {
      "auth_config": {
        "id": authConfigId
      },
      "connection": {
        "user_id": userId
      }
    };
    
    // Create a new connected account using the direct fetch API
    const response = await fetch("https://backend.composio.dev/api/v3/connected_accounts", {
      method: "POST",
      headers: {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const responseBody = await response.json();
    
    return {
      id: responseBody.id,
      redirectUrl: responseBody.redirect_url || responseBody.redirect_uri,
      status: responseBody.status
    };
  } catch (error) {
    console.error(`Error in initiateSquareConnection:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get merchantId from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const customAuthConfigId = searchParams.get('authConfigId') || SQUARE_AUTH_CONFIG_ID;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing merchantId parameter" },
        { status: 400 }
      );
    }

    // Verify the merchant exists
    try {
      const merchantDoc = await getDoc(doc(db, 'merchants', merchantId));
      
      if (!merchantDoc.exists()) {
        return NextResponse.json({
          success: false,
          error: "Merchant not found"
        }, { status: 404 });
      }
    } catch (dbError) {
      return NextResponse.json({
        success: false,
        error: "Error verifying merchant in database"
      }, { status: 500 });
    }

    // Use the helper function that uses direct fetch API
    const connectionResult = await initiateSquareConnection(merchantId, customAuthConfigId);
    
    // Store connection details in Firestore
    try {
      await setDoc(
        doc(db, `merchants/${merchantId}/integrations/square_composio`),
        {
          connected: false, // Will be set to true after authentication completes
          connectionId: connectionResult.id,
          authConfigId: customAuthConfigId,
          provider: "composio",
          lastUpdated: serverTimestamp(),
          initiatedAt: serverTimestamp(),
          status: connectionResult.status || "INITIATED"
        },
        { merge: true }
      );
    } catch (dbError) {
      console.error(`Error storing connection details in Firestore:`, dbError);
      // Continue with the process even if storage fails
    }

    if (debug) {
      return NextResponse.json({
        success: true,
        message: "Debug mode - connection initiated",
        connectionRequest: connectionResult,
        storedInFirebase: true
      });
    }

    // Redirect to the auth URL
    if (connectionResult.redirectUrl) {
      return NextResponse.redirect(connectionResult.redirectUrl);
    } else {
      return NextResponse.json(
        { error: "No redirect URL provided by Composio" },
        { status: 500 }
      );
    }
  } catch (error) {
    // Format error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to initiate Square Composio connection",
      details: errorMessage
    }, { status: 500 });
  }
} 