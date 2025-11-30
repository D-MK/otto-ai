/**
 * AI Script Generator component
 * Allows users to generate new scripts using AI (Gemini or Claude)
 */

import React, { useState, useEffect } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { AIScriptGenerator, AIConfig, AIProvider } from '../../services/aiScriptGenerator';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import './AIScriptGenerator.css';

interface AIScriptGeneratorProps {
  onClose: () => void;
}

const AIScriptGeneratorComponent: React.FC<AIScriptGeneratorProps> = ({ onClose }) => {
  const { scriptStorage, router, settings, saveSettings } = useConversationStore();
  const [step, setStep] = useState<'config' | 'generate'>('config');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<any | null>(null);

  useEffect(() => {
    const loadSavedConfig = async () => {
      const savedConfig = await AIScriptGenerator.loadConfig();
      if (savedConfig) {
        setProvider(savedConfig.provider);
        setApiKey(savedConfig.apiKey);
        setStep('generate');
      } else if (settings.geminiApiKey) {
        // Fall back to settings if no ai_config but geminiApiKey exists
        setProvider('gemini');
        setApiKey(settings.geminiApiKey);
        setStep('generate');
      }
    };
    loadSavedConfig();
  }, [settings.geminiApiKey]);

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    try {
      const config: AIConfig = { provider, apiKey: apiKey.trim() };
      await AIScriptGenerator.saveConfig(config);

      // Also sync to settings store if provider is Gemini
      if (provider === 'gemini') {
        await saveSettings({
          ...settings,
          geminiApiKey: apiKey.trim(),
        });
      }

      setStep('generate');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleChangeConfig = () => {
    setStep('config');
    setError(null);
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe the script you want to create');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedScript(null);

    try {
      const config = await AIScriptGenerator.loadConfig();
      if (!config) {
        setError('API configuration not found');
        setStep('config');
        return;
      }

      // Try to load custom prompt from Supabase if configured
      let customPrompt: string | undefined;
      if (settings.supabaseUrl && settings.supabaseApiKey) {
        try {
          const supabaseStorage = new SupabaseStorageService(settings.supabaseUrl, settings.supabaseApiKey);
          const aiConfig = await supabaseStorage.getAIConfig('default');
          if (aiConfig) {
            customPrompt = aiConfig.systemPrompt;
          }
        } catch (err) {
          // Silently fail - will use default prompt
          console.warn('Failed to load custom prompt from Supabase, using default:', err);
        }
      }

      const generator = new AIScriptGenerator(config);
      const script = await generator.generateScript(description, customPrompt);
      setGeneratedScript(script);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveScript = () => {
    if (!generatedScript || !scriptStorage || !router) return;

    try {
      scriptStorage.create(generatedScript);
      router.refreshScripts();
      alert('Script saved successfully!');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save script');
    }
  };

  const handleEditAndSave = () => {
    if (!generatedScript) return;

    // Store the script temporarily and close this dialog
    // The user can edit it in the regular script editor
    localStorage.setItem('pending_script', JSON.stringify(generatedScript));
    onClose();
    // Trigger the script editor (this would need to be handled by parent component)
    window.dispatchEvent(new CustomEvent('open-script-editor', { detail: { script: generatedScript } }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-generator" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ AI Script Generator</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        {step === 'config' && (
          <div className="config-step">
            <p className="instruction">Configure your AI provider to generate scripts automatically.</p>

            <div className="form-group">
              <label>AI Provider</label>
              <div className="provider-options">
                <button
                  className={`provider-button ${provider === 'gemini' ? 'active' : ''}`}
                  onClick={() => setProvider('gemini')}
                >
                  <div className="provider-name">Google Gemini</div>
                  <div className="provider-info">Free tier available</div>
                </button>
                <button
                  className={`provider-button ${provider === 'claude' ? 'active' : ''}`}
                  onClick={() => setProvider('claude')}
                >
                  <div className="provider-name">Claude by Anthropic</div>
                  <div className="provider-info">High quality results</div>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'Enter your Gemini API key' : 'Enter your Claude API key'}
                className="api-key-input"
              />
              <div className="help-text">
                {provider === 'gemini' ? (
                  <>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></>
                ) : (
                  <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></>
                )}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button onClick={onClose} className="secondary-button">Cancel</button>
              <button onClick={handleSaveConfig} className="primary-button">Save & Continue</button>
            </div>
          </div>
        )}

        {step === 'generate' && (
          <div className="generate-step">
            {!generatedScript ? (
              <>
                <p className="instruction">Describe the script you want to create, and AI will generate it for you.</p>

                <div className="form-group">
                  <label htmlFor="description">Script Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Example: Create a script that calculates the tip amount for a restaurant bill"
                    rows={4}
                    className="description-input"
                    disabled={isGenerating}
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="button-group">
                  <button onClick={handleChangeConfig} className="secondary-button" disabled={isGenerating}>
                    Change API Config
                  </button>
                  <button onClick={onClose} className="secondary-button" disabled={isGenerating}>Cancel</button>
                  <button onClick={handleGenerate} className="primary-button" disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Script'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="preview-section">
                  <h3>Generated Script Preview</h3>

                  <div className="preview-field">
                    <strong>Name:</strong> {generatedScript.name}
                  </div>

                  <div className="preview-field">
                    <strong>Description:</strong> {generatedScript.description}
                  </div>

                  <div className="preview-field">
                    <strong>Tags:</strong> {generatedScript.tags.join(', ')}
                  </div>

                  <div className="preview-field">
                    <strong>Trigger Phrases:</strong>
                    <ul>
                      {generatedScript.triggerPhrases.map((phrase: string, idx: number) => (
                        <li key={idx}>{phrase}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="preview-field">
                    <strong>Parameters:</strong>
                    {generatedScript.parameters.length === 0 ? (
                      <span> None</span>
                    ) : (
                      <ul>
                        {generatedScript.parameters.map((param: any, idx: number) => (
                          <li key={idx}>
                            {param.name} ({param.type}){param.required ? ' *' : ''} - {param.prompt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="preview-field">
                    <strong>Code:</strong>
                    <pre className="code-preview">{generatedScript.code}</pre>
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="button-group">
                  <button onClick={() => setGeneratedScript(null)} className="secondary-button">
                    Generate Another
                  </button>
                  <button onClick={handleEditAndSave} className="secondary-button">
                    Edit Before Saving
                  </button>
                  <button onClick={handleSaveScript} className="primary-button">
                    Save Script
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIScriptGeneratorComponent;
