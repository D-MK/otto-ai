/**
 * Zustand store for conversation state
 */

import { create } from 'zustand';
import {
  Message,
  ConversationContext,
  IntentRouter,
  BrowserScriptStorage,
  MCPClient,
  MCPConfig,
} from '@otto-ai/core';
import { GeminiChatService } from '../services/geminiChat';
import { EncryptionService } from '../services/encryption';
import { SyncedScriptStorage } from '../services/syncedScriptStorage';
import type { SettingsData } from '../components/Settings/Settings';

interface ConversationState extends ConversationContext {
  router: IntentRouter | null;
  scriptStorage: BrowserScriptStorage | null;
  geminiChat: GeminiChatService | null;
  ttsEnabled: boolean;
  isProcessing: boolean;
  settings: SettingsData;

  // Actions
  initialize: (dbPath?: string, mcpConfig?: MCPConfig) => void;
  sendMessage: (content: string) => Promise<void>;
  toggleTTS: () => void;
  clearConversation: () => void;
  setActiveScriptContext: (context: ConversationContext['activeScriptContext']) => void;
  loadSettings: () => Promise<SettingsData>;
  saveSettings: (settings: SettingsData) => Promise<void>;
  getMCPConfigs: () => MCPConfig[];
  reinitializeWithSettings: () => void;
}

const SETTINGS_STORAGE_KEY = 'otto_settings';

const loadSettingsFromStorage = async (): Promise<SettingsData> => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const settings: SettingsData = JSON.parse(stored);
      
      // Decrypt geminiApiKey if encrypted, or migrate if plaintext
      if (settings.geminiApiKey) {
        if (EncryptionService.isEncrypted(settings.geminiApiKey)) {
          const decrypted = await EncryptionService.decrypt(settings.geminiApiKey);
          if (decrypted === null) {
            // Check if it's password-encrypted and password is not set
            if (EncryptionService.isPasswordEncrypted(settings.geminiApiKey) && !EncryptionService.hasMasterPassword()) {
              console.warn('Password-encrypted key found but no password set. User needs to enter password.');
              settings.geminiApiKey = ''; // Clear to prompt for re-entry
            } else {
              console.warn('Failed to decrypt geminiApiKey. Device characteristics may have changed or password is incorrect.');
              settings.geminiApiKey = ''; // Clear invalid key
            }
          } else {
            settings.geminiApiKey = decrypted;
          }
        } else {
          // Migrate: encrypt plaintext key
          const encrypted = await EncryptionService.encrypt(settings.geminiApiKey);
          settings.geminiApiKey = encrypted;
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
          // Return decrypted value for use
          settings.geminiApiKey = await EncryptionService.decrypt(encrypted) || '';
        }
      }
      
      // Decrypt supabaseApiKey if encrypted
      if (settings.supabaseApiKey && EncryptionService.isEncrypted(settings.supabaseApiKey)) {
        const decrypted = await EncryptionService.decrypt(settings.supabaseApiKey);
        if (decrypted === null) {
          if (EncryptionService.isPasswordEncrypted(settings.supabaseApiKey) && !EncryptionService.hasMasterPassword()) {
            console.warn('Password-encrypted Supabase key found but no password set.');
            settings.supabaseApiKey = '';
          } else {
            settings.supabaseApiKey = '';
          }
        } else {
          settings.supabaseApiKey = decrypted;
        }
      }
      
      return settings;
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }

  // Default settings
  return {
    geminiApiKey: '',
    supabaseApiKey: '',
    supabaseUrl: '',
    storageMode: 'localStorage',
    mcpServers: [],
  };
};

