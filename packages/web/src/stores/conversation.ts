/**
 * Zustand store for conversation state
 */

import { create } from 'zustand';
import { logger } from '../utils/logger';
import {
  Message,
  ConversationContext,
  IntentRouter,
  BrowserScriptStorage,
  MCPClient,
  MCPConfig,
  Note,
  LocalNoteStorage,
  NoteStorage,
  CreateNoteParams,
  UpdateNoteParams,
  AIGenerationResult,
  createNoteAIGenerator,
} from '@otto-ai/core';
import { GeminiChatService } from '../services/geminiChat';
import { EncryptionService } from '../services/encryption';
import { SyncedScriptStorage } from '../services/syncedScriptStorage';
import { getAuthService, AuthUser } from '../services/supabaseAuth';
import { SupabaseSettingsService } from '../services/supabaseSettings';
import type { SettingsData } from '../components/Settings/Settings';

interface ConversationState extends ConversationContext {
  router: IntentRouter | null;
  scriptStorage: BrowserScriptStorage | null;
  geminiChat: GeminiChatService | null;
  ttsEnabled: boolean;
  isProcessing: boolean;
  settings: SettingsData;

  // Notes state
  noteStorage: NoteStorage | null;
  notes: Note[];
  scripts: any[]; // From scriptStorage

  // Auth state
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  authChecked: boolean;

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

  // Notes actions
  loadNotes: () => void;
  createNote: (params: CreateNoteParams) => Promise<Note | undefined>;
  updateNote: (id: string, params: UpdateNoteParams) => void;
  deleteNote: (id: string) => void;
  generateNoteTitleAndSummary: (content: string) => Promise<AIGenerationResult>;

  // Auth actions
  checkAuthState: () => Promise<void>;
  handleAuthSuccess: (userId: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUserSettings: (userId: string) => Promise<void>;
  saveUserSettings: (userId: string, settings: SettingsData) => Promise<void>;
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
              logger.warn('Password-encrypted key found but no password set. User needs to enter password.');
              settings.geminiApiKey = ''; // Clear to prompt for re-entry
            } else {
              logger.warn('Failed to decrypt geminiApiKey. Device characteristics may have changed or password is incorrect.');
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
            logger.warn('Password-encrypted Supabase key found but no password set.');
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
    logger.error('Error loading settings from localStorage:', error);
  }

  // Default settings
  return {
    geminiApiKey: '',
    supabaseApiKey: '',
    supabaseUrl: '',
    storageMode: 'localStorage',
    mcpServers: [],
    scriptSortPreference: 'name-asc',
  };
};

const saveSettingsToStorage = async (settings: SettingsData): Promise<void> => {
  try {
    // Encrypt API keys before storage
    const settingsToSave = { ...settings };
    if (settingsToSave.geminiApiKey && !EncryptionService.isEncrypted(settingsToSave.geminiApiKey)) {
      settingsToSave.geminiApiKey = await EncryptionService.encrypt(settingsToSave.geminiApiKey);
    }
    if (settingsToSave.supabaseApiKey && !EncryptionService.isEncrypted(settingsToSave.supabaseApiKey)) {
      settingsToSave.supabaseApiKey = await EncryptionService.encrypt(settingsToSave.supabaseApiKey);
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    logger.error('Error saving settings to localStorage:', error);
  }
};

// Initialize settings synchronously with empty defaults, then load async
const initialSettings: SettingsData = {
  geminiApiKey: '',
  supabaseApiKey: '',
  supabaseUrl: '',
  storageMode: 'localStorage',
  mcpServers: [],
  scriptSortPreference: 'name-asc',
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
  noteStorage: null,
  notes: [],
  scripts: [],
  currentUser: null,
  isAuthenticated: false,
  authChecked: false,

  initialize: (dbPath = ':memory:', mcpConfig) => {
    const { settings } = get();
    const scriptStorage = new SyncedScriptStorage(dbPath, settings);
    const mcpClient = mcpConfig ? new MCPClient(mcpConfig) : null;
    const router = new IntentRouter(scriptStorage, mcpClient);
    const geminiChat = new GeminiChatService();
    const noteStorage = new LocalNoteStorage();

    // Load scripts and notes
    const scripts = scriptStorage.getAll();
    const notes = noteStorage.getAll();

    set({
      scriptStorage,
      router,
      geminiChat,
      noteStorage,
      scripts,
      notes,
    });
  },

  sendMessage: async (content: string) => {
    const { router, messageHistory, activeScriptContext, ttsEnabled, geminiChat } = get();

    if (!router) {
      logger.error('Router not initialized');
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
      logger.error('Error processing message:', error);

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
    const { geminiChat, scriptStorage, isAuthenticated, currentUser } = get();
    if (geminiChat && settings.geminiApiKey) {
      await geminiChat.setApiKey(settings.geminiApiKey);
    }

    // Update script storage settings for Supabase sync
    if (scriptStorage && scriptStorage instanceof SyncedScriptStorage) {
      scriptStorage.updateSettings(settings);
    }

    // If user is authenticated, also save to Supabase
    if (isAuthenticated && currentUser) {
      try {
        await get().saveUserSettings(currentUser.id, settings);
      } catch (error) {
        logger.error('Failed to sync settings to Supabase:', error);
        // Don't throw - local settings are still saved
      }
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
    const noteStorage = new LocalNoteStorage();

    // Set the Gemini API key if available
    if (settings.geminiApiKey) {
      geminiChat.setApiKey(settings.geminiApiKey).catch((err) => {
        logger.error('Failed to set Gemini API key:', err);
      });
    }

    // Load scripts and notes
    const scripts = scriptStorage.getAll();
    const notes = noteStorage.getAll();

    set({
      scriptStorage,
      router,
      geminiChat,
      noteStorage,
      scripts,
      notes,
    });
  },

  // Notes actions
  loadNotes: () => {
    const { noteStorage, scriptStorage } = get();
    if (noteStorage) {
      const notes = noteStorage.getAll();
      const scripts = scriptStorage ? scriptStorage.getAll() : [];
      set({ notes, scripts });
    }
  },

  createNote: async (params: CreateNoteParams): Promise<Note | undefined> => {
    const { noteStorage, geminiChat, settings } = get();
    if (!noteStorage) return undefined;

    // If title or summary not provided, auto-generate them
    let finalParams = { ...params };

    let summaryToSet: string | undefined;
    
    if (!params.title) {
      // Generate title and summary using AI if geminiChat is available
      if (geminiChat && settings.geminiApiKey) {
        try {
          const aiGenerator = createNoteAIGenerator(
            settings.geminiApiKey,
            geminiChat.getModel()
          );
          const result = await aiGenerator.generateTitleAndSummary(params.content);
          finalParams.title = result.title;
          summaryToSet = result.summary;
        } catch (error) {
          logger.error('Failed to generate title with AI:', error);
          // Fallback to first line
          finalParams.title = params.content.split('\n')[0].substring(0, 60) || 'Untitled Note';
        }
      } else {
        // Fallback to first line
        finalParams.title = params.content.split('\n')[0].substring(0, 60) || 'Untitled Note';
      }
    }

    // Remove summary from finalParams as CreateNoteParams doesn't include it
    const { summary: _, ...createParams } = finalParams as any;
    const note = noteStorage.create(createParams);
    
    // Update note with summary if generated
    if (summaryToSet) {
      noteStorage.update(note.id, { summary: summaryToSet });
      const updatedNote = noteStorage.get(note.id);
      get().loadNotes();
      return updatedNote;
    }
    
    get().loadNotes();
    return note;
  },

  updateNote: (id: string, params: UpdateNoteParams) => {
    const { noteStorage } = get();
    if (!noteStorage) return;

    noteStorage.update(id, params);
    get().loadNotes();
  },

  deleteNote: (id: string) => {
    const { noteStorage } = get();
    if (!noteStorage) return;

    noteStorage.delete(id);
    get().loadNotes();
  },

  generateNoteTitleAndSummary: async (content: string): Promise<AIGenerationResult> => {
    const { geminiChat, settings } = get();

    if (!geminiChat || !settings.geminiApiKey) {
      // Fallback: generate simple title and summary
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine.substring(0, 60) || 'Untitled Note';
      const firstSentence = content.split(/[.!?]\s/)[0].trim();
      const summary = firstSentence.substring(0, 150);
      return { title, summary };
    }

    try {
      const aiGenerator = createNoteAIGenerator(
        settings.geminiApiKey,
        geminiChat.getModel()
      );
      return await aiGenerator.generateTitleAndSummary(content);
    } catch (error) {
      logger.error('Failed to generate title and summary:', error);
      // Fallback
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine.substring(0, 60) || 'Untitled Note';
      const firstSentence = content.split(/[.!?]\s/)[0].trim();
      const summary = firstSentence.substring(0, 150);
      return { title, summary };
    }
  },

  checkAuthState: async () => {
    const authService = getAuthService();
    const { settings } = get();

    // Only check auth if Supabase is configured
    if (!settings.supabaseUrl || !settings.supabaseApiKey) {
      set({ authChecked: true, isAuthenticated: false, currentUser: null });
      return;
    }

    // Configure auth service
    if (!authService.isConfigured()) {
      authService.configure(settings.supabaseUrl, settings.supabaseApiKey);
    }

    try {
      const session = await authService.getSession();
      if (session) {
        set({
          currentUser: session.user,
          isAuthenticated: true,
          authChecked: true,
        });

        // Load user settings from Supabase
        await get().loadUserSettings(session.user.id);

        // Load scripts from Supabase if local storage is empty
        const { scriptStorage, router } = get();
        if (scriptStorage instanceof SyncedScriptStorage) {
          try {
            const shouldLoad = await scriptStorage.shouldLoadFromSupabase();
            if (shouldLoad) {
              logger.log('Loading scripts from Supabase...');
              const result = await scriptStorage.loadFromSupabase();
              logger.log(`Loaded ${result.loaded} scripts from Supabase`);

              // Refresh the router with the loaded scripts
              if (router) {
                router.refreshScripts();
              }

              // Reload scripts in the store
              const scripts = scriptStorage.getAll();
              set({ scripts });
            }
          } catch (error) {
            logger.error('Failed to load scripts from Supabase:', error);
          }
        }
      } else {
        set({
          currentUser: null,
          isAuthenticated: false,
          authChecked: true,
        });
      }
    } catch (error) {
      logger.error('Failed to check auth state:', error);
      set({
        currentUser: null,
        isAuthenticated: false,
        authChecked: true,
      });
    }
  },

  handleAuthSuccess: async (userId: string, email: string) => {
    set({
      currentUser: { id: userId, email, createdAt: new Date().toISOString() },
      isAuthenticated: true,
    });

    // Load user settings from Supabase
    await get().loadUserSettings(userId);

    // Reinitialize with loaded settings
    get().reinitializeWithSettings();

    // Load scripts from Supabase if local storage is empty
    const { scriptStorage } = get();
    if (scriptStorage instanceof SyncedScriptStorage) {
      try {
        const shouldLoad = await scriptStorage.shouldLoadFromSupabase();
        if (shouldLoad) {
          logger.log('Loading scripts from Supabase...');
          const result = await scriptStorage.loadFromSupabase();
          logger.log(`Loaded ${result.loaded} scripts from Supabase`);

          // Refresh the router with the loaded scripts
          const router = get().router;
          if (router) {
            router.refreshScripts();
          }

          // Reload scripts in the store
          const scripts = scriptStorage.getAll();
          set({ scripts });
        }
      } catch (error) {
        logger.error('Failed to load scripts from Supabase:', error);
      }
    }
  },

  logout: async () => {
    const authService = getAuthService();

    try {
      await authService.signOut();
      set({
        currentUser: null,
        isAuthenticated: false,
      });

      // Clear conversation
      get().clearConversation();
    } catch (error) {
      logger.error('Failed to logout:', error);
    }
  },

  loadUserSettings: async (userId: string) => {
    const { settings } = get();

    if (!settings.supabaseUrl || !settings.supabaseApiKey) {
      logger.warn('Supabase not configured, cannot load user settings');
      return;
    }

    try {
      const settingsService = new SupabaseSettingsService(
        settings.supabaseUrl,
        settings.supabaseApiKey
      );

      const userSettings = await settingsService.getUserSettings(userId);

      if (userSettings) {
        // Merge user settings with local settings
        const mergedSettings = {
          ...settings,
          ...userSettings,
        };

        // Update store and save to localStorage
        await get().saveSettings(mergedSettings);
      } else {
        logger.log('No user settings found in Supabase, using local settings');
      }
    } catch (error) {
      logger.error('Failed to load user settings:', error);
    }
  },

  saveUserSettings: async (userId: string, settings: SettingsData) => {
    const currentSettings = get().settings;

    if (!currentSettings.supabaseUrl || !currentSettings.supabaseApiKey) {
      logger.warn('Supabase not configured, cannot save user settings');
      return;
    }

    try {
      const settingsService = new SupabaseSettingsService(
        currentSettings.supabaseUrl,
        currentSettings.supabaseApiKey
      );

      await settingsService.saveUserSettings(userId, settings);
    } catch (error) {
      logger.error('Failed to save user settings to Supabase:', error);
      throw error;
    }
  },
}));
