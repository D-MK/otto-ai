/**
 * OnboardingGuide component - provides step-by-step guide for Supabase setup
 */

import React from 'react';
import './OnboardingGuide.css';

interface OnboardingGuideProps {
  onClose: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onClose }) => {
  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-header">
          <h2>Getting Started with Otto AI</h2>
          <button className="onboarding-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="onboarding-content">
          <section className="onboarding-section">
            <h3>🚀 Quick Start</h3>
            <p>Otto AI works immediately without any setup! You can:</p>
            <ul>
              <li>Chat with the AI assistant</li>
              <li>Create and manage scripts</li>
              <li>Take notes with AI-powered features</li>
            </ul>
            <p className="onboarding-note">
              <strong>Note:</strong> All data is stored locally in your browser by default.
            </p>
          </section>

          <section className="onboarding-section">
            <h3>☁️ Optional: Enable Cloud Sync (Supabase)</h3>
            <p>Want to sync your scripts across devices? Set up Supabase integration:</p>

            <div className="onboarding-steps">
              <div className="onboarding-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Create a Supabase Account</h4>
                  <p>Visit <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a> and sign up for a free account</p>
                </div>
              </div>

              <div className="onboarding-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Create a New Project</h4>
                  <p>Create a new project in your Supabase dashboard. Note your:</p>
                  <ul>
                    <li><strong>Project URL</strong> (e.g., https://xyz.supabase.co)</li>
                    <li><strong>API Key</strong> (anon/public key)</li>
                  </ul>
                </div>
              </div>

              <div className="onboarding-step">
                <div className="step-number">2.5</div>
                <div className="step-content">
                  <h4>Configure Site URL</h4>
                  <p>In your Supabase project, go to <strong>Authentication → URL Configuration</strong> and set:</p>
                  <ul>
                    <li><strong>Site URL</strong>: Your app's full URL
                      <ul>
                        <li>For GitHub Pages: <code>https://YOUR_USERNAME.github.io/REPO_NAME/</code></li>
                        <li>For custom domain: <code>https://yourdomain.com</code></li>
                        <li>For local development: <code>http://localhost:3000</code></li>
                      </ul>
                    </li>
                    <li><strong>Redirect URLs</strong>: Add your app URL (same as Site URL) to the allowed redirect URLs list</li>
                  </ul>
                  <p className="onboarding-note" style={{ marginTop: '0.5rem' }}>
                    <strong>Important:</strong> The Site URL must match your app's deployment URL exactly, including the base path (e.g., <code>/otto-ai/</code> for GitHub Pages).
                  </p>
                </div>
              </div>

              <div className="onboarding-step">
                <div className="step-number">2.6</div>
                <div className="step-content">
                  <h4>Enable Authentication Providers</h4>
                  <p>In your Supabase project, go to <strong>Authentication → Providers</strong> and enable:</p>
                  <ul>
                    <li><strong>Email</strong> - Toggle to enable email/password authentication</li>
                    <li><strong>GitHub</strong> (Optional) - For GitHub OAuth login
                      <ul>
                        <li>Create a GitHub OAuth App at <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer">github.com/settings/developers</a></li>
                        <li>Set Authorization callback URL to: <code>https://YOUR_PROJECT.supabase.co/auth/v1/callback</code></li>
                        <li>Copy Client ID and Client Secret to Supabase</li>
                      </ul>
                    </li>
                  </ul>
                  <p className="onboarding-note" style={{ marginTop: '0.5rem' }}>
                    <strong>Important:</strong> Without enabling Email provider, you won't be able to sign up or log in!
                  </p>
                </div>
              </div>

              <div className="onboarding-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Configure Otto AI</h4>
                  <p>Go to <strong>Settings → Supabase</strong> and enter:</p>
                  <ul>
                    <li>Your Supabase URL</li>
                    <li>Your Supabase API Key</li>
                    <li>Set Storage Mode to "Supabase"</li>
                  </ul>
                </div>
              </div>

              <div className="onboarding-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>Sign Up / Login</h4>
                  <p>Use the Auth tab to create an account or log in. Your scripts will now sync across all your devices!</p>
                </div>
              </div>
            </div>
          </section>

          <section className="onboarding-section">
            <h3>💡 Tips</h3>
            <ul>
              <li><strong>Local Mode:</strong> Works offline, data stays in your browser</li>
              <li><strong>Supabase Mode:</strong> Requires internet, enables multi-device sync</li>
              <li><strong>Settings:</strong> Access via the menu (gear icon) to configure API keys, themes, and more</li>
              <li><strong>Scripts:</strong> Create custom automation scripts or use AI to generate them</li>
            </ul>
          </section>

          <section className="onboarding-section onboarding-simplified">
            <h3>🎯 Simplified Setup</h3>
            <p><strong>Want to make this easier?</strong> Here are suggestions to simplify onboarding:</p>
            <div className="simplification-ideas">
              <div className="idea">
                <h4>1. Hosted Option</h4>
                <p>Deploy Otto AI with built-in Supabase project, so users only need to sign up—no configuration needed.</p>
              </div>
              <div className="idea">
                <h4>2. One-Click Setup</h4>
                <p>Create a Supabase template or CLI tool that auto-configures the project with proper tables and policies.</p>
              </div>
              <div className="idea">
                <h4>3. Setup Wizard</h4>
                <p>Add an in-app wizard that tests the connection and guides users through each step with validation.</p>
              </div>
              <div className="idea">
                <h4>4. Demo Mode</h4>
                <p>Offer a "Try It" mode with temporary cloud storage so users can test sync features before setting up Supabase.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="onboarding-footer">
          <button className="onboarding-button primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
