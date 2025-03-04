"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

export function TestFunction() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFunction = async () => {
    setLoading(true)
    setError(null)
    try {
      const functions = getFunctions(getApp())
      const getOpenAIKey = httpsCallable(functions, 'getOpenAIKey')
      const response = await getOpenAIKey()
      setResult(JSON.stringify(response.data, null, 2))
    } catch (err: any) {
      console.error("Function test error:", err)
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-bold mb-2">Test Firebase Function</h2>
      <Button onClick={testFunction} disabled={loading}>
        {loading ? "Testing..." : "Test getOpenAIKey Function"}
      </Button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
          Error: {error}
        </div>
      )}
      
      {result && (
        <div className="mt-2">
          <h3 className="font-semibold">Result:</h3>
          <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-40">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
} 