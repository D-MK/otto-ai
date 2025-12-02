/**
 * Gemini Chat Service
 * Handles conversational interactions with Gemini API
 * Supports up to 3 back-and-forth exchanges before resetting
 */

import { GoogleGenAI } from '@google/genai';
import { EncryptionService } from './encryption';
import { logger } from '../utils/logger';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatHistory {
  messages: ChatMessage[];
  turnCount: number;
  lastUpdated: number;
}

const MAX_TURNS = 3;
const STORAGE_KEY = 'gemini_chat_history';
const API_KEY_STORAGE = 'gemini_api_key';
const AI_CONFIG_STORAGE = 'ai_config'; // Shared with AIScriptGenerator

export class GeminiChatService {
  private apiKey: string | null = null;

  constructor() {
    // Load API key asynchronously
    this.loadApiKey().then((key) => {
      this.apiKey = key;
    });
  }

  /**
   * Send a message and get a response
   */
  async chat(userMessage: string): Promise<{ response: string; turnsRemaining: number; isNewConversation: boolean }> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please set your API key first.');
    }

    // Load conversation history
    let history = this.loadHistory();
    let isNewConversation = false;

    // Reset if max turns reached
    if (history.turnCount >= MAX_TURNS) {
      history = this.resetHistory();
      isNewConversation = true;
    }

    // Add user message to history
    history.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      // Initialize Gemini client
      const ai = new GoogleGenAI({
        apiKey: this.apiKey,
      });

      // Build conversation context
      const conversationContext = this.buildConversationPrompt(history.messages);

      // Get response from Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conversationContext,
      });

      const assistantMessage = response.text;

      if (!assistantMessage) {
        throw new Error('Empty response from Gemini');
      }

      // Add assistant response to history
      history.messages.push({
        role: 'model',
        content: assistantMessage,
      });

      // Increment turn count
      history.turnCount += 1;
      history.lastUpdated = Date.now();

      // Save updated history
      this.saveHistory(history);

      return {
        response: assistantMessage,
        turnsRemaining: MAX_TURNS - history.turnCount,
        isNewConversation,
      };
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build conversation prompt from message history
   */
  private buildConversationPrompt(messages: ChatMessage[]): string {
    return messages
      .map((msg) => {
        const prefix = msg.role === 'user' ? 'User: ' : 'Assistant: ';
        return prefix + msg.content;
      })
      .join('\n\n');
  }

  /**
   * Load conversation history from localStorage
   */
  private loadHistory(): ChatHistory {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return this.resetHistory();
    }

    try {
      return JSON.parse(stored);
    } catch {
      return this.resetHistory();
    }
  }

  /**
   * Save conversation history to localStorage
   */
  private saveHistory(history: ChatHistory): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  /**
   * Reset conversation history
   */
  private resetHistory(): ChatHistory {
    const newHistory: ChatHistory = {
      messages: [],
      turnCount: 0,
      lastUpdated: Date.now(),
    };
    this.saveHistory(newHistory);
    return newHistory;
  }

  /**
   * Manually reset conversation
   */
  resetConversation(): void {
    this.resetHistory();
  }

  /**
   * Get current turn count
   */
  getTurnCount(): number {
    return this.loadHistory().turnCount;
  }

  /**
   * Set API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    // Encrypt before storage
    const encrypted = await EncryptionService.encrypt(apiKey);
    localStorage.setItem(API_KEY_STORAGE, encrypted);
  }

  /**
   * Load API key from storage
   * First checks AI config (shared with AIScriptGenerator), then dedicated storage
   */
  private async loadApiKey(): Promise<string | null> {
    // First try to load from shared AI config
    const aiConfigStr = localStorage.getItem(AI_CONFIG_STORAGE);
    if (aiConfigStr) {
      try {
        const aiConfig = JSON.parse(aiConfigStr);
        if (aiConfig.provider === 'gemini' && aiConfig.apiKey) {
          const key = aiConfig.apiKey;
          if (EncryptionService.isEncrypted(key)) {
            const decrypted = await EncryptionService.decrypt(key);
            if (decrypted === null) {
              // Check if it's password-encrypted and password is not set
              if (EncryptionService.isPasswordEncrypted(key) && !EncryptionService.hasMasterPassword()) {
                logger.warn('Password-encrypted key found but no password set. User needs to enter password.');
              } else {
                logger.warn('Failed to decrypt API key from AI config');
              }
              return null;
            }
            return decrypted;
          } else {
            // Migrate: encrypt plaintext key
            const encrypted = await EncryptionService.encrypt(key);
            aiConfig.apiKey = encrypted;
            localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(aiConfig));
            // Return decrypted value for use
            const decrypted = await EncryptionService.decrypt(encrypted);
            return decrypted;
          }
        }
      } catch {
        // Invalid config, continue to dedicated storage
      }
    }

    // Fall back to dedicated storage
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (!storedKey) {
      return null;
    }

    if (EncryptionService.isEncrypted(storedKey)) {
      const decrypted = await EncryptionService.decrypt(storedKey);
      if (decrypted === null) {
        if (EncryptionService.isPasswordEncrypted(storedKey) && !EncryptionService.hasMasterPassword()) {
          logger.warn('Password-encrypted key found but no password set.');
        } else {
          logger.warn('Failed to decrypt API key from dedicated storage');
        }
        return null;
      }
      return decrypted;
    } else {
      // Migrate: encrypt plaintext key
      const encrypted = await EncryptionService.encrypt(storedKey);
      localStorage.setItem(API_KEY_STORAGE, encrypted);
      // Return decrypted value for use
      const decrypted = await EncryptionService.decrypt(encrypted);
      return decrypted;
    }
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the Gemini model for use in other services
   */
  getModel(): any {
    if (!this.apiKey) {
      return null;
    }

    const ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });

    // Return a model object that can generate content
    return {
      generateContent: async (prompt: string) => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
      },
    };
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.apiKey = null;
    localStorage.removeItem(API_KEY_STORAGE);
    // Also clear from AI config if it's the only key
    const aiConfigStr = localStorage.getItem(AI_CONFIG_STORAGE);
    if (aiConfigStr) {
      try {
        const aiConfig = JSON.parse(aiConfigStr);
        if (aiConfig.provider === 'gemini') {
          aiConfig.apiKey = '';
          localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(aiConfig));
        }
      } catch {
        // Ignore errors
      }
    }
  }
}
