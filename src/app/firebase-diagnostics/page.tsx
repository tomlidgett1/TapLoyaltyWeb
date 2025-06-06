"use client"

import { useState, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp, getApps } from 'firebase/app'
import { PageTransition } from "@/components/page-transition"

export default function FirebaseDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const addLog = (message: string) => {
    setDiagnostics(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }
  
  useEffect(() => {
    // Run diagnostics on page load
    runDiagnostics()
  }, [])
  
  const runDiagnostics = async () => {
    setDiagnostics([])
    setError(null)
    
    try {
      // Check Firebase initialization
      addLog('Starting Firebase diagnostics')
      
      // Check if Firebase is initialized
      addLog(`Firebase apps initialized: ${getApps().length}`)
      
      // Check environment
      addLog(`Running in environment: ${process.env.NODE_ENV}`)
      addLog(`Window location: ${window.location.href}`)
      
      // Check for environment variables
      addLog(`NEXT_PUBLIC_OPENAI_AVAILABLE: ${process.env.NEXT_PUBLIC_OPENAI_AVAILABLE || 'not set'}`)
      addLog(`NEXT_PUBLIC_OPENAI_API_KEY: ${process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'set' : 'not set'}`)
      
      // Test HTTP function
      try {
        addLog('Testing HTTP function (hello)')
        const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/hello')
        if (response.ok) {
          const data = await response.json()
          addLog(`HTTP function response: ${JSON.stringify(data)}`)
        } else {
          addLog(`HTTP function failed with status: ${response.status}`)
        }
      } catch (err: any) {
        addLog(`HTTP function error: ${err.message}`)
      }
      
      // Test callable function
      try {
        addLog('Getting Firebase functions instance')
        const functions = getFunctions(getApp())
        addLog(`Functions region: ${functions.region || 'not set'}`)
        
        addLog('Creating callable function reference')
        const getOpenAIKey = httpsCallable(functions, 'getOpenAIKey')
        
        addLog('Calling getOpenAIKey function')
        const result = await getOpenAIKey()
        
        addLog(`Function call successful: ${JSON.stringify(result.data)}`)
      } catch (err: any) {
        addLog(`Callable function error: ${err.message}`)
        console.error('Full error:', err)
        setError(err.message)
      }
      
      // Test CORS
      await testCors()
      
      addLog('Diagnostics complete')
    } catch (err: any) {
      addLog(`Diagnostics error: ${err.message}`)
      setError(err.message)
    }
  }
  
  const testCors = async () => {
    addLog('Testing CORS with HTTP function')
    
    // Test preflight request
    try {
      addLog('Testing preflight request')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/hello', {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })
      
      addLog(`CORS preflight status: ${response.status}`)
      addLog(`CORS headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)
    } catch (err: any) {
      addLog(`CORS preflight test error: ${err.message}`)
    }
    
    // Test HTTP version of getOpenAIKey
    try {
      addLog('Testing HTTP version of getOpenAIKey')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/getOpenAIKeyHttp', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        addLog(`HTTP function response: ${JSON.stringify(data)}`)
      } else {
        addLog(`HTTP function failed with status: ${response.status}`)
      }
    } catch (err: any) {
      addLog(`HTTP function error: ${err.message}`)
    }
  }
  
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Firebase Diagnostics</h1>
        
        <button 
          onClick={runDiagnostics}
          className="px-4 py-2 bg-blue-500 text-white rounded mb-4"
        >
          Run Diagnostics
        </button>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-gray-100 p-4 rounded font-mono text-sm h-[400px] overflow-auto">
          {diagnostics.length === 0 ? (
            <p className="text-gray-500">No diagnostic data available. Click "Run Diagnostics" to begin.</p>
          ) : (
            diagnostics.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  )
} 