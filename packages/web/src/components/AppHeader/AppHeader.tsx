/**
 * AppHeader component - shared header visible in all tabs
 */

import React, { useState, useRef, useEffect } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { OttoLogo } from '../OttoLogo/OttoLogo';
import './AppHeader.css';

interface AppHeaderProps {
  onDebugClick?: () => void;
  onSettingsClick?: () => void;
  showDebug?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onDebugClick, onSettingsClick, showDebug = false }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const {
    ttsEnabled,
    toggleTTS,
    isAuthenticated,
    currentUser,
    logout,
  } = useConversationStore();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
    setShowUserMenu(false);
  };

  const handleDebugClick = () => {
    if (onDebugClick) {
      onDebugClick();
    }
    setShowUserMenu(false);
  };

  return (
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
        <div className="user-menu-container" ref={userMenuRef}>
          <button
            className="user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={isAuthenticated && currentUser ? currentUser.email : 'Menu'}
          >
            👤
          </button>
          {showUserMenu && (
            <div className="user-menu">
              {isAuthenticated && currentUser && (
                <div className="user-menu-email">{currentUser.email}</div>
              )}
              {onSettingsClick && (
                <button className="user-menu-item" onClick={handleSettingsClick}>
                  Settings
                </button>
              )}
              {onDebugClick && (
                <button className="user-menu-item" onClick={handleDebugClick}>
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              )}
              {isAuthenticated && currentUser && (
                <button className="user-menu-item" onClick={handleLogout}>
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppHeader;

