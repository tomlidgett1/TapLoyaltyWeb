"use client"

import { useState } from 'react'
import { callOpenAI } from '@/lib/assistant'
import { useAuth } from '@/contexts/auth-context'
import { useOpenAI } from '@/components/providers/openai-provider'
import { Button } from '@/components/ui/button'

export default function TestAIPage() {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { aiAvailable, checkAvailability } = useOpenAI()

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing OpenAI API...')
      const models = await callOpenAI('models.list', {})
      console.log('API response:', models)
      setResult(JSON.stringify(models, null, 2))
    } catch (err) {
      console.error('API test failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const checkAPI = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const isAvailable = await checkAvailability()
      setResult(`OpenAI API is ${isAvailable ? 'available' : 'not available'}`)
    } catch (err) {
      console.error('API check failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test OpenAI API</h1>
      
      <div className="mb-4">
        <p>User: {user ? user.uid : 'Not logged in'}</p>
        <p>OpenAI Available: {aiAvailable ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="flex gap-4 mb-4">
        <Button 
          onClick={testAPI} 
          disabled={loading || !user}
        >
          {loading ? 'Testing...' : 'Test OpenAI API'}
        </Button>
        
        <Button 
          onClick={checkAPI}
          disabled={loading || !user}
          variant="outline"
        >
          {loading ? 'Checking...' : 'Check Availability'}
        </Button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-bold">Error:</h2>
          <pre>{error}</pre>
        </div>
      )}
      
      {result && (
        <div className="p-4 bg-green-100 text-green-700 rounded">
          <h2 className="font-bold">Result:</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  )
} 