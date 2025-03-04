'use client';

import { useOpenAI } from '@/components/providers/openai-provider';
import { getAIResponse } from '@/lib/openai';

export function AIFeature() {
  const { isAvailable } = useOpenAI();

  const handleAIRequest = async (message: string) => {
    if (!isAvailable) {
      return "AI features are currently unavailable.";
    }
    
    try {
      return await getAIResponse(message);
    } catch (error) {
      console.error('AI error:', error);
      return "Failed to get AI response. Please try again.";
    }
  };

  // Rest of your component
} 