import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GMAIL_INTEGRATION_ID = process.env.COMPOSIO_GMAIL_INTEGRATION_ID || '48ab3736-146c-4fdf-bd30-dda79973bd1d';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Gmail Composio callback received');
  
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
    // Now we need to check all existing Gmail Composio integrations and update their status
    if (code) {
      try {
        console.log('OAuth successful, checking all Gmail Composio integrations for updates...');
        
        // Initialize Composio toolset
        const toolset = new OpenAIToolSet({ apiKey: COMPOSIO_API_KEY });
        
        // Get all connected accounts for this integration
        const connRes = await toolset.connectedAccounts.list({
          integrationId: GMAIL_INTEGRATION_ID
        });
        
        // Handle the response structure (could be array or object with items)
        const allConns = Array.isArray(connRes) ? connRes : connRes.items ?? [];
        console.log(`Found ${allConns.length} connected accounts for Gmail Composio integration`);
        
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
                // Get detailed account information
                const detailedAccount = await toolset.connectedAccounts.get(account.id);
                
                // Update the Gmail Composio integration status with all available data
                const updateData: any = {
                  connected: true,
                  connectedAccountId: account.id,
                  connectionStatus: account.status,
                  provider: 'composio',
                  lastUpdated: serverTimestamp(),
                  connectedAt: serverTimestamp(),
                  integrationId: GMAIL_INTEGRATION_ID,
                  // Store all available properties from the detailed account response
                  ...(account.appName ? { appName: account.appName } : {}),
                  ...(account.appUniqueId ? { appUniqueId: account.appUniqueId } : {}),
                  ...(account.entityId ? { entityId: account.entityId } : {}),
                  ...(account.userId ? { userId: account.userId } : {}),
                  ...(account.emailAddress ? { emailAddress: account.emailAddress } : {}),
                  ...(account.displayName ? { displayName: account.displayName } : {}),
                  ...(account.avatarUrl ? { avatarUrl: account.avatarUrl } : {}),
                  ...(account.createdAt ? { createdAt: account.createdAt } : {}),
                  ...(account.updatedAt ? { updatedAt: account.updatedAt } : {}),
                  ...(account.metadata ? { metadata: account.metadata } : {}),
                  ...(account.config ? { config: account.config } : {}),
                  ...(account.tags ? { tags: account.tags } : {}),
                  ...(account.permissions ? { permissions: account.permissions } : {}),
                  ...(account.scopes ? { scopes: account.scopes } : {}),
                  ...(account.expiresAt ? { expiresAt: account.expiresAt } : {}),
                  // Store the complete detailed response for debugging
                  fullDetailedResponse: JSON.parse(JSON.stringify(detailedAccount))
                };

                // If we don't have email address from Composio, try to fetch it from Gmail API
                // Note: Composio doesn't expose access tokens directly, so we'll rely on the email address
                // that should be available in the Composio response
                if (!updateData.emailAddress) {
                  console.log('No email address found in Composio response, will need to fetch it later');
                }

                await updateDoc(
                  doc(db, 'merchants', merchantId, 'integrations', 'gmail_composio'),
                  updateData
                );
                
                console.log(`Successfully updated Gmail Composio integration for merchant: ${merchantId}`);
                console.log('Stored data keys:', Object.keys(updateData));
              } else {
                console.warn(`Merchant ${merchantId} not found in database, skipping update`);
              }
            } catch (dbError) {
              console.error(`Error updating Firestore for merchant ${merchantId}:`, dbError);
            }
          }
        }
        
        console.log('Finished updating all active Gmail Composio connections');
        
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
                // Get detailed account information
                const detailedAccount = await toolset.connectedAccounts.get(merchantAccount.id);
                
                const updateData: any = {
                  connected: true,
                  connectedAccountId: merchantAccount.id,
                  connectionStatus: merchantAccount.status,
                  provider: 'composio',
                  lastUpdated: serverTimestamp(),
                  connectedAt: serverTimestamp(),
                  integrationId: GMAIL_INTEGRATION_ID,
                  ...(merchantAccount.appName ? { appName: merchantAccount.appName } : {}),
                  ...(merchantAccount.appUniqueId ? { appUniqueId: merchantAccount.appUniqueId } : {}),
                  ...(merchantAccount.emailAddress ? { emailAddress: merchantAccount.emailAddress } : {}),
                  ...(merchantAccount.displayName ? { displayName: merchantAccount.displayName } : {}),
                  fullDetailedResponse: JSON.parse(JSON.stringify(detailedAccount))
                };

                await updateDoc(
                  doc(db, 'merchants', state, 'integrations', 'gmail_composio'),
                  updateData
                );
                
                console.log(`Successfully updated Gmail Composio integration via state parameter for merchant: ${state}`);
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
    return NextResponse.redirect('/dashboard/integrations?success=true&source=gmail_composio_callback');
  } catch (error) {
    console.error('Error handling Gmail Composio callback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(`/dashboard/integrations?error=server_error&details=${encodeURIComponent(errorMessage)}`);
  }
} 