/**
 * Integration tests for GeminiChatbot component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { GeminiAIProvider } from '../../../contexts/GeminiAIContext';
import { GeminiChatbot } from '../GeminiChatbot';

// Mock the AI services
jest.mock('../../../services/ai/GeminiAIService', () => ({
  GeminiAIService: {
    query: jest.fn(),
    buildContext: jest.fn(),
    estimateCost: jest.fn(),
    checkBudget: jest.fn()
  }
}));

jest.mock('../../../services/ai/GeminiContextBuilder', () => ({
  GeminiContextBuilder: {
    buildDesignSystemContext: jest.fn(),
    isContextWithinBudget: jest.fn(() => true)
  }
}));

jest.mock('../../../services/ai/GeminiCostManager', () => ({
  GeminiCostManager: {
    isFeatureAvailable: jest.fn(() => true),
    getUsageMetrics: jest.fn(() => ({
      monthlyQueries: 0,
      monthlyCost: 0,
      averageTokensPerQuery: 0,
      costPerQuery: 0
    })),
    getBudgetStatus: jest.fn(() => ({
      currentUsage: 0,
      budget: 5.00,
      remaining: 5.00,
      percentageUsed: 0,
      isOverBudget: false
    }))
  }
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <GeminiAIProvider>
        {component}
      </GeminiAIProvider>
    </ChakraProvider>
  );
};

describe('GeminiChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render chatbot interface', () => {
    renderWithProviders(<GeminiChatbot />);
    
    expect(screen.getByPlaceholderText('Ask about your design system...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('AI Available')).toBeInTheDocument();
  });

  test('should display suggestions when no conversation exists', () => {
    renderWithProviders(<GeminiChatbot />);
    
    expect(screen.getByText('Try asking about:')).toBeInTheDocument();
    expect(screen.getByText('What tokens are available in my design system?')).toBeInTheDocument();
    expect(screen.getByText('How do I create a new component?')).toBeInTheDocument();
  });

  test('should handle user input correctly', async () => {
    renderWithProviders(<GeminiChatbot />);
    
    const input = screen.getByPlaceholderText('Ask about your design system...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(input, { target: { value: 'What tokens do I have?' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('What tokens do I have?')).toBeInTheDocument();
    });
  });

  test('should show loading state during query', async () => {
    renderWithProviders(<GeminiChatbot />);
    
    const input = screen.getByPlaceholderText('Ask about your design system...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(sendButton);
    
    // Should show loading indicator
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  test('should handle suggestion button clicks', async () => {
    renderWithProviders(<GeminiChatbot />);
    
    const suggestionButton = screen.getByText('What tokens are available in my design system?');
    fireEvent.click(suggestionButton);
    
    await waitFor(() => {
      expect(screen.getByText('What tokens are available in my design system?')).toBeInTheDocument();
    });
  });

  test('should display cost information', () => {
    renderWithProviders(<GeminiChatbot showCostInfo={true} />);
    
    expect(screen.getByText('$0.0000 / $5.00')).toBeInTheDocument();
  });

  test('should show budget warning when approaching limit', () => {
    // Mock budget status to show warning
    const mockGeminiCostManager = require('../../../services/ai/GeminiCostManager');
    mockGeminiCostManager.GeminiCostManager.getBudgetStatus.mockReturnValue({
      currentUsage: 4.00,
      budget: 5.00,
      remaining: 1.00,
      percentageUsed: 80,
      isOverBudget: false
    });

    renderWithProviders(<GeminiChatbot />);
    
    expect(screen.getByText('Budget Warning')).toBeInTheDocument();
  });

  test('should disable input when AI is not available', () => {
    // Mock AI as unavailable
    const mockGeminiCostManager = require('../../../services/ai/GeminiCostManager');
    mockGeminiCostManager.GeminiCostManager.isFeatureAvailable.mockReturnValue(false);

    renderWithProviders(<GeminiChatbot />);
    
    const input = screen.getByPlaceholderText('AI is currently disabled');
    expect(input).toBeDisabled();
  });

  test('should auto-scroll to bottom when new messages arrive', async () => {
    const mockScrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

    renderWithProviders(<GeminiChatbot />);
    
    const input = screen.getByPlaceholderText('Ask about your design system...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });
});
