"use client"

import { useState } from 'react'
import { callOpenAI } from '@/lib/assistant'
import { useAuth } from '@/contexts/auth-context'

export default function OpenAITestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const testOpenAI = async () => {
    if (!user) {
      setError('You must be logged in to test OpenAI')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Test a simple OpenAI API call
      const models = await callOpenAI('models.list', {})
      setResult(models)
    } catch (err) {
      console.error('Error testing OpenAI:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OpenAI API Test</h1>
      
      <button 
        onClick={testOpenAI}
        disabled={loading || !user}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Test OpenAI API'}
      </button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 