/**
 * Sidebar component - displays existing scripts with keywords
 */

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { Script } from '@otto-ai/core';
import './Sidebar.css';

export interface SidebarHandle {
  refresh: () => void;
}

interface SidebarProps {
  onKeywordClick: (keyword: string) => void;
  onGenerateClick: () => void;
}

const Sidebar = forwardRef<SidebarHandle, SidebarProps>(({ onKeywordClick, onGenerateClick }, ref) => {
  const { scriptStorage } = useConversationStore();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadScripts = () => {
    if (scriptStorage) {
      const loadedScripts = scriptStorage.getAll();
      setScripts(loadedScripts);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: loadScripts,
  }));

  useEffect(() => {
    loadScripts();
  }, [scriptStorage]);

  const getKeywordFromTrigger = (trigger: string): string => {
    // Extract the first 2-3 words as keyword
    const words = trigger.split(' ').slice(0, 3);
    return words.join(' ');
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
        {!isCollapsed && <h3>Scripts</h3>}
      </div>

      {!isCollapsed && (
        <>
          <button className="generate-script-button" onClick={onGenerateClick}>
            ✨ Generate New Script
          </button>

          <div className="scripts-list">
            {scripts.length === 0 ? (
              <div className="no-scripts">No scripts available</div>
            ) : (
              scripts.map((script) => (
                <div
                  key={script.id}
                  className="script-item"
                  onClick={() => onKeywordClick(script.triggerPhrases[0] || script.name)}
                  style={{ cursor: 'pointer' }}
                  title={`Click to use: "${script.triggerPhrases[0] || script.name}"`}
                >
                  <div className="script-name">{script.name}</div>
                  <div className="script-description">{script.description}</div>
                  <div className="keywords">
                    {script.triggerPhrases.slice(0, 2).map((trigger: string, idx: number) => (
                      <button
                        key={idx}
                        className="keyword-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          onKeywordClick(trigger);
                        }}
                        title={`Click to use: "${trigger}"`}
                      >
                        {getKeywordFromTrigger(trigger)}
                      </button>
                    ))}
                  </div>
                  <div className="script-tags">
                    {script.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
