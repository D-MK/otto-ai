/**
 * Main App component
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Chat, { ChatHandle } from './components/Chat/Chat';
import Sidebar, { SidebarHandle } from './components/Sidebar/Sidebar';
import { useConversationStore } from './stores/conversation';
import { SupabaseStorageService } from './services/supabaseStorage';
import { SyncService, SyncResult, ConflictResolution } from './services/syncService';
import { CSVExportService } from './services/csvExport';
import { ThemeService } from './services/themeService';
import './App.css';

// Lazy load conditional components to improve initial load time
const ScriptEditor = React.lazy(() => import('./components/ScriptEditor/ScriptEditor'));
const DebugPanel = React.lazy(() => import('./components/DebugPanel/DebugPanel'));
const AIScriptGenerator = React.lazy(() => import('./components/AIScriptGenerator/AIScriptGenerator'));
const Settings = React.lazy(() => import('./components/Settings/Settings').then(m => ({ default: m.Settings })));
const ConflictResolver = React.lazy(() => import('./components/ConflictResolver/ConflictResolver').then(m => ({ default: m.ConflictResolver })));
const Auth = React.lazy(() => import('./components/Auth/Auth'));
const Notes = React.lazy(() => import('./components/Notes/Notes'));
import TabContainer, { TabType } from './components/TabContainer/TabContainer';

// Load seed scripts
import seedScripts from '../../../seed-data/scripts.json';

const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || true;

const App: React.FC = () => {
  const {
    initialize,
    scriptStorage,
    router,
    settings,
    saveSettings,
    reinitializeWithSettings,
    checkAuthState,
    handleAuthSuccess,
    isAuthenticated,
    authChecked,
    currentUser,
  } = useConversationStore();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showDebug, setShowDebug] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const chatRef = useRef<ChatHandle>(null);
  const sidebarRef = useRef<SidebarHandle>(null);

  // Initialize theme on app load
  useEffect(() => {
    ThemeService.initializeTheme();
  }, []);

  // Load settings asynchronously without blocking initialization
  useEffect(() => {
    const { loadSettings, checkAuthState } = useConversationStore.getState();
    loadSettings()
      .then(async (loadedSettings) => {
        // Settings loaded, but don't block app initialization
        // The app will reinitialize when settings are available
        if (loadedSettings.mcpServers && loadedSettings.mcpServers.length > 0) {
          // Reinitialize with loaded settings
          const { reinitializeWithSettings } = useConversationStore.getState();
          reinitializeWithSettings();
        }

        // Apply theme from settings if available
        if ((loadedSettings as any).theme) {
          ThemeService.applyTheme((loadedSettings as any).theme);
        }

        // Check auth state after settings are loaded
        await checkAuthState();
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
      });
  }, []);

  // Initialize the app (non-blocking - doesn't wait for settings)
  useEffect(() => {
    // Priority: runtime settings > environment variables
    const hasRuntimeMcpServers = settings.mcpServers && settings.mcpServers.length > 0;

    if (hasRuntimeMcpServers) {
      // Use the reinitializeWithSettings method to load runtime config
      reinitializeWithSettings();
    } else {
      // Fall back to environment variables if no runtime config
      const mcpConfig = import.meta.env.VITE_MCP_BASE_URL
        ? {
            baseUrl: import.meta.env.VITE_MCP_BASE_URL,
            authType: import.meta.env.VITE_MCP_AUTH_TYPE || 'none',
            authToken: import.meta.env.VITE_MCP_AUTH_TOKEN,
            timeout: 10000,
          }
        : undefined;

      initialize(':memory:', mcpConfig as any);
    }
  }, [initialize, reinitializeWithSettings, settings.mcpServers]);

  // Load seed scripts after storage and router are ready
  useEffect(() => {
    if (!scriptStorage || !router) return;

    const existing = scriptStorage.getAll();
    if (existing.length === 0) {
      // Import seed scripts
      scriptStorage.importFromJSON(JSON.stringify(seedScripts));
      // Refresh router to pick up new scripts
      router.refreshScripts();
    }

    setIsInitialized(true);
  }, [scriptStorage, router]);

  // Show auth modal when user is not authenticated and Supabase is configured
  useEffect(() => {
    if (authChecked && !isAuthenticated && settings.supabaseUrl && settings.supabaseApiKey) {
      setShowAuth(true);
    }
  }, [authChecked, isAuthenticated, settings.supabaseUrl, settings.supabaseApiKey]);

  const handleKeywordClick = (keyword: string) => {
    if (chatRef.current) {
      chatRef.current.setInput(keyword);
      chatRef.current.focusInput();
    }
  };

  const handleGenerateClick = () => {
    setShowAIGenerator(true);
  };

  const handleAIGeneratorClose = () => {
    setShowAIGenerator(false);
    // Refresh the router to pick up any new scripts
    if (router) {
      router.refreshScripts();
    }
  };

  const handleSettingsSave = async (newSettings: typeof settings) => {
    await saveSettings(newSettings);
    // Reinitialize the store with the new settings
    reinitializeWithSettings();
    // Reload seed scripts if needed
    if (scriptStorage) {
      const existing = scriptStorage.getAll();
      if (existing.length === 0) {
        scriptStorage.importFromJSON(JSON.stringify(seedScripts));
        if (router) {
          router.refreshScripts();
        }
      }
    }
  };

  const handleSync = async () => {
    if (!scriptStorage || !settings.supabaseUrl || !settings.supabaseApiKey) {
      console.error('Script storage or Supabase not configured');
      return;
    }

    try {
      // Create Supabase storage and sync service
      const supabaseStorage = new SupabaseStorageService(settings.supabaseUrl, settings.supabaseApiKey);
      const syncService = new SyncService(scriptStorage, supabaseStorage);

      // Ensure table exists
      await supabaseStorage.ensureTableExists();

      // Compare and get results
      const result = await syncService.compare();
      setSyncResult(result);
      setShowConflictResolver(true);
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleConflictResolve = async (resolutions: Map<string, ConflictResolution>) => {
    if (!syncResult || !scriptStorage || !settings.supabaseUrl || !settings.supabaseApiKey) {
      return;
    }

    try {
      const supabaseStorage = new SupabaseStorageService(settings.supabaseUrl, settings.supabaseApiKey);
      const syncService = new SyncService(scriptStorage, supabaseStorage);

      // Resolve conflicts and sync
      await syncService.resolveAndSync(syncResult, resolutions);

      // Close the conflict resolver
      setShowConflictResolver(false);
      setSyncResult(null);

      // Refresh the router to pick up synced scripts
      if (router) {
        router.refreshScripts();
      }

      // Refresh the sidebar to show updated scripts
      if (sidebarRef.current) {
        sidebarRef.current.refresh();
      }

      alert('Sync completed successfully!');
    } catch (error) {
      console.error('Conflict resolution error:', error);
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (!scriptStorage) {
      console.error('Script storage not initialized');
      return;
    }

    try {
      const scripts = scriptStorage.getAll();
      const filename = CSVExportService.generateFilename();
      CSVExportService.downloadCSV(scripts, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAuthSuccessWrapper = async (userId: string, email: string) => {
    await handleAuthSuccess(userId, email);
    setShowAuth(false);
  };

  const handleAuthSkip = () => {
    setShowAuth(false);
  };

  // Determine if we should show auth modal
  const shouldShowAuth = authChecked &&
                        !isAuthenticated &&
                        settings.supabaseUrl &&
                        settings.supabaseApiKey &&
                        showAuth;

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div>Initializing Otto AI...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-content">
        <Sidebar
          ref={sidebarRef}
          onKeywordClick={handleKeywordClick}
          onGenerateClick={handleGenerateClick}
        />
        <TabContainer activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'chat' && (
            <Chat
              ref={chatRef}
              onScriptsClick={() => setActiveTab('scripts')}
              onNotesClick={() => setActiveTab('notes')}
              onDebugClick={DEBUG_MODE ? () => setShowDebug(!showDebug) : undefined}
              onSettingsClick={() => setShowSettings(true)}
              showDebug={showDebug}
            />
          )}
          {activeTab === 'scripts' && (
            <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading scripts...</div></div>}>
              <ScriptEditor
                onClose={() => setActiveTab('chat')}
                onScriptSaved={() => sidebarRef.current?.refresh()}
              />
            </Suspense>
          )}
          {activeTab === 'notes' && (
            <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading notes...</div></div>}>
              <Notes onClose={() => setActiveTab('chat')} />
            </Suspense>
          )}
        </TabContainer>
      </div>

      {showAIGenerator && (
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading AI generator...</div></div>}>
          <AIScriptGenerator onClose={handleAIGeneratorClose} />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading settings...</div></div>}>
          <Settings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSave={handleSettingsSave}
            onSync={handleSync}
            onExportCSV={handleExportCSV}
          />
        </Suspense>
      )}
      {showConflictResolver && (
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading conflict resolver...</div></div>}>
          <ConflictResolver
            isOpen={showConflictResolver}
            syncResult={syncResult}
            onResolve={handleConflictResolve}
            onCancel={() => {
              setShowConflictResolver(false);
              setSyncResult(null);
            }}
          />
        </Suspense>
      )}
      {shouldShowAuth && (
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div><div>Loading authentication...</div></div>}>
          <Auth
            onAuthSuccess={handleAuthSuccessWrapper}
            onSkip={handleAuthSkip}
          />
        </Suspense>
      )}
      {DEBUG_MODE && (
        <Suspense fallback={null}>
          <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(!showDebug)} />
        </Suspense>
      )}
    </div>
  );
};

export default App;
