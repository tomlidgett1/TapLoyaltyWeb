"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function TestSquarePage() {
  const { user } = useAuth()
  const [code, setCode] = useState("")
  const [state, setState] = useState("")
  const [merchantId, setMerchantId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [squareIntegration, setSquareIntegration] = useState<any>(null)
  const [loadingIntegration, setLoadingIntegration] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      setMerchantId(user.uid)
    }
  }, [user])

  const handleTestTokenExchange = async () => {
    if (!code || !state || !merchantId) {
      toast({
        title: "Missing Information",
        description: "Please provide code, state, and merchant ID",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/oauth/square', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          state,
          merchantId
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "Success!",
          description: "Token exchange successful and data stored in Firestore",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to exchange token",
          variant: "destructive"
        })
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) })
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkSquareIntegration = async () => {
    if (!user?.uid) {
      toast({
        title: "Not Authenticated",
        description: "Please log in first",
        variant: "destructive"
      })
      return
    }

    setLoadingIntegration(true)
    setSquareIntegration(null)

    try {
      const docRef = doc(db, 'merchants', user.uid, 'integrations', 'square')
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        // Mask sensitive data
        const maskedData = {
          ...data,
          accessToken: data.accessToken ? `${data.accessToken.substring(0, 5)}...` : null,
          refreshToken: data.refreshToken ? `${data.refreshToken.substring(0, 5)}...` : null,
        }
        setSquareIntegration(maskedData)
        toast({
          title: "Integration Found",
          description: "Square integration exists in Firestore",
        })
      } else {
        setSquareIntegration({ notFound: true })
        toast({
          title: "Not Found",
          description: "No Square integration found in Firestore",
          variant: "destructive"
        })
      }
    } catch (error) {
      setSquareIntegration({ error: error instanceof Error ? error.message : String(error) })
      toast({
        title: "Error",
        description: "Failed to check integration status",
        variant: "destructive"
      })
    } finally {
      setLoadingIntegration(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Square Integration Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Token Exchange */}
        <Card>
          <CardHeader>
            <CardTitle>Test Token Exchange</CardTitle>
            <CardDescription>
              Manually test the Square OAuth token exchange
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Authorization Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="sq0cgp-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State parameter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantId">Merchant ID</Label>
              <Input
                id="merchantId"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Your Firebase user ID"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleTestTokenExchange} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Processing..." : "Test Token Exchange"}
            </Button>
          </CardFooter>
        </Card>

        {/* Check Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Check Integration Status</CardTitle>
            <CardDescription>
              Check if Square integration exists in Firestore
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Click the button below to check if your Square integration is properly stored in Firestore.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={checkSquareIntegration} 
              disabled={loadingIntegration || !user}
              className="w-full"
            >
              {loadingIntegration ? "Checking..." : "Check Integration Status"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Results Display */}
      {(result || squareIntegration) && (
        <div className="mt-6 space-y-6">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Token Exchange Result</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  className="font-mono h-48"
                  value={JSON.stringify(result, null, 2)}
                />
              </CardContent>
            </Card>
          )}

          {squareIntegration && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  className="font-mono h-48"
                  value={JSON.stringify(squareIntegration, null, 2)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 