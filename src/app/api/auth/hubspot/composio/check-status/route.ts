import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = 'smwbexfl2lqlcy3wb0cq3';
const HUBSPOT_INTEGRATION_ID = '4fc8c5e7-78f7-45b9-a24a-066d08116e6a';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('HubSpot Composio status check requested');
  
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }
    
    console.log('Checking HubSpot Composio status for merchant:', merchantId);
    
    // Verify the merchant exists
    const merchantDoc = await getDoc(doc(db, 'merchants', merchantId));
    if (!merchantDoc.exists()) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    // Initialize Composio toolset
    const toolset = new OpenAIToolSet({ apiKey: COMPOSIO_API_KEY });
    
    // Get connected accounts for this merchant
    const connRes = await toolset.connectedAccounts.list({
      entityId: merchantId
    });
    
    // Handle the response structure
    const allConns = Array.isArray(connRes) ? connRes : connRes.items ?? [];
    console.log(`Found ${allConns.length} connected accounts for merchant ${merchantId}`);
    
    // Find HubSpot integration
    const hubspotConnection = allConns.find(
      account => account.appName === 'hubspot' && account.status === 'ACTIVE'
    );
    
    if (hubspotConnection) {
      console.log('Found active HubSpot connection:', hubspotConnection.id);
      
      // Update the HubSpot integration status in Firestore
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'hubspot'),
        {
          connected: true,
          connectedAccountId: hubspotConnection.id,
          connectionStatus: hubspotConnection.status,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: HUBSPOT_INTEGRATION_ID,
          appName: hubspotConnection.appName,
          ...(hubspotConnection.appUniqueId ? { appUniqueId: hubspotConnection.appUniqueId } : {})
        }
      );
      
      console.log(`Successfully updated HubSpot integration status for merchant: ${merchantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'HubSpot connection status updated successfully',
        connection: {
          id: hubspotConnection.id,
          status: hubspotConnection.status,
          appName: hubspotConnection.appName,
          connected: true
        }
      });
    } else {
      console.log('No active HubSpot connection found for merchant');
      
      // Update to disconnected status
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'hubspot'),
        {
          connected: false,
          connectionStatus: 'INACTIVE',
          lastUpdated: serverTimestamp()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'No active HubSpot connection found',
        connection: {
          connected: false,
          availableConnections: allConns.map(conn => ({
            id: conn.id,
            appName: conn.appName,
            status: conn.status
          }))
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking HubSpot Composio status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: `Failed to check status: ${errorMessage}`,
        success: false
      },
      { status: 500 }
    );
  }
} 