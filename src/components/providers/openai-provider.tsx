'use client';

import { createContext, useContext, ReactNode } from 'react';

// Create a context for OpenAI availability
type OpenAIContextType = {
  isAvailable: boolean;
};

const OpenAIContext = createContext<OpenAIContextType>({ isAvailable: false });

export const useOpenAI = () => useContext(OpenAIContext);

export function OpenAIProvider({ children }: { children: ReactNode }) {
  // We'll check if we're in the browser and if the API is available
  const isAvailable = typeof window !== 'undefined' && 
    (process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true');

  return (
    <OpenAIContext.Provider value={{ isAvailable }}>
      {children}
    </OpenAIContext.Provider>
  );
} 