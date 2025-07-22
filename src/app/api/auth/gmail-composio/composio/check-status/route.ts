import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getComposioToolset } from '@/lib/composio';

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
    const toolset = getComposioToolset();
    
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
      
      // Debug: Log all available data from the connection
      console.log('=== COMPLETE GMAIL CONNECTION DATA DEBUG ===');
      console.log('Gmail connection object:', JSON.stringify(gmailConnection, null, 2));
      console.log('Gmail connection properties:', Object.keys(gmailConnection));
      console.log('=== END GMAIL CONNECTION DEBUG ===');
      
      // Update the Gmail Composio integration status in Firestore with all available data
      const updateData: any = {
        connected: true,
        connectedAccountId: gmailConnection.id,
        connectionStatus: gmailConnection.status,
        provider: 'composio',
        lastUpdated: serverTimestamp(),
        connectedAt: serverTimestamp(),
        integrationId: GMAIL_INTEGRATION_ID,
      };

      // Store all available properties from the connection response
      const connectionProperties = [
        'appName', 'appUniqueId', 'entityId', 'userId', 'emailAddress', 
        'displayName', 'avatarUrl', 'createdAt', 'updatedAt', 'metadata', 
        'config', 'tags', 'permissions', 'scopes', 'expiresAt', 'refreshToken',
        'accessToken', 'idToken', 'tokenType', 'expiresIn', 'scope'
      ];

      connectionProperties.forEach(prop => {
        if ((gmailConnection as any)[prop] !== undefined) {
          updateData[prop] = (gmailConnection as any)[prop];
          console.log(`Storing ${prop}:`, (gmailConnection as any)[prop]);
        }
      });

      // Store the complete response for debugging
      updateData.fullResponse = JSON.parse(JSON.stringify(gmailConnection));

      // Fetch Gmail profile data directly from Composio API to get email address and other details
      try {
        console.log('Fetching Gmail profile data from Composio API in check-status...');
        
        const gmailProfileResponse = await fetch("https://backend.composio.dev/api/v3/tools/execute/GMAIL_GET_PROFILE", {
          method: "POST",
          headers: {
            "x-api-key": COMPOSIO_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "arguments": {},
            "connectedAccountId": gmailConnection.id
          }),
        });

        if (gmailProfileResponse.ok) {
          const gmailProfileData = await gmailProfileResponse.json();
          console.log('Gmail profile API response in check-status:', JSON.stringify(gmailProfileData, null, 2));
          
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
              updateData.connected = true; // Set connected status when email is found
              console.log('Email address fetched from Gmail API in check-status:', profileData.emailAddress);
              console.log('Setting connected status to true in check-status');
            }
            
            console.log('Successfully stored Gmail profile data in check-status');
          } else {
            console.warn('Gmail profile API call was not successful in check-status:', gmailProfileData);
          }
        } else {
          const errorText = await gmailProfileResponse.text();
          console.error('Failed to fetch Gmail profile in check-status. Status:', gmailProfileResponse.status, 'Response:', errorText);
        }
      } catch (gmailApiError) {
        console.error('Error calling Gmail profile API in check-status:', gmailApiError);
      }

      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail'),
        updateData
      );
      
      console.log(`Successfully updated Gmail Composio integration status for merchant: ${merchantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Gmail Composio connection status updated successfully',
        connection: {
          id: gmailConnection.id,
          status: gmailConnection.status,
          appName: gmailConnection.appName,
          connected: true
        }
      });
    } else {
      console.log('No active Gmail Composio connection found for merchant');
      
      // Update to disconnected status
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail_composio'),
        {
          connected: false,
          connectionStatus: 'INACTIVE',
          lastUpdated: serverTimestamp()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'No active Gmail Composio connection found',
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