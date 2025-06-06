"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export default function ApiKeyTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }
  
  const testRewrite = async () => {
    setIsLoading(true)
    addLog('Testing rewrite URL...')
    
    try {
      // Get the current user's ID token
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const user = auth.currentUser
      
      if (!user) {
        addLog('ERROR: No authenticated user')
        setIsLoading(false)
        return
      }
      
      addLog(`User authenticated: ${user.uid}`)
      const token = await user.getIdToken()
      addLog(`Got ID token (length: ${token.length})`)
      
      // Make the request with the token
      addLog('Making request to /api/openai-key')
      const response = await fetch('/api/openai-key', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      addLog(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`ERROR: HTTP error ${response.status}: ${errorText}`)
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      addLog(`Response data: ${JSON.stringify(data)}`)
      
      if (data && data.apiKey) {
        addLog(`SUCCESS: Got API key (length: ${data.apiKey.length})`)
      } else {
        addLog('ERROR: No API key in response')
      }
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const testCallable = async () => {
    setIsLoading(true)
    addLog('Testing callable function...')
    
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const { getApp } = await import('firebase/app')
      
      addLog('Getting Firebase functions instance')
      const functionsInstance = getFunctions(getApp())
      addLog(`Functions region: ${functionsInstance.region}`)
      
      addLog('Creating callable function reference')
      const getOpenAIKey = httpsCallable(functionsInstance, 'getOpenAIKey')
      
      addLog('Calling getOpenAIKey function')
      try {
        const result = await getOpenAIKey()
        addLog(`Function call result: ${JSON.stringify(result.data)}`)
        
        const data = result.data as { apiKey: string }
        
        if (data && data.apiKey) {
          addLog(`SUCCESS: Got API key (length: ${data.apiKey.length})`)
        } else {
          addLog('ERROR: No API key in response')
        }
      } catch (callError: any) {
        // Extract detailed error information from Firebase callable error
        addLog(`ERROR: Function call failed with code: ${callError.code}`)
        addLog(`ERROR message: ${callError.message}`)
        
        if (callError.details) {
          addLog(`ERROR details: ${JSON.stringify(callError.details)}`)
        }
        
        // Try to get the Firebase Functions logs URL
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tap-loyalty-fb6d0'
        const logsUrl = `https://console.firebase.google.com/project/${projectId}/functions/logs`
        addLog(`Check Firebase Functions logs for more details: ${logsUrl}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        addLog(`ERROR: ${error.message}`)
        addLog(`ERROR stack: ${error.stack}`)
      } else {
        addLog(`ERROR: ${String(error)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  const testHttp = async () => {
    setIsLoading(true)
    addLog('Testing HTTP function...')
    
    try {
      // Get the current user's ID token
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const user = auth.currentUser
      
      if (!user) {
        addLog('ERROR: No authenticated user')
        setIsLoading(false)
        return
      }
      
      addLog(`User authenticated: ${user.uid}`)
      const token = await user.getIdToken()
      addLog(`Got ID token (length: ${token.length})`)
      
      // Make the request with the token
      addLog('Making HTTP request to getOpenAIKeyHttp')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/getOpenAIKeyHttp', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      addLog(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`ERROR: HTTP error ${response.status}: ${errorText}`)
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      addLog(`Response data: ${JSON.stringify(data)}`)
      
      if (data && data.apiKey) {
        addLog(`SUCCESS: Got API key (length: ${data.apiKey.length})`)
      } else {
        addLog('ERROR: No API key in response')
      }
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const testConfig = async () => {
    setIsLoading(true)
    addLog('Testing config...')
    
    try {
      // Make the request to check config
      addLog('Making request to checkConfig')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/checkConfig')
      
      addLog(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`ERROR: HTTP error ${response.status}: ${errorText}`)
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      addLog(`Config data: ${JSON.stringify(data)}`)
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const testDirectConfig = async () => {
    setIsLoading(true)
    addLog('Testing direct config access...')
    
    try {
      // Make the request to check config
      addLog('Making request to checkConfig')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/checkConfig')
      
      addLog(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`ERROR: HTTP error ${response.status}: ${errorText}`)
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      addLog(`Config data: ${JSON.stringify(data)}`)
      
      // Check if the OpenAI API key exists
      if (data.apiKeyExists) {
        addLog(`SUCCESS: OpenAI API key exists (length: ${data.apiKeyLength})`)
      } else {
        addLog('ERROR: OpenAI API key does not exist in Firebase config')
        
        // Provide instructions for setting the API key
        addLog('To set the API key, run:')
        addLog('firebase functions:config:set openai.api_key="YOUR_API_KEY"')
        addLog('Then redeploy your functions:')
        addLog('firebase deploy --only functions')
      }
    } catch (error) {
      if (error instanceof Error) {
        addLog(`ERROR: ${error.message}`)
        addLog(`ERROR stack: ${error.stack}`)
      } else {
        addLog(`ERROR: ${String(error)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  const testEnvironment = async () => {
    setIsLoading(true)
    addLog('Testing Firebase environment...')
    
    try {
      // Make the request to check environment
      addLog('Making request to checkEnvironment')
      const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/checkEnvironment')
      
      addLog(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        addLog(`ERROR: HTTP error ${response.status}: ${errorText}`)
        setIsLoading(false)
        return
      }
      
      const data = await response.json()
      addLog(`Environment data:`)
      Object.entries(data).forEach(([key, value]) => {
        addLog(`  ${key}: ${value}`)
      })
    } catch (error) {
      if (error instanceof Error) {
        addLog(`ERROR: ${error.message}`)
        addLog(`ERROR stack: ${error.stack}`)
      } else {
        addLog(`ERROR: ${String(error)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Key Test</h1>
      
      {!user ? (
        <p className="text-red-500">You must be logged in to test API key retrieval</p>
      ) : (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button 
              onClick={testRewrite}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              Test Rewrite
            </button>
            
            <button 
              onClick={testCallable}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
            >
              Test Callable
            </button>
            
            <button 
              onClick={testHttp}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-400"
            >
              Test HTTP
            </button>
            
            <button 
              onClick={testConfig}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-400"
            >
              Test Config
            </button>
            
            <button 
              onClick={testDirectConfig}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-400"
            >
              Test Direct Config
            </button>
            
            <button 
              onClick={testEnvironment}
              disabled={isLoading}
              className="px-4 py-2 bg-teal-500 text-white rounded disabled:bg-gray-400"
            >
              Test Environment
            </button>
          </div>
          
          <div className="border p-4 bg-gray-50 rounded h-96 overflow-auto">
            <h2 className="font-bold mb-2">Logs:</h2>
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click a test button to start.</p>
            ) : (
              <pre className="whitespace-pre-wrap text-sm">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 