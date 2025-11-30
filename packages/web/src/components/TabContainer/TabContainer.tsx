/**
 * TabContainer component - provides tabbed interface for Chat, Scripts, and Notes
 */

import React, { useState } from 'react';
import './TabContainer.css';

export type TabType = 'chat' | 'scripts' | 'notes';

interface TabContainerProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabContainer: React.FC<TabContainerProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="tab-container">
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onTabChange('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab-button ${activeTab === 'scripts' ? 'active' : ''}`}
          onClick={() => onTabChange('scripts')}
        >
          📜 Scripts
        </button>
        <button
          className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => onTabChange('notes')}
        >
          📝 Notes
        </button>
      </div>
      <div className="tab-content">
        {children}
      </div>
    </div>
  );
};

export default TabContainer;
