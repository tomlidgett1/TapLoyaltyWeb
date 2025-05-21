"use client"

import { useState } from 'react'
import { callOpenAI } from '@/lib/assistant'
import { useAuth } from '@/contexts/auth-context'

export default function OpenAITestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState<string>('')
  const { user } = useAuth()

  const testOpenAI = async () => {
    if (!user) {
      setError('You must be logged in to test OpenAI')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Test the OpenAI Responses API instead of models.list
      const response = await callOpenAI('responses.create', {
        model: "gpt-4o-mini",
        input: query || "Say hello!",
        tools: [
          {
            type: "web_search_preview",
            user_location: {
              type: "approximate",
              country: "AU",
              city: "Melbourne",
              region: "Victoria",
            }
          }
        ]
      })
      setResult(response)
    } catch (err) {
      console.error('Error testing OpenAI:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OpenAI Responses API Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Query
        </label>
        <textarea 
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a query (e.g., What's the weather in Melbourne?)"
        />
      </div>
      
      <button 
        onClick={testOpenAI}
        disabled={loading || !user}
        className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Test OpenAI Responses API'}
      </button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <div className="mb-2">
            <h3 className="font-medium">Output Text:</h3>
            <p className="bg-gray-50 p-3 rounded-md">{result.output_text}</p>
          </div>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 