import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Testing direct Composio Gmail integration with user-provided code');
  
  try {
    // Use exact code from user
    console.log('2025-05-23T03:24:26.255Z - Initializing Composio w API Key: [REDACTED] and baseURL: https://backend.composio.dev');
    const toolset = new OpenAIToolSet({ apiKey: 'smwbexfl2lqlcy3wb0cq3' });

    // Step 1: Get the integration
    console.log('Fetching integration with ID: 48ab3736-146c-4fdf-bd30-dda79973bd1d');
    const integration = await toolset.integrations.get({
      integrationId: '48ab3736-146c-4fdf-bd30-dda79973bd1d'
    });
    
    console.log('Successfully retrieved integration:', integration.name);
    console.log('2025-05-23T03:24:26.790Z - 🚀 [Info] Give Feedback / Get Help: https://dub.composio.dev/discord');
    console.log('2025-05-23T03:24:26.790Z - 🐛 [Info] Create a new issue: https://github.com/ComposioHQ/composio/issues');
    console.log('2025-05-23T03:24:26.790Z - ⛔ [Info] If you need to debug this error, set env variable COMPOSIO_LOGGING_LEVEL=debug');
    
    // Step 2: Get required parameters - FIX: Use object parameter instead of string
    try {
      console.log('Getting required parameters for integration:', integration.id);
      const expectedInputFields = await toolset.integrations.getRequiredParams({
        integrationId: integration.id
      });
      console.log('Required input fields:', expectedInputFields);
      
      // Step 3: Initiate connection
      // Get merchant ID from query parameter if available, otherwise use 'default'
      const { searchParams } = new URL(request.url);
      const entityId = searchParams.get('merchantId') || 'default';
      
      console.log(`Initiating connection with entityId: ${entityId}`);
      const connectedAccount = await toolset.connectedAccounts.initiate({
        integrationId: integration.id,
        entityId: entityId,
      });
      
      console.log('Connected account details:', {
        status: connectedAccount.connectionStatus,
        id: connectedAccount.connectedAccountId,
        hasRedirectUrl: !!connectedAccount.redirectUrl
      });
      
      // Return success result
      return NextResponse.json({
        success: true,
        integration: {
          id: integration.id,
          name: integration.name
        },
        inputFields: expectedInputFields,
        connectedAccount: {
          id: connectedAccount.connectedAccountId,
          status: connectedAccount.connectionStatus
        },
        redirectUrl: connectedAccount.redirectUrl
      });
    } catch (paramsError) {
      console.error('Error getting required parameters:', paramsError);
      
      // Skip the parameters step and try to initiate connection directly
      const { searchParams } = new URL(request.url);
      const entityId = searchParams.get('merchantId') || 'default';
      
      console.log(`Skipping parameters, initiating connection with entityId: ${entityId}`);
      const connectedAccount = await toolset.connectedAccounts.initiate({
        integrationId: integration.id,
        entityId: entityId,
      });
      
      return NextResponse.json({
        success: true,
        note: "Skipped getRequiredParams due to error",
        integration: {
          id: integration.id,
          name: integration.name
        },
        paramsError: paramsError instanceof Error ? paramsError.message : String(paramsError),
        connectedAccount: {
          id: connectedAccount.connectedAccountId,
          status: connectedAccount.connectionStatus
        },
        redirectUrl: connectedAccount.redirectUrl
      });
    }
  } catch (error) {
    console.error('Error in direct test:', error);
    
    // Format error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Add more detailed error information
    let detailedError = null;
    if (error && typeof error === 'object') {
      detailedError = {};
      
      // Copy all properties that might be useful for debugging
      const errorProps = ['metadata', 'errCode', 'description', 'possibleFix', 'timestamp', 'errorId'];
      for (const prop of errorProps) {
        if (prop in error) {
          detailedError[prop] = error[prop];
        }
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
      detailedError: detailedError,
      hint: "Found error in the Composio integration code - added the error logs for debugging"
    }, { status: 500 });
  }
} 