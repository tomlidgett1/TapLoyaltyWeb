import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GMAIL_INTEGRATION_ID = process.env.COMPOSIO_GMAIL_INTEGRATION_ID || '48ab3736-146c-4fdf-bd30-dda79973bd1d';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Testing Composio Gmail integration');
  
  try {
    // Get debug flag from query params
    const { searchParams } = new URL(request.url);
    const verbose = searchParams.get('verbose') === '1' || searchParams.get('verbose') === 'true';
    
    // Initialize Composio tool set
    console.log('Initializing Composio with API key:', `${COMPOSIO_API_KEY.substring(0, 3)}...${COMPOSIO_API_KEY.substring(COMPOSIO_API_KEY.length - 3)}`);
    const toolset = new OpenAIToolSet({ apiKey: COMPOSIO_API_KEY });
    
    // Test 1: List all available integrations
    console.log('Fetching available integrations...');
    const integrations = await toolset.integrations.list();
    
    // Cast the response to an array to satisfy TypeScript
    const integrationsArray = Array.isArray(integrations) ? integrations : [integrations];
    
    const integrationsList = integrationsArray.map((integration: any) => ({
      id: integration.id,
      name: integration.name,
      isTargetIntegration: integration.id === GMAIL_INTEGRATION_ID
    }));
    
    // Test 2: Try to get our specific Gmail integration
    console.log(`Fetching Gmail integration with ID: ${GMAIL_INTEGRATION_ID}`);
    let gmailIntegration: any = null;
    let gmailIntegrationError = null;
    
    try {
      gmailIntegration = await toolset.integrations.get({
        integrationId: GMAIL_INTEGRATION_ID
      });
      console.log('Successfully fetched Gmail integration:', gmailIntegration.name);
    } catch (error) {
      gmailIntegrationError = error instanceof Error ? error.message : String(error);
      console.error('Error fetching Gmail integration:', gmailIntegrationError);
    }
    
    // Return diagnostic information
    return NextResponse.json({
      status: gmailIntegration ? 'ok' : 'error',
      apiKeyPrefix: COMPOSIO_API_KEY.substring(0, 3),
      apiKeySuffix: COMPOSIO_API_KEY.substring(COMPOSIO_API_KEY.length - 3),
      targetIntegrationId: GMAIL_INTEGRATION_ID,
      foundTargetIntegration: integrationsList.some((i: any) => i.isTargetIntegration),
      totalIntegrationsCount: integrationsArray.length,
      gmailIntegration: gmailIntegration ? {
        id: gmailIntegration.id,
        name: gmailIntegration.name,
        category: gmailIntegration.category
      } : null,
      gmailIntegrationError,
      integrations: verbose ? integrationsList : undefined
    });
  } catch (error) {
    console.error('Error testing Composio integration:', error);
    return NextResponse.json(
      { 
        error: `Failed to test Composio integration: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 