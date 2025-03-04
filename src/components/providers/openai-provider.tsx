'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface OpenAIContextType {
  aiAvailable: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  checkAvailability: () => Promise<boolean>;
}

const OpenAIContext = createContext<OpenAIContextType>({
  aiAvailable: false,
  isOpen: false,
  setIsOpen: () => {},
  checkAvailability: async () => false,
});

export function OpenAIProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [aiAvailable, setAIAvailable] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const checkAvailability = useCallback(async () => {
    try {
      if (!user) {
        console.log('OpenAIProvider: No user, AI not available');
        setAIAvailable(false);
        return false;
      }

      // Check if OpenAI is available by trying to get the API key
      // We'll use the getOpenAIClient function indirectly by checking if an assistant exists
      const { checkAssistantExists } = await import('@/lib/assistant');
      const exists = await checkAssistantExists('asst_Aymz6DWL61Twlz2XubPu49ur');
      
      console.log('OpenAIProvider: AI availability check result:', exists);
      setAIAvailable(exists);
      return exists;
    } catch (error) {
      console.error('OpenAIProvider: Error checking AI availability:', error);
      setAIAvailable(false);
      return false;
    }
  }, [user]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return (
    <OpenAIContext.Provider value={{ aiAvailable, isOpen, setIsOpen, checkAvailability }}>
      {children}
    </OpenAIContext.Provider>
  );
}

export function useOpenAI() {
  return useContext(OpenAIContext);
} 