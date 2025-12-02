/**
 * AppHeader component - shared header visible in all tabs
 */

import React, { useState, useRef, useEffect } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { OttoLogo } from '../OttoLogo/OttoLogo';
import { HelpIcon } from '../Icons/Icons';
import OnboardingGuide from '../OnboardingGuide/OnboardingGuide';
import './AppHeader.css';

interface AppHeaderProps {
  onDebugClick?: () => void;
  onSettingsClick?: () => void;
  showDebug?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onDebugClick, onSettingsClick, showDebug = false }) => {
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  const {
    ttsEnabled,
    toggleTTS,
    isAuthenticated,
    currentUser,
    logout,
  } = useConversationStore();

  // Close help menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false);
      }
    };

    if (showHelpMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showHelpMenu]);

  const handleOnboardingClick = () => {
    setShowOnboarding(true);
    setShowHelpMenu(false);
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
    setShowHelpMenu(false);
  };

  const handleDebugClick = () => {
    if (onDebugClick) {
      onDebugClick();
    }
    setShowHelpMenu(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowHelpMenu(false);
  };

  return (
    <>
      <div className="app-header-container">
        <h2 className="app-title">
          <span className="app-title-part">Otto</span>
          <OttoLogo size={45} />
          <span className="app-title-part">AI</span>
        </h2>
        <div className="header-buttons">
          <button
            className={`tts-toggle ${ttsEnabled ? 'active' : ''}`}
            onClick={toggleTTS}
            title={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
          >
            {ttsEnabled ? '🔊' : '🔇'}
          </button>
          <div className="help-menu-container" ref={helpMenuRef}>
            <button
              className="help-button"
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              title="Help & Settings"
            >
              <HelpIcon size={24} />
            </button>
            {showHelpMenu && (
              <div className="help-menu">
                <button className="help-menu-item" onClick={handleOnboardingClick}>
                  📚 Getting Started Guide
                </button>
                {onSettingsClick && (
                  <button className="help-menu-item" onClick={handleSettingsClick}>
                    ⚙️ Settings
                  </button>
                )}
                {onDebugClick && (
                  <button className="help-menu-item" onClick={handleDebugClick}>
                    🐛 {showDebug ? 'Hide' : 'Show'} Debug
                  </button>
                )}
                {isAuthenticated && currentUser && (
                  <>
                    <div className="help-menu-divider" />
                    <div className="help-menu-email">{currentUser.email}</div>
                    <button className="help-menu-item" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showOnboarding && <OnboardingGuide onClose={() => setShowOnboarding(false)} />}
    </>
  );
};

export default AppHeader;

