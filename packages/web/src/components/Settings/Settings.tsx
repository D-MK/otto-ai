import React, { useState, useEffect, useRef } from 'react';
import { EncryptionService } from '../../services/encryption';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import { ThemeService, ThemePreset, ThemeColors } from '../../services/themeService';
import { logger } from '../../utils/logger';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import './Settings.css';

export interface MCPServerConfig {
  name: string;
  baseUrl: string;
  authType: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  timeout?: number;
}

export type StorageMode = 'localStorage' | 'supabase';
export type ScriptSortPreference = 'name-asc' | 'name-desc' | 'type-asc' | 'type-desc';

export interface SettingsData {
  geminiApiKey: string;
  supabaseApiKey: string;
  supabaseUrl: string;
  mcpServers: MCPServerConfig[];
  storageMode: StorageMode;
  scriptSortPreference?: ScriptSortPreference;
  theme?: ThemePreset;
}

export type SettingsSection = 'api-keys' | 'mcp-servers' | 'sync' | 'ai-prompt' | 'appearance';

interface SettingsProps {
  settings: SettingsData;
  onSave: (settings: SettingsData) => Promise<void>;
  onSync?: () => void;
  onExportCSV?: () => void;
  activeSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  isAuthenticated?: boolean;
  currentUserEmail?: string;
  onAuthRequest?: () => void;
  onLogout?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onSave,
  onSync,
  onExportCSV,
  activeSection: externalActiveSection,
  isAuthenticated = false,
  currentUserEmail = '',
  onAuthRequest,
  onLogout,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [supabaseApiKey, setSupabaseApiKey] = useState(settings.supabaseApiKey);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl);
  const [storageMode, setStorageMode] = useState<StorageMode>(settings.storageMode || 'localStorage');
  const [mcpServersJson, setMcpServersJson] = useState(
    JSON.stringify(settings.mcpServers, null, 2)
  );
  const [jsonError, setJsonError] = useState<string>('');
  const [internalActiveSection] = useState<SettingsSection>('api-keys');

  // Use external state if provided, otherwise use internal state
  const activeSection = externalActiveSection ?? internalActiveSection;
  const [theme, setTheme] = useState<ThemePreset | 'custom'>((settings as any).theme || 'light');
  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [customTheme, setCustomTheme] = useState<ThemeColors>(() => {
    // Initialize with light theme colors as default
    return {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      bgTertiary: '#e8e8e8',
      textPrimary: '#1a1a1a',
      textSecondary: '#666666',
      borderColor: '#d0d0d0',
      accentColor: '#2563eb',
      accentHover: '#1d4ed8',
      successColor: '#10b981',
      errorColor: '#ef4444',
      tabHeaderBg: '#f5f5f5',
      tabHeaderBorder: '#e0e0e0',
      tabInactiveColor: '#666666',
      tabHoverBg: 'rgba(0, 0, 0, 0.05)',
      tabHoverColor: '#333333',
      tabActiveColor: '#2563eb',
      tabActiveBg: '#ffffff',
      tabActiveBorder: '#2563eb',
      tabContentBg: '#ffffff',
      sidebarTabActiveBg: '#2563eb',
      sidebarTabBg: '#ffffff',
      chatHeaderBg: '#2563eb',
      createScriptButtonColor: '#4CAF50',
    };
  });
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptError, setAiPromptError] = useState<string>('');
  const [aiPromptSuccess, setAiPromptSuccess] = useState(false);
  const [isEditingAiPrompt, setIsEditingAiPrompt] = useState(false);
  const aiPromptRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setSupabaseApiKey(settings.supabaseApiKey);
    setSupabaseUrl(settings.supabaseUrl);
    setStorageMode(settings.storageMode || 'localStorage');
    setMcpServersJson(JSON.stringify(settings.mcpServers, null, 2));
    setJsonError('');
    setHasPassword(EncryptionService.hasMasterPassword());
    const savedTheme = (settings as any).theme || 'light';
    setTheme(savedTheme);
    setUseCustomTheme(savedTheme === 'custom');
    if (savedTheme === 'custom') {
      const customColors = ThemeService.getCurrentThemeColors();
      setCustomTheme(customColors);
    }

    // Load AI prompt from Supabase when switching to AI prompt tab
    if (activeSection === 'ai-prompt' && supabaseUrl && supabaseApiKey && !aiPrompt) {
      loadAIPrompt();
    }
  }, [settings, activeSection]);

  // Apply syntax highlighting to AI prompt when not editing
  useEffect(() => {
    if (aiPromptRef.current && !isEditingAiPrompt && aiPrompt) {
      Prism.highlightElement(aiPromptRef.current);
    }
  }, [aiPrompt, isEditingAiPrompt]);

  const loadAIPrompt = async () => {
    if (!supabaseUrl || !supabaseApiKey) {
      setAiPromptError('Please configure Supabase URL and API key first');
      return;
    }

    setAiPromptLoading(true);
    setAiPromptError('');
    setAiPromptSuccess(false);

    try {
      const supabaseStorage = new SupabaseStorageService(supabaseUrl, supabaseApiKey);
      const config = await supabaseStorage.getAIConfig('default');
      
      if (config) {
        setAiPrompt(config.systemPrompt);
      } else {
        // Load default prompt from AIScriptGenerator
        const defaultPrompt = `You are an expert at creating automation scripts. Generate a script based on the user's description.

The script should be returned as a JSON object with the following structure:
{
  "name": "Script Name",
  "description": "Brief description of what the script does",
  "tags": ["tag1", "tag2"],
  "triggerPhrases": ["phrase1", "phrase2", "phrase3"],
  "parameters": [
    {
      "name": "paramName",
      "type": "string|number|boolean|date",
      "required": true,
      "prompt": "What should I ask the user?"
    }
  ],
  "executionType": "local",
  "code": "JavaScript code that uses the parameters and returns a string result"
}

Important guidelines:
1. The code should be clean, sandboxed JavaScript that only uses Math, Date, and JSON globals
2. Parameters are available as variables in the code
3. The code MUST return a string (use return statement)
4. Create 3-4 relevant trigger phrases based on keywords from the user's description
5. Analyze the user's description for key concepts and add 2-4 relevant tags (e.g., "math", "finance", "time", "conversion", "calculation")
6. Look for keywords the user mentions and ensure trigger phrases include variations of those keywords
7. Keep parameter names simple and lowercase
8. The code should handle edge cases gracefully
9. Tags should be lowercase and relevant to the script's domain/purpose

Example code format:
const result = someCalculation;
return \`The result is \${result}\`;

Return ONLY the JSON object, no additional text or explanation.`;
        setAiPrompt(defaultPrompt);
      }
    } catch (error) {
      setAiPromptError(error instanceof Error ? error.message : 'Failed to load AI prompt');
    } finally {
      setAiPromptLoading(false);
    }
  };

  const handleSaveAIPrompt = async () => {
    if (!supabaseUrl || !supabaseApiKey) {
      setAiPromptError('Please configure Supabase URL and API key first');
      return;
    }

    if (!aiPrompt.trim()) {
      setAiPromptError('Prompt cannot be empty');
      return;
    }

    setAiPromptLoading(true);
    setAiPromptError('');
    setAiPromptSuccess(false);

    try {
      const supabaseStorage = new SupabaseStorageService(supabaseUrl, supabaseApiKey);
      
      // Try to update existing config, or create new one
      const existingConfig = await supabaseStorage.getAIConfig('default');
      
      if (existingConfig) {
        await supabaseStorage.updateAIConfig({
          id: 'default',
          systemPrompt: aiPrompt.trim(),
        });
      } else {
        await supabaseStorage.upsertAIConfig({
          id: 'default',
          systemPrompt: aiPrompt.trim(),
          geminiModel: 'gemini-2.5-flash',
          claudeModel: 'claude-3-5-sonnet-20241022',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setAiPromptSuccess(true);
      setTimeout(() => setAiPromptSuccess(false), 3000);
    } catch (error) {
      setAiPromptError(error instanceof Error ? error.message : 'Failed to save AI prompt');
    } finally {
      setAiPromptLoading(false);
    }
  };

  const validateMcpServersJson = (jsonStr: string): MCPServerConfig[] | null => {
    try {
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        setJsonError('MCP servers must be an array');
        return null;
      }

      for (const server of parsed) {
        if (!server.name || typeof server.name !== 'string') {
          setJsonError('Each server must have a "name" string property');
          return null;
        }
        if (!server.baseUrl || typeof server.baseUrl !== 'string') {
          setJsonError('Each server must have a "baseUrl" string property');
          return null;
        }
        if (!server.authType || !['none', 'bearer', 'api-key'].includes(server.authType)) {
          setJsonError('Each server must have an "authType" of "none", "bearer", or "api-key"');
          return null;
        }
        if (server.authType !== 'none' && !server.authToken) {
          setJsonError(`Server "${server.name}" requires an "authToken" for auth type "${server.authType}"`);
          return null;
        }
      }

      setJsonError('');
      return parsed;
    } catch (e) {
      setJsonError(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      return null;
    }
  };

  const handleSetPassword = async () => {
    setPasswordError('');

    if (!masterPassword) {
      setPasswordError('Password cannot be empty');
      return;
    }

    if (masterPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      // Set the password
      EncryptionService.setMasterPassword(masterPassword);
      setHasPassword(true);
      setMasterPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      // Re-encrypt existing API keys with the new password
      await reencryptApiKeys();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to set password');
    }
  };

  const handleClearPassword = () => {
    if (confirm('Are you sure you want to clear the master password? You will need to re-enter your API keys if device characteristics change.')) {
      EncryptionService.clearMasterPassword();
      setHasPassword(false);
      setMasterPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  };

  const reencryptApiKeys = async () => {
    try {
      // Re-encrypt Gemini API key if it exists
      if (geminiApiKey && EncryptionService.isEncrypted(geminiApiKey)) {
        const reencrypted = await EncryptionService.reencrypt(geminiApiKey);
        if (reencrypted) {
          setGeminiApiKey(reencrypted);
        }
      }

      // Re-encrypt Supabase API key if it exists
      if (supabaseApiKey && EncryptionService.isEncrypted(supabaseApiKey)) {
        const reencrypted = await EncryptionService.reencrypt(supabaseApiKey);
        if (reencrypted) {
          setSupabaseApiKey(reencrypted);
        }
      }
    } catch (error) {
      logger.error('Failed to re-encrypt API keys:', error);
    }
  };

  const handleSave = async () => {
    let mcpServers: MCPServerConfig[] = [];

    if (activeSection === 'mcp-servers') {
      const validated = validateMcpServersJson(mcpServersJson);
      if (!validated) {
        return;
      }
      mcpServers = validated;
    } else {
      // If not on MCP tab, use the existing settings
      mcpServers = settings.mcpServers;
    }

    await onSave({
      geminiApiKey,
      supabaseApiKey,
      supabaseUrl,
      storageMode,
      mcpServers,
      theme: useCustomTheme ? 'custom' : theme,
    } as SettingsData);

    // Apply theme immediately
    if (useCustomTheme) {
      ThemeService.saveTheme(customTheme);
    } else {
      ThemeService.saveTheme(theme as ThemePreset);
    }
  };

  const handleMcpJsonChange = (value: string) => {
    setMcpServersJson(value);
    // Clear error when user starts typing
    if (jsonError) {
      setJsonError('');
    }
  };

  const formatJson = () => {
    const validated = validateMcpServersJson(mcpServersJson);
    if (validated) {
      setMcpServersJson(JSON.stringify(validated, null, 2));
    }
  };

  const addExampleServer = () => {
    const example: MCPServerConfig = {
      name: 'Example MCP Server',
      baseUrl: 'https://api.example.com/mcp',
      authType: 'bearer',
      authToken: 'your-token-here',
      timeout: 5000,
    };

    const currentServers = validateMcpServersJson(mcpServersJson) || [];
    const updated = [...currentServers, example];
    setMcpServersJson(JSON.stringify(updated, null, 2));
    setJsonError('');
  };

  return (
    <div className="settings-container">
      <div className="settings-content">
        <div className="settings-main">
          {activeSection === 'api-keys' && (
            <div className="settings-section">
              <div className="settings-field">
                <label>
                  Master Password (Optional)
                  <span className="settings-field-hint">
                    Set a master password to encrypt API keys with password-based encryption. This allows your keys to work across different devices and browsers. If not set, keys are encrypted using device-specific characteristics.
                  </span>
                </label>
                {!hasPassword && !showPasswordSection && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(true)}
                    className="settings-btn-secondary"
                    style={{ marginTop: '8px' }}
                  >
                    Set Master Password
                  </button>
                )}
                {hasPassword && !showPasswordSection && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'green', fontSize: '14px' }}>✓ Master password is set</span>
                    <button
                      type="button"
                      onClick={handleClearPassword}
                      className="settings-btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Clear Password
                    </button>
                  </div>
                )}
                {showPasswordSection && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="password"
                      value={masterPassword}
                      onChange={(e) => {
                        setMasterPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter master password (min 8 characters)"
                      className="settings-input"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Confirm master password"
                      className="settings-input"
                    />
                    {passwordError && (
                      <div className="settings-error">{passwordError}</div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSetPassword}
                        className="settings-btn-primary"
                        disabled={!masterPassword || !confirmPassword}
                      >
                        Set Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setMasterPassword('');
                          setConfirmPassword('');
                          setPasswordError('');
                        }}
                        className="settings-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-field">
                <label htmlFor="gemini-api-key">
                  Gemini API Key
                  <span className="settings-field-hint">For AI chat and script generation</span>
                </label>
                <input
                  id="gemini-api-key"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="settings-input"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="supabase-url">
                  Supabase URL
                  <span className="settings-field-hint">Your Supabase project URL</span>
                </label>
                <input
                  id="supabase-url"
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="settings-input"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="supabase-api-key">
                  Supabase API Key
                  <span className="settings-field-hint">Your Supabase anon/public key</span>
                </label>
                <input
                  id="supabase-api-key"
                  type="password"
                  value={supabaseApiKey}
                  onChange={(e) => setSupabaseApiKey(e.target.value)}
                  placeholder="Enter your Supabase API key"
                  className="settings-input"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="storage-mode">
                  Script Storage Mode
                  <span className="settings-field-hint">
                    Choose where to store your scripts. Supabase enables cloud sync across devices.
                  </span>
                </label>
                <div className="storage-mode-toggle">
                  <button
                    type="button"
                    className={`storage-mode-btn ${storageMode === 'localStorage' ? 'active' : ''}`}
                    onClick={() => setStorageMode('localStorage')}
                  >
                    localStorage
                  </button>
                  <button
                    type="button"
                    className={`storage-mode-btn ${storageMode === 'supabase' ? 'active' : ''}`}
                    onClick={() => setStorageMode('supabase')}
                    disabled={!supabaseUrl || !supabaseApiKey}
                    title={!supabaseUrl || !supabaseApiKey ? 'Configure Supabase URL and API key first' : ''}
                  >
                    Supabase
                  </button>
                </div>
                {storageMode === 'supabase' && (!supabaseUrl || !supabaseApiKey) && (
                  <div className="settings-warning">
                    Please configure Supabase URL and API key above to use Supabase storage.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'mcp-servers' && (
            <div className="settings-section">
              <div className="settings-field">
                <label htmlFor="mcp-servers">
                  MCP Servers Configuration
                  <span className="settings-field-hint">
                    Define MCP servers as a JSON array. Each server requires: name, baseUrl, authType (none/bearer/api-key), and authToken (if not "none").
                  </span>
                </label>
                <div className="mcp-json-toolbar">
                  <button
                    type="button"
                    onClick={formatJson}
                    className="mcp-format-btn"
                    disabled={!!jsonError}
                  >
                    Format JSON
                  </button>
                  <button
                    type="button"
                    onClick={addExampleServer}
                    className="mcp-example-btn"
                  >
                    Add Example Server
                  </button>
                </div>
                <textarea
                  id="mcp-servers"
                  value={mcpServersJson}
                  onChange={(e) => handleMcpJsonChange(e.target.value)}
                  placeholder='[\n  {\n    "name": "My MCP Server",\n    "baseUrl": "https://api.example.com/mcp",\n    "authType": "bearer",\n    "authToken": "your-token",\n    "timeout": 5000\n  }\n]'
                  className={`settings-textarea ${jsonError ? 'error' : ''}`}
                  rows={15}
                />
                {jsonError && (
                  <div className="settings-error">{jsonError}</div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'sync' && (
            <div className="settings-section">
              <div className="sync-info">
                <h3>Sync Scripts Between localStorage and Supabase</h3>
                <p>
                  Keep your scripts synchronized between your browser's localStorage and Supabase cloud storage.
                  This allows you to access your scripts across different devices and browsers.
                </p>
              </div>

              {/* Authentication Status */}
              {supabaseUrl && supabaseApiKey && (
                <div className="auth-status-section" style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Authentication Status</h4>
                  {isAuthenticated ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--success-color)', fontSize: '20px' }}>✓</span>
                        <span style={{ fontSize: '14px' }}>
                          Logged in as <strong>{currentUserEmail}</strong>
                        </span>
                      </div>
                      {onLogout && (
                        <button
                          type="button"
                          onClick={onLogout}
                          className="settings-btn-secondary"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          Logout
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Login to Supabase to enable cloud sync for your scripts and settings.
                      </p>
                      {onAuthRequest && (
                        <button
                          type="button"
                          onClick={onAuthRequest}
                          className="settings-btn-primary"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          Login with Supabase
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(!supabaseUrl || !supabaseApiKey) && (
                <div className="settings-warning">
                  <strong>Supabase Not Configured</strong>
                  <p>Please configure your Supabase URL and API key in the API Keys tab before syncing.</p>
                </div>
              )}

              {supabaseUrl && supabaseApiKey && (
                <div className="sync-actions">
                  <button
                    type="button"
                    className="sync-btn primary"
                    onClick={onSync}
                  >
                    Check for Differences & Sync
                  </button>
                  <div className="sync-description">
                    Click this button to compare your localStorage scripts with Supabase and resolve any conflicts.
                  </div>
                </div>
              )}

              <div className="sync-note">
                <h4>How Sync Works:</h4>
                <ul>
                  <li><strong>Compare:</strong> Detects differences between localStorage and Supabase</li>
                  <li><strong>Conflicts:</strong> Shows scripts that differ in both locations</li>
                  <li><strong>Resolve:</strong> Choose which version to keep for each conflict</li>
                  <li><strong>Merge:</strong> Scripts that exist in only one location are automatically synced</li>
                </ul>
              </div>

              <div className="export-section">
                <h3>Export Scripts</h3>
                <p>Export all scripts from localStorage to a CSV file for backup or analysis.</p>
                <div className="export-actions">
                  <button
                    type="button"
                    className="export-btn"
                    onClick={onExportCSV}
                  >
                    Export to CSV
                  </button>
                  <div className="export-description">
                    Download all your scripts in CSV format. Includes all script data, parameters, and metadata.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ai-prompt' && (
            <div className="settings-section">
              <div className="settings-field">
                <label htmlFor="ai-prompt">
                  AI Script Generator System Prompt
                  <span className="settings-field-hint">
                    Customize the system prompt used by the AI Script Generator. This prompt instructs the AI on how to generate scripts. Changes are saved to Supabase.
                  </span>
                </label>
                {aiPromptLoading && !aiPrompt && (
                  <div className="settings-loading">Loading prompt...</div>
                )}
                {!isEditingAiPrompt && aiPrompt ? (
                  <div style={{ position: 'relative' }}>
                    <pre className="code-preview" style={{ minHeight: '300px', maxHeight: '500px', overflow: 'auto' }}>
                      <code ref={aiPromptRef} className="language-markdown">
                        {aiPrompt}
                      </code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => setIsEditingAiPrompt(true)}
                      className="settings-btn-secondary"
                      style={{ marginTop: '8px' }}
                    >
                      Edit Prompt
                    </button>
                  </div>
                ) : (
                  <div>
                    <textarea
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => {
                        setAiPrompt(e.target.value);
                        setAiPromptError('');
                        setAiPromptSuccess(false);
                      }}
                      placeholder="Enter the system prompt for AI script generation..."
                      className="settings-textarea"
                      rows={20}
                      disabled={aiPromptLoading}
                    />
                    {aiPrompt && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAiPrompt(false)}
                        className="settings-btn-secondary"
                        style={{ marginTop: '8px' }}
                      >
                        Done Editing
                      </button>
                    )}
                  </div>
                )}
                {aiPromptError && (
                  <div className="settings-error">{aiPromptError}</div>
                )}
                {aiPromptSuccess && (
                  <div className="settings-success" style={{ color: 'green', marginTop: '8px' }}>
                    ✓ Prompt saved successfully to Supabase
                  </div>
                )}
                {(!supabaseUrl || !supabaseApiKey) && (
                  <div className="settings-warning" style={{ marginTop: '8px' }}>
                    Please configure Supabase URL and API key in the API Keys tab to save the prompt.
                  </div>
                )}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveAIPrompt}
                    className="settings-btn-primary"
                    disabled={aiPromptLoading || !supabaseUrl || !supabaseApiKey || !aiPrompt.trim()}
                  >
                    {aiPromptLoading ? 'Saving...' : 'Save Prompt to Supabase'}
                  </button>
                  <button
                    type="button"
                    onClick={loadAIPrompt}
                    className="settings-btn-secondary"
                    disabled={aiPromptLoading || !supabaseUrl || !supabaseApiKey}
                  >
                    Reload from Supabase
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="settings-section">
              <div className="settings-field">
                <label htmlFor="theme-selector">
                  Color Theme
                  <span className="settings-field-hint">
                    Choose a preset theme or create a custom theme. The theme is applied immediately and saved to your settings.
                  </span>
                </label>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="radio"
                      checked={!useCustomTheme}
                      onChange={() => {
                        setUseCustomTheme(false);
                        setTheme('light');
                        ThemeService.applyTheme('light');
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Preset Themes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      checked={useCustomTheme}
                      onChange={() => {
                        setUseCustomTheme(true);
                        setTheme('custom');
                        // Initialize custom theme with current theme colors
                        const currentColors = ThemeService.getCurrentThemeColors();
                        setCustomTheme(currentColors);
                        ThemeService.applyCustomTheme(currentColors);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Custom Theme</span>
                  </label>
                </div>
                
                {!useCustomTheme ? (
                  <>
                    <div className="theme-selector">
                      {(['light', 'dark', 'blue', 'green', 'purple'] as ThemePreset[]).map((themeOption) => (
                        <button
                          key={themeOption}
                          type="button"
                          className={`theme-option ${theme === themeOption ? 'active' : ''}`}
                          onClick={() => {
                            setTheme(themeOption);
                            ThemeService.applyTheme(themeOption);
                          }}
                        >
                          {themeOption}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="custom-theme-editor">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '16px' }}>
                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Sidebar Tab Active Background
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.sidebarTabActiveBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, sidebarTabActiveBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.sidebarTabActiveBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, sidebarTabActiveBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#000000"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Sidebar Tab Background
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.sidebarTabBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, sidebarTabBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.sidebarTabBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, sidebarTabBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#ffffff"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Chat Header Background
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.chatHeaderBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, chatHeaderBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.chatHeaderBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, chatHeaderBg: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#0066cc"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Create Script Button Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.createScriptButtonColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, createScriptButtonColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.createScriptButtonColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, createScriptButtonColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#4CAF50"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Accent Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.accentColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, accentColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.accentColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, accentColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#0066cc"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Background Primary
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.bgPrimary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgPrimary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.bgPrimary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgPrimary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#ffffff"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Background Secondary
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.bgSecondary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgSecondary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.bgSecondary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgSecondary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#f5f5f5"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Text Primary
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.textPrimary}
                            onChange={(e) => {
                              const updated = { ...customTheme, textPrimary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.textPrimary}
                            onChange={(e) => {
                              const updated = { ...customTheme, textPrimary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#1a1a1a"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Text Secondary
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.textSecondary}
                            onChange={(e) => {
                              const updated = { ...customTheme, textSecondary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.textSecondary}
                            onChange={(e) => {
                              const updated = { ...customTheme, textSecondary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#666666"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Border Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.borderColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, borderColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.borderColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, borderColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#d0d0d0"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const preset = ThemeService.getCurrentThemeColors();
                          setCustomTheme(preset);
                          ThemeService.applyCustomTheme(preset);
                        }}
                        className="settings-btn-secondary"
                        style={{ marginRight: '8px' }}
                      >
                        Reset to Current Theme
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Get light preset colors
                          const lightPreset = {
                            bgPrimary: '#ffffff',
                            bgSecondary: '#f5f5f5',
                            bgTertiary: '#e8e8e8',
                            textPrimary: '#1a1a1a',
                            textSecondary: '#666666',
                            borderColor: '#d0d0d0',
                            accentColor: '#2563eb',
                            accentHover: '#1d4ed8',
                            successColor: '#10b981',
                            errorColor: '#ef4444',
                            tabHeaderBg: '#f5f5f5',
                            tabHeaderBorder: '#e0e0e0',
                            tabInactiveColor: '#666666',
                            tabHoverBg: 'rgba(0, 0, 0, 0.05)',
                            tabHoverColor: '#333333',
                            tabActiveColor: '#2563eb',
                            tabActiveBg: '#ffffff',
                            tabActiveBorder: '#2563eb',
                            tabContentBg: '#ffffff',
                            sidebarTabActiveBg: '#2563eb',
                            sidebarTabBg: '#ffffff',
                            chatHeaderBg: '#2563eb',
                            createScriptButtonColor: '#4CAF50',
                          };
                          setCustomTheme(lightPreset);
                          ThemeService.applyCustomTheme(lightPreset);
                        }}
                        className="settings-btn-secondary"
                      >
                        Reset to Light Theme
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <p>Theme preview is applied immediately. Click "Save" to persist your preference.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button onClick={handleSave} className="settings-btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
