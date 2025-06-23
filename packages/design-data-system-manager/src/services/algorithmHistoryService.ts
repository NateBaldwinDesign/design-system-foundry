import type { Algorithm } from '../types/algorithm';

export interface AlgorithmHistoryEntry {
  id: string;
  timestamp: number;
  algorithm: Algorithm;
  description: string;
  type: 'formula' | 'variable' | 'step' | 'token-generation' | 'general';
}

export class AlgorithmHistoryService {
  private static readonly MAX_HISTORY_SIZE = 50;
  private static readonly STORAGE_KEY = 'algorithm_history';

  /**
   * Save current algorithm state to history
   */
  static saveToHistory(
    algorithm: Algorithm,
    description: string,
    type: AlgorithmHistoryEntry['type']
  ): void {
    try {
      const history = this.getHistory();
      const entry: AlgorithmHistoryEntry = {
        id: this.generateId(),
        timestamp: Date.now(),
        algorithm: JSON.parse(JSON.stringify(algorithm)), // Deep clone
        description,
        type
      };

      // Add to beginning of array (most recent first)
      history.unshift(entry);

      // Limit history size
      if (history.length > this.MAX_HISTORY_SIZE) {
        history.splice(this.MAX_HISTORY_SIZE);
      }

      this.saveHistory(history);
    } catch (error) {
      console.error('Failed to save algorithm to history:', error);
    }
  }

  /**
   * Get all history entries
   */
  static getHistory(): AlgorithmHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load algorithm history:', error);
      return [];
    }
  }

  /**
   * Get history entries for a specific algorithm
   */
  static getHistoryForAlgorithm(algorithmId: string): AlgorithmHistoryEntry[] {
    return this.getHistory().filter(entry => entry.algorithm.id === algorithmId);
  }

  /**
   * Get the most recent entry for an algorithm
   */
  static getLatestEntry(algorithmId: string): AlgorithmHistoryEntry | null {
    const history = this.getHistoryForAlgorithm(algorithmId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Get the previous entry for an algorithm (for undo)
   */
  static getPreviousEntry(algorithmId: string): AlgorithmHistoryEntry | null {
    const history = this.getHistoryForAlgorithm(algorithmId);
    return history.length > 1 ? history[1] : null;
  }

  /**
   * Check if undo is available for an algorithm
   */
  static canUndo(algorithmId: string): boolean {
    return this.getHistoryForAlgorithm(algorithmId).length > 1;
  }

  /**
   * Check if redo is available for an algorithm
   */
  static canRedo(algorithmId: string): boolean {
    // For now, we'll implement a simple redo using a separate redo stack
    // In a more sophisticated implementation, we'd track the current position in history
    const redoStack = this.getRedoStack(algorithmId);
    return redoStack.length > 0;
  }

  /**
   * Undo the last change for an algorithm
   */
  static undo(algorithmId: string): Algorithm | null {
    try {
      const history = this.getHistoryForAlgorithm(algorithmId);
      if (history.length <= 1) {
        return null; // Nothing to undo
      }

      const currentEntry = history[0];
      const previousEntry = history[1];

      // Move current state to redo stack
      this.addToRedoStack(algorithmId, currentEntry);

      // Remove current entry from history
      const allHistory = this.getHistory();
      const updatedHistory = allHistory.filter(entry => 
        !(entry.algorithm.id === algorithmId && entry.timestamp === currentEntry.timestamp)
      );
      this.saveHistory(updatedHistory);

      return previousEntry.algorithm;
    } catch (error) {
      console.error('Failed to undo algorithm change:', error);
      return null;
    }
  }

  /**
   * Redo the last undone change for an algorithm
   */
  static redo(algorithmId: string): Algorithm | null {
    try {
      const redoStack = this.getRedoStack(algorithmId);
      if (redoStack.length === 0) {
        return null; // Nothing to redo
      }

      const redoEntry = redoStack.pop()!;
      
      // Add back to history
      const history = this.getHistory();
      history.unshift(redoEntry);
      this.saveHistory(history);

      // Update redo stack
      this.saveRedoStack(algorithmId, redoStack);

      return redoEntry.algorithm;
    } catch (error) {
      console.error('Failed to redo algorithm change:', error);
      return null;
    }
  }

  /**
   * Clear history for an algorithm
   */
  static clearHistory(algorithmId: string): void {
    try {
      const history = this.getHistory();
      const updatedHistory = history.filter(entry => entry.algorithm.id !== algorithmId);
      this.saveHistory(updatedHistory);
      this.clearRedoStack(algorithmId);
    } catch (error) {
      console.error('Failed to clear algorithm history:', error);
    }
  }

  /**
   * Clear all history
   */
  static clearAllHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      // Clear all redo stacks
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('algorithm_redo_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all history:', error);
    }
  }

  /**
   * Get the redo stack for an algorithm
   */
  private static getRedoStack(algorithmId: string): AlgorithmHistoryEntry[] {
    try {
      const stored = localStorage.getItem(`algorithm_redo_${algorithmId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load redo stack:', error);
      return [];
    }
  }

  /**
   * Add an entry to the redo stack
   */
  private static addToRedoStack(algorithmId: string, entry: AlgorithmHistoryEntry): void {
    try {
      const redoStack = this.getRedoStack(algorithmId);
      redoStack.push(entry);
      this.saveRedoStack(algorithmId, redoStack);
    } catch (error) {
      console.error('Failed to add to redo stack:', error);
    }
  }

  /**
   * Save the redo stack for an algorithm
   */
  private static saveRedoStack(algorithmId: string, redoStack: AlgorithmHistoryEntry[]): void {
    try {
      localStorage.setItem(`algorithm_redo_${algorithmId}`, JSON.stringify(redoStack));
    } catch (error) {
      console.error('Failed to save redo stack:', error);
    }
  }

  /**
   * Clear the redo stack for an algorithm
   */
  private static clearRedoStack(algorithmId: string): void {
    try {
      localStorage.removeItem(`algorithm_redo_${algorithmId}`);
    } catch (error) {
      console.error('Failed to clear redo stack:', error);
    }
  }

  /**
   * Save history to localStorage
   */
  private static saveHistory(history: AlgorithmHistoryEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save algorithm history:', error);
    }
  }

  /**
   * Generate a unique ID for history entries
   */
  private static generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 