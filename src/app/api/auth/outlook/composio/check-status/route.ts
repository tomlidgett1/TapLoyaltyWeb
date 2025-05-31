import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Checking Microsoft Outlook Composio status');
  
  try {
    // Extract parameters
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
    if (!merchantId) {
      return NextResponse.json({
        success: false,
        error: "Missing merchantId parameter"
      }, { status: 400 });
    }
    
    // Initialize toolset
    const toolset = new OpenAIToolSet({ apiKey: 'smwbexfl2lqlcy3wb0cq3' });
    
    // Query for connected accounts
    console.log('Checking Microsoft Outlook connection status for merchant:', merchantId);
    const connectedAccounts = await toolset.connectedAccounts.list({
      entityId: merchantId
    });
    
    console.log('Connected accounts response:', {
      count: connectedAccounts.items.length,
      entityId: merchantId
    });
    
    // Look for Microsoft Outlook connections specifically
    const outlookConnections = connectedAccounts.items.filter(account => 
      account.integrationId === '2f4a80d5-2396-49b2-a7f7-05025622bcaa'
    );
    
    console.log('Found Microsoft Outlook connections:', {
      count: outlookConnections.length,
      connections: outlookConnections.map(conn => ({
        id: conn.id,
        status: conn.status,
        integrationId: conn.integrationId
      }))
    });
    
    if (outlookConnections.length > 0) {
      const activeConnection = outlookConnections.find(conn => conn.status === 'ACTIVE');
      
      if (activeConnection) {
        // Update Firestore with current status
        await setDoc(
          doc(db, 'merchants', merchantId, 'integrations', 'outlook'),
          {
            connected: true,
            connectedAccountId: activeConnection.id,
            connectionStatus: activeConnection.status,
            provider: 'composio',
            lastUpdated: serverTimestamp(),
            integrationId: '2f4a80d5-2396-49b2-a7f7-05025622bcaa'
          },
          { merge: true }
        );
        
        return NextResponse.json({
          success: true,
          connection: {
            connected: true,
            id: activeConnection.id,
            status: activeConnection.status
          }
        });
      } else {
        // Connection exists but not active
        await setDoc(
          doc(db, 'merchants', merchantId, 'integrations', 'outlook'),
          {
            connected: false,
            connectionStatus: outlookConnections[0].status,
            provider: 'composio',
            lastUpdated: serverTimestamp(),
            integrationId: '2f4a80d5-2396-49b2-a7f7-05025622bcaa'
          },
          { merge: true }
        );
        
        return NextResponse.json({
          success: true,
          connection: {
            connected: false,
            status: outlookConnections[0].status
          }
        });
      }
    } else {
      // No connections found
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'outlook'),
        {
          connected: false,
          connectionStatus: 'NOT_FOUND',
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          integrationId: '2f4a80d5-2396-49b2-a7f7-05025622bcaa'
        },
        { merge: true }
      );
      
      return NextResponse.json({
        success: true,
        connection: {
          connected: false,
          status: 'NOT_FOUND'
        }
      });
    }
  } catch (error) {
    console.error('Error checking Microsoft Outlook status:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
} 