import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Testing Google Sheets Composio integration');
  
  try {
    // Extract parameters
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const customIntegrationId = searchParams.get('integrationId') || 'fa4d8a13-fa7d-45b4-942c-09d0eaf243d5';
    const debugMode = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';
    
    if (!merchantId) {
      return NextResponse.json({
        success: false,
        error: "Missing merchantId parameter"
      }, { status: 400 });
    }
    
    // Verify the merchant exists
    try {
      const merchantDoc = await getDoc(doc(db, 'merchants', merchantId));
      if (!merchantDoc.exists()) {
        console.error('Merchant not found:', merchantId);
        return NextResponse.json({
          success: false,
          error: "Merchant not found"
        }, { status: 404 });
      }
    } catch (dbError) {
      console.error('Error checking merchant:', dbError);
      return NextResponse.json({
        success: false,
        error: "Error verifying merchant in database"
      }, { status: 500 });
    }
    
    // Initialize toolset with the API key
    console.log('Initializing Composio with integration ID:', customIntegrationId);
    const toolset = new OpenAIToolSet({ apiKey: 'smwbexfl2lqlcy3wb0cq3' });
    
    // Skip straight to initiation - this is the simplest test
    console.log(`Initiating connection with entityId: ${merchantId}, integrationId: ${customIntegrationId}`);
    const connectedAccount = await toolset.connectedAccounts.initiate({
      integrationId: customIntegrationId,
      entityId: merchantId,
      redirectUri: "https://app.taployalty.com.au"
    });
    
    console.log('Connected account initiated:', {
      status: connectedAccount.connectionStatus,
      id: connectedAccount.connectedAccountId,
      hasRedirectUrl: !!connectedAccount.redirectUrl
    });
    
    // Store the connection information in Firestore
    try {
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'google_sheets'),
        {
          connected: connectedAccount.connectionStatus === 'ACTIVE',
          connectedAccountId: connectedAccount.connectedAccountId,
          connectionStatus: connectedAccount.connectionStatus,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: customIntegrationId
        },
        { merge: true }
      );
      
      console.log('Stored connection details in Firestore');
    } catch (dbError) {
      console.error('Error storing connection details in Firestore:', dbError);
      // Continue with the process even if storage fails
    }
    
    // If we have a redirect URL, return it
    if (connectedAccount.redirectUrl) {
      // Show debug data if requested
      if (debugMode) {
        return NextResponse.json({
          success: true,
          message: "Successfully initiated connection",
          connectedAccount: {
            id: connectedAccount.connectedAccountId,
            status: connectedAccount.connectionStatus
          },
          redirectUrl: connectedAccount.redirectUrl,
          storedInFirebase: true
        });
      }
      
      // Otherwise redirect
      return NextResponse.redirect(connectedAccount.redirectUrl);
    } else {
      return NextResponse.json({
        success: false,
        error: "No redirect URL provided by Composio"
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in Google Sheets integration:', error);
    
    // Format error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Add more detailed error information
    let detailedError: any = null;
    if (error && typeof error === 'object') {
      detailedError = {};
      
      // Copy all properties that might be useful for debugging
      if ('metadata' in error) detailedError.metadata = (error as any).metadata;
      if ('errCode' in error) detailedError.errCode = (error as any).errCode;
      if ('description' in error) detailedError.description = (error as any).description;
      if ('possibleFix' in error) detailedError.possibleFix = (error as any).possibleFix;
      if ('timestamp' in error) detailedError.timestamp = (error as any).timestamp;
      if ('errorId' in error) detailedError.errorId = (error as any).errorId;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
      detailedError: detailedError
    }, { status: 500 });
  }
} 