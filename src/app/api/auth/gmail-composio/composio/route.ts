import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Testing Gmail Composio integration');
  
  try {
    // Extract parameters
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const customIntegrationId = searchParams.get('integrationId') || '48ab3736-146c-4fdf-bd30-dda79973bd1d';
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
    
    // Debug: Log the toolset object to see what methods are available
    console.log('=== TOOLSET DEBUG ===');
    console.log('Toolset object:', toolset);
    console.log('Toolset methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(toolset)));
    console.log('Connected accounts methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(toolset.connectedAccounts)));
    console.log('=== END TOOLSET DEBUG ===');
    
    // Skip straight to initiation - this is the simplest test
    console.log(`Initiating connection with entityId: ${merchantId}, integrationId: ${customIntegrationId}`);
    
    // Debug: Log the initiate method parameters
    const initiateParams = {
      integrationId: customIntegrationId,
      entityId: merchantId,
      redirectUri: "https://app.taployalty.com.au"
    };
    console.log('=== INITIATE PARAMETERS DEBUG ===');
    console.log('Initiate parameters:', JSON.stringify(initiateParams, null, 2));
    console.log('=== END INITIATE PARAMETERS DEBUG ===');
    
    const connectedAccount = await toolset.connectedAccounts.initiate(initiateParams);
    
    console.log('Connected account initiated:', {
      status: connectedAccount.connectionStatus,
      id: connectedAccount.connectedAccountId,
      hasRedirectUrl: !!connectedAccount.redirectUrl
    });

    // Debug: Log all available properties from the connected account response
    console.log('=== COMPLETE CONNECTED ACCOUNT RESPONSE DEBUG ===');
    console.log('Full response object:', JSON.stringify(connectedAccount, null, 2));
    console.log('Available properties:');
    Object.keys(connectedAccount).forEach(key => {
      console.log(`- ${key}:`, (connectedAccount as any)[key]);
    });
    console.log('=== END DEBUG ===');
    
    // Store the connection information in Firestore
    try {
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail_composio'),
        {
          connected: connectedAccount.connectionStatus === 'ACTIVE',
          connectedAccountId: connectedAccount.connectedAccountId,
          connectionStatus: connectedAccount.connectionStatus,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: customIntegrationId,
          // Store the complete response for debugging
          fullResponse: JSON.parse(JSON.stringify(connectedAccount))
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
    console.error('Error in Gmail Composio integration:', error);
    
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