import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = 'smwbexfl2lqlcy3wb0cq3';
const GOOGLE_SHEETS_INTEGRATION_ID = 'fa4d8a13-fa7d-45b4-942c-09d0eaf243d5';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Google Sheets Composio status check requested');
  
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
    
    console.log('Checking Google Sheets Composio status for merchant:', merchantId);
    
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
    
    // Find Google Sheets integration
    const googleSheetsConnection = allConns.find(
      account => account.appName === 'googlesheets' && account.status === 'ACTIVE'
    );
    
    if (googleSheetsConnection) {
      console.log('Found active Google Sheets connection:', googleSheetsConnection.id);
      
      // Update the Google Sheets integration status in Firestore
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'google_sheets'),
        {
          connected: true,
          connectedAccountId: googleSheetsConnection.id,
          connectionStatus: googleSheetsConnection.status,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: GOOGLE_SHEETS_INTEGRATION_ID,
          appName: googleSheetsConnection.appName,
          ...(googleSheetsConnection.appUniqueId ? { appUniqueId: googleSheetsConnection.appUniqueId } : {})
        }
      );
      
      console.log(`Successfully updated Google Sheets integration status for merchant: ${merchantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Google Sheets connection status updated successfully',
        connection: {
          id: googleSheetsConnection.id,
          status: googleSheetsConnection.status,
          appName: googleSheetsConnection.appName,
          connected: true
        }
      });
    } else {
      console.log('No active Google Sheets connection found for merchant');
      
      // Update to disconnected status
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'google_sheets'),
        {
          connected: false,
          connectionStatus: 'INACTIVE',
          lastUpdated: serverTimestamp()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'No active Google Sheets connection found',
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
    console.error('Error checking Google Sheets Composio status:', error);
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