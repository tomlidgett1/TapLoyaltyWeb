'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { initializeOpenAI } from '@/lib/assistant';

// Create a context for OpenAI availability
type OpenAIContextType = {
  isAvailable: boolean;
};

const OpenAIContext = createContext<OpenAIContextType>({ isAvailable: false });

export const useOpenAI = () => useContext(OpenAIContext);

export function OpenAIProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // First check if we have environment variables
    const envApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const envAvailable = process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true';
    
    if (envApiKey && envAvailable) {
      console.log('OpenAI available via environment variables');
      setIsAvailable(true);
      return;
    }
    
    // Otherwise try to get from Firebase function
    if (user) {
      console.log('Trying to initialize OpenAI via Firebase function');
      initializeOpenAI()
        .then(() => {
          console.log('OpenAI initialized successfully');
          setIsAvailable(true);
        })
        .catch(error => {
          console.error("Failed to initialize OpenAI:", error);
          setIsAvailable(false);
        });
    } else {
      setIsAvailable(false);
    }
  }, [user]);

  return (
    <OpenAIContext.Provider value={{ isAvailable }}>
      {children}
    </OpenAIContext.Provider>
  );
} 