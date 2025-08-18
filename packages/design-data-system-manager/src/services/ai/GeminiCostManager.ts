/**
 * Gemini Cost Manager
 * Manages cost tracking, budget controls, and usage monitoring for Gemini AI
 */

export interface UsageMetrics {
  monthlyQueries: number;
  monthlyCost: number;
  averageTokensPerQuery: number;
  costPerQuery: number;
}

export interface BudgetSettings {
  monthlyBudget: number;
  costAlerts: boolean;
  autoFallback: boolean;
}

export class GeminiCostManager {
  private readonly COST_PER_1K_TOKENS = 0.001; // Gemini pricing
  private readonly MONTHLY_BUDGET = 5.00; // $5 target
  private readonly STORAGE_KEY = 'gemini-ai:monthly-usage';
  private readonly SETTINGS_KEY = 'gemini-ai:budget-settings';

  calculateCost(inputTokens: number, outputTokens: number): number {
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  checkBudget(estimatedCost: number): boolean {
    const currentUsage = this.getCurrentMonthlyUsage();
    return (currentUsage + estimatedCost) <= this.MONTHLY_BUDGET;
  }

  trackUsage(query: string, cost: number): void {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const existingData = localStorage.getItem(this.STORAGE_KEY);
      
      let usageData: {
        month: string;
        queries: Array<{ query: string; cost: number; timestamp: string }>;
        totalCost: number;
        queryCount: number;
      };

      if (existingData) {
        usageData = JSON.parse(existingData);
        
        // Reset if it's a new month
        if (usageData.month !== currentMonth) {
          usageData = {
            month: currentMonth,
            queries: [],
            totalCost: 0,
            queryCount: 0
          };
        }
      } else {
        usageData = {
          month: currentMonth,
          queries: [],
          totalCost: 0,
          queryCount: 0
        };
      }

      // Add new usage
      usageData.queries.push({
        query: query.substring(0, 100), // Limit query length for storage
        cost,
        timestamp: new Date().toISOString()
      });
      usageData.totalCost += cost;
      usageData.queryCount += 1;

      // Keep only last 100 queries to prevent storage bloat
      if (usageData.queries.length > 100) {
        usageData.queries = usageData.queries.slice(-100);
      }

      // Store updated usage data
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usageData));

      // Check if approaching budget limit
      this.checkBudgetAlerts(usageData.totalCost);

      console.log(`[GeminiCostManager] Usage tracked: $${cost.toFixed(4)} (Total: $${usageData.totalCost.toFixed(4)})`);
    } catch (error) {
      console.error('[GeminiCostManager] Error tracking usage:', error);
    }
  }

  getCurrentMonthlyUsage(): number {
    try {
      const usageData = localStorage.getItem(this.STORAGE_KEY);
      if (usageData) {
        const usage = JSON.parse(usageData);
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        if (usage.month === currentMonth) {
          return usage.totalCost || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('[GeminiCostManager] Error reading monthly usage:', error);
      return 0;
    }
  }

  getUsageMetrics(): UsageMetrics {
    try {
      const usageData = localStorage.getItem(this.STORAGE_KEY);
      if (usageData) {
        const usage = JSON.parse(usageData);
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        if (usage.month === currentMonth && usage.queryCount > 0) {
          return {
            monthlyQueries: usage.queryCount,
            monthlyCost: usage.totalCost,
            averageTokensPerQuery: this.estimateAverageTokens(usage.queries),
            costPerQuery: usage.totalCost / usage.queryCount
          };
        }
      }
      
      return {
        monthlyQueries: 0,
        monthlyCost: 0,
        averageTokensPerQuery: 0,
        costPerQuery: 0
      };
    } catch (error) {
      console.error('[GeminiCostManager] Error getting usage metrics:', error);
      return {
        monthlyQueries: 0,
        monthlyCost: 0,
        averageTokensPerQuery: 0,
        costPerQuery: 0
      };
    }
  }

  getBudgetSettings(): BudgetSettings {
    try {
      const settingsData = localStorage.getItem(this.SETTINGS_KEY);
      if (settingsData) {
        return JSON.parse(settingsData);
      }
    } catch (error) {
      console.error('[GeminiCostManager] Error reading budget settings:', error);
    }

    // Default settings
    return {
      monthlyBudget: this.MONTHLY_BUDGET,
      costAlerts: true,
      autoFallback: true
    };
  }

  updateBudgetSettings(settings: Partial<BudgetSettings>): void {
    try {
      const currentSettings = this.getBudgetSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
      console.log('[GeminiCostManager] Budget settings updated:', updatedSettings);
    } catch (error) {
      console.error('[GeminiCostManager] Error updating budget settings:', error);
    }
  }

  resetMonthlyUsage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[GeminiCostManager] Monthly usage reset');
    } catch (error) {
      console.error('[GeminiCostManager] Error resetting monthly usage:', error);
    }
  }

  getBudgetStatus(): {
    currentUsage: number;
    budget: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
  } {
    const currentUsage = this.getCurrentMonthlyUsage();
    const budget = this.getBudgetSettings().monthlyBudget;
    const remaining = Math.max(0, budget - currentUsage);
    const percentageUsed = (currentUsage / budget) * 100;
    const isOverBudget = currentUsage > budget;

    return {
      currentUsage,
      budget,
      remaining,
      percentageUsed,
      isOverBudget
    };
  }

  private checkBudgetAlerts(currentCost: number): void {
    const budget = this.getBudgetSettings().monthlyBudget;
    const percentageUsed = (currentCost / budget) * 100;

    // Alert at 80% usage
    if (percentageUsed >= 80 && percentageUsed < 90) {
      console.warn(`[GeminiCostManager] Budget warning: ${percentageUsed.toFixed(1)}% of monthly budget used`);
      this.showBudgetAlert('warning', `You've used ${percentageUsed.toFixed(1)}% of your monthly budget.`);
    }
    
    // Alert at 90% usage
    if (percentageUsed >= 90 && percentageUsed < 100) {
      console.warn(`[GeminiCostManager] Budget alert: ${percentageUsed.toFixed(1)}% of monthly budget used`);
      this.showBudgetAlert('error', `You've used ${percentageUsed.toFixed(1)}% of your monthly budget. Consider reducing usage.`);
    }
    
    // Alert when over budget
    if (percentageUsed >= 100) {
      console.error(`[GeminiCostManager] Budget exceeded: ${percentageUsed.toFixed(1)}% of monthly budget used`);
      this.showBudgetAlert('error', 'Monthly budget exceeded. AI features will be disabled until next month.');
    }
  }

  private showBudgetAlert(type: 'warning' | 'error', message: string): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('gemini-ai:budget-alert', {
      detail: { type, message }
    }));
  }

  private estimateAverageTokens(queries: Array<{ query: string; cost: number }>): number {
    if (queries.length === 0) return 0;
    
    const totalCost = queries.reduce((sum, q) => sum + q.cost, 0);
    const averageCost = totalCost / queries.length;
    
    // Convert cost back to tokens (approximate)
    return Math.round((averageCost / this.COST_PER_1K_TOKENS) * 1000);
  }

  isFeatureAvailable(): boolean {
    const budgetStatus = this.getBudgetStatus();
    return !budgetStatus.isOverBudget;
  }

  getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }
}

// Export singleton instance
export const GeminiCostManagerInstance = new GeminiCostManager();
