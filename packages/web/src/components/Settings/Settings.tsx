import React, { useState, useEffect } from 'react';
import { EncryptionService } from '../../services/encryption';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import { ThemeService, ThemePreset } from '../../services/themeService';
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

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsData;
  onSave: (settings: SettingsData) => Promise<void>;
  onSync?: () => void;
  onExportCSV?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSave, onSync, onExportCSV }) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [supabaseApiKey, setSupabaseApiKey] = useState(settings.supabaseApiKey);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl);
  const [storageMode, setStorageMode] = useState<StorageMode>(settings.storageMode || 'localStorage');
  const [mcpServersJson, setMcpServersJson] = useState(
    JSON.stringify(settings.mcpServers, null, 2)
  );
  const [jsonError, setJsonError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'api-keys' | 'mcp-servers' | 'sync' | 'ai-prompt' | 'appearance'>('api-keys');
  const [theme, setTheme] = useState<ThemePreset>((settings as any).theme || 'light');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptError, setAiPromptError] = useState<string>('');
  const [aiPromptSuccess, setAiPromptSuccess] = useState(false);

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setSupabaseApiKey(settings.supabaseApiKey);
    setSupabaseUrl(settings.supabaseUrl);
    setStorageMode(settings.storageMode || 'localStorage');
    setMcpServersJson(JSON.stringify(settings.mcpServers, null, 2));
    setJsonError('');
    setHasPassword(EncryptionService.hasMasterPassword());
    setTheme((settings as any).theme || 'light');
    
    // Load AI prompt from Supabase when opening settings
    if (isOpen && activeTab === 'ai-prompt') {
      loadAIPrompt();
    }
  }, [settings, isOpen, activeTab]);

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
      console.error('Failed to re-encrypt API keys:', error);
    }
  };

  const handleSave = async () => {
    let mcpServers: MCPServerConfig[] = [];

    if (activeTab === 'mcp-servers') {
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
      theme,
    } as SettingsData);
    
    // Apply theme immediately
    ThemeService.saveTheme(theme);
    
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            API Keys
          </button>
          <button
            className={`settings-tab ${activeTab === 'mcp-servers' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp-servers')}
          >
            MCP Servers
          </button>
          <button
            className={`settings-tab ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            Sync
          </button>
          <button
            className={`settings-tab ${activeTab === 'ai-prompt' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ai-prompt');
              if (!aiPrompt && supabaseUrl && supabaseApiKey) {
                loadAIPrompt();
              }
            }}
          >
            AI Prompt
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'api-keys' && (
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

          {activeTab === 'mcp-servers' && (
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

          {activeTab === 'sync' && (
            <div className="settings-section">
              <div className="sync-info">
                <h3>Sync Scripts Between localStorage and Supabase</h3>
                <p>
                  Keep your scripts synchronized between your browser's localStorage and Supabase cloud storage.
                  This allows you to access your scripts across different devices and browsers.
                </p>
              </div>

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

          {activeTab === 'ai-prompt' && (
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

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="settings-field">
                <label htmlFor="theme-selector">
                  Color Theme
                  <span className="settings-field-hint">
                    Choose a color theme for the application. The theme is applied immediately and saved to your settings.
                  </span>
                </label>
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
                      style={{
                        textTransform: 'capitalize',
                        padding: '12px 24px',
                        margin: '4px',
                        border: `2px solid ${theme === themeOption ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        background: theme === themeOption ? 'var(--accent-color)' : 'var(--bg-primary)',
                        color: theme === themeOption ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {themeOption}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <p>Theme preview is applied immediately. Click "Save" to persist your preference.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="settings-btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="settings-btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
