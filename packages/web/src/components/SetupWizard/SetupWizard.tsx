import React, { useEffect, useMemo, useState } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { SettingsData, StorageMode, buildSupabaseUrl, extractSupabaseProjectName } from '../Settings/Settings';
import './SetupWizard.css';

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

type SetupStep = 1 | 2 | 3 | 4 | 5;

const determineInitialStep = (settings: SettingsData): SetupStep => {
  if (settings.setupWizardCompleted) {
    return 5;
  }

  if (!settings.geminiApiKey) {
    return 2;
  }

  if (!settings.supabaseUrl || !settings.supabaseApiKey) {
    return 3;
  }

  if (settings.storageMode !== 'supabase') {
    return 4;
  }

  const nextStep = (settings.setupWizardLastStep ?? 1) + 1;
  return (Math.min(Math.max(nextStep, 1), 5) as SetupStep);
};

const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onClose, onCompleted }) => {
  const settings = useConversationStore((state) => state.settings);
  const saveSettings = useConversationStore((state) => state.saveSettings);

  const [activeStep, setActiveStep] = useState<SetupStep>(1);
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [supabaseProject, setSupabaseProject] = useState(extractSupabaseProjectName(settings.supabaseUrl) || '');
  const [supabaseKey, setSupabaseKey] = useState(settings.supabaseApiKey || '');
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(settings.storageMode || 'localStorage');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveStep(determineInitialStep(settings));
    setGeminiKey(settings.geminiApiKey || '');
    setSupabaseProject(extractSupabaseProjectName(settings.supabaseUrl) || '');
    setSupabaseKey(settings.supabaseApiKey || '');
    setStorageMode(settings.storageMode || 'localStorage');
    setGeminiError(null);
    setSupabaseError(null);
    setStatusMessage(null);
  }, [isOpen, settings]);

  const wizardProgress = useMemo(() => {
    return ['Welcome', 'Gemini API Key', 'Supabase (Optional)', 'Storage Mode', 'Complete'];
  }, []);

  const persistSettings = async (updates: Partial<SettingsData>, lastStep: number) => {
    setIsSaving(true);
    try {
      await saveSettings({
        ...settings,
        ...updates,
        setupWizardLastStep: Math.max(settings.setupWizardLastStep || 0, lastStep),
        setupWizardDismissedAt: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeminiNext = async () => {
    if (!geminiKey.trim()) {
      setGeminiError('Gemini API key is required to enable AI features.');
      return;
    }

    if (geminiKey.trim().length < 20) {
      setGeminiError('This API key looks too short. Please double-check the value.');
      return;
    }

    setGeminiError(null);

    await persistSettings({ geminiApiKey: geminiKey.trim() }, 2);
    setActiveStep(3);
    setStatusMessage('Gemini API key saved and encrypted.');
  };

  const handleSupabaseNext = async () => {
    if (!supabaseProject.trim() && !supabaseKey.trim()) {
      // Treat as skip
      setActiveStep(4);
      setSupabaseError(null);
      setStatusMessage('You can add Supabase later in Settings → Quick Setup.');
      return;
    }

    if (!supabaseProject.trim()) {
      setSupabaseError('Project name is required when Supabase API key is provided.');
      return;
    }

    if (!/^[a-z0-9-]+$/i.test(supabaseProject.trim())) {
      setSupabaseError('Project name can only contain letters, numbers, and hyphens.');
      return;
    }

    if (!supabaseKey.trim()) {
      setSupabaseError('Supabase API key is required for cloud sync.');
      return;
    }

    setSupabaseError(null);

    await persistSettings({
      supabaseUrl: buildSupabaseUrl(supabaseProject.trim()),
      supabaseApiKey: supabaseKey.trim(),
    }, 3);

    setActiveStep(4);
    setStatusMessage('Supabase configuration saved securely.');
  };

  const handleStorageNext = async () => {
    await persistSettings({ storageMode }, 4);
    setActiveStep(5);
    setStatusMessage(null);
  };

  const handleFinish = async () => {
    await saveSettings({
      ...settings,
      setupWizardCompleted: true,
      setupWizardLastStep: 5,
      setupWizardDismissedAt: null,
    });
    setStatusMessage('Setup complete!');
    onCompleted?.();
    onClose();
  };

  const handleSkipWizard = async () => {
    await saveSettings({
      ...settings,
      setupWizardDismissedAt: new Date().toISOString(),
      setupWizardLastStep: Math.max(settings.setupWizardLastStep || 0, activeStep),
    });
    onClose();
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => (Math.max(prev - 1, 1) as SetupStep));
    setStatusMessage(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="setup-wizard-overlay" role="dialog" aria-modal="true">
      <div className="setup-wizard-modal">
        <header className="setup-wizard-header">
          <div>
            <p className="setup-wizard-eyebrow">Secure onboarding</p>
            <h2>Finish setting up Otto AI</h2>
          </div>
          <button className="setup-wizard-close" onClick={handleSkipWizard} aria-label="Skip setup for now">
            ×
          </button>
        </header>

        <div className="setup-wizard-steps">
          {wizardProgress.map((label, index) => {
            const stepNumber = (index + 1) as SetupStep;
            const isActive = stepNumber === activeStep;
            const isCompleted = settings.setupWizardLastStep !== undefined && (settings.setupWizardLastStep >= stepNumber);
            return (
              <div
                key={label}
                className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <span className="wizard-step-number">{stepNumber}</span>
                <span className="wizard-step-label">{label}</span>
              </div>
            );
          })}
        </div>

        <div className="setup-wizard-body">
          {activeStep === 1 && (
            <section>
              <h3>Welcome to Otto AI</h3>
              <p>Let’s securely store your API keys one time so you can focus on building automations.</p>
              <ul className="wizard-list">
                <li>🔒 Keys are encrypted locally (AES-GCM) before storage.</li>
                <li>🧠 Set a Gemini API key to unlock AI chat and script generation.</li>
                <li>☁️ Add Supabase (optional) to sync scripts across devices.</li>
              </ul>
            </section>
          )}

          {activeStep === 2 && (
            <section>
              <h3>Gemini API Key</h3>
              <p>Required for chat, script generation, and AI-powered features.</p>
              <label htmlFor="wizard-gemini-key">Gemini API Key</label>
              <input
                id="wizard-gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setGeminiError(null);
                }}
                placeholder="Paste your key from Google AI Studio"
                className={geminiError ? 'has-error' : ''}
              />
              {geminiError && <div className="wizard-error">{geminiError}</div>}
              <p className="wizard-field-hint">
                Tip: Keys start with <code>AI</code> and are at least 20 characters.
              </p>
            </section>
          )}

          {activeStep === 3 && (
            <section>
              <h3>Supabase (Optional)</h3>
              <p>Enable cloud sync so scripts and settings follow you to other devices.</p>
              <label htmlFor="wizard-supabase-project">Project Name</label>
              <div className="wizard-supabase-input">
                <span>https://</span>
                <input
                  id="wizard-supabase-project"
                  type="text"
                  value={supabaseProject}
                  onChange={(e) => {
                    setSupabaseProject(e.target.value);
                    setSupabaseError(null);
                  }}
                  placeholder="your-project"
                />
                <span>.supabase.co</span>
              </div>
              <label htmlFor="wizard-supabase-key">Supabase API Key</label>
              <input
                id="wizard-supabase-key"
                type="password"
                value={supabaseKey}
                onChange={(e) => {
                  setSupabaseKey(e.target.value);
                  setSupabaseError(null);
                }}
                placeholder="anon/public key"
                className={supabaseError ? 'has-error' : ''}
              />
              {supabaseError && <div className="wizard-error">{supabaseError}</div>}
              <p className="wizard-field-hint">
                Leave blank to stay in local-only mode. You can add Supabase later.
              </p>
            </section>
          )}

          {activeStep === 4 && (
            <section>
              <h3>Choose Storage Mode</h3>
              <p>Pick where your scripts live by default. You can change this anytime.</p>
              <div className="wizard-storage-options">
                <button
                  type="button"
                  className={storageMode === 'localStorage' ? 'selected' : ''}
                  onClick={() => setStorageMode('localStorage')}
                >
                  <strong>Local Device</strong>
                  <span>Offline-first, fastest option</span>
                </button>
                <button
                  type="button"
                  className={storageMode === 'supabase' ? 'selected' : ''}
                  onClick={() => setStorageMode('supabase')}
                  disabled={!settings.supabaseUrl || !settings.supabaseApiKey}
                  title={!settings.supabaseUrl || !settings.supabaseApiKey ? 'Add Supabase credentials first' : ''}
                >
                  <strong>Supabase Cloud</strong>
                  <span>Multi-device sync</span>
                </button>
              </div>
            </section>
          )}

          {activeStep === 5 && (
            <section className="wizard-summary">
              <h3>All set!</h3>
              <p>Your API keys are encrypted and ready to use.</p>
              <ul className="wizard-list">
                <li>{settings.geminiApiKey ? '✅ Gemini API key configured' : '⚠️ Gemini API key missing'}</li>
                <li>{settings.supabaseUrl && settings.supabaseApiKey ? '✅ Supabase sync ready' : '• Supabase optional (you can add later)'}</li>
                <li>{settings.storageMode === 'supabase' ? '☁️ Cloud sync enabled' : '💾 Local device mode active'}</li>
              </ul>
              <p>Need to make changes later? Visit Settings → Quick Setup.</p>
            </section>
          )}
        </div>

        {statusMessage && <div className="wizard-status">{statusMessage}</div>}

        <footer className="setup-wizard-footer">
          <div className="wizard-footer-left">
            {activeStep > 1 && activeStep < 5 && (
              <button type="button" className="link-button" onClick={handleBack} disabled={isSaving}>
                Back
              </button>
            )}
            {activeStep < 5 && (
              <button type="button" className="link-button" onClick={handleSkipWizard} disabled={isSaving}>
                Skip for now
              </button>
            )}
          </div>
          <div className="wizard-footer-right">
            {activeStep === 1 && (
              <button type="button" className="primary" onClick={() => setActiveStep(2)}>
                Start secure setup
              </button>
            )}
            {activeStep === 2 && (
              <button type="button" className="primary" onClick={handleGeminiNext} disabled={isSaving}>
                Save & Continue
              </button>
            )}
            {activeStep === 3 && (
              <button type="button" className="primary" onClick={handleSupabaseNext} disabled={isSaving}>
                Continue
              </button>
            )}
            {activeStep === 4 && (
              <button type="button" className="primary" onClick={handleStorageNext} disabled={isSaving}>
                Continue
              </button>
            )}
            {activeStep === 5 && (
              <button type="button" className="primary" onClick={handleFinish} disabled={isSaving}>
                Finish
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SetupWizard;

