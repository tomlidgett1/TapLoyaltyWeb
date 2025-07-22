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
                
                // Debug: Log all available data from both account and detailedAccount
                console.log('=== COMPLETE ACCOUNT DATA DEBUG ===');
                console.log('Account from list:', JSON.stringify(account, null, 2));
                console.log('Detailed account:', JSON.stringify(detailedAccount, null, 2));
                console.log('Account properties:', Object.keys(account));
                console.log('Detailed account properties:', Object.keys(detailedAccount));
                console.log('=== END ACCOUNT DEBUG ===');
                
                // Update the Gmail Composio integration status with all available data
                const updateData: any = {
                  connected: true,
                  connectedAccountId: account.id,
                  connectionStatus: account.status,
                  provider: 'composio',
                  lastUpdated: serverTimestamp(),
                  connectedAt: serverTimestamp(),
                  integrationId: GMAIL_INTEGRATION_ID,
                };

                // Store all available properties from the account response
                const accountProperties = [
                  'appName', 'appUniqueId', 'entityId', 'userId', 'emailAddress', 
                  'displayName', 'avatarUrl', 'createdAt', 'updatedAt', 'metadata', 
                  'config', 'tags', 'permissions', 'scopes', 'expiresAt', 'refreshToken',
                  'accessToken', 'idToken', 'tokenType', 'expiresIn', 'scope'
                ];

                accountProperties.forEach(prop => {
                  if ((account as any)[prop] !== undefined) {
                    updateData[prop] = (account as any)[prop];
                    console.log(`Storing ${prop}:`, (account as any)[prop]);
                  }
                });

                // Store all available properties from the detailed account response
                const detailedProperties = [
                  'appName', 'appUniqueId', 'entityId', 'userId', 'emailAddress', 
                  'displayName', 'avatarUrl', 'createdAt', 'updatedAt', 'metadata', 
                  'config', 'tags', 'permissions', 'scopes', 'expiresAt', 'refreshToken',
                  'accessToken', 'idToken', 'tokenType', 'expiresIn', 'scope'
                ];

                detailedProperties.forEach(prop => {
                  if ((detailedAccount as any)[prop] !== undefined) {
                    updateData[prop] = (detailedAccount as any)[prop];
                    console.log(`Storing detailed ${prop}:`, (detailedAccount as any)[prop]);
                  }
                });

                // Store the complete responses for debugging
                updateData.fullAccountResponse = JSON.parse(JSON.stringify(account));
                updateData.fullDetailedResponse = JSON.parse(JSON.stringify(detailedAccount));

                // Fetch Gmail profile data directly from Composio API to get email address and other details
                try {
                  console.log('Fetching Gmail profile data from Composio API...');
                  
                  const gmailProfileResponse = await fetch("https://backend.composio.dev/api/v3/tools/execute/GMAIL_GET_PROFILE", {
                    method: "POST",
                    headers: {
                      "x-api-key": COMPOSIO_API_KEY,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      "arguments": {},
                      "user_id": merchantId
                    }),
                  });

                  if (gmailProfileResponse.ok) {
                    const gmailProfileData = await gmailProfileResponse.json();
                    console.log('Gmail profile API response:', JSON.stringify(gmailProfileData, null, 2));
                    
                    if (gmailProfileData.successful && gmailProfileData.data?.response_data) {
                      const profileData = gmailProfileData.data.response_data;
                      
                      // Store all the Gmail profile data
                      updateData.gmailProfile = {
                        emailAddress: profileData.emailAddress,
                        historyId: profileData.historyId,
                        messagesTotal: profileData.messagesTotal,
                        threadsTotal: profileData.threadsTotal
                      };
                      
                      // Also store email address at the top level for easy access
                      if (profileData.emailAddress) {
                        updateData.emailAddress = profileData.emailAddress;
                        console.log('Email address fetched from Gmail API:', profileData.emailAddress);
                      }
                      
                      console.log('Successfully stored Gmail profile data');
                    } else {
                      console.warn('Gmail profile API call was not successful:', gmailProfileData);
                    }
                  } else {
                    const errorText = await gmailProfileResponse.text();
                    console.error('Failed to fetch Gmail profile. Status:', gmailProfileResponse.status, 'Response:', errorText);
                  }
                } catch (gmailApiError) {
                  console.error('Error calling Gmail profile API:', gmailApiError);
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