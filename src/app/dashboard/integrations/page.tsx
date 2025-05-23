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
import { CheckCircle, Globe, BarChart2, MessageSquare, Mail, Phone, Calculator } from "lucide-react"

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
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    square: { connected: false, data: null },
    clover: { connected: false, data: null },
    shopify: { connected: false, data: null },
    lightspeed_new: { connected: false, data: null },
    gmail: { connected: false, data: null }
  })
  
  const [refreshing, setRefreshing] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [configCheckResult, setConfigCheckResult] = useState<any>(null)
  const [checkingConfig, setCheckingConfig] = useState(false)
  
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
          }
        }));
      } else {
        console.log('Lightspeed New integration not found');
        
        // Check Gmail integration status even if Lightspeed is not found
        const gmailDoc = await getDoc(doc(db, `merchants/${user.uid}/integrations/gmail`));
        const gmailConnected = gmailDoc.exists() && gmailDoc.data()?.connected === true;
        console.log('Gmail integration status:', gmailConnected ? 'Connected' : 'Not connected');
        
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

  return (
    <PageTransition>
      <div className="p-6 py-4">
        <PageHeader
          title="Integrations"
        >
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={refreshIntegrationStatus}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Status
              </>
            )}
          </Button>
        </PageHeader>
        
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Gmail Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <img src="/gmail.png" alt="Gmail" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Gmail</CardTitle>
                      <CardDescription>Email Integration</CardDescription>
                    </div>
                    {integrations.gmail.connected && (
                      <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
                    )}
                  </div>
                </div>
                <Button 
                  variant={integrations.gmail.connected ? "outline" : "default"}
                  className="rounded-md"
                  onClick={integrations.gmail.connected ? disconnectGmail : connectGmail}
                  disabled={connecting === "gmail"}
                >
                  {connecting === "gmail" ? "Connecting..." : 
                  integrations.gmail.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Connect your Gmail account to enable automated email sending and communication with your customers.
                </p>
                {integrations.gmail.connected && integrations.gmail.data?.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Connected on {new Date(integrations.gmail.data.connectedAt.toDate()).toLocaleDateString()} at {new Date(integrations.gmail.data.connectedAt.toDate()).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Lightspeed Retail Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <img src="/lslogo.png" alt="Lightspeed" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Lightspeed Retail</CardTitle>
                      <CardDescription>Point of Sale Integration</CardDescription>
                    </div>
                    {integrations.lightspeed_new.connected && (
                      <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
                    )}
                  </div>
                </div>
                <Button 
                  variant={integrations.lightspeed_new.connected ? "outline" : "default"}
                  className="rounded-md"
                  onClick={integrations.lightspeed_new.connected ? disconnectLightspeedNew : connectLightspeedNew}
                  disabled={connecting === "lightspeed_new"}
                >
                  {connecting === "lightspeed_new" ? "Connecting..." : 
                  integrations.lightspeed_new.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Connect to Lightspeed Retail POS (R-Series) for advanced inventory and customer management.
                </p>
                {integrations.lightspeed_new.connected && integrations.lightspeed_new.data?.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Connected on {new Date(integrations.lightspeed_new.data.connectedAt.toDate()).toLocaleDateString()} at {new Date(integrations.lightspeed_new.data.connectedAt.toDate()).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Square Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <img src="/square.png" alt="Square" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Square</CardTitle>
                      <CardDescription>Point of Sale Integration</CardDescription>
                    </div>
                    {integrations.square.connected && (
                      <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
                    )}
                  </div>
                </div>
                <Button 
                  variant={integrations.square.connected ? "outline" : "default"}
                  className="rounded-md"
                  onClick={integrations.square.connected ? disconnectSquare : connectSquare}
                  disabled={connecting === "square"}
                >
                  {connecting === "square" ? "Connecting..." : 
                  integrations.square.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Sync customer data, transactions, and inventory with your Square account for a seamless integration.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Google Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <Globe className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Google</CardTitle>
                      <CardDescription>Business & Analytics Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "Google integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Connect with Google services including Google Analytics, Google Business Profile, and more.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Lightspeed Restaurant Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <img src="/lslogo.png" alt="Lightspeed Restaurant" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Lightspeed Restaurant</CardTitle>
                      <CardDescription>Restaurant POS Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "Lightspeed Restaurant integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Connect to Lightspeed Restaurant POS for specialized restaurant management and customer loyalty.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* HubSpot Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <BarChart2 className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">HubSpot</CardTitle>
                      <CardDescription>CRM Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "HubSpot integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Sync customer data with HubSpot CRM for enhanced marketing, sales, and customer service.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Mailchimp Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <Mail className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Mailchimp</CardTitle>
                      <CardDescription>Email Marketing Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "Mailchimp integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Sync contacts and create targeted email campaigns through Mailchimp integration.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Twilio Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Twilio</CardTitle>
                      <CardDescription>SMS & Voice Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "Twilio integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Enable SMS notifications, appointment reminders, and communication with your customers.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Xero Integration Card */}
          <Card className="rounded-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex items-center">
                    <div>
                      <CardTitle className="text-base font-medium">Xero</CardTitle>
                      <CardDescription>Accounting Integration</CardDescription>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default"
                  className="rounded-md"
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "Xero integration will be available soon",
                  })}
                >
                  Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Sync financial data with Xero for streamlined accounting and financial management.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
} 