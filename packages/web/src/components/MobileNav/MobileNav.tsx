/**
 * Mobile Navigation - Bottom tab bar for mobile devices
 */

import React from 'react';
import { TabType } from '../TabContainer/TabContainer';
import { ChatIcon, ScriptsIcon, NotesIcon, MagicWandIcon, SettingsIcon } from '../Icons/Icons';
import './MobileNav.css';

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onGenerateClick: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange, onGenerateClick }) => {
  return (
    <div className="mobile-nav">
      <button
        className={`mobile-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onTabChange('chat')}
        aria-label="Chat"
      >
        <ChatIcon size={24} />
      </button>
      <button
        className={`mobile-nav-item ${activeTab === 'scripts' ? 'active' : ''}`}
        onClick={() => onTabChange('scripts')}
        aria-label="Scripts"
      >
        <ScriptsIcon size={24} />
      </button>
      <button
        className={`mobile-nav-item ${activeTab === 'notes' ? 'active' : ''}`}
        onClick={() => onTabChange('notes')}
        aria-label="Notes"
      >
        <NotesIcon size={24} />
      </button>
      <button
        className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
        aria-label="Settings"
      >
        <SettingsIcon size={24} />
      </button>
      <button
        className="mobile-nav-generate"
        onClick={onGenerateClick}
        aria-label="Generate New Script"
      >
        <MagicWandIcon size={20} />
      </button>
    </div>
  );
};

export default MobileNav;

