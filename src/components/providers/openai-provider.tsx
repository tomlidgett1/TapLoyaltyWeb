'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { callOpenAI } from '@/lib/assistant';

interface OpenAIContextType {
  aiAvailable: boolean;
}

const OpenAIContext = createContext<OpenAIContextType>({
  aiAvailable: false
});

export function OpenAIProvider({ children }: { children: React.ReactNode }) {
  const [aiAvailable, setAiAvailable] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    console.log('OpenAI Provider state:', { user: !!user, aiAvailable });

    if (!user) {
      setAiAvailable(false);
      return;
    }

    // Check if OpenAI is available
    const checkOpenAI = async () => {
      try {
        console.log('Checking OpenAI availability...');
        
        // Add a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.error("OpenAI check timed out");
          setAiAvailable(false);
        }, 10000); // 10 second timeout
        
        // Test the OpenAI API with a simple models.list call
        await callOpenAI('models.list', {});
        clearTimeout(timeoutId);
        
        console.log('OpenAI is available!');
        setAiAvailable(true);
      } catch (error) {
        console.error("Failed to check OpenAI availability:", error);
        setAiAvailable(false);
      }
    }

    checkOpenAI();
  }, [user]);

  return (
    <OpenAIContext.Provider value={{ aiAvailable }}>
      {children}
    </OpenAIContext.Provider>
  );
}

export const useOpenAI = () => useContext(OpenAIContext); 