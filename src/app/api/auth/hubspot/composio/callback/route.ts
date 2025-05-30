import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = 'smwbexfl2lqlcy3wb0cq3';
const HUBSPOT_INTEGRATION_ID = '4fc8c5e7-78f7-45b9-a24a-066d08116e6a';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('HubSpot Composio callback received');
  
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // From Composio, might contain merchant ID
    const error = searchParams.get('error');
    
    console.log('Callback parameters - code exists:', !!code, 'state exists:', !!state);
    console.log('State parameter:', state);
    
    // Handle errors from Composio OAuth
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`/dashboard/integrations?error=auth_error&details=${encodeURIComponent(error)}`);
    }
    
    // If we have a code, that means the OAuth was successful
    // Now we need to check all existing HubSpot integrations and update their status
    if (code) {
      try {
        console.log('OAuth successful, checking all HubSpot integrations for updates...');
        
        // Initialize Composio toolset
        const toolset = new OpenAIToolSet({ apiKey: COMPOSIO_API_KEY });
        
        // Get all connected accounts for this integration
        const connRes = await toolset.connectedAccounts.list({
          integrationId: HUBSPOT_INTEGRATION_ID
        });
        
        // Handle the response structure (could be array or object with items)
        const allConns = Array.isArray(connRes) ? connRes : connRes.items ?? [];
        console.log(`Found ${allConns.length} connected accounts for HubSpot integration`);
        
        // Check each connected account and update the corresponding merchant's Firestore
        for (const account of allConns) {
          // Use the correct property names based on the actual API response
          if (account.status === 'ACTIVE' && account.entityId) {
            const merchantId = account.entityId;
            console.log(`Updating active connection for merchant: ${merchantId}`);
            
            try {
              // Check if this merchant exists in our database
              const merchantDoc = await getDoc(doc(db, 'merchants', merchantId));
              if (merchantDoc.exists()) {
                // Update the HubSpot integration status
                await updateDoc(
                  doc(db, 'merchants', merchantId, 'integrations', 'hubspot'),
                  {
                    connected: true,
                    connectedAccountId: account.id,
                    connectionStatus: account.status,
                    provider: 'composio',
                    lastUpdated: serverTimestamp(),
                    connectedAt: serverTimestamp(),
                    integrationId: HUBSPOT_INTEGRATION_ID,
                    // Store additional account details if available
                    ...(account.appName ? { appName: account.appName } : {}),
                    ...(account.appUniqueId ? { appUniqueId: account.appUniqueId } : {})
                  }
                );
                
                console.log(`Successfully updated HubSpot integration for merchant: ${merchantId}`);
              } else {
                console.warn(`Merchant ${merchantId} not found in database, skipping update`);
              }
            } catch (dbError) {
              console.error(`Error updating Firestore for merchant ${merchantId}:`, dbError);
            }
          }
        }
        
        console.log('Finished updating all active HubSpot connections');
        
        // Also try to update based on the state parameter if it's a valid merchant ID
        if (state) {
          try {
            const merchantDoc = await getDoc(doc(db, 'merchants', state));
            if (merchantDoc.exists()) {
              console.log(`Attempting to update based on state parameter: ${state}`);
              
              // Find the connected account for this merchant
              const merchantAccount = allConns.find(
                account => account.entityId === state && account.status === 'ACTIVE'
              );
              
              if (merchantAccount) {
                await updateDoc(
                  doc(db, 'merchants', state, 'integrations', 'hubspot'),
                  {
                    connected: true,
                    connectedAccountId: merchantAccount.id,
                    connectionStatus: merchantAccount.status,
                    provider: 'composio',
                    lastUpdated: serverTimestamp(),
                    connectedAt: serverTimestamp(),
                    integrationId: HUBSPOT_INTEGRATION_ID,
                    ...(merchantAccount.appName ? { appName: merchantAccount.appName } : {}),
                    ...(merchantAccount.appUniqueId ? { appUniqueId: merchantAccount.appUniqueId } : {})
                  }
                );
                
                console.log(`Successfully updated HubSpot integration via state parameter for merchant: ${state}`);
              }
            }
          } catch (stateError) {
            console.error('Error processing state parameter:', stateError);
          }
        }
        
      } catch (composioError) {
        console.error('Error checking Composio connected accounts:', composioError);
        // Continue to redirect even if the update fails
      }
    }
    
    // Redirect to integrations page with success message
    console.log('Callback completed, redirecting to integrations page');
    return NextResponse.redirect('/dashboard/integrations?success=true&source=composio_hubspot_callback');
  } catch (error) {
    console.error('Error handling HubSpot Composio callback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(`/dashboard/integrations?error=server_error&details=${encodeURIComponent(errorMessage)}`);
  }
} 