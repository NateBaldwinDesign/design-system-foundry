# Gemini AI Integration Implementation Plan

## Mission Statement
Implement a cost-effective, conversational AI assistant using Google Gemini API that integrates seamlessly with the token-model design system application. The AI will provide natural language understanding of design system data while maintaining strict adherence to project philosophies, schema-driven development, and technical decisions.

## Core Requirements

### Primary Objectives
1. **Natural Language Processing**: Implement conversational AI that understands design system concepts
2. **Schema-Driven Integration**: All AI interactions must respect the schema.json structure
3. **Cost Optimization**: Maintain monthly costs under $5 for typical usage
4. **Client-Side Compatibility**: Work within GitHub Pages static hosting constraints
5. **Project Philosophy Alignment**: Accurately represent core design system concepts

### Technical Constraints
- Must work in client-side JavaScript/React environment
- Compatible with GitHub Pages hosting limitations
- No server-side processing requirements
- Secure handling of user data (local storage only)
- Monthly cost target: < $5 for 100 queries/day
- Real-time response capabilities (< 2 seconds)

## Project Philosophy Integration

### Core Concepts to Represent
1. **Resolved Value Types**: AI must understand "color", "font", "gap", "shadow" as fundamental types
2. **Dimensions**: AI must comprehend mutually exclusive mode groups with common themes
3. **Modes**: AI must understand specific dimension options and their exclusivity
4. **Token Collections**: AI must recognize categorization beyond traditional value type grouping
5. **Aliases**: AI must understand token-to-token references and their type inheritance

### Schema Compliance Requirements
- All AI responses must reference schema.json as single source of truth
- No new models, keys, or properties outside schema definitions
- All data validation must use schema constraints
- UI organization must derive from schema structure

## Implementation Architecture

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Service Layer Implementation
**File**: `src/services/ai/GeminiAIService.ts`
```typescript
interface GeminiAIService {
  query(question: string, context: DesignSystemContext): Promise<AIResponse>;
  buildContext(designSystem: TokenSystem): DesignSystemContext;
  estimateCost(tokens: number): number;
  checkBudget(estimatedCost: number): boolean;
}

interface DesignSystemContext {
  systemName: string;
  systemId: string;
  coreConcepts: {
    resolvedValueTypes: ResolvedValueType[];
    dimensions: Dimension[];
    modes: Mode[];
    tokenCollections: TokenCollection[];
    aliases: TokenAlias[];
  };
  data: {
    tokens: Token[];
    collections: TokenCollection[];
    dimensions: Dimension[];
    components: Component[];
    taxonomies: Taxonomy[];
  };
  metadata: {
    tokenCount: number;
    collectionCount: number;
    dimensionCount: number;
    componentCount: number;
  };
}
```

#### 1.2 Context Builder Implementation
**File**: `src/services/ai/GeminiContextBuilder.ts`
```typescript
class GeminiContextBuilder {
  buildDesignSystemContext(designSystem: TokenSystem): DesignSystemContext {
    // Must follow schema structure exactly
    // Must represent core concepts accurately
    // Must optimize for token usage while maintaining context
  }
  
  private buildCoreConceptsContext(designSystem: TokenSystem): CoreConceptsContext {
    // Emphasize project philosophy concepts
    // Include resolved value types with clear descriptions
    // Explain dimensions and modes relationship
    // Describe token collections and aliases
  }
  
  private optimizeForCost(context: DesignSystemContext): DesignSystemContext {
    // Prioritize most relevant data based on query patterns
    // Truncate to fit within token limits
    // Maintain schema compliance
  }
}
```

#### 1.3 Cost Management Implementation
**File**: `src/services/ai/GeminiCostManager.ts`
```typescript
class GeminiCostManager {
  private readonly COST_PER_1K_TOKENS = 0.001; // Gemini pricing
  private readonly MONTHLY_BUDGET = 5.00; // $5 target
  
  calculateCost(inputTokens: number, outputTokens: number): number {
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * this.COST_PER_1K_TOKENS;
  }
  
  checkBudget(estimatedCost: number): boolean {
    const currentUsage = this.getCurrentMonthlyUsage();
    return (currentUsage + estimatedCost) <= this.MONTHLY_BUDGET;
  }
  
  trackUsage(query: string, cost: number): void {
    // Store usage in localStorage
    // Update monthly tracking
    // Alert user if approaching budget
  }
}
```

### Phase 2: React Integration (Week 2)

#### 2.1 Context Provider Implementation
**File**: `src/contexts/GeminiAIContext.tsx`
```typescript
interface GeminiAIContextValue {
  isAvailable: boolean;
  isLoading: boolean;
  conversation: ConversationMessage[];
  askQuestion: (question: string) => Promise<void>;
  clearConversation: () => void;
  costStats: CostStatistics;
  budgetSettings: BudgetSettings;
}

const GeminiAIContext = createContext<GeminiAIContextValue | null>(null);

export const GeminiAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [costStats, setCostStats] = useState<CostStatistics>({
    monthlyQueries: 0,
    monthlyCost: 0,
    averageCostPerQuery: 0
  });
  
  const askQuestion = useCallback(async (question: string) => {
    setIsLoading(true);
    try {
      const designSystem = getCurrentDesignSystemData();
      const context = GeminiContextBuilder.buildDesignSystemContext(designSystem);
      const response = await GeminiAIService.query(question, context);
      
      setConversation(prev => [...prev, 
        { type: 'user', content: question, timestamp: new Date() },
        { type: 'assistant', content: response.answer, timestamp: new Date() }
      ]);
      
      // Track cost
      GeminiCostManager.trackUsage(question, response.cost);
    } catch (error) {
      console.error('[GeminiAI] Query failed:', error);
      // Handle error gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return (
    <GeminiAIContext.Provider value={{
      isAvailable: true,
      isLoading,
      conversation,
      askQuestion,
      clearConversation: () => setConversation([]),
      costStats,
      budgetSettings: { monthlyBudget: 5.00 }
    }}>
      {children}
    </GeminiAIContext.Provider>
  );
};
```

#### 2.2 Hook Implementation
**File**: `src/hooks/useGeminiAI.ts`
```typescript
export const useGeminiAI = () => {
  const context = useContext(GeminiAIContext);
  if (!context) {
    throw new Error('useGeminiAI must be used within GeminiAIProvider');
  }
  return context;
};
```

### Phase 3: UI Components (Week 3)

#### 3.1 Chatbot Component Implementation
**File**: `src/components/ai/GeminiChatbot.tsx`
```typescript
interface GeminiChatbotProps {
  suggestions?: string[];
  maxHeight?: string;
  showCostInfo?: boolean;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  maxHeight = "600px",
  showCostInfo = true
}) => {
  const { conversation, askQuestion, isLoading, costStats } = useGeminiAI();
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    await askQuestion(inputValue.trim());
    setInputValue('');
  };
  
  return (
    <Box>
      {/* Conversation Messages */}
      <VStack spacing={4} maxHeight={maxHeight} overflowY="auto">
        {conversation.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {isLoading && <LoadingIndicator />}
      </VStack>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <HStack>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your design system..."
            disabled={isLoading}
          />
          <Button type="submit" isLoading={isLoading}>
            Send
          </Button>
        </HStack>
      </form>
      
      {/* Suggestions */}
      <SuggestionButtons suggestions={suggestions} onSelect={askQuestion} />
      
      {/* Cost Information */}
      {showCostInfo && <CostDisplay costStats={costStats} />}
    </Box>
  );
};
```

#### 3.2 Main View Implementation
**File**: `src/views/GeminiAIView.tsx`
```typescript
export const GeminiAIView: React.FC<{ canEdit?: boolean }> = ({ canEdit = false }) => {
  const { colorMode } = useColorMode();
  
  const suggestions = [
    "What tokens are available in my design system?",
    "How do I create a new component?",
    "What are the current dimensions and modes?",
    "How do I organize tokens with taxonomies?",
    "What platforms does my design system support?",
    "Explain the relationship between dimensions and modes",
    "How do aliases work in this design system?",
    "What resolved value types are supported?"
  ];
  
  return (
    <PageTemplate
      title="AI Assistant"
      description="Ask questions about your design system using natural language"
    >
      <VStack spacing={6} align="stretch">
        {/* Status and Cost Information */}
        <GeminiAIStatus />
        
        {/* Chatbot Interface */}
        <Box
          borderWidth={1}
          borderRadius="lg"
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          p={6}
        >
          <GeminiChatbot
            suggestions={suggestions}
            maxHeight="600px"
            showCostInfo={true}
          />
        </Box>
        
        {/* Help and Information */}
        <GeminiAIHelp />
      </VStack>
    </PageTemplate>
  );
};
```

### Phase 4: Navigation Integration (Week 4)

#### 4.1 App Integration
**File**: `src/App.tsx` (Update)
```typescript
// Add to existing imports
import { GeminiAIProvider } from './contexts/GeminiAIContext';

// Add to App component
const App: React.FC = () => {
  // ... existing code ...
  
  return (
    <BrowserRouter>
      <GeminiAIProvider>
        <Box h="100vh" display="flex" flexDirection="column">
          {/* ... existing content ... */}
        </Box>
      </GeminiAIProvider>
    </BrowserRouter>
  );
};
```

#### 4.2 Navigation Update
**File**: `src/components/AppSidebar.tsx` (Update)
```typescript
// Add to NAV_ITEMS array
const NAV_ITEMS = [
  // ... existing items ...
  { id: 'gemini-ai', label: 'AI Assistant', icon: LuBot },
];
```

