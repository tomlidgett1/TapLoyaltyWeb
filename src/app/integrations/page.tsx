"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"

// Import icons for different POS systems
import { LightspeedIcon } from "@/components/icons/lightspeed-icon"
import { SquareIcon } from "@/components/icons/square-icon"
import { CloverIcon } from "@/components/icons/clover-icon"
import { ShopifyIcon } from "@/components/icons/shopify-icon"

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState({
    lightspeed: { connected: false, data: null },
    square: { connected: false, data: null },
    clover: { connected: false, data: null },
    shopify: { connected: false, data: null }
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

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your point of sale system to automatically sync customer data and transactions
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lightspeed Integration Card */}
        <Card className="rounded-lg overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-md bg-[#FF6B00] flex items-center justify-center">
                  <LightspeedIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Lightspeed Retail</CardTitle>
                  <CardDescription>Connect your Lightspeed POS</CardDescription>
                </div>
              </div>
              <Badge variant={integrations.lightspeed.connected ? "default" : "outline"}>
                {integrations.lightspeed.connected ? "Connected" : "Not Connected"}
              </Badge>
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
        <Card className="rounded-lg overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-md bg-[#FF6B00] flex items-center justify-center">
                  <LightspeedIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Lightspeed Retail API</CardTitle>
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
        
        {/* Add other integration cards here */}
      </div>
    </div>
  )
} 