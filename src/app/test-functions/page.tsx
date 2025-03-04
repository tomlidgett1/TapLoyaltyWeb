"use client"

import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function TestFunctionsPage() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const testFunction = async () => {
    setLoading(true)
    setError('')
    setResult('')
    
    try {
      const functions = getFunctions()
      console.log('Functions object:', functions)
      
      const getOpenAIKey = httpsCallable(functions, 'getOpenAIKey')
      console.log('Function reference created')
      
      const result = await getOpenAIKey()
      console.log('Function call result:', result)
      
      setResult(JSON.stringify(result.data, null, 2))
    } catch (err: any) {
      console.error('Error calling function:', err)
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Firebase Functions</h1>
      
      <button 
        onClick={testFunction}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test getOpenAIKey Function'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <h2 className="font-bold">Result:</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
} 