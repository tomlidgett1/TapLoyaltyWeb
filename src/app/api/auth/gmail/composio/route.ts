import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { initiateGmailConnection } from '@/lib/composio';

// Import constants from environment variables
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GMAIL_INTEGRATION_ID = process.env.COMPOSIO_GMAIL_INTEGRATION_ID || '48ab3736-146c-4fdf-bd30-dda79973bd1d';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Gmail Composio connect request received');
  
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const debugMode = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';
    
    console.log('Composio connect request for merchant:', merchantId);
    
    if (!merchantId) {
      console.error('Missing merchant ID in connect request');
      return NextResponse.json(
        { error: 'Missing merchant ID' },
        { status: 400 }
      );
    }
    
    // Verify the merchant exists
    const merchantDoc = doc(db, 'merchants', merchantId);
    const merchantSnapshot = await getDoc(merchantDoc);
    
    if (!merchantSnapshot.exists()) {
      console.error('Merchant not found:', merchantId);
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    try {
      // Initiate the connected account using our utility function
      console.log('Attempting to connect with integration ID:', GMAIL_INTEGRATION_ID);
      
      try {
        const connectedAccount = await initiateGmailConnection(merchantId);
        
        console.log('Connected account initiated:', {
          id: connectedAccount.connectedAccountId,
          status: connectedAccount.connectionStatus
        });
        
        // Store the connection information in Firestore
        await setDoc(
          doc(db, 'merchants', merchantId, 'integrations', 'gmail'),
          {
            connected: connectedAccount.connectionStatus === 'ACTIVE',
            connectedAccountId: connectedAccount.connectedAccountId,
            connectionStatus: connectedAccount.connectionStatus,
            provider: 'composio',
            lastUpdated: serverTimestamp(),
            connectedAt: serverTimestamp(),
          },
          { merge: true }
        );
        
        // Return debug information if requested
        if (debugMode) {
          return NextResponse.json({
            status: 'ok',
            merchantId,
            connectedAccount: {
              id: connectedAccount.connectedAccountId,
              status: connectedAccount.connectionStatus
            },
            redirectUrl: connectedAccount.redirectUrl
          });
        }
        
        // Redirect to the OAuth URL provided by Composio
        if (connectedAccount.redirectUrl) {
          console.log('Redirecting to Composio OAuth URL:', connectedAccount.redirectUrl);
          return NextResponse.redirect(connectedAccount.redirectUrl);
        } else {
          console.error('No redirect URL provided by Composio');
          return NextResponse.json(
            { error: 'No redirect URL provided for authentication' },
            { status: 500 }
          );
        }
      } catch (composioError) {
        console.error('Detailed Composio integration error:', composioError);
        
        // Enhanced error response
        const errorMessage = composioError instanceof Error ? composioError.message : String(composioError);
        const errorDetails = {
          message: errorMessage,
          stack: composioError instanceof Error ? composioError.stack : undefined,
          apiKey: COMPOSIO_API_KEY ? `${COMPOSIO_API_KEY.substring(0, 3)}...${COMPOSIO_API_KEY.substring(COMPOSIO_API_KEY.length - 3)}` : 'missing',
          integrationId: GMAIL_INTEGRATION_ID
        };
        
        console.error('Error details:', JSON.stringify(errorDetails));
        
        return NextResponse.json(
          { 
            error: `Composio integration error: ${errorMessage}`,
            details: errorDetails
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error initiating Gmail Composio connection:', error);
      return NextResponse.json(
        { error: `Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error initiating Gmail Composio connection:', error);
    return NextResponse.json(
      { error: `Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 