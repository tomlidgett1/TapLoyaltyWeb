import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getComposioToolset } from '@/lib/composio';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GOOGLE_DOCS_INTEGRATION_ID = process.env.COMPOSIO_GOOGLE_DOCS_INTEGRATION_ID || 'b75caef3-ef36-4abd-893a-a350cc1d4a31';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Google Docs Composio status check requested');
  
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
    
    console.log('Checking Google Docs Composio status for merchant:', merchantId);
    
    // Verify the merchant exists
    const merchantDoc = await getDoc(doc(db, 'merchants', merchantId));
    if (!merchantDoc.exists()) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    // Initialize Composio toolset
    const toolset = getComposioToolset();
    
    // Get connected accounts for this merchant
    const connRes = await toolset.connectedAccounts.list({
      entityId: merchantId
    });
    
    // Handle the response structure
    const allConns = Array.isArray(connRes) ? connRes : connRes.items ?? [];
    console.log(`Found ${allConns.length} connected accounts for merchant ${merchantId}`);
    
    // Find Google Docs integration
    const googleDocsConnection = allConns.find(
      account => account.appName === 'googledocs' && account.status === 'ACTIVE'
    );
    
    if (googleDocsConnection) {
      console.log('Found active Google Docs connection:', googleDocsConnection.id);
      
      // Update the Google Docs integration status in Firestore
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'google_docs'),
        {
          connected: true,
          connectedAccountId: googleDocsConnection.id,
          connectionStatus: googleDocsConnection.status,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: GOOGLE_DOCS_INTEGRATION_ID,
          appName: googleDocsConnection.appName,
          ...(googleDocsConnection.appUniqueId ? { appUniqueId: googleDocsConnection.appUniqueId } : {})
        }
      );
      
      console.log(`Successfully updated Google Docs integration status for merchant: ${merchantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Google Docs connection status updated successfully',
        connection: {
          id: googleDocsConnection.id,
          status: googleDocsConnection.status,
          appName: googleDocsConnection.appName,
          connected: true
        }
      });
    } else {
      console.log('No active Google Docs connection found for merchant');
      
      // Update to disconnected status
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'google_docs'),
        {
          connected: false,
          connectionStatus: 'INACTIVE',
          lastUpdated: serverTimestamp()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'No active Google Docs connection found',
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
    console.error('Error checking Google Docs Composio status:', error);
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