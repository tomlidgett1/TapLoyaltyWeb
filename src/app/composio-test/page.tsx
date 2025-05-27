"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PageTransition } from "@/components/page-transition"

export default function ComposioTestPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [customIntegrationId, setCustomIntegrationId] = useState<string>('48ab3736-146c-4fdf-bd30-dda79973bd1d')
  
  const runTest = async (testType: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      let url = ''
      
      if (testType === 'direct') {
        url = `/api/auth/gmail/composio/direct-test?merchantId=${user?.uid || 'default'}`
      } else if (testType === 'diagnostic') {
        url = `/api/auth/gmail/composio/test?verbose=1`
      } else if (testType === 'custom') {
        // Not implemented yet
        url = `/api/auth/gmail/composio/test?integrationId=${customIntegrationId}&verbose=1`
      } else {
        url = `/api/auth/gmail/composio?merchantId=${user?.uid}&debug=1`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      setResult(data)
    } catch (err) {
      setError(`Error running test: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }
  
  const startAuth = () => {
    if (!user?.uid) {
      setError("User ID is required. Please log in first.")
      return
    }
    
    window.location.href = `/api/auth/gmail/composio?merchantId=${user.uid}`
  }

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader title="Composio Integration Test" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>Test Composio Integration</CardTitle>
              <CardDescription>
                Run various tests on the Composio Gmail integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button 
                  onClick={() => runTest('direct')}
                  disabled={loading}
                  className="mr-2 rounded-md"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Direct Implementation
                </Button>
                
                <Button 
                  onClick={() => runTest('diagnostic')}
                  disabled={loading}
                  variant="outline"
                  className="mr-2 rounded-md"
                >
                  Run Diagnostics
                </Button>
                
                <Button 
                  onClick={() => runTest('normal')}
                  disabled={loading}
                  variant="outline"
                  className="rounded-md"
                >
                  Test Regular Flow
                </Button>
              </div>
              
              <div>
                <Label htmlFor="integration-id">Custom Integration ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="integration-id"
                    value={customIntegrationId}
                    onChange={(e) => setCustomIntegrationId(e.target.value)}
                    placeholder="Integration ID"
                    className="rounded-md"
                  />
                  <Button
                    onClick={() => runTest('custom')}
                    disabled={loading || !customIntegrationId}
                    className="rounded-md"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={startAuth}
                className="w-full rounded-md"
                disabled={loading || !user?.uid}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Gmail with Composio
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Results from the Composio integration tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="p-4 mb-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}
              
              {result && (
                <div className="p-4 bg-slate-50 rounded-md border overflow-auto max-h-[400px]">
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              
              {!error && !result && (
                <div className="p-4 bg-slate-50 text-slate-500 rounded-md border text-center">
                  <p>Run a test to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
            <CardDescription>
              Tips for resolving common Composio integration issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Internal Server Error</h3>
                <p className="text-sm text-slate-600">
                  If you're seeing an internal server error from Composio's API, this typically means:
                </p>
                <ul className="list-disc ml-5 mt-1 text-sm text-slate-600">
                  <li>The integration ID doesn't exist</li>
                  <li>Your API key doesn't have permission to access the integration</li>
                  <li>Composio's service is experiencing issues</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Authentication Flow</h3>
                <p className="text-sm text-slate-600">
                  For successful authentication:
                </p>
                <ol className="list-decimal ml-5 mt-1 text-sm text-slate-600">
                  <li>Make sure you're using a valid integration ID that's associated with your API key</li>
                  <li>The entityId should be a unique identifier for the user (we use the merchant ID)</li>
                  <li>After successful authorization, you'll be redirected back to the callback URL</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">API Key Issues</h3>
                <p className="text-sm text-slate-600">
                  If your API key isn't working:
                </p>
                <ul className="list-disc ml-5 mt-1 text-sm text-slate-600">
                  <li>Verify that it hasn't expired</li>
                  <li>Check that it has the necessary permissions</li>
                  <li>Try generating a new key from the Composio dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
} 