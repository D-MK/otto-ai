/**
 * Sidebar component - displays existing scripts with keywords and navigation tabs
 */

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { Script, Note, NoteFilter, NoteSortOption } from '@otto-ai/core';
import { ChatIcon, ScriptsIcon, NotesIcon, MagicWandIcon, SettingsIcon, ApiKeysIcon, McpServerIcon, SyncIcon, AiPromptIcon, AppearanceIcon } from '../Icons/Icons';
import { TabType } from '../TabContainer/TabContainer';
import { SettingsSection } from '../Settings/Settings';
import { logger } from '../../utils/logger';
import NoteList from '../Notes/NoteList';
import './Sidebar.css';

export interface SidebarHandle {
  refresh: () => void;
  refreshNotes: () => void;
  toggleSidebar: () => void;
  isCollapsed: () => boolean;
}

interface SidebarProps {
  onKeywordClick: (keyword: string) => void;
  onGenerateClick: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onScriptSelect?: (script: Script | null) => void;
  onNoteSelect?: (note: Note | null) => void;
  selectedScriptId?: string | null;
  selectedNoteId?: string | null;
  activeSettingsSection?: SettingsSection;
  onSettingsSectionChange?: (section: SettingsSection) => void;
  onCollapsedChange?: (isCollapsed: boolean) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'type-asc' | 'type-desc';

const Sidebar = forwardRef<SidebarHandle, SidebarProps>(({
  onKeywordClick,
  onGenerateClick,
  activeTab,
  onTabChange,
  onScriptSelect,
  onNoteSelect,
  selectedScriptId,
  selectedNoteId,
  activeSettingsSection,
  onSettingsSectionChange,
  onCollapsedChange
}, ref) => {
  const { scriptStorage, noteStorage, settings, saveSettings, loadNotes } = useConversationStore();
  const [scripts, setScripts] = useState<Script[]>([]);
  // Default to collapsed on mobile
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  // Chat tab - scripts list state
  const [chatSelectedTags, setChatSelectedTags] = useState<Set<string>>(new Set());
  const [expandedTagsScripts, setExpandedTagsScripts] = useState<Set<string>>(new Set());

  // Scripts tab - manager state
  const [scriptsSearchQuery, setScriptsSearchQuery] = useState('');
  const [scriptsSortBy, setScriptsSortBy] = useState<SortOption>((settings as any)?.scriptSortPreference || 'name-asc');
  const [scriptsSelectedTags, setScriptsSelectedTags] = useState<Set<string>>(new Set());
  
  // Notes tab - manager state
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [notesSortBy, setNotesSortBy] = useState<NoteSortOption>((settings as any)?.noteSortPreference || 'pinned-first');
  const [notesSelectedTags, setNotesSelectedTags] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Filter sections collapsed state
  const [chatFiltersExpanded, setChatFiltersExpanded] = useState(false);
  const [scriptsFiltersExpanded, setScriptsFiltersExpanded] = useState(false);
  const [notesFiltersExpanded, setNotesFiltersExpanded] = useState(false);

  const loadScripts = () => {
    if (scriptStorage) {
      const loadedScripts = scriptStorage.getAll();
      setScripts(loadedScripts);
    }
  };

  const loadNotesData = () => {
    if (noteStorage) {
      loadNotes();
    }
  };

  // Notify parent when collapsed state changes
  useEffect(() => {
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  useImperativeHandle(ref, () => ({
    refresh: loadScripts,
    refreshNotes: loadNotesData,
    toggleSidebar: () => {
      setIsCollapsed(!isCollapsed);
    },
    isCollapsed: () => isCollapsed,
  }));

  useEffect(() => {
    loadScripts();
  }, [scriptStorage]);

  useEffect(() => {
    loadNotesData();
  }, [noteStorage]);

  // Chat tab - filter scripts based on selected tags
  const chatFilteredScripts = scripts.filter(script => {
    if (chatSelectedTags.size === 0) return true;
    return script.tags.some(tag => chatSelectedTags.has(tag));
  });

  // Scripts tab - filter and sort scripts
  const scriptsFilteredScripts = scripts.filter(script => {
    const matchesSearch = scriptsSearchQuery === '' ||
      script.name.toLowerCase().includes(scriptsSearchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(scriptsSearchQuery.toLowerCase());
    const matchesTags = scriptsSelectedTags.size === 0 ||
      script.tags.some(tag => scriptsSelectedTags.has(tag));
    return matchesSearch && matchesTags;
  });

  const scriptsSortedScripts = [...scriptsFilteredScripts].sort((a, b) => {
    switch (scriptsSortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'type-asc':
        return a.executionType.localeCompare(b.executionType);
      case 'type-desc':
        return b.executionType.localeCompare(a.executionType);
      default:
        return 0;
    }
  });

  // Notes tab - filter and sort notes
  const notesFilter: NoteFilter = {
    searchQuery: notesSearchQuery || undefined,
    tags: notesSelectedTags.size > 0 ? Array.from(notesSelectedTags) : undefined,
    isPinned: showPinnedOnly ? true : undefined,
  };

  const notesFilteredNotes = noteStorage ? noteStorage.search(notesFilter) : [];
  const notesSortedNotes = noteStorage ? noteStorage.sort(notesFilteredNotes, notesSortBy) : [];

  // Get all unique tags from all scripts
  const allScriptTags = Array.from(new Set(scripts.flatMap(script => script.tags))).sort();
  const allNoteTags = noteStorage ? noteStorage.getAllTags() : [];

  const toggleChatTag = (tag: string) => {
    const newSelectedTags = new Set(chatSelectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setChatSelectedTags(newSelectedTags);
  };

  const toggleScriptsTag = (tag: string) => {
    const newSelectedTags = new Set(scriptsSelectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setScriptsSelectedTags(newSelectedTags);
  };

  const toggleNotesTag = (tag: string) => {
    const newSelectedTags = new Set(notesSelectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setNotesSelectedTags(newSelectedTags);
  };

  const clearChatFilters = () => {
    setChatSelectedTags(new Set());
  };

  const clearScriptsFilters = () => {
    setScriptsSearchQuery('');
    setScriptsSelectedTags(new Set());
  };

  const clearNotesFilters = () => {
    setNotesSearchQuery('');
    setNotesSelectedTags(new Set());
    setShowPinnedOnly(false);
  };

  const handleScriptsSortChange = async (newSort: SortOption) => {
    setScriptsSortBy(newSort);
    try {
      await saveSettings({
        ...settings,
        scriptSortPreference: newSort,
      } as any);
    } catch (error) {
      logger.error('Failed to save sort preference:', error);
    }
  };

  const handleNotesSortChange = async (newSort: NoteSortOption) => {
    setNotesSortBy(newSort);
    try {
      await saveSettings({
        ...settings,
        noteSortPreference: newSort,
      } as any);
    } catch (error) {
      logger.error('Failed to save sort preference:', error);
    }
  };

  const handleScriptClick = (script: Script) => {
    if (onScriptSelect) {
      onScriptSelect(script);
    }
    // Auto-close sidebar on mobile when script is selected
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  const handleNoteClick = (note: Note) => {
    if (onNoteSelect) {
      onNoteSelect(note);
    }
    // Auto-close sidebar on mobile when note is selected
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const { deleteNote } = useConversationStore.getState();
      deleteNote(id);
      loadNotesData();
      if (selectedNoteId === id && onNoteSelect) {
        onNoteSelect(null);
      }
    }
  };

  const handlePinToggle = (id: string) => {
    if (!noteStorage) return;
    const note = noteStorage.get(id);
    if (note) {
      if (note.isPinned) {
        noteStorage.unpin(id);
      } else {
        noteStorage.pin(id);
      }
      loadNotesData();
    }
  };

  const notesActiveFiltersCount =
    (notesSearchQuery ? 1 : 0) +
    notesSelectedTags.size +
    (showPinnedOnly ? 1 : 0);

  const getKeywordFromTrigger = (trigger: string): string => {
    // Extract the first 2-3 words as keyword
    const words = trigger.split(' ').slice(0, 3);
    return words.join(' ');
  };

  const toggleTagsExpansion = (scriptId: string) => {
    const newExpanded = new Set(expandedTagsScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedTagsScripts(newExpanded);
  };

  const truncateDescription = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div
          className="sidebar-backdrop mobile-only"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      <div className={`sidebar ${!isCollapsed ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        {/* Generate Script button */}
        {!isCollapsed && (
          <button className="generate-script-button" onClick={onGenerateClick}>
            <MagicWandIcon size={16} style={{ marginRight: '0.5rem' }} />
            Generate Script
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>

          {/* Navigation Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => onTabChange('chat')}
              title="Chat"
            >
              <ChatIcon size={18} />
              <span>Chat</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'scripts' ? 'active' : ''}`}
              onClick={() => onTabChange('scripts')}
              title="Scripts"
            >
              <ScriptsIcon size={18} />
              <span>Scripts</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => onTabChange('notes')}
              title="Notes"
            >
              <NotesIcon size={18} />
              <span>Notes</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => onTabChange('settings')}
              title="Settings"
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </button>
          </div>

          {/* Chat Tab - Scripts List */}
          {activeTab === 'chat' && (
            <>
              {allScriptTags.length > 0 && (
                <div className="tag-filter-section">
                  <div 
                    className="tag-filter-header" 
                    onClick={() => setChatFiltersExpanded(!chatFiltersExpanded)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="filter-label">Filter by tags:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {chatSelectedTags.size > 0 && (
                        <button 
                          className="clear-filters-button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearChatFilters();
                          }}
                        >
                          Clear ({chatSelectedTags.size})
                        </button>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {chatFiltersExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  {chatFiltersExpanded && (
                    <div className="tag-filters">
                      {allScriptTags.map((tag) => (
                        <button
                          key={tag}
                          className={`tag-filter-chip ${chatSelectedTags.has(tag) ? 'active' : ''}`}
                          onClick={() => toggleChatTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="scripts-list" id="scripts-list">
                {chatFilteredScripts.length === 0 ? (
                  <div className="no-scripts">
                    {chatSelectedTags.size > 0 ? 'No scripts match selected tags' : 'No scripts available'}
                  </div>
                ) : (
                  chatFilteredScripts.map((script) => (
                    <div
                      key={script.id}
                      className="script-item"
                      onClick={() => onKeywordClick(script.triggerPhrases[0] || script.name)}
                      style={{ cursor: 'pointer' }}
                      title={`Click to use: "${script.triggerPhrases[0] || script.name}"`}
                    >
                      <div className="script-name">{script.name}</div>
                      <div className="script-description">{truncateDescription(script.description)}</div>
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
                        {(expandedTagsScripts.has(script.id) ? script.tags : script.tags.slice(0, 2)).map((tag: string, idx: number) => (
                          <span key={idx} className="tag">
                            {tag}
                          </span>
                        ))}
                        {script.tags.length > 2 && (
                          <span
                            className="tag tag-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTagsExpansion(script.id);
                            }}
                            style={{ cursor: 'pointer', fontWeight: 500 }}
                          >
                            {expandedTagsScripts.has(script.id)
                              ? '- show less'
                              : `+ ${script.tags.length - 2} more`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Scripts Tab - Script Manager */}
          {activeTab === 'scripts' && (
            <>
              <div className="sidebar-section-header">
                <h3>Scripts</h3>
                <button 
                  className="new-script-button" 
                  onClick={() => onScriptSelect && onScriptSelect(null)}
                  title="Create new script"
                >
                  + New
                </button>
              </div>

              <div className="search-sort-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search scripts..."
                  value={scriptsSearchQuery}
                  onChange={(e) => setScriptsSearchQuery(e.target.value)}
                />
                <select
                  className="sort-select"
                  value={scriptsSortBy}
                  onChange={(e) => handleScriptsSortChange(e.target.value as SortOption)}
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="type-asc">Type (A-Z)</option>
                  <option value="type-desc">Type (Z-A)</option>
                </select>
              </div>

              <div className="scripts-list">
                {scriptsSortedScripts.length === 0 ? (
                  <div className="no-scripts">
                    {scriptsSearchQuery || scriptsSelectedTags.size > 0 ? 'No scripts match your filters' : 'No scripts available'}
                  </div>
                ) : (
                  scriptsSortedScripts.map(script => (
                    <div
                      key={script.id}
                      className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                      onClick={() => handleScriptClick(script)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="script-header">
                        <div className="script-name">{script.name}</div>
                        <div className="script-type">{script.executionType}</div>
                      </div>
                      {script.tags && script.tags.length > 0 && (
                        <div className="script-tags">
                          {script.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span key={idx} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {allScriptTags.length > 0 && (
                <div className="tag-filter-section">
                  <div 
                    className="tag-filter-header" 
                    onClick={() => setScriptsFiltersExpanded(!scriptsFiltersExpanded)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="filter-label">Filter by tags:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {scriptsSelectedTags.size > 0 && (
                        <button 
                          className="clear-filters-button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearScriptsFilters();
                          }}
                        >
                          Clear ({scriptsSelectedTags.size})
                        </button>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {scriptsFiltersExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  {scriptsFiltersExpanded && (
                    <div className="tag-filters">
                      {allScriptTags.map((tag) => (
                        <button
                          key={tag}
                          className={`tag-filter-chip ${scriptsSelectedTags.has(tag) ? 'active' : ''}`}
                          onClick={() => toggleScriptsTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Notes Tab - Notes Manager */}
          {activeTab === 'notes' && (
            <>
              <div className="sidebar-section-header">
                <h3>All Notes ({notesSortedNotes.length})</h3>
                <button 
                  className="new-note-button" 
                  onClick={() => onNoteSelect && onNoteSelect(null)}
                  title="Create new note"
                >
                  + New
                </button>
              </div>

              <div className="search-sort-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search notes..."
                  value={notesSearchQuery}
                  onChange={(e) => setNotesSearchQuery(e.target.value)}
                />
                <select
                  className="sort-select"
                  value={notesSortBy}
                  onChange={(e) => handleNotesSortChange(e.target.value as NoteSortOption)}
                >
                  <option value="pinned-first">Pinned First</option>
                  <option value="updated-desc">Recently Updated</option>
                  <option value="updated-asc">Least Recently Updated</option>
                  <option value="created-desc">Newest First</option>
                  <option value="created-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
              </div>

              <div className="note-list">
                <NoteList
                  notes={notesSortedNotes}
                  selectedId={selectedNoteId || undefined}
                  onSelectNote={handleNoteClick}
                  onDeleteNote={handleDeleteNote}
                  onPinToggle={handlePinToggle}
                />
              </div>

              <div className="filter-controls">
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={showPinnedOnly}
                    onChange={(e) => setShowPinnedOnly(e.target.checked)}
                  />
                  Show pinned only
                </label>

                {notesActiveFiltersCount > 0 && (
                  <button className="clear-filters-btn" onClick={clearNotesFilters}>
                    Clear all ({notesActiveFiltersCount})
                  </button>
                )}
              </div>

              {allNoteTags.length > 0 && (
                <div className="tag-filter-section">
                  <div 
                    className="tag-filter-header" 
                    onClick={() => setNotesFiltersExpanded(!notesFiltersExpanded)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="filter-label">Filter by tags:</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {notesFiltersExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                  {notesFiltersExpanded && (
                    <div className="tag-filters">
                      {allNoteTags.map((tag) => (
                        <button
                          key={tag}
                          className={`tag-filter-chip ${notesSelectedTags.has(tag) ? 'active' : ''}`}
                          onClick={() => toggleNotesTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Settings Tab - Settings Sections */}
          {activeTab === 'settings' && (
            <div className="settings-sidebar">
              <div className="settings-sidebar-header">
                <h3>Settings</h3>
              </div>
              <div className="settings-sections">
                <button
                  className={`settings-section-item ${activeSettingsSection === 'api-keys' ? 'active' : ''}`}
                  onClick={() => {
                    onSettingsSectionChange?.('api-keys');
                    // Auto-close sidebar on mobile when section is selected
                    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <ApiKeysIcon className="settings-section-icon" size={18} />
                  <span>API Keys</span>
                </button>
                <button
                  className={`settings-section-item ${activeSettingsSection === 'mcp-servers' ? 'active' : ''}`}
                  onClick={() => {
                    onSettingsSectionChange?.('mcp-servers');
                    // Auto-close sidebar on mobile when section is selected
                    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <McpServerIcon className="settings-section-icon" size={18} />
                  <span>MCP Servers</span>
                </button>
                <button
                  className={`settings-section-item ${activeSettingsSection === 'sync' ? 'active' : ''}`}
                  onClick={() => {
                    onSettingsSectionChange?.('sync');
                    // Auto-close sidebar on mobile when section is selected
                    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <SyncIcon className="settings-section-icon" size={18} />
                  <span>Sync & Export</span>
                </button>
                <button
                  className={`settings-section-item ${activeSettingsSection === 'ai-prompt' ? 'active' : ''}`}
                  onClick={() => {
                    onSettingsSectionChange?.('ai-prompt');
                    // Auto-close sidebar on mobile when section is selected
                    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <AiPromptIcon className="settings-section-icon" size={18} />
                  <span>AI Prompt</span>
                </button>
                <button
                  className={`settings-section-item ${activeSettingsSection === 'appearance' ? 'active' : ''}`}
                  onClick={() => {
                    onSettingsSectionChange?.('appearance');
                    // Auto-close sidebar on mobile when section is selected
                    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <AppearanceIcon className="settings-section-icon" size={18} />
                  <span>Appearance</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
