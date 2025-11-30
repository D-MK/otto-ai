import React, { useState, useEffect } from 'react';
import { EncryptionService } from '../../services/encryption';
import './Settings.css';

export interface MCPServerConfig {
  name: string;
  baseUrl: string;
  authType: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  timeout?: number;
}

export type StorageMode = 'localStorage' | 'supabase';

export interface SettingsData {
  geminiApiKey: string;
  supabaseApiKey: string;
  supabaseUrl: string;
  mcpServers: MCPServerConfig[];
  storageMode: StorageMode;
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
  const [activeTab, setActiveTab] = useState<'api-keys' | 'mcp-servers' | 'sync'>('api-keys');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setSupabaseApiKey(settings.supabaseApiKey);
    setSupabaseUrl(settings.supabaseUrl);
    setStorageMode(settings.storageMode || 'localStorage');
    setMcpServersJson(JSON.stringify(settings.mcpServers, null, 2));
    setJsonError('');
    setHasPassword(EncryptionService.hasMasterPassword());
  }, [settings, isOpen]);

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
    });
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