#### 4.3 View Renderer Update
**File**: `src/components/ViewRenderer.tsx` (Update)
```typescript
// Add to imports
import { GeminiAIView } from '../views/GeminiAIView';

// Add to switch statement
switch (activeView) {
  // ... existing cases ...
  case 'gemini-ai':
    return <GeminiAIView canEdit={effectiveCanEdit} />;
}
```

### Phase 5: Testing and Optimization (Week 5)

#### 5.1 Unit Tests Implementation
**File**: `src/services/ai/__tests__/GeminiAIService.test.ts`
```typescript
describe('GeminiAIService', () => {
  test('should build context correctly', () => {
    const mockDesignSystem = createMockDesignSystem();
    const context = GeminiContextBuilder.buildDesignSystemContext(mockDesignSystem);
    
    expect(context.coreConcepts.resolvedValueTypes).toBeDefined();
    expect(context.coreConcepts.dimensions).toBeDefined();
    expect(context.coreConcepts.modes).toBeDefined();
    expect(context.coreConcepts.tokenCollections).toBeDefined();
    expect(context.coreConcepts.aliases).toBeDefined();
  });
  
  test('should calculate costs correctly', () => {
    const cost = GeminiCostManager.calculateCost(1000, 500);
    expect(cost).toBe(0.0015); // (1500 / 1000) * 0.001
  });
  
  test('should respect budget limits', () => {
    const canAfford = GeminiCostManager.checkBudget(1.00);
    expect(canAfford).toBe(true);
  });
});
```

#### 5.2 Integration Tests Implementation
**File**: `src/components/ai/__tests__/GeminiChatbot.test.tsx`
```typescript
describe('GeminiChatbot', () => {
  test('should handle user input correctly', async () => {
    render(
      <GeminiAIProvider>
        <GeminiChatbot />
      </GeminiAIProvider>
    );
    
    const input = screen.getByPlaceholderText('Ask about your design system...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(input, { target: { value: 'What tokens do I have?' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('What tokens do I have?')).toBeInTheDocument();
    });
  });
});
```

### Phase 6: Documentation and Deployment (Week 6)

#### 6.1 Documentation Implementation
**File**: `docs/gemini-ai-integration.md`
```markdown
# Gemini AI Integration Documentation

## Overview
The Gemini AI integration provides conversational AI capabilities for the design system application using Google's Gemini API.

## Features
- Natural language queries about design system data
- Cost-optimized implementation (< $5/month)
- Schema-compliant responses
- Real-time conversation interface

## Usage
1. Navigate to "AI Assistant" in the sidebar
2. Ask questions about your design system
3. Use suggested questions to get started
4. Monitor costs in the cost display

## Configuration
- API key management in settings
- Budget controls and alerts
- Cost tracking and analytics
```

#### 6.2 Environment Configuration
**File**: `.env.example`
```env
# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MONTHLY_BUDGET=5.00
```

#### 6.3 GitHub Pages Deployment and Runtime API Key Configuration

To satisfy the constraint that the app must run as a static site on GitHub Pages while preserving AI functionality and security, the Gemini integration MUST support runtime API key configuration and avoid server-side dependencies.

Deployment design decisions (aligned with project philosophies and technical decisions):
- No server required; all AI calls are made client-side
- API key is never stored in the repository or build artifacts
- Users configure their own API key at runtime; key is stored locally in the browser
- Vite-only variables (VITE_*) are used for local development, but production uses runtime configuration

Key sourcing order (implemented in `GeminiAIService`):
1. `import.meta.env.VITE_GEMINI_API_KEY` (development only)
2. `window.GEMINI_API_KEY` (optional runtime injection)
3. `localStorage['gemini-api-key']` (recommended for GitHub Pages)

UI support (implemented):
- `GeminiAPIKeyConfig` UI prompts the user to enter and save their key in `localStorage`
- `GeminiAIView` renders the configuration UI when no key is present

Step-by-step: Deploy to GitHub Pages (project pages)
1. Build the app locally or via GitHub Actions
   - For local build: `cd packages/design-data-system-manager && pnpm build`
   - Output is written to `dist/`
2. Publish to GitHub Pages
   - Enable Pages in repo Settings → Pages
   - Use an Actions workflow to deploy `packages/design-data-system-manager/dist` to Pages
3. First-time user setup (runtime)
   - Navigate to the deployed site → AI Assistant view
   - Enter Gemini API key in the configuration box; it is stored in `localStorage`
   - Begin using the assistant; costs are tracked locally as designed

Optional: Inject key at runtime (not recommended for public sites)
If you must inject a key at runtime (e.g., protected environments), add a script tag to your hosting page:
```html
<script>
  window.GEMINI_API_KEY = 'YOUR_API_KEY';
</script>
```
Do not commit secrets to source control. Prefer the `localStorage` approach for public Pages.

