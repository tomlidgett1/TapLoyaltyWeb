import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Microsoft Outlook Composio OAuth callback');
  
  try {
    // Extract parameters from URL
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('state') || searchParams.get('merchantId');
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    console.log('Callback parameters:', {
      merchantId,
      hasCode: !!code,
      error: error || 'none'
    });
    
    // Check for errors from OAuth provider
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`https://app.taployalty.com.au/dashboard/integrations?error=oauth_error&details=${encodeURIComponent(error)}`);
    }
    
    if (!merchantId) {
      console.error('No merchantId provided in callback');
      return NextResponse.redirect(`https://app.taployalty.com.au/dashboard/integrations?error=invalid_state&details=${encodeURIComponent('No merchant ID provided in callback')}`);
    }
    
    // Initialize toolset
    const toolset = new OpenAIToolSet({ apiKey: 'smwbexfl2lqlcy3wb0cq3' });
    
    // Query Composio for all connected accounts for this merchant
    console.log('Querying Composio for connected accounts...');
    const connectedAccounts = await toolset.connectedAccounts.list({
      entityId: merchantId
    });
    
    console.log('Connected accounts response:', {
      count: connectedAccounts.items.length,
      entityId: merchantId
    });
    
    // Look for Microsoft Outlook connections (integration ID: 2f4a80d5-2396-49b2-a7f7-05025622bcaa)
    const outlookConnections = connectedAccounts.items.filter(account => 
      account.integrationId === '2f4a80d5-2396-49b2-a7f7-05025622bcaa' && 
      account.status === 'ACTIVE'
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
      // Use the first active connection
      const activeConnection = outlookConnections[0];
      
      // Update Firestore with successful connection
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'outlook'),
        {
          connected: true,
          connectedAccountId: activeConnection.id,
          connectionStatus: activeConnection.status,
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          connectedAt: serverTimestamp(),
          integrationId: '2f4a80d5-2396-49b2-a7f7-05025622bcaa'
        },
        { merge: true }
      );
      
      console.log('Microsoft Outlook integration successful, stored in Firestore');
      
      // Redirect back to integrations page
      return NextResponse.redirect('https://app.taployalty.com.au/dashboard/integrations');
    } else {
      console.log('No active Microsoft Outlook connection found');
      
      // Store failed connection status
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'outlook'),
        {
          connected: false,
          connectionStatus: 'FAILED',
          provider: 'composio',
          lastUpdated: serverTimestamp(),
          integrationId: '2f4a80d5-2396-49b2-a7f7-05025622bcaa',
          error: 'No active connection found after OAuth callback'
        },
        { merge: true }
      );
      
      return NextResponse.redirect(`https://app.taployalty.com.au/dashboard/integrations?error=connection_failed&details=${encodeURIComponent('Microsoft Outlook connection was not established successfully')}`);
    }
  } catch (error) {
    console.error('Error in Microsoft Outlook callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(`https://app.taployalty.com.au/dashboard/integrations?error=callback_error&details=${encodeURIComponent(errorMessage)}`);
  }
} 