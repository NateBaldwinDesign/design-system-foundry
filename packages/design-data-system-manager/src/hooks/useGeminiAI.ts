/**
 * useGeminiAI Hook
 * Provides access to Gemini AI functionality with error boundaries
 */

import { useContext } from 'react';
import { GeminiAIContext } from '../contexts/GeminiAIContext';

export const useGeminiAI = () => {
  const context = useContext(GeminiAIContext);
  if (!context) {
    throw new Error('useGeminiAI must be used within GeminiAIProvider');
  }
  return context;
};