GitHub Actions example (build + deploy):
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: |
          npm install -g pnpm
          pnpm install
      - name: Build application
        run: |
          cd packages/design-data-system-manager
          pnpm build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: packages/design-data-system-manager/dist
```

Base path note (project pages):
- If deploying under `https://<org>.github.io/<repo>/`, set Vite `base` to `'/<repo>/'` for production builds, or serve from a custom domain at root. Keep current `base: '/'` if serving at the domain root.

Security and cost considerations:
- API key remains in the user's browser; never stored on servers or in the repo
- Cost management and budget alerts continue to function via `localStorage`
- Users can remove/update their key any time from the UI

## Development Best Practices

### Code Quality Standards
1. **TypeScript Strict Mode**: All code must use strict TypeScript
2. **Schema Compliance**: All data operations must validate against schema.json
3. **Error Handling**: Comprehensive error handling with user-friendly messages
4. **Performance**: Optimize for sub-2-second response times
5. **Cost Management**: Always check budget before API calls

### Testing Requirements
1. **Unit Tests**: 90%+ coverage for all service methods
2. **Integration Tests**: Test complete user workflows
3. **Cost Tests**: Verify budget compliance
4. **Schema Tests**: Ensure all responses respect schema structure

### Documentation Standards
1. **Inline Comments**: Explain complex logic and schema relationships
2. **API Documentation**: Document all public methods and interfaces
3. **User Documentation**: Clear usage instructions and examples
4. **Cost Documentation**: Explain pricing and budget management

## Success Criteria

### Technical Metrics
- **Response Time**: < 2 seconds for 95% of queries
- **Cost Efficiency**: < $5/month for typical usage
- **Schema Compliance**: 100% of responses respect schema structure
- **Error Rate**: < 5% of queries result in errors

### User Experience Metrics
- **Adoption Rate**: > 60% of users try AI features within first week
- **Query Success**: > 85% of queries return helpful responses
- **User Satisfaction**: > 4.0/5.0 rating for AI helpfulness
- **Cost Transparency**: Users understand and can control costs

### Project Philosophy Metrics
- **Concept Accuracy**: AI correctly explains all 5 core concepts
- **Schema Alignment**: All responses reference correct schema elements
- **Data Integrity**: No responses suggest invalid data structures
- **Terminology Consistency**: Uses project-specific terminology correctly

## Implementation Checklist

### Week 1: Foundation
- [ ] Implement GeminiAIService with proper error handling
- [ ] Create GeminiContextBuilder with schema compliance
- [ ] Implement GeminiCostManager with budget controls
- [ ] Add unit tests for all service methods

### Week 2: React Integration
- [ ] Create GeminiAIContext with proper state management
- [ ] Implement useGeminiAI hook with error boundaries
- [ ] Add cost tracking and budget monitoring
- [ ] Test context integration with existing components

### Week 3: UI Components
- [ ] Build GeminiChatbot with conversation interface
- [ ] Create GeminiAIView with proper layout
- [ ] Implement suggestion system and cost display
- [ ] Add loading states and error handling

### Week 4: Navigation Integration
- [ ] Update App.tsx with GeminiAIProvider
- [ ] Add AI Assistant to navigation sidebar
- [ ] Update ViewRenderer with new view
- [ ] Test navigation flow and routing

### Week 5: Testing and Optimization
- [ ] Complete unit test coverage
- [ ] Add integration tests for user workflows
- [ ] Performance testing and optimization
- [ ] Cost testing and budget validation

### Week 6: Documentation and Deployment
- [ ] Complete user documentation
- [ ] Add developer documentation
- [ ] Environment configuration setup
- [ ] Final testing and deployment preparation

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement exponential backoff and caching
- **Cost Overruns**: Strict budget controls and user alerts
- **Schema Violations**: Comprehensive validation and testing
- **Performance Issues**: Optimize context building and response processing

### User Experience Risks
- **Complexity**: Progressive disclosure and clear guidance
- **Expectation Management**: Clear communication about capabilities
- **Cost Surprises**: Transparent cost tracking and alerts
- **Error Recovery**: Graceful degradation and helpful error messages

## Monitoring and Updates

### Development Progress
- Daily progress updates on implementation status
- Weekly code reviews for schema compliance
- Bi-weekly cost analysis and optimization
- Monthly user feedback collection and analysis

### Success Tracking
- Monitor technical metrics daily
- Track user adoption weekly
- Analyze cost efficiency monthly
- Evaluate project philosophy alignment continuously

This plan ensures successful implementation of Gemini AI integration while maintaining strict adherence to project philosophies, schema-driven development, and cost optimization requirements.
