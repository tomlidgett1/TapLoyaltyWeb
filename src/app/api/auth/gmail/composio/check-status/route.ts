import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GMAIL_INTEGRATION_ID = process.env.COMPOSIO_GMAIL_INTEGRATION_ID || '48ab3736-146c-4fdf-bd30-dda79973bd1d';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Gmail Composio status check requested');
  
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
    
    console.log('Checking Gmail Composio status for merchant:', merchantId);
    
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
    
    // Find Gmail integration
    const gmailConnection = allConns.find(
      account => account.appName === 'gmail' && account.status === 'ACTIVE'
    );
    
    if (gmailConnection) {
      console.log('Found active Gmail connection:', gmailConnection.id);
      
      // Update the Gmail integration status in Firestore
      await updateDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail'),
        {
          connected: true,
          connectedAccountId: gmailConnection.id,
          connectionStatus: gmailConnection.status,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: GMAIL_INTEGRATION_ID,
          appName: gmailConnection.appName,
          ...(gmailConnection.appUniqueId ? { appUniqueId: gmailConnection.appUniqueId } : {})
        }
      );
      
      console.log(`Successfully updated Gmail integration status for merchant: ${merchantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Gmail connection status updated successfully',
        connection: {
          id: gmailConnection.id,
          status: gmailConnection.status,
          appName: gmailConnection.appName,
          connected: true
        }
      });
    } else {
      console.log('No active Gmail connection found for merchant');
      
      // Update to disconnected status
      await updateDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail'),
        {
          connected: false,
          connectionStatus: 'INACTIVE',
          lastUpdated: serverTimestamp()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'No active Gmail connection found',
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
    console.error('Error checking Gmail Composio status:', error);
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