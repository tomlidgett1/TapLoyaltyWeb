"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, DocumentData } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce"

// Import icons for different POS systems
import { LightspeedIcon } from "@/components/icons/lightspeed-icon"
import { SquareIcon } from "@/components/icons/square-icon"
import { CloverIcon } from "@/components/icons/clover-icon"
import { ShopifyIcon } from "@/components/icons/shopify-icon"

// Define integration state type
interface IntegrationState {
  connected: boolean;
  data: DocumentData | null;
}

interface IntegrationsState {
  lightspeed: IntegrationState;
  square: IntegrationState;
  clover: IntegrationState;
  shopify: IntegrationState;
  lightspeed_new: IntegrationState;
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    lightspeed: { connected: false, data: null },
    square: { connected: false, data: null },
    clover: { connected: false, data: null },
    shopify: { connected: false, data: null },
    lightspeed_new: { connected: false, data: null }
  })
  
  // Add a new state for the API connection
  const [connectingApi, setConnectingApi] = useState<string | null>(null)
  
  useEffect(() => {
    // Check if we have existing integrations
    const checkIntegrations = async () => {
      if (!user?.uid) return
      
      try {
        const lightspeedDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'lightspeed'))
        if (lightspeedDoc.exists() && lightspeedDoc.data().connected) {
          setIntegrations(prev => ({
            ...prev,
            lightspeed: { 
              connected: true, 
              data: lightspeedDoc.data() 
            }
          }))
        }
        
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
          setIntegrations(prev => ({
            ...prev,
            lightspeed_new: { 
              connected: true, 
              data: lightspeedNewDoc.data() 
            }
          }))
        }
      } catch (error) {
        console.error("Error checking integrations:", error)
      }
    }
    
    checkIntegrations()
  }, [user])

  // Lightspeed integration
  const connectLightspeed = async () => {
    if (!user) return
    
    setConnecting("lightspeed")
    
    try {
      // Updated Lightspeed OAuth parameters with new client ID
      const clientId = "808201776257e0984572c066974f81ee4f2aa156e4a6b67a957bec3761f5cdb2"
      
      // Store the state in localStorage to verify when the user returns
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('lightspeed_state', state)
      
      // Store the merchant ID in localStorage to associate with the integration
      localStorage.setItem('merchant_id', user.uid)
      
      // Add redirect_uri to the authorization URL
      const redirectUri = `${window.location.origin}/dashboard`
      
      // Make sure there are no spaces or encoding issues in the URL parameters
      const authUrl = `https://api.lightspeed.app/oidc/authorize?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}&response_type=code&scope=openid&product=retail&redirect_uri=${encodeURIComponent(redirectUri)}`
      
      console.log("Redirecting to authorization URL:", authUrl)
      
      // Redirect to Lightspeed authorization page
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting to Lightspeed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Lightspeed. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnecting(null)
    }
  }

  // Disconnect Lightspeed
  const disconnectLightspeed = async () => {
    if (!user) return
    
    try {
      await updateDoc(doc(db, 'merchants', user.uid, 'integrations', 'lightspeed'), {
        connected: false
      })
      
      setIntegrations(prev => ({
        ...prev,
        lightspeed: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Lightspeed account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Lightspeed:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Lightspeed. Please try again.",
        variant: "destructive"
      })
    }
  }

  // New function for Lightspeed API connection
  const connectLightspeedApi = async () => {
    if (!user) return
    
    setConnectingApi("lightspeed")
    
    try {
      // Lightspeed API OAuth parameters
      const clientId = "808201776257e0984572c066974f81ee4f2aa156e4a6b67a957bec3761f5cdb2"
      
      // Store the state in localStorage to verify when the user returns
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('lightspeed_api_state', state)
      
      // Store the merchant ID in localStorage to associate with the integration
      localStorage.setItem('merchant_api_id', user.uid)
      
      // Add redirect_uri to the authorization URL
      const redirectUri = `${window.location.origin}/dashboard`
      
      // Use the Lightspeed API authorization endpoint with employee:all scope
      // This grants full read and write access to the account based on the authorizing user's permissions
      const authUrl = `https://cloud.lightspeedapp.com/auth/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=employee:all&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`
      
      console.log("Redirecting to Lightspeed API authorization URL:", authUrl)
      
      // Redirect to Lightspeed authorization page
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting to Lightspeed API:", error)
      toast({
        title: "API Connection Failed",
        description: "Failed to connect to Lightspeed API. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnectingApi(null)
    }
  }

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
    if (!user) return
    
    setConnecting("lightspeed_new")
    
    try {
      // Lightspeed New OAuth parameters
      const clientId = "0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e"
      
      // Store the state in localStorage to verify when the user returns
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('lightspeed_new_state', state)
      
      // Store the merchant ID in localStorage to associate with the integration
      localStorage.setItem('lightspeed_new_merchant_id', user.uid)
      
      // Generate code verifier and challenge for PKCE
      const codeVerifier = generateCodeVerifier()
      localStorage.setItem('lightspeed_new_code_verifier', codeVerifier)
      
      // Generate code challenge using SHA-256
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      
      // Add redirect_uri to the authorization URL
      const redirectUri = `${window.location.origin}/dashboard`
      
      // Define the scopes we need
      const scopes = [
        'employee:register',
        'employee:inventory',
        'employee:customers'
      ].join(' ')
      
      // Build the authorization URL
      const authUrl = `https://cloud.lightspeedapp.com/auth/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(redirectUri)}`
      
      console.log("Redirecting to Lightspeed New authorization URL:", authUrl)
      
      // Redirect to Lightspeed authorization page
      window.location.href = authUrl
    } catch (error) {
      console.error("Error connecting to Lightspeed New:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Lightspeed. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnecting(null)
    }
  }

  // Disconnect Lightspeed New
  const disconnectLightspeedNew = async () => {
    if (!user) return
    
    try {
      await updateDoc(doc(db, 'merchants', user.uid, 'integrations', 'lightspeed_new'), {
        connected: false
      })
      
      setIntegrations(prev => ({
        ...prev,
        lightspeed_new: { connected: false, data: null }
      }))
      
      toast({
        title: "Disconnected",
        description: "Your Lightspeed New account has been disconnected."
      })
    } catch (error) {
      console.error("Error disconnecting Lightspeed New:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Lightspeed New. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader
          title="Integrations"
          subtitle="Connect your POS system and other services"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lightspeed Integration Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                    <LightspeedIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Lightspeed Retail</CardTitle>
                    <CardDescription>Point of Sale Integration</CardDescription>
                  </div>
                </div>
                {integrations.lightspeed.connected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">
                Sync customer data, transactions, and inventory with your Lightspeed Retail account.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant={integrations.lightspeed.connected ? "outline" : "default"}
                className="w-full rounded-md"
                onClick={integrations.lightspeed.connected ? disconnectLightspeed : connectLightspeed}
                disabled={connecting === "lightspeed"}
              >
                {connecting === "lightspeed" ? "Connecting..." : 
                 integrations.lightspeed.connected ? "Disconnect" : "Connect"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* New Lightspeed API Integration Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                    <LightspeedIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Lightspeed Retail API</CardTitle>
                    <CardDescription>Connect via Lightspeed API</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">
                  Not Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">
                Connect directly to the Lightspeed Retail API for advanced inventory and employee management.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="default"
                className="w-full rounded-md"
                onClick={connectLightspeedApi}
                disabled={connectingApi === "lightspeed"}
              >
                {connectingApi === "lightspeed" ? "Connecting..." : "Connect to API"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Lightspeed New Integration Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                    <LightspeedIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Lightspeed New</CardTitle>
                    <CardDescription>R-Series API Integration</CardDescription>
                  </div>
                </div>
                {integrations.lightspeed_new.connected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">
                Connect to Lightspeed Retail POS (R-Series) for advanced inventory and customer management.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant={integrations.lightspeed_new.connected ? "outline" : "default"}
                className="w-full rounded-md"
                onClick={integrations.lightspeed_new.connected ? disconnectLightspeedNew : connectLightspeedNew}
                disabled={connecting === "lightspeed_new"}
              >
                {connecting === "lightspeed_new" ? "Connecting..." : 
                 integrations.lightspeed_new.connected ? "Disconnect" : "Connect"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Square Integration Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                    <SquareIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Square</CardTitle>
                    <CardDescription>Point of Sale Integration</CardDescription>
                  </div>
                </div>
                {integrations.square.connected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">
                Sync customer data, transactions, and inventory with your Square account for a seamless integration.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant={integrations.square.connected ? "outline" : "default"}
                className="w-full rounded-md"
                onClick={integrations.square.connected ? disconnectSquare : connectSquare}
                disabled={connecting === "square"}
              >
                {connecting === "square" ? "Connecting..." : 
                 integrations.square.connected ? "Disconnect" : "Connect to Square"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Add other integration cards here */}
        </div>
      </div>
    </PageTransition>
  )
} 