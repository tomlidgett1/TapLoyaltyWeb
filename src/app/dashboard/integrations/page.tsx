"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, DocumentData, deleteDoc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce"
import { CheckCircle, Globe, BarChart2, MessageSquare, Mail, Phone, Calculator, Calendar, FileText, Table } from "lucide-react"

// Import icons for different POS systems
import { LightspeedIcon } from "@/components/icons/lightspeed-icon"
import { SquareIcon } from "@/components/icons/square-icon"
import { CloverIcon } from "@/components/icons/clover-icon"
import { ShopifyIcon } from "@/components/icons/shopify-icon"
import { GmailIcon } from "@/components/icons/gmail-icon"

// Define integration state type
interface IntegrationState {
  connected: boolean;
  data: DocumentData | null;
}

interface IntegrationsState {
  square: IntegrationState;
  clover: IntegrationState;
  shopify: IntegrationState;
  lightspeed_new: IntegrationState;
  gmail: IntegrationState;
  google_calendar: IntegrationState;
  google_docs: IntegrationState;
  google_sheets: IntegrationState;
  hubspot: IntegrationState;
  outlook: IntegrationState;
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    square: { connected: false, data: null },
    clover: { connected: false, data: null },
    shopify: { connected: false, data: null },
    lightspeed_new: { connected: false, data: null },
    gmail: { connected: false, data: null },
    google_calendar: { connected: false, data: null },
    google_docs: { connected: false, data: null },
    google_sheets: { connected: false, data: null },
    hubspot: { connected: false, data: null },
    outlook: { connected: false, data: null }
  })
  
  const [refreshing, setRefreshing] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [configCheckResult, setConfigCheckResult] = useState<any>(null)
  const [checkingConfig, setCheckingConfig] = useState(false)
  
  // Add debug state
  const [debugMode, setDebugMode] = useState(false)
  const [debugResult, setDebugResult] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugError, setDebugError] = useState<string | null>(null)
  const [customIntegrationId, setCustomIntegrationId] = useState<string>('48ab3736-146c-4fdf-bd30-dda79973bd1d')
  
  // Function to check environment configuration
  const checkEnvironmentConfig = async () => {
    try {
      setCheckingConfig(true)
      const response = await fetch('/api/auth/gmail/check-config')
      const data = await response.json()
      setConfigCheckResult(data)
      console.log('Configuration check result:', data)
    } catch (error) {
      console.error('Error checking configuration:', error)
      setConfigCheckResult({ error: 'Failed to check configuration' })
    } finally {
      setCheckingConfig(false)
    }
  }
  
  // Extract error details from URL on component mount
  useEffect(() => {
    // Check for error details in the URL
    const url = new URL(window.location.href)
    const errorParam = url.searchParams.get('error')
    const detailsParam = url.searchParams.get('details')
    
    if (errorParam && detailsParam) {
      console.log(`Integration error detected: ${errorParam}`);
      console.log(`Error details: ${detailsParam}`);
      setErrorDetails(decodeURIComponent(detailsParam));
      
      // Log additional debug information
      console.log('Full URL parameters:');
      url.searchParams.forEach((value, key) => {
        console.log(`- ${key}: ${value}`);
      });
    }
  }, []);
  
  // Function to manually refresh integration status
  const refreshIntegrationStatus = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to check integration status",
        variant: "destructive"
      });
      return;
    }

    setRefreshing(true);
    try {
      // Check Square integration status
      const squareDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/square`));
      const squareConnected = squareDoc.exists() && squareDoc.data()?.connected === true;
      console.log('Square integration status:', squareConnected ? 'Connected' : 'Not connected');

      // Check Lightspeed New integration status
      const lightspeedNewDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/lightspeed_new`));
      if (lightspeedNewDoc.exists()) {
        const lightspeedNewData = lightspeedNewDoc.data();
        console.log('Lightspeed New integration found:', lightspeedNewData);
        const lightspeedNewConnected = lightspeedNewData?.connected === true;
        console.log('Lightspeed New integration status:', lightspeedNewConnected ? 'Connected' : 'Not connected');
        
        // Check Gmail integration status
        const gmailDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/gmail`));
        const gmailConnected = gmailDoc.exists() && gmailDoc.data()?.connected === true;
        console.log('Gmail integration status:', gmailConnected ? 'Connected' : 'Not connected');
        
        // Check Google Calendar integration status
        const googleCalendarDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_calendar`));
        const googleCalendarConnected = googleCalendarDoc.exists() && googleCalendarDoc.data()?.connected === true;
        console.log('Google Calendar integration status:', googleCalendarConnected ? 'Connected' : 'Not connected');
        
        // Check Google Docs integration status
        const googleDocsDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_docs`));
        const googleDocsConnected = googleDocsDoc.exists() && googleDocsDoc.data()?.connected === true;
        console.log('Google Docs integration status:', googleDocsConnected ? 'Connected' : 'Not connected');
        
        // Check Google Sheets integration status
        const googleSheetsDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_sheets`));
        const googleSheetsConnected = googleSheetsDoc.exists() && googleSheetsDoc.data()?.connected === true;
        console.log('Google Sheets integration status:', googleSheetsConnected ? 'Connected' : 'Not connected');
        
        // Check HubSpot integration status
        const hubspotDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/hubspot`));
        const hubspotConnected = hubspotDoc.exists() && hubspotDoc.data()?.connected === true;
        console.log('HubSpot integration status:', hubspotConnected ? 'Connected' : 'Not connected');
        
        // Check Microsoft Outlook integration status
        const outlookDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/outlook`));
        const outlookConnected = outlookDoc.exists() && outlookDoc.data()?.connected === true;
        console.log('Microsoft Outlook integration status:', outlookConnected ? 'Connected' : 'Not connected');
        
        setIntegrations(prev => ({
          ...prev,
          square: {
            connected: squareConnected,
            data: squareDoc.exists() ? squareDoc.data() : null
          },
          lightspeed_new: {
            connected: lightspeedNewConnected,
            data: lightspeedNewConnected ? lightspeedNewData : null
          },
          gmail: {
            connected: gmailConnected,
            data: gmailDoc.exists() ? gmailDoc.data() : null
          },
          google_calendar: {
            connected: googleCalendarConnected,
            data: googleCalendarDoc.exists() ? googleCalendarDoc.data() : null
          },
          google_docs: {
            connected: googleDocsConnected,
            data: googleDocsDoc.exists() ? googleDocsDoc.data() : null
          },
          google_sheets: {
            connected: googleSheetsConnected,
            data: googleSheetsDoc.exists() ? googleSheetsDoc.data() : null
          },
          hubspot: {
            connected: hubspotConnected,
            data: hubspotDoc.exists() ? hubspotDoc.data() : null
          },
          outlook: {
            connected: outlookConnected,
            data: outlookDoc.exists() ? outlookDoc.data() : null
          }
        }));
      } else {
        console.log('Lightspeed New integration not found');
        
        // Check Gmail integration status even if Lightspeed is not found
        const gmailDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/gmail`));
        const gmailConnected = gmailDoc.exists() && gmailDoc.data()?.connected === true;
        console.log('Gmail integration status:', gmailConnected ? 'Connected' : 'Not connected');
        
        // Check Google Calendar integration status even if Lightspeed is not found
        const googleCalendarDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_calendar`));
        const googleCalendarConnected = googleCalendarDoc.exists() && googleCalendarDoc.data()?.connected === true;
        console.log('Google Calendar integration status:', googleCalendarConnected ? 'Connected' : 'Not connected');
        
        // Check Google Docs integration status even if Lightspeed is not found
        const googleDocsDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_docs`));
        const googleDocsConnected = googleDocsDoc.exists() && googleDocsDoc.data()?.connected === true;
        console.log('Google Docs integration status:', googleDocsConnected ? 'Connected' : 'Not connected');
        
        // Check Google Sheets integration status even if Lightspeed is not found
        const googleSheetsDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/google_sheets`));
        const googleSheetsConnected = googleSheetsDoc.exists() && googleSheetsDoc.data()?.connected === true;
        console.log('Google Sheets integration status:', googleSheetsConnected ? 'Connected' : 'Not connected');
        
        // Check HubSpot integration status
        const hubspotDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/hubspot`));
        const hubspotConnected = hubspotDoc.exists() && hubspotDoc.data()?.connected === true;
        console.log('HubSpot integration status:', hubspotConnected ? 'Connected' : 'Not connected');
        
        // Check Microsoft Outlook integration status
        const outlookDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/outlook`));
        const outlookConnected = outlookDoc.exists() && outlookDoc.data()?.connected === true;
        console.log('Microsoft Outlook integration status:', outlookConnected ? 'Connected' : 'Not connected');
        
        setIntegrations(prev => ({
          ...prev,
          square: {
            connected: squareConnected,
            data: squareDoc.exists() ? squareDoc.data() : null
          },
          lightspeed_new: {
            connected: false,
            data: null
          },
          gmail: {
            connected: gmailConnected,
            data: gmailDoc.exists() ? gmailDoc.data() : null
          },
          google_calendar: {
            connected: googleCalendarConnected,
            data: googleCalendarDoc.exists() ? googleCalendarDoc.data() : null
          },
          google_docs: {
            connected: googleDocsConnected,
            data: googleDocsDoc.exists() ? googleDocsDoc.data() : null
          },
          google_sheets: {
            connected: googleSheetsConnected,
            data: googleSheetsDoc.exists() ? googleSheetsDoc.data() : null
          },
          hubspot: {
            connected: hubspotConnected,
            data: hubspotDoc.exists() ? hubspotDoc.data() : null
          },
          outlook: {
            connected: outlookConnected,
            data: outlookDoc.exists() ? outlookDoc.data() : null
          }
        }));
      }

      toast({
        title: "Success",
        description: "Integration status refreshed successfully"
      });
    } catch (error) {
      console.error('Error refreshing integration status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh integration status",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    // Check if we have existing integrations
    const checkIntegrations = async () => {
      if (!user?.uid) return
      
      try {
        // Check Square integration status
        const squareDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'square'))
        if (squareDoc.exists() && squareDoc.data().connected) {
          setIntegrations(prev => ({
            ...prev,
            square: { 
              connected: true, 
              data: squareDoc.data() 
            }
          }))
        }
        
        // Check Lightspeed New integration status
        const lightspeedNewDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'lightspeed_new'))
        if (lightspeedNewDoc.exists() && lightspeedNewDoc.data().connected) {
          console.log('Lightspeed New integration found:', lightspeedNewDoc.data())
          setIntegrations(prev => ({
            ...prev,
            lightspeed_new: { 
              connected: true, 
              data: lightspeedNewDoc.data() 
            }
          }))
        } else {
          console.log('Lightspeed New integration not connected or not found')
        }
        
        // Check Gmail integration status
        const gmailDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'gmail'))
        if (gmailDoc.exists() && gmailDoc.data().connected) {
          console.log('Gmail integration found:', gmailDoc.data())
          setIntegrations(prev => ({
            ...prev,
            gmail: { 
              connected: true, 
              data: gmailDoc.data() 
            }
          }))
        } else {
          console.log('Gmail integration not connected or not found')
        }
        
        // Check Google Calendar integration status
        const googleCalendarDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'google_calendar'))
        if (googleCalendarDoc.exists() && googleCalendarDoc.data().connected) {
          console.log('Google Calendar integration found:', googleCalendarDoc.data())
          setIntegrations(prev => ({
            ...prev,
            google_calendar: { 
              connected: true, 
              data: googleCalendarDoc.data() 
            }
          }))
        } else {
          console.log('Google Calendar integration not connected or not found')
        }
        
        // Check Google Docs integration status
        const googleDocsDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'google_docs'))
        if (googleDocsDoc.exists() && googleDocsDoc.data().connected) {
          console.log('Google Docs integration found:', googleDocsDoc.data())
          setIntegrations(prev => ({
            ...prev,
            google_docs: { 
              connected: true, 
              data: googleDocsDoc.data() 
            }
          }))
        } else {
          console.log('Google Docs integration not connected or not found')
        }

        // Check Google Sheets integration status
        const googleSheetsDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'google_sheets'))
        if (googleSheetsDoc.exists() && googleSheetsDoc.data().connected) {
          console.log('Google Sheets integration found:', googleSheetsDoc.data())
          setIntegrations(prev => ({
            ...prev,
            google_sheets: { 
              connected: true, 
              data: googleSheetsDoc.data() 
            }
          }))
        } else {
          console.log('Google Sheets integration not connected or not found')
        }

        // Check HubSpot integration status
        const hubspotDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'hubspot'))
        if (hubspotDoc.exists() && hubspotDoc.data().connected) {
          console.log('HubSpot integration found:', hubspotDoc.data())
          setIntegrations(prev => ({
            ...prev,
            hubspot: { 
              connected: true, 
              data: hubspotDoc.data() 
            }
          }))
        } else {
          console.log('HubSpot integration not connected or not found')
        }

        // Check Microsoft Outlook integration status
        const outlookDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'outlook'))
        if (outlookDoc.exists() && outlookDoc.data().connected) {
          console.log('Microsoft Outlook integration found:', outlookDoc.data())
          setIntegrations(prev => ({
            ...prev,
            outlook: { 
              connected: true, 
              data: outlookDoc.data() 
            }
          }))
        } else {
          console.log('Microsoft Outlook integration not connected or not found')
        }
      } catch (error) {
        console.error("Error checking integrations:", error)
      }
    }
    
    checkIntegrations()
  }, [user])

  // Square integration
  const connectSquare = async () => {
    if (!user) return
    
    setConnecting("square")
    
    try {
      // Square OAuth parameters
      const clientId = "sq0idp-4LAqjdrwhjauSthYdTRFtA" // Production application ID
      
      // Store the state in localStorage to verify when the user returns
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('square_state', state)
      
      // Store the merchant ID in localStorage to associate with the integration
      localStorage.setItem('merchant_id', user.uid)
      
      // Prepare scopes for Square OAuth
      const scopes = [
        'MERCHANT_PROFILE_READ',
        'CUSTOMERS_READ',
        'CUSTOMERS_WRITE',
        'ORDERS_READ',
        'ORDERS_WRITE',
        'PAYMENTS_READ',
        'PAYMENTS_WRITE',
        'ITEMS_READ',
        'ITEMS_WRITE',
        'INVENTORY_READ'
      ].join(' ')
      
      // Build the authorization URL for production
      // Remove redirect_uri parameter as it's configured in the Square Developer Dashboard
      const authUrl = `https://connect.squareup.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`
      
      console.log("Redirecting to Square authorization URL:", authUrl)
      
      // Redirect to Square authorization page
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting to Square:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Square. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnecting(null)
    }
  }

  // Disconnect Square
  const disconnectSquare = async () => {
    if (!user) return
    
    try {
      await updateDoc(doc(db, 'merchants', user.uid, 'integrations', 'square'), {
        connected: false
      })
      
      setIntegrations(prev => ({
        ...prev,
        square: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Square account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Square:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Square. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Lightspeed New integration
  const connectLightspeedNew = async () => {
    try {
      setConnecting("lightspeed_new");
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to connect integrations",
          variant: "destructive"
        });
        return;
      }

      // Store the merchant ID in localStorage
      localStorage.setItem("lightspeed_new_merchant_id", user.uid);
      
      // Generate a random state parameter for security
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("lightspeed_new_state", state);
      
      // Generate code verifier and challenge for PKCE
      const codeVerifier = generateCodeVerifier();
      localStorage.setItem("lightspeed_new_code_verifier", codeVerifier);
      
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Define the scopes needed for the integration
      // Using employee:all for full access as per documentation
      const scope = "employee:all+employee:register_read";
      
      // Lightspeed New API credentials with fallback value
      const clientId = process.env.NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID || "0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e";
      
      // Check if clientId is still undefined despite the fallback
      if (!clientId) {
        console.error("Missing Lightspeed New client ID");
        toast({
          title: "Configuration Error",
          description: "Lightspeed integration is not properly configured. Please contact support.",
          variant: "destructive"
        });
        setConnecting("");
        return;
      }
      
      // Construct the authorization URL as per Lightspeed API documentation
      // Note: redirect_uri is not included as it's configured in the Lightspeed portal
      const authUrl = `https://cloud.lightspeedapp.com/auth/oauth/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
      console.log("Redirecting to Lightspeed New authorization URL:", authUrl);
      
      // Redirect to the authorization URL
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting to Lightspeed New:", error);
      toast({
        title: "Error",
        description: "Failed to connect to Lightspeed New",
        variant: "destructive"
      });
      setConnecting("");
    }
  };

  const disconnectLightspeedNew = async () => {
    try {
      setConnecting("lightspeed_new");
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to disconnect integrations",
          variant: "destructive"
        });
        return;
      }

      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/lightspeed_new`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        lightspeed_new: {
          connected: false,
          data: null
        }
      }));
      
      toast({
        title: "Success",
        description: "Lightspeed New disconnected successfully"
      });
    } catch (error) {
      console.error("Error disconnecting Lightspeed New:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Lightspeed New",
        variant: "destructive"
      });
    } finally {
      setConnecting("");
    }
  };

  // Gmail integration – always go through the backend connect route so that the
  // `state` parameter is consistently the merchantId expected by the callback.
  const connectGmail = () => {
    if (!user?.uid) return

    setConnecting("gmail")

    try {
      // Simply hit our server-side connect endpoint – it does all the heavy lifting
      // (building the Google OAuth URL, enforcing scopes, etc.) and guarantees the
      // `state` value matches the merchantId.
      window.location.href = `/api/auth/gmail/connect?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to Gmail connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Gmail connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect Gmail
  const disconnectGmail = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/gmail`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        gmail: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Gmail account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Gmail:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Google Calendar integration – using Composio like Gmail
  const connectGoogleCalendar = () => {
    if (!user?.uid) return

    setConnecting("google_calendar")

    try {
      // Simply hit our server-side connect endpoint for Google Calendar
      window.location.href = `/api/auth/google-calendar/composio?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to Google Calendar connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Google Calendar connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/google_calendar`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        google_calendar: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Google Calendar account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Debug test functions
  const runDebugTest = async (testType: string) => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to run tests",
        variant: "destructive"
      });
      return;
    }
    
    setDebugLoading(true);
    setDebugError(null);
    setDebugResult(null);
    
    try {
      let url = '';
      
      if (testType === 'direct') {
        url = `/api/auth/gmail/composio/direct-test?merchantId=${user.uid}`;
      } else if (testType === 'diagnostic') {
        url = `/api/auth/gmail/composio/test?verbose=1`;
      } else if (testType === 'custom') {
        url = `/api/auth/gmail/composio/test?integrationId=${customIntegrationId}&verbose=1`;
      } else if (testType === 'simplified') {
        url = `/api/auth/gmail/composio/simplified?merchantId=${user.uid}&debug=1`;
      } else if (testType === 'calendar_test') {
        url = `/api/auth/google-calendar/composio/test?verbose=1`;
      } else if (testType === 'calendar_connect') {
        url = `/api/auth/google-calendar/composio?merchantId=${user.uid}&debug=1`;
      } else {
        url = `/api/auth/gmail/composio?merchantId=${user.uid}&debug=1`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      setDebugResult(data);
      
      // Show success toast
      toast({
        title: "Debug Test Complete",
        description: `${testType} test completed successfully`,
      });
    } catch (err) {
      setDebugError(`Error running test: ${err instanceof Error ? err.message : String(err)}`);
      
      toast({
        title: "Test Error",
        description: `Error running ${testType} test`,
        variant: "destructive"
      });
    } finally {
      setDebugLoading(false);
    }
  };

  // Manual Gmail status check function
  const checkGmailComposioStatus = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to check status",
        variant: "destructive"
      });
      return;
    }
    
    setConnecting("gmail");
    
    try {
      const response = await fetch(`/api/auth/gmail/composio/check-status?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on the response
        if (data.connection.connected) {
          setIntegrations(prev => ({
            ...prev,
            gmail: {
              connected: true,
              data: {
                connectedAccountId: data.connection.id,
                connectionStatus: data.connection.status,
                provider: 'composio',
                connectedAt: { toDate: () => new Date() } // Mock timestamp for display
              }
            }
          }));
          
          toast({
            title: "Success",
            description: "Gmail connection is active and updated successfully",
          });
        } else {
          setIntegrations(prev => ({
            ...prev,
            gmail: {
              connected: false,
              data: null
            }
          }));
          
          toast({
            title: "Not Connected",
            description: "No active Gmail connection found",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check Gmail status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      toast({
        title: "Error", 
        description: "Failed to check Gmail connection status",
        variant: "destructive"
      });
    } finally {
      setConnecting(null);
    }
  };

  // Google Docs integration functions
  const connectGoogleDocs = () => {
    if (!user?.uid) return

    setConnecting("google_docs")

    try {
      // Go directly to the Google Docs Composio connect route
      window.location.href = `/api/auth/google-docs/composio?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to Google Docs connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Google Docs connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect Google Docs
  const disconnectGoogleDocs = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/google_docs`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        google_docs: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Google Docs account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Google Docs:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Google Docs. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Manual Google Docs status check function
  const checkGoogleDocsComposioStatus = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to check status",
        variant: "destructive"
      });
      return;
    }
    
    setConnecting("google_docs");
    
    try {
      const response = await fetch(`/api/auth/google-docs/composio/check-status?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on the response
        if (data.connection.connected) {
          setIntegrations(prev => ({
            ...prev,
            google_docs: {
              connected: true,
              data: {
                connectedAccountId: data.connection.id,
                connectionStatus: data.connection.status,
                provider: 'composio',
                connectedAt: { toDate: () => new Date() } // Mock timestamp for display
              }
            }
          }));
          
          toast({
            title: "Success",
            description: "Google Docs connection is active and updated successfully",
          });
        } else {
          setIntegrations(prev => ({
            ...prev,
            google_docs: {
              connected: false,
              data: null
            }
          }));
          
          toast({
            title: "Not Connected",
            description: "No active Google Docs connection found",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check Google Docs status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking Google Docs status:', error);
      toast({
        title: "Error", 
        description: "Failed to check Google Docs connection status",
        variant: "destructive"
      });
    } finally {
      setConnecting(null);
    }
  };

  // Google Sheets integration functions
  const connectGoogleSheets = () => {
    if (!user?.uid) return

    setConnecting("google_sheets")

    try {
      // Go directly to the Google Sheets Composio connect route
      window.location.href = `/api/auth/google-sheets/composio?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to Google Sheets connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Google Sheets connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect Google Sheets
  const disconnectGoogleSheets = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/google_sheets`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        google_sheets: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Google Sheets account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Google Sheets:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Google Sheets. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Manual Google Sheets status check function
  const checkGoogleSheetsComposioStatus = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to check status",
        variant: "destructive"
      });
      return;
    }
    
    setConnecting("google_sheets");
    
    try {
      const response = await fetch(`/api/auth/google-sheets/composio/check-status?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on the response
        if (data.connection.connected) {
          setIntegrations(prev => ({
            ...prev,
            google_sheets: {
              connected: true,
              data: {
                connectedAccountId: data.connection.id,
                connectionStatus: data.connection.status,
                provider: 'composio',
                connectedAt: { toDate: () => new Date() } // Mock timestamp for display
              }
            }
          }));
          
          toast({
            title: "Success",
            description: "Google Sheets connection is active and updated successfully",
          });
        } else {
          setIntegrations(prev => ({
            ...prev,
            google_sheets: {
              connected: false,
              data: null
            }
          }));
          
          toast({
            title: "Not Connected",
            description: "No active Google Sheets connection found",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check Google Sheets status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking Google Sheets status:', error);
      toast({
        title: "Error", 
        description: "Failed to check Google Sheets connection status",
        variant: "destructive"
      });
    } finally {
      setConnecting(null);
    }
  };

  // HubSpot integration functions
  const connectHubSpot = () => {
    if (!user?.uid) return

    setConnecting("hubspot")

    try {
      // Go directly to the HubSpot Composio connect route
      window.location.href = `/api/auth/hubspot/composio?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to HubSpot connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate HubSpot connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect HubSpot
  const disconnectHubSpot = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/hubspot`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        hubspot: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your HubSpot account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting HubSpot:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect HubSpot. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Manual HubSpot status check function
  const checkHubSpotComposioStatus = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to check status",
        variant: "destructive"
      });
      return;
    }
    
    setConnecting("hubspot");
    
    try {
      const response = await fetch(`/api/auth/hubspot/composio/check-status?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on the response
        if (data.connection.connected) {
          setIntegrations(prev => ({
            ...prev,
            hubspot: {
              connected: true,
              data: {
                connectedAccountId: data.connection.id,
                connectionStatus: data.connection.status,
                provider: 'composio',
                connectedAt: { toDate: () => new Date() } // Mock timestamp for display
              }
            }
          }));
          
          toast({
            title: "Success",
            description: "HubSpot connection is active and updated successfully",
          });
        } else {
          setIntegrations(prev => ({
            ...prev,
            hubspot: {
              connected: false,
              data: null
            }
          }));
          
          toast({
            title: "Not Connected",
            description: "No active HubSpot connection found",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check HubSpot status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking HubSpot status:', error);
      toast({
        title: "Error", 
        description: "Failed to check HubSpot connection status",
        variant: "destructive"
      });
    } finally {
      setConnecting(null);
    }
  };

  // Microsoft Outlook integration functions
  const connectOutlook = () => {
    if (!user?.uid) return

    setConnecting("outlook")

    try {
      // Go directly to the Microsoft Outlook Composio connect route
      window.location.href = `/api/auth/outlook/composio?merchantId=${user.uid}`
    } catch (error) {
      console.error("Error redirecting to Microsoft Outlook connect route:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Microsoft Outlook connection. Please try again.",
        variant: "destructive",
      })
      setConnecting(null)
    }
  }

  // Disconnect Microsoft Outlook
  const disconnectOutlook = async () => {
    if (!user) return
    
    try {
      // Delete the integration from Firestore
      const integrationRef = doc(db, `merchants/${user.uid}/integrations/outlook`);
      await deleteDoc(integrationRef);
      
      // Update local state
      setIntegrations(prev => ({
        ...prev,
        outlook: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Microsoft Outlook account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Microsoft Outlook:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Microsoft Outlook. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Manual Microsoft Outlook status check function
  const checkOutlookComposioStatus = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to check status",
        variant: "destructive"
      });
      return;
    }
    
    setConnecting("outlook");
    
    try {
      const response = await fetch(`/api/auth/outlook/composio/check-status?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on the response
        if (data.connection.connected) {
          setIntegrations(prev => ({
            ...prev,
            outlook: {
              connected: true,
              data: {
                connectedAccountId: data.connection.id,
                connectionStatus: data.connection.status,
                provider: 'composio',
                connectedAt: { toDate: () => new Date() } // Mock timestamp for display
              }
            }
          }));
          
          toast({
            title: "Success",
            description: "Microsoft Outlook connection is active and updated successfully",
          });
        } else {
          setIntegrations(prev => ({
            ...prev,
            outlook: {
              connected: false,
              data: null
            }
          }));
          
          toast({
            title: "Not Connected",
            description: "No active Microsoft Outlook connection found",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check Microsoft Outlook status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking Microsoft Outlook status:', error);
      toast({
        title: "Error", 
        description: "Failed to check Microsoft Outlook connection status",
        variant: "destructive"
      });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <PageTransition>
      <div className="p-6 py-4">
        <PageHeader
          title="Integrations"
        />
        
        {/* Debug Tools */}
        {debugMode && (
          <div className="mb-6">
            <Card className="rounded-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Composio Debug Tools</CardTitle>
                <CardDescription>Test and troubleshoot Gmail and Google Calendar Composio integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => runDebugTest('direct')}
                      disabled={debugLoading}
                    >
                      {debugLoading ? (
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Test Direct Implementation
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => runDebugTest('diagnostic')}
                      disabled={debugLoading}
                    >
                      Run Diagnostics
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => runDebugTest('normal')}
                      disabled={debugLoading}
                    >
                      Test Regular Flow
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800"
                      onClick={() => runDebugTest('simplified')}
                      disabled={debugLoading}
                    >
                      Test Simplified Version
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800"
                      onClick={() => runDebugTest('calendar_test')}
                      disabled={debugLoading}
                    >
                      Test Google Calendar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800"
                      onClick={() => runDebugTest('calendar_connect')}
                      disabled={debugLoading}
                    >
                      Test Calendar Connect
                    </Button>
                    
                    <div className="flex items-center gap-2 ml-2">
                      <input
                        type="text"
                        value={customIntegrationId}
                        onChange={(e) => setCustomIntegrationId(e.target.value)}
                        placeholder="Custom Integration ID"
                        className="px-2 py-1 text-sm border rounded-md w-64"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={() => runDebugTest('custom')}
                        disabled={debugLoading || !customIntegrationId}
                      >
                        Test Custom ID
                      </Button>
                    </div>
                  </div>
                  
                  {/* Debug Results */}
                  {debugError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="font-medium text-sm text-red-700">Error</p>
                      <p className="text-sm text-red-600">{debugError}</p>
                    </div>
                  )}
                  
                  {debugResult && (
                    <div className="border rounded-md overflow-auto max-h-[300px]">
                      <div className="p-2 bg-slate-100 border-b font-medium text-sm">Debug Result</div>
                      <pre className="p-3 text-xs whitespace-pre-wrap break-words bg-slate-50">
                        {JSON.stringify(debugResult, null, 2)}
                      </pre>
                      
                      {/* Error logs display */}
                      {debugResult.error && (
                        <div className="p-2 bg-red-100 border-t border-red-200">
                          <div className="font-medium text-sm text-red-800 mb-1">Error Details</div>
                          <div className="text-xs text-red-700 whitespace-pre-wrap break-words">
                            <p><strong>Message:</strong> {debugResult.error}</p>
                            {debugResult.detailedError && (
                              <>
                                <p className="mt-1"><strong>Error Code:</strong> {debugResult.detailedError.errCode || 'N/A'}</p>
                                <p><strong>Description:</strong> {debugResult.detailedError.description || 'N/A'}</p>
                                <p><strong>Possible Fix:</strong> {debugResult.detailedError.possibleFix || 'N/A'}</p>
                                <p><strong>Error ID:</strong> {debugResult.detailedError.errorId || 'N/A'}</p>
                              </>
                            )}
                            {debugResult.stack && (
                              <div className="mt-1">
                                <p><strong>Stack Trace:</strong></p>
                                <div className="bg-red-50 p-2 mt-1 rounded overflow-auto">
                                  {debugResult.stack}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-red-700 mt-2">
                            <p><strong>Composio Log Hints:</strong></p>
                            <ul className="list-disc ml-4 mt-1">
                              <li>Get Help: <span className="font-mono">https://dub.composio.dev/discord</span></li>
                              <li>Report Issue: <span className="font-mono">https://github.com/ComposioHQ/composio/issues</span></li>
                              <li>Set <span className="font-mono">COMPOSIO_LOGGING_LEVEL=debug</span> for more information</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Success path debug info */}
                      {debugResult.success && (
                        <div className="p-2 bg-green-100 border-t border-green-200">
                          <div className="font-medium text-sm text-green-800 mb-1">Integration Details</div>
                          <div className="text-xs text-green-700">
                            {debugResult.integration && (
                              <>
                                <p><strong>Integration ID:</strong> {debugResult.integration.id}</p>
                                <p><strong>Integration Name:</strong> {debugResult.integration.name}</p>
                              </>
                            )}
                            {debugResult.connectedAccount && (
                              <>
                                <p className="mt-1"><strong>Connected Account ID:</strong> {debugResult.connectedAccount.id}</p>
                                <p><strong>Status:</strong> {debugResult.connectedAccount.status}</p>
                                <p><strong>Redirect URL:</strong> {debugResult.redirectUrl ? "Available" : "Not Available"}</p>
                              </>
                            )}
                            {debugResult.note && (
                              <p className="mt-1"><strong>Note:</strong> {debugResult.note}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!debugError && !debugResult && (
                    <div className="p-4 bg-slate-50 text-slate-500 rounded-md border text-center">
                      <p>Run a test to see results</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Error Details Display */}
        {errorDetails && (
          <div className="mb-6 p-4 border border-red-200 rounded-md bg-red-50">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-medium text-red-800">Integration Error</h3>
            </div>
            <div className="text-sm text-red-700">
              <p className="mb-2">There was an error configuring the integration:</p>
              <pre className="p-2 bg-white border border-red-100 rounded overflow-x-auto text-xs">{errorDetails}</pre>
              <div className="mt-3 text-xs">
                <p>Please ensure all required environment variables are set correctly.</p>
                <p className="mt-1">For Gmail integration, make sure <code className="bg-white px-1 py-0.5 rounded">GMAIL_CLIENT_ID</code> and <code className="bg-white px-1 py-0.5 rounded">GMAIL_CLIENT_SECRET</code> are properly configured on the server.</p>
              </div>
              
              <div className="mt-4 flex items-center space-x-3">
                <button 
                  className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
                  onClick={checkEnvironmentConfig}
                  disabled={checkingConfig}
                >
                  {checkingConfig ? 'Checking...' : 'Check Server Configuration'}
                </button>
                <button 
                  className="text-red-800 text-xs underline"
                  onClick={() => {
                    setErrorDetails(null)
                    setConfigCheckResult(null)
                  }}
                >
                  Dismiss
                </button>
              </div>
              
              {/* Configuration Check Results */}
              {configCheckResult && (
                <div className="mt-4 p-2 bg-white border border-red-100 rounded text-xs">
                  <h4 className="font-medium mb-1">Environment Check Results:</h4>
                  {configCheckResult.error ? (
                    <p className="text-red-600">{configCheckResult.error}</p>
                  ) : (
                    <>
                      <p>Environment: <span className="font-mono">{configCheckResult.environment}</span></p>
                      <p className="mt-1">
                        Status: {configCheckResult.configCheck?.allConfigured 
                          ? <span className="text-green-600">All configured</span> 
                          : <span className="text-red-600">Missing variables</span>}
                      </p>
                      
                      {configCheckResult.configCheck?.missingVariables?.length > 0 && (
                        <div className="mt-1">
                          <p>Missing variables:</p>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {configCheckResult.configCheck.missingVariables.map((v: string) => (
                              <li key={v} className="font-mono">{v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {configCheckResult.configCheck?.variables && (
                        <div className="mt-2">
                          <p>Variable status:</p>
                          <div className="mt-1 grid grid-cols-2 gap-1">
                            {Object.entries(configCheckResult.configCheck.variables)
                              .filter(([key]) => !key.includes('VALUE') && !key.includes('PREFIX'))
                              .map(([key, value]: [string, any]) => (
                                <div key={key} className="font-mono">
                                  {key}: <span className={value ? "text-green-600" : "text-red-600"}>{value ? "✓" : "✗"}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Connected Apps First */}
          {[
            // Gmail
            integrations.gmail.connected && (
              <Card key="gmail" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/gmailpro.png" alt="Gmail" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Gmail</CardTitle>
                        <CardDescription className="text-xs">Email Integration</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectGmail}
                      disabled={connecting === "gmail"}
                    >
                      {connecting === "gmail" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Calendar
            integrations.google_calendar.connected && (
              <Card key="google_calendar" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/cal.svg" alt="Google Calendar" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Calendar</CardTitle>
                        <CardDescription className="text-xs">Calendar Integration</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectGoogleCalendar}
                      disabled={connecting === "google_calendar"}
                    >
                      {connecting === "google_calendar" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Docs
            integrations.google_docs.connected && (
              <Card key="google_docs" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/docspro.png" alt="Google Docs" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Docs</CardTitle>
                        <CardDescription className="text-xs">Document Management</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectGoogleDocs}
                      disabled={connecting === "google_docs"}
                    >
                      {connecting === "google_docs" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Sheets
            integrations.google_sheets.connected && (
              <Card key="google_sheets" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/sheetspro.png" alt="Google Sheets" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Sheets</CardTitle>
                        <CardDescription className="text-xs">Spreadsheet Integration</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectGoogleSheets}
                      disabled={connecting === "google_sheets"}
                    >
                      {connecting === "google_sheets" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Lightspeed Retail
            integrations.lightspeed_new.connected && (
              <Card key="lightspeed_new" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/lslogo.png" alt="Lightspeed" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Lightspeed Retail</CardTitle>
                        <CardDescription className="text-xs">Point of Sale</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectLightspeedNew}
                      disabled={connecting === "lightspeed_new"}
                    >
                      {connecting === "lightspeed_new" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Square
            integrations.square.connected && (
              <Card key="square" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/squarepro.png" alt="Square" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Square</CardTitle>
                        <CardDescription className="text-xs">Point of Sale</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectSquare}
                      disabled={connecting === "square"}
                    >
                      {connecting === "square" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // HubSpot
            integrations.hubspot.connected && (
              <Card key="hubspot" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/hubspot.png" alt="HubSpot" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">HubSpot</CardTitle>
                        <CardDescription className="text-xs">CRM Integration</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectHubSpot}
                      disabled={connecting === "hubspot"}
                    >
                      {connecting === "hubspot" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Microsoft Outlook
            integrations.outlook.connected && (
              <Card key="outlook" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/outlook.png" alt="Microsoft Outlook" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Microsoft Outlook</CardTitle>
                        <CardDescription className="text-xs">Email Integration</CardDescription>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={disconnectOutlook}
                      disabled={connecting === "outlook"}
                    >
                      {connecting === "outlook" ? "..." : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          ].filter(Boolean)}
          
          {/* Available Apps (Not Connected) */}
          {[
            // Gmail
            !integrations.gmail.connected && (
              <Card key="gmail" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/gmailpro.png" alt="Gmail" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Gmail</CardTitle>
                        <CardDescription className="text-xs">Email Integration</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectGmail}
                      disabled={connecting === "gmail"}
                    >
                      {connecting === "gmail" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Calendar
            !integrations.google_calendar.connected && (
              <Card key="google_calendar" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/cal.svg" alt="Google Calendar" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Calendar</CardTitle>
                        <CardDescription className="text-xs">Calendar Integration</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectGoogleCalendar}
                      disabled={connecting === "google_calendar"}
                    >
                      {connecting === "google_calendar" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Docs
            !integrations.google_docs.connected && (
              <Card key="google_docs" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/docspro.png" alt="Google Docs" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Docs</CardTitle>
                        <CardDescription className="text-xs">Document Management</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectGoogleDocs}
                      disabled={connecting === "google_docs"}
                    >
                      {connecting === "google_docs" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Google Sheets
            !integrations.google_sheets.connected && (
              <Card key="google_sheets" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/sheetspro.png" alt="Google Sheets" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Google Sheets</CardTitle>
                        <CardDescription className="text-xs">Spreadsheet Integration</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectGoogleSheets}
                      disabled={connecting === "google_sheets"}
                    >
                      {connecting === "google_sheets" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Lightspeed Retail
            !integrations.lightspeed_new.connected && (
              <Card key="lightspeed_new" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/lslogo.png" alt="Lightspeed" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Lightspeed Retail</CardTitle>
                        <CardDescription className="text-xs">Point of Sale</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectLightspeedNew}
                      disabled={connecting === "lightspeed_new"}
                    >
                      {connecting === "lightspeed_new" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Square
            !integrations.square.connected && (
              <Card key="square" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/squarepro.png" alt="Square" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Square</CardTitle>
                        <CardDescription className="text-xs">Point of Sale</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectSquare}
                      disabled={connecting === "square"}
                    >
                      {connecting === "square" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // HubSpot
            !integrations.hubspot.connected && (
              <Card key="hubspot" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/hubspot.png" alt="HubSpot" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">HubSpot</CardTitle>
                        <CardDescription className="text-xs">CRM Integration</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectHubSpot}
                      disabled={connecting === "hubspot"}
                    >
                      {connecting === "hubspot" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
            
            // Microsoft Outlook
            !integrations.outlook.connected && (
              <Card key="outlook" className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src="/outlook.png" alt="Microsoft Outlook" className="w-8 h-8 object-contain" />
                      <div>
                        <CardTitle className="text-sm font-medium">Microsoft Outlook</CardTitle>
                        <CardDescription className="text-xs">Email Integration</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-gray-500">Not connected</span>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      className="rounded-md h-7 px-3 text-xs"
                      onClick={connectOutlook}
                      disabled={connecting === "outlook"}
                    >
                      {connecting === "outlook" ? "..." : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          ].filter(Boolean)}

          {/* Coming Soon Apps */}
          <Card className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors opacity-60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Google</CardTitle>
                    <CardDescription className="text-xs">Business & Analytics</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  <span className="text-gray-400">Coming Soon</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-md h-7 px-3 text-xs"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors opacity-60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src="/lslogo.png" alt="Lightspeed Restaurant" className="w-8 h-8 object-contain" />
                  <div>
                    <CardTitle className="text-sm font-medium">Lightspeed Restaurant</CardTitle>
                    <CardDescription className="text-xs">Restaurant POS</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  <span className="text-gray-400">Coming Soon</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-md h-7 px-3 text-xs"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors opacity-60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center">
                    <Mail className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Mailchimp</CardTitle>
                    <CardDescription className="text-xs">Email Marketing</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  <span className="text-gray-400">Coming Soon</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-md h-7 px-3 text-xs"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors opacity-60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Twilio</CardTitle>
                    <CardDescription className="text-xs">SMS & Voice</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  <span className="text-gray-400">Coming Soon</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-md h-7 px-3 text-xs"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-md border border-gray-200 hover:border-gray-300 transition-colors opacity-60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Xero</CardTitle>
                    <CardDescription className="text-xs">Accounting</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  <span className="text-gray-400">Coming Soon</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-md h-7 px-3 text-xs"
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug and Management Tools - Hidden at Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="flex justify-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={refreshIntegrationStatus}
              disabled={refreshing}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              {refreshing ? (
                <>
                  <svg className="mr-1 h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Status
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              {debugMode ? "Hide Debug" : "Debug Tools"}
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 