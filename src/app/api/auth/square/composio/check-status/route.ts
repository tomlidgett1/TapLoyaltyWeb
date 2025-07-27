import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Square Composio auth config ID
const SQUARE_AUTH_CONFIG_ID = "ac_6fzSMFX36-8j";
// Composio API key
const COMPOSIO_API_KEY = "smwbexfl2lqlcy3wb0cq3";

// Helper function to check connection status using direct fetch API
async function checkConnectionStatus(connectionId: string) {
  try {
    const response = await fetch(`https://backend.composio.dev/api/v3/connected_accounts/${connectionId}`, {
      method: "GET",
      headers: {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const responseBody = await response.json();
    return responseBody;
  } catch (error) {
    console.error(`Error in checkConnectionStatus:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get merchantId from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const verbose = searchParams.get("verbose") === "1";
    const customAuthConfigId = searchParams.get('authConfigId') || SQUARE_AUTH_CONFIG_ID;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing merchantId parameter" },
        { status: 400 }
      );
    }

    // Get integration document from Firestore
    const integrationDoc = await getDoc(
      doc(db, `merchants/${merchantId}/integrations/square_composio`)
    );

    if (!integrationDoc.exists()) {
      return NextResponse.json({
        success: true,
        connection: {
          connected: false,
          message: "No Square Composio integration found"
        }
      });
    }

    const integrationData = integrationDoc.data();
    const connectionId = integrationData.connectionId;

    if (!connectionId) {
      return NextResponse.json({
        success: true,
        connection: {
          connected: false,
          message: "No connection ID found in integration data"
        }
      });
    }

    // Check connection status with Composio using direct fetch API
    const connectedAccount = await checkConnectionStatus(connectionId);

    // Determine connection status
    let isConnected = false;
    let status = "UNKNOWN";
    
    if (connectedAccount) {
      status = connectedAccount.status || "UNKNOWN";
      isConnected = status === "ACTIVE";
    }

    // Update Firestore with latest status
    await setDoc(
      doc(db, `merchants/${merchantId}/integrations/square_composio`),
      {
        connected: isConnected,
        connectionStatus: status,
        lastChecked: serverTimestamp(),
        connectedAt: isConnected ? serverTimestamp() : integrationData.connectedAt,
        authConfigId: customAuthConfigId
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      connection: {
        connected: isConnected,
        id: connectionId,
        status: status,
        details: verbose ? connectedAccount : undefined
      }
    });
  } catch (error) {
    // Format error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to check Square Composio status",
      details: errorMessage
    }, { status: 500 });
  }
} 