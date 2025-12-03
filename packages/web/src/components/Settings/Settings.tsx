import React, { useState, useEffect, useRef } from 'react';
import { EncryptionService } from '../../services/encryption';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import { ThemeService, ThemePreset, ThemeColors, FontPreferences, SavedCustomTheme } from '../../services/themeService';
import { logger } from '../../utils/logger';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-json';
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
  setupWizardCompleted?: boolean;
  setupWizardLastStep?: number;
  setupWizardDismissedAt?: string | null;
}

export type SettingsSection = 'api-keys' | 'mcp-servers' | 'sync' | 'ai-prompt' | 'appearance';

/**
 * Extract project name from Supabase URL
 * Handles both full URLs and just project names
 */
export function extractSupabaseProjectName(url: string): string {
  if (!url) return '';
  
  // If it's already just a project name (no https:// or .supabase.co), return as-is
  if (!url.includes('://') && !url.includes('.')) {
    return url.trim();
  }
  
  // Extract from full URL: https://project.supabase.co
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    return match[1];
  }
  
  // If it doesn't match the pattern, try to extract any alphanumeric project-like string
  const projectMatch = url.match(/([a-z0-9-]+)/i);
  return projectMatch ? projectMatch[1] : url.trim();
}

/**
 * Build full Supabase URL from project name
 */
export function buildSupabaseUrl(projectName: string): string {
  if (!projectName) return '';
  const cleanName = projectName.trim().replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '');
  return `https://${cleanName}.supabase.co`;
}

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
  onOpenSetupWizard?: () => void;
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
  onOpenSetupWizard,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [supabaseApiKey, setSupabaseApiKey] = useState(settings.supabaseApiKey);
  // Store just the project name in the input field
  const [supabaseProjectName, setSupabaseProjectName] = useState(
    extractSupabaseProjectName(settings.supabaseUrl)
  );
  const [supabaseUrlError, setSupabaseUrlError] = useState<string>('');
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
  const [isEditingMcpJson, setIsEditingMcpJson] = useState(true);
  const mcpJsonRef = useRef<HTMLElement>(null);

  // Font preferences
  const [fontFamily, setFontFamily] = useState<string>('system');
  const [fontSize, setFontSize] = useState<string>('16px');

  // Saved themes management
  const [savedThemes, setSavedThemes] = useState<SavedCustomTheme[]>([]);
  const [customThemeName, setCustomThemeName] = useState<string>('');
  const [showSaveThemeDialog, setShowSaveThemeDialog] = useState(false);
  const setupCompleted = !!settings.setupWizardCompleted;
  const setupSummaryText = setupCompleted
    ? 'Secure setup complete. You can revisit the wizard anytime.'
    : 'Complete the secure wizard once so you never have to re-enter keys.';
  const setupButtonLabel = setupCompleted ? 'Review Setup Wizard' : 'Start Setup Wizard';

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setSupabaseApiKey(settings.supabaseApiKey);
    setSupabaseProjectName(extractSupabaseProjectName(settings.supabaseUrl));
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

    // Load font preferences
    const currentFonts = ThemeService.getCurrentFontPreferences();
    setFontFamily(currentFonts.fontFamily);
    setFontSize(currentFonts.fontSize);

    // Load saved themes
    setSavedThemes(ThemeService.getSavedThemes());

    // Load AI prompt when switching to AI prompt tab
    if (activeSection === 'ai-prompt' && !aiPrompt) {
      loadAIPrompt();
    }
  }, [settings, activeSection]);

  // Apply syntax highlighting to AI prompt when not editing
  useEffect(() => {
    if (aiPromptRef.current && !isEditingAiPrompt && aiPrompt) {
      Prism.highlightElement(aiPromptRef.current);
    }
  }, [aiPrompt, isEditingAiPrompt]);

  // Apply syntax highlighting to MCP JSON when not editing
  useEffect(() => {
    if (mcpJsonRef.current && !isEditingMcpJson && mcpServersJson) {
      Prism.highlightElement(mcpJsonRef.current);
    }
  }, [mcpServersJson, isEditingMcpJson]);

  const loadAIPrompt = async () => {
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

    const fullSupabaseUrl = buildSupabaseUrl(supabaseProjectName);
    if (!fullSupabaseUrl || !supabaseApiKey) {
      // No Supabase connection - use default prompt
      setAiPrompt(defaultPrompt);
      setAiPromptError('');
      return;
    }

    setAiPromptLoading(true);
    setAiPromptError('');
    setAiPromptSuccess(false);

    try {
      const supabaseStorage = new SupabaseStorageService(fullSupabaseUrl, supabaseApiKey);
      const config = await supabaseStorage.getAIConfig('default');

      if (config) {
        setAiPrompt(config.systemPrompt);
      } else {
        // Load default prompt
        setAiPrompt(defaultPrompt);
      }
    } catch (error) {
      // On error, fall back to default prompt
      setAiPrompt(defaultPrompt);
      setAiPromptError(error instanceof Error ? error.message : 'Failed to load AI prompt from Supabase. Using default prompt.');
    } finally {
      setAiPromptLoading(false);
    }
  };

  const handleSaveAIPrompt = async () => {
    const fullSupabaseUrl = buildSupabaseUrl(supabaseProjectName);
    if (!fullSupabaseUrl || !supabaseApiKey) {
      setAiPromptError('Please configure Supabase project name and API key first');
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
      const supabaseStorage = new SupabaseStorageService(fullSupabaseUrl, supabaseApiKey);
      
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

    // Validate Supabase project name
    if (supabaseProjectName && !supabaseProjectName.match(/^[a-z0-9-]+$/i)) {
      setSupabaseUrlError('Invalid project name. Use only letters, numbers, and hyphens.');
      return;
    } else {
      setSupabaseUrlError('');
    }

    // Convert project name to full URL
    const fullSupabaseUrl = buildSupabaseUrl(supabaseProjectName);

    await onSave({
      geminiApiKey,
      supabaseApiKey,
      supabaseUrl: fullSupabaseUrl,
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

  // Quick color palette presets
  const applyQuickPalette = (paletteType: 'light' | 'dark' | 'ocean' | 'forest') => {
    let palette: Partial<ThemeColors>;

    switch (paletteType) {
      case 'light':
        palette = {
          bgPrimary: '#ffffff',
          bgSecondary: '#f5f5f5',
          bgTertiary: '#e8e8e8',
          textPrimary: '#1a1a1a',
          textSecondary: '#666666',
          borderColor: '#d0d0d0',
        };
        break;
      case 'dark':
        palette = {
          bgPrimary: '#0f172a',
          bgSecondary: '#1e293b',
          bgTertiary: '#334155',
          textPrimary: '#f1f5f9',
          textSecondary: '#cbd5e1',
          borderColor: '#475569',
        };
        break;
      case 'ocean':
        palette = {
          bgPrimary: '#f0f9ff',
          bgSecondary: '#e0f2fe',
          bgTertiary: '#bae6fd',
          textPrimary: '#0c4a6e',
          textSecondary: '#0369a1',
          borderColor: '#7dd3fc',
        };
        break;
      case 'forest':
        palette = {
          bgPrimary: '#f0fdf4',
          bgSecondary: '#dcfce7',
          bgTertiary: '#bbf7d0',
          textPrimary: '#14532d',
          textSecondary: '#15803d',
          borderColor: '#86efac',
        };
        break;
    }

    const updated = { ...customTheme, ...palette };
    setCustomTheme(updated);
    ThemeService.applyCustomTheme(updated);
  };

  const handleSaveCustomTheme = () => {
    if (!customThemeName.trim()) {
      alert('Please enter a name for your theme');
      return;
    }

    const fonts: FontPreferences = { fontFamily, fontSize };
    ThemeService.saveNamedTheme(customThemeName, customTheme, fonts);
    setSavedThemes(ThemeService.getSavedThemes());
    setCustomThemeName('');
    setShowSaveThemeDialog(false);
  };

  const handleLoadCustomTheme = (themeName: string) => {
    const theme = ThemeService.loadSavedTheme(themeName);
    if (theme) {
      setCustomTheme(theme.colors);
      ThemeService.applyCustomTheme(theme.colors);
      if (theme.fonts) {
        setFontFamily(theme.fonts.fontFamily);
        setFontSize(theme.fonts.fontSize);
        ThemeService.applyFontPreferences(theme.fonts);
      }
    }
  };

  const handleDeleteCustomTheme = (themeName: string) => {
    if (confirm(`Delete theme "${themeName}"?`)) {
      ThemeService.deleteSavedTheme(themeName);
      setSavedThemes(ThemeService.getSavedThemes());
    }
  };

  const handleFontChange = (newFontFamily?: string, newFontSize?: string) => {
    const fonts: FontPreferences = {
      fontFamily: newFontFamily || fontFamily,
      fontSize: newFontSize || fontSize,
    };

    if (newFontFamily) setFontFamily(newFontFamily);
    if (newFontSize) setFontSize(newFontSize);

    ThemeService.saveFontPreferences(fonts);
  };

  return (
    <div className="settings-container">
      <div className="settings-content">
        <div className="settings-main">
          {activeSection === 'api-keys' && (
            <div className="settings-section">
              <div className="setup-banner">
                <div>
                  <p className="setup-banner-eyebrow">{setupCompleted ? '✅ Secure setup complete' : 'Secure setup pending'}</p>
                  <h3>{setupCompleted ? 'Keys encrypted & ready' : 'Finish secure setup once'}</h3>
                  <p>{setupSummaryText}</p>
                </div>
                {onOpenSetupWizard && (
                  <button
                    type="button"
                    className="settings-btn-primary"
                    onClick={onOpenSetupWizard}
                    style={{ alignSelf: 'center' }}
                  >
                    {setupButtonLabel}
                  </button>
                )}
              </div>

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
                <label htmlFor="supabase-project">
                  Supabase Project Name
                  <span className="settings-field-hint">Your Supabase project name (e.g., xdsytzwjxujybxemclpz)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>https://</span>
                  <input
                    id="supabase-project"
                    type="text"
                    value={supabaseProjectName}
                    onChange={(e) => {
                      setSupabaseProjectName(e.target.value);
                      // Clear error when user starts typing
                      if (supabaseUrlError) {
                        setSupabaseUrlError('');
                      }
                    }}
                    placeholder="your-project"
                    className={`settings-input ${supabaseUrlError ? 'settings-input-error' : ''}`}
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>.supabase.co</span>
                </div>
                {supabaseUrlError && (
                  <div className="settings-error" style={{ marginTop: '0.5rem' }}>
                    {supabaseUrlError}
                  </div>
                )}
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
                    disabled={!supabaseProjectName || !supabaseApiKey}
                    title={!supabaseProjectName || !supabaseApiKey ? 'Configure Supabase project name and API key first' : ''}
                  >
                    Supabase
                  </button>
                </div>
                {storageMode === 'supabase' && (!supabaseProjectName || !supabaseApiKey) && (
                  <div className="settings-warning">
                    Please configure Supabase project name and API key above to use Supabase storage.
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
                {!isEditingMcpJson && mcpServersJson ? (
                  <div style={{ position: 'relative' }}>
                    <pre className="code-preview" style={{ minHeight: '300px', maxHeight: '500px', overflow: 'auto' }}>
                      <code ref={mcpJsonRef} className="language-json">
                        {mcpServersJson}
                      </code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => setIsEditingMcpJson(true)}
                      className="settings-btn-secondary"
                      style={{ marginTop: '8px' }}
                    >
                      Edit JSON
                    </button>
                  </div>
                ) : (
                  <div>
                    <textarea
                      id="mcp-servers"
                      value={mcpServersJson}
                      onChange={(e) => handleMcpJsonChange(e.target.value)}
                      placeholder='[\n  {\n    "name": "My MCP Server",\n    "baseUrl": "https://api.example.com/mcp",\n    "authType": "bearer",\n    "authToken": "your-token",\n    "timeout": 5000\n  }\n]'
                      className={`settings-textarea ${jsonError ? 'error' : ''}`}
                      rows={15}
                    />
                    {mcpServersJson && (
                      <button
                        type="button"
                        onClick={() => {
                          // Validate JSON before switching to view mode
                          const validated = validateMcpServersJson(mcpServersJson);
                          if (validated) {
                            setIsEditingMcpJson(false);
                          }
                        }}
                        className="settings-btn-secondary"
                        style={{ marginTop: '8px' }}
                        disabled={!!jsonError}
                      >
                        Done Editing
                      </button>
                    )}
                  </div>
                )}
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
              {supabaseProjectName && supabaseApiKey && (
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

              {(!supabaseProjectName || !supabaseApiKey) && (
                <div className="settings-warning">
                  <strong>Supabase Not Configured</strong>
                  <p>Please configure your Supabase URL and API key in the API Keys tab before syncing.</p>
                </div>
              )}

              {supabaseProjectName && supabaseApiKey && (
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
                {(!supabaseProjectName || !supabaseApiKey) && (
                  <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent-color)', borderRadius: '4px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <strong>Using Default Prompt</strong>
                    <p style={{ margin: '4px 0 0 0' }}>Configure Supabase in the API Keys tab to save custom prompts to the cloud.</p>
                  </div>
                )}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveAIPrompt}
                    className="settings-btn-primary"
                    disabled={aiPromptLoading || !supabaseProjectName || !supabaseApiKey || !aiPrompt.trim()}
                  >
                    {aiPromptLoading ? 'Saving...' : 'Save Prompt to Supabase'}
                  </button>
                  <button
                    type="button"
                    onClick={loadAIPrompt}
                    className="settings-btn-secondary"
                    disabled={aiPromptLoading || !supabaseProjectName || !supabaseApiKey}
                  >
                    Reload from Supabase
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="settings-section">
              {/* Font Options */}
              <div className="settings-field">
                <label htmlFor="font-preferences">
                  Font Preferences
                  <span className="settings-field-hint">
                    Choose your preferred font family and size
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => handleFontChange(e.target.value, undefined)}
                      className="settings-input"
                    >
                      <option value="system">System Default</option>
                      <option value="serif">Serif</option>
                      <option value="mono">Monospace</option>
                      <option value="inter">Inter</option>
                      <option value="roboto">Roboto</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => handleFontChange(undefined, e.target.value)}
                      className="settings-input"
                    >
                      <option value="14px">Small (14px)</option>
                      <option value="16px">Medium (16px)</option>
                      <option value="18px">Large (18px)</option>
                      <option value="20px">Extra Large (20px)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
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
                    {/* Quick Palette Selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '15px' }}>
                        Quick Color Palettes
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => applyQuickPalette('light')}
                          className="palette-button"
                          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)', color: '#1a1a1a', border: '2px solid #d0d0d0' }}
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickPalette('dark')}
                          className="palette-button"
                          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f1f5f9', border: '2px solid #475569' }}
                        >
                          Dark
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickPalette('ocean')}
                          className="palette-button"
                          style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)', color: '#0c4a6e', border: '2px solid #7dd3fc' }}
                        >
                          Ocean
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickPalette('forest')}
                          className="palette-button"
                          style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)', color: '#14532d', border: '2px solid #86efac' }}
                        >
                          Forest
                        </button>
                      </div>
                    </div>

                    {/* Saved Themes */}
                    {savedThemes.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '15px' }}>
                          Saved Custom Themes
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {savedThemes.map((savedTheme) => (
                            <div key={savedTheme.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                              <button
                                type="button"
                                onClick={() => handleLoadCustomTheme(savedTheme.name)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px', padding: 0 }}
                              >
                                {savedTheme.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTheme(savedTheme.name)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-color)', fontSize: '14px', padding: '0 4px' }}
                                title="Delete theme"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save Current Theme */}
                    <div style={{ marginBottom: '20px' }}>
                      {!showSaveThemeDialog ? (
                        <button
                          type="button"
                          onClick={() => setShowSaveThemeDialog(true)}
                          className="settings-btn-secondary"
                        >
                          Save Current Theme
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={customThemeName}
                            onChange={(e) => setCustomThemeName(e.target.value)}
                            placeholder="Theme name"
                            className="settings-input"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomTheme}
                            className="settings-btn-primary"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSaveThemeDialog(false);
                              setCustomThemeName('');
                            }}
                            className="settings-btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Color Pickers - Organized by Importance */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '16px' }}>
                      {/* Primary Colors */}
                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Accent Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.accentColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, accentColor: e.target.value, accentHover: e.target.value };
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
                            placeholder="#2563eb"
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
                          Background Tertiary
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.bgTertiary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgTertiary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.bgTertiary}
                            onChange={(e) => {
                              const updated = { ...customTheme, bgTertiary: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#e8e8e8"
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

                      {/* Component-Specific Colors */}
                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Header Background
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.chatHeaderBg}
                            onChange={(e) => {
                              const updated = { ...customTheme, chatHeaderBg: e.target.value, sidebarTabActiveBg: e.target.value, tabActiveColor: e.target.value };
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
                            placeholder="#2563eb"
                            style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div className="color-picker-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Button Color (Success/Create)
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.createScriptButtonColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, createScriptButtonColor: e.target.value, successColor: e.target.value };
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
                          Error Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customTheme.errorColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, errorColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <input
                            type="text"
                            value={customTheme.errorColor}
                            onChange={(e) => {
                              const updated = { ...customTheme, errorColor: e.target.value };
                              setCustomTheme(updated);
                              ThemeService.applyCustomTheme(updated);
                            }}
                            placeholder="#ef4444"
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
