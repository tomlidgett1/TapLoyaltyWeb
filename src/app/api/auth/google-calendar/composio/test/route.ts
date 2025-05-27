import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GOOGLE_CALENDAR_INTEGRATION_ID = process.env.COMPOSIO_GOOGLE_CALENDAR_INTEGRATION_ID || 'e4c1c614-421c-4ab2-9544-20b3b1b8c5d3';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Testing Composio Google Calendar integration');
  
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
      isTargetIntegration: integration.id === GOOGLE_CALENDAR_INTEGRATION_ID
    }));
    
    // Test 2: Try to get our specific Google Calendar integration
    console.log(`Fetching Google Calendar integration with ID: ${GOOGLE_CALENDAR_INTEGRATION_ID}`);
    let googleCalendarIntegration: any = null;
    let googleCalendarIntegrationError = null;
    
    try {
      googleCalendarIntegration = await toolset.integrations.get({
        integrationId: GOOGLE_CALENDAR_INTEGRATION_ID
      });
      console.log('Successfully fetched Google Calendar integration:', googleCalendarIntegration.name);
    } catch (error) {
      googleCalendarIntegrationError = error instanceof Error ? error.message : String(error);
      console.error('Error fetching Google Calendar integration:', googleCalendarIntegrationError);
    }
    
    // Return diagnostic information
    return NextResponse.json({
      status: googleCalendarIntegration ? 'ok' : 'error',
      apiKeyPrefix: COMPOSIO_API_KEY.substring(0, 3),
      apiKeySuffix: COMPOSIO_API_KEY.substring(COMPOSIO_API_KEY.length - 3),
      targetIntegrationId: GOOGLE_CALENDAR_INTEGRATION_ID,
      foundTargetIntegration: integrationsList.some((i: any) => i.isTargetIntegration),
      totalIntegrationsCount: integrationsArray.length,
      googleCalendarIntegration: googleCalendarIntegration ? {
        id: googleCalendarIntegration.id,
        name: googleCalendarIntegration.name,
        category: googleCalendarIntegration.category
      } : null,
      googleCalendarIntegrationError,
      integrations: verbose ? integrationsList : undefined
    });
  } catch (error) {
    console.error('Error testing Composio Google Calendar integration:', error);
    return NextResponse.json(
      { 
        error: `Failed to test Composio Google Calendar integration: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 