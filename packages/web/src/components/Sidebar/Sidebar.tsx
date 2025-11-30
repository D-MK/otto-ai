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
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

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

  // Filter scripts based on selected tags
  const filteredScripts = scripts.filter(script => {
    if (selectedTags.size === 0) return true;
    return script.tags.some(tag => selectedTags.has(tag));
  });

  // Get all unique tags from all scripts
  const allTags = Array.from(new Set(scripts.flatMap(script => script.tags))).sort();

  const toggleTag = (tag: string) => {
    const newSelectedTags = new Set(selectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setSelectedTags(newSelectedTags);
  };

  const clearFilters = () => {
    setSelectedTags(new Set());
  };

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

          {allTags.length > 0 && (
            <div className="tag-filter-section">
              <div className="tag-filter-header">
                <span className="filter-label">Filter by tags:</span>
                {selectedTags.size > 0 && (
                  <button className="clear-filters-button" onClick={clearFilters}>
                    Clear ({selectedTags.size})
                  </button>
                )}
              </div>
              <div className="tag-filters">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`tag-filter-chip ${selectedTags.has(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="scripts-list">
            {filteredScripts.length === 0 ? (
              <div className="no-scripts">
                {selectedTags.size > 0 ? 'No scripts match selected tags' : 'No scripts available'}
              </div>
            ) : (
              filteredScripts.map((script) => (
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