const saveSettingsToStorage = async (settings: SettingsData): Promise<void> => {
  try {
    // Encrypt geminiApiKey before storage
    const settingsToSave = { ...settings };
    if (settingsToSave.geminiApiKey && !EncryptionService.isEncrypted(settingsToSave.geminiApiKey)) {
      settingsToSave.geminiApiKey = await EncryptionService.encrypt(settingsToSave.geminiApiKey);
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

// Initialize settings synchronously with empty defaults, then load async
const initialSettings: SettingsData = {
  geminiApiKey: '',
  supabaseApiKey: '',
  supabaseUrl: '',
  storageMode: 'localStorage',
  mcpServers: [],
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  messageHistory: [],
  activeScriptContext: undefined,
  router: null,
  scriptStorage: null,
  geminiChat: null,
  ttsEnabled: false,
  isProcessing: false,
  settings: initialSettings,

  initialize: (dbPath = ':memory:', mcpConfig) => {
    const { settings } = get();
    const scriptStorage = new SyncedScriptStorage(dbPath, settings);
    const mcpClient = mcpConfig ? new MCPClient(mcpConfig) : null;
    const router = new IntentRouter(scriptStorage, mcpClient);
    const geminiChat = new GeminiChatService();

    set({
      scriptStorage,
      router,
      geminiChat,
    });
  },

  sendMessage: async (content: string) => {
    const { router, messageHistory, activeScriptContext, ttsEnabled, geminiChat } = get();

    if (!router) {
      console.error('Router not initialized');
      return;
    }

    set({ isProcessing: true });

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set({
      messageHistory: [...messageHistory, userMessage],
    });

    try {
      // Route the message
      let response = await router.route(content, {
        messageHistory: [...messageHistory, userMessage],
        activeScriptContext,
      });

      // Handle Gemini chat execution
      if (response.message === 'GEMINI_CHAT_EXECUTION_REQUIRED' && geminiChat) {
        const question = response.executionResult?.params?.question || content;

        try {
          if (!geminiChat.hasApiKey()) {
            response = {
              message: "Please configure your Gemini API key first. You can use the AI Script Generator to set it up.",
            };
          } else {
            const chatResult = await geminiChat.chat(question);
            let responseText = chatResult.response;

            if (chatResult.isNewConversation) {
              responseText = "[New conversation started]\n\n" + responseText;
            }

            if (chatResult.turnsRemaining === 0) {
              responseText += "\n\n[Conversation limit reached. Next message will start a new conversation.]";
            } else {
              responseText += `\n\n[${chatResult.turnsRemaining} turn(s) remaining in this conversation]`;
            }

            response = {
              message: responseText,
              executionResult: chatResult,
            };
          }
        } catch (error) {
          response = {
            message: `Gemini chat error: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          intent: response.debug?.intent ?? undefined,
          executionResult: response.executionResult,
        },
      };

      const newMessageHistory = [...messageHistory, userMessage, assistantMessage];

      // Update active script context if parameter collection is ongoing
      if (response.requiresUserInput && response.promptForParam) {
        const currentContext = activeScriptContext || {
          scriptId: response.debug?.intent?.scriptId || '',
          collectedParams: {},
          missingParams: [],
        };

        if (response.debug?.intent?.scriptId) {
          currentContext.scriptId = response.debug.intent.scriptId;
        }

        set({
          messageHistory: newMessageHistory,
          activeScriptContext: currentContext,
          isProcessing: false,
        });
      } else {
        // Clear active context after execution
        set({
          messageHistory: newMessageHistory,
          activeScriptContext: undefined,
          isProcessing: false,
        });
      }

      // Text-to-speech
      if (ttsEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.message);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error processing message:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      };

      set({
        messageHistory: [...messageHistory, userMessage, errorMessage],
        isProcessing: false,
      });
    }
  },

  toggleTTS: () => {
    set((state) => ({ ttsEnabled: !state.ttsEnabled }));
  },

  clearConversation: () => {
    set({
      messageHistory: [],
      activeScriptContext: undefined,
    });
  },

  setActiveScriptContext: (context) => {
    set({ activeScriptContext: context });
  },

  loadSettings: async () => {
    const settings = await loadSettingsFromStorage();
    set({ settings });
    return settings;
  },

  saveSettings: async (settings: SettingsData) => {
    await saveSettingsToStorage(settings);
    set({ settings });

    // Update Gemini API key in the geminiChat service
    const { geminiChat, scriptStorage } = get();
    if (geminiChat && settings.geminiApiKey) {
      await geminiChat.setApiKey(settings.geminiApiKey);
    }

    // Update script storage settings for Supabase sync
    if (scriptStorage && scriptStorage instanceof SyncedScriptStorage) {
      scriptStorage.updateSettings(settings);
    }
  },

  getMCPConfigs: () => {
    const { settings } = get();
    return settings.mcpServers.map((server) => ({
      baseUrl: server.baseUrl,
      authType: server.authType,
      authToken: server.authToken,
      timeout: server.timeout || 5000,
    }));
  },

  reinitializeWithSettings: () => {
    const { settings } = get();
    const scriptStorage = new SyncedScriptStorage(':memory:', settings);

    // Create MCP clients for all configured servers
    const mcpClients = settings.mcpServers.map((server) =>
      new MCPClient({
        baseUrl: server.baseUrl,
        authType: server.authType,
        authToken: server.authToken,
        timeout: server.timeout || 5000,
      })
    );

    // For now, use the first MCP client (you may want to support multiple later)
    const mcpClient = mcpClients.length > 0 ? mcpClients[0] : null;
    const router = new IntentRouter(scriptStorage, mcpClient);
    const geminiChat = new GeminiChatService();

    // Set the Gemini API key if available
    if (settings.geminiApiKey) {
      geminiChat.setApiKey(settings.geminiApiKey).catch((err) => {
        console.error('Failed to set Gemini API key:', err);
      });
    }

    set({
      scriptStorage,
      router,
      geminiChat,
    });
  },
}));
