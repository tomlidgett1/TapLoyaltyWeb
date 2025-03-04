'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { callOpenAI } from '@/lib/assistant';

interface OpenAIContextType {
  aiAvailable: boolean;
  checkAvailability: () => Promise<boolean>;
}

const OpenAIContext = createContext<OpenAIContextType>({
  aiAvailable: false,
  checkAvailability: async () => false
});

export function OpenAIProvider({ children }: { children: React.ReactNode }) {
  const [aiAvailable, setAiAvailable] = useState(false);
  const [checkInProgress, setCheckInProgress] = useState(false);
  const { user, loading } = useAuth();

  // Create a reusable function to check OpenAI availability
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (checkInProgress) return aiAvailable;

    setCheckInProgress(true);
    console.log('Manually checking OpenAI availability...');
    
    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI check timed out")), 10000);
      });
      
      // Test the OpenAI API with a simple models.list call
      const apiCallPromise = callOpenAI('models.list', {}).then(() => true);
      
      // Race the API call against the timeout
      const isAvailable = await Promise.race([apiCallPromise, timeoutPromise]);
      
      console.log('OpenAI availability check result:', isAvailable);
      setAiAvailable(isAvailable);
      setCheckInProgress(false);
      return isAvailable;
    } catch (error) {
      console.error("Failed to check OpenAI availability:", error);
      setAiAvailable(false);
      setCheckInProgress(false);
      return false;
    }
  }, [user, checkInProgress, aiAvailable]);

  // Check availability when auth state changes
  useEffect(() => {
    console.log('OpenAI Provider auth state:', { 
      user: user?.uid || 'none', 
      loading, 
      aiAvailable,
      checkInProgress
    });

    // Don't run the check if auth is still loading or if we're already checking
    if (loading || checkInProgress) return;
    
    // If user is logged in and we haven't checked yet, check availability
    if (user && !aiAvailable) {
      checkAvailability();
    } else if (!user) {
      // Reset state when user logs out
      setAiAvailable(false);
    }
  }, [user, loading, aiAvailable, checkInProgress, checkAvailability]);

  return (
    <OpenAIContext.Provider value={{ aiAvailable, checkAvailability }}>
      {children}
    </OpenAIContext.Provider>
  );
}

export const useOpenAI = () => useContext(OpenAIContext); 