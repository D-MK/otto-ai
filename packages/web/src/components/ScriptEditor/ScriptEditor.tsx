/**
 * ScriptEditor component - create and edit scripts
 */

import React, { useState, useEffect } from 'react';
import { Script, ParameterDef, ExecutionType } from '@otto-ai/core';
import { useConversationStore } from '../../stores/conversation';
import './ScriptEditor.css';

interface ScriptEditorProps {
  onClose: () => void;
  onScriptSaved?: () => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'type-asc' | 'type-desc';

const ScriptEditor: React.FC<ScriptEditorProps> = ({ onClose, onScriptSaved }) => {
  const { scriptStorage, router, settings, saveSettings } = useConversationStore();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>((settings as any).scriptSortPreference || 'name-asc');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [triggerPhrases, setTriggerPhrases] = useState('');
  const [executionType, setExecutionType] = useState<ExecutionType>('local');
  const [code, setCode] = useState('');
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [parameters, setParameters] = useState<ParameterDef[]>([]);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = () => {
    if (scriptStorage) {
      const allScripts = scriptStorage.getAll();
      setScripts(allScripts);
    }
  };

  // Get all unique tags from all scripts
  const allTags = Array.from(new Set(scripts.flatMap(script => script.tags))).sort();

  // Filter scripts by search query and tags
  const filteredScripts = scripts.filter(script => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Tag filter
    const matchesTags = selectedTags.size === 0 ||
      script.tags.some(tag => selectedTags.has(tag));

    return matchesSearch && matchesTags;
  });

  // Sort filtered scripts
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    switch (sortBy) {
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
    setSearchQuery('');
    setSelectedTags(new Set());
  };

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    // Save to settings
    try {
      await saveSettings({
        ...settings,
        scriptSortPreference: newSort,
      } as any);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  };

  const handleNewScript = () => {
    setSelectedScript(null);
    setIsEditing(true);
    resetForm();
  };

  const handleEditScript = (script: Script) => {
    setSelectedScript(script);
    setIsEditing(true);
    setName(script.name);
    setDescription(script.description);
    setTags(script.tags.join(', '));
    setTriggerPhrases(script.triggerPhrases.join('\n'));
    setExecutionType(script.executionType);
    setCode(script.code || '');
    setMcpEndpoint(script.mcpEndpoint || '');
    setParameters(script.parameters);
  };

  const handleSave = () => {
    if (!scriptStorage || !router) return;

    // Validation
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Script name is required' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    if (triggerPhrases.split('\n').filter(t => t.trim()).length === 0) {
      setFeedback({ type: 'error', message: 'At least one trigger phrase is required' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      const scriptData = {
        name,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        triggerPhrases: triggerPhrases.split('\n').map(t => t.trim()).filter(Boolean),
        parameters,
        executionType,
        code: executionType === 'local' ? code : undefined,
        mcpEndpoint: executionType === 'mcp' ? mcpEndpoint : undefined,
      };

      if (selectedScript) {
        scriptStorage.update(selectedScript.id, scriptData);
        setFeedback({ type: 'success', message: 'Script updated successfully!' });
      } else {
        scriptStorage.create(scriptData);
        setFeedback({ type: 'success', message: 'Script created successfully!' });
      }

      router.refreshScripts();
      loadScripts();
      setIsEditing(false);
      resetForm();

      // Notify parent that script was saved
      if (onScriptSaved) {
        onScriptSaved();
      }

      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error('Error saving script:', error);
      setFeedback({ type: 'error', message: 'Failed to save script. Please try again.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (!scriptStorage || !router) return;
    if (confirm('Are you sure you want to delete this script?')) {
      try {
        scriptStorage.delete(id);
        router.refreshScripts();
        loadScripts();
        if (selectedScript?.id === id) {
          setIsEditing(false);
          resetForm();
        }

        // Notify parent that script was deleted
        if (onScriptSaved) {
          onScriptSaved();
        }

        setFeedback({ type: 'success', message: 'Script deleted successfully!' });
        setTimeout(() => setFeedback(null), 3000);
      } catch (error) {
        console.error('Error deleting script:', error);
        setFeedback({ type: 'error', message: 'Failed to delete script. Please try again.' });
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags('');
    setTriggerPhrases('');
    setExecutionType('local');
    setCode('');
    setMcpEndpoint('');
    setParameters([]);
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: '', type: 'string', required: true, prompt: '' },
    ]);
  };

  const updateParameter = (index: number, updates: Partial<ParameterDef>) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], ...updates };
    setParameters(newParams);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  return (
    <div className="script-editor-overlay">
      <div className="script-editor">
        <div className="editor-header">
          <h2>Script Manager</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {feedback && (
          <div className={`feedback-banner ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="editor-content">
          <div className="script-list">
            <div className="list-header">
              <h3>Scripts</h3>
              <button onClick={handleNewScript} className="new-button">+ New</button>
            </div>

            <div className="search-sort-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search scripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="type-asc">Type (A-Z)</option>
                <option value="type-desc">Type (Z-A)</option>
              </select>
            </div>

            {allTags.length > 0 && (
              <div className="tag-filter-section">
                <div className="tag-filter-header">
                  <span className="filter-label">Filter by tags:</span>
                  {selectedTags.size > 0 && (
                    <button className="clear-filters-btn" onClick={clearFilters}>
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

            <div className="scripts">
              {sortedScripts.length === 0 ? (
                <div className="no-scripts">
                  {searchQuery || selectedTags.size > 0 ? 'No scripts match your filters' : 'No scripts available'}
                </div>
              ) : (
                sortedScripts.map(script => (
                  <div
                    key={script.id}
                    className={`script-item ${selectedScript?.id === script.id ? 'selected' : ''}`}
                    onClick={() => handleEditScript(script)}
                  >
                    <div className="script-name">{script.name}</div>
                    <div className="script-type">{script.executionType}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {isEditing && (
            <div className="script-form">
              <h3>{selectedScript ? 'Edit Script' : 'New Script'}</h3>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., BMI Calculator"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Used for intent matching..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="health, calculator, fitness"
                />
              </div>

              <div className="form-group">
                <label>Trigger Phrases (one per line)</label>
                <textarea
                  value={triggerPhrases}
                  onChange={e => setTriggerPhrases(e.target.value)}
                  placeholder="calculate my bmi&#10;what's my body mass index"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Execution Type</label>
                <select
                  value={executionType}
                  onChange={e => setExecutionType(e.target.value as ExecutionType)}
                >
                  <option value="local">Local (JavaScript)</option>
                  <option value="mcp">MCP (External API)</option>
                </select>
              </div>

              {executionType === 'local' && (
                <div className="form-group">
                  <label>Code</label>
                  <textarea
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="return 'Hello, ' + name;"
                    rows={8}
                    className="code-textarea"
                  />
                </div>
              )}

              {executionType === 'mcp' && (
                <div className="form-group">
                  <label>MCP Endpoint</label>
                  <input
                    type="text"
                    value={mcpEndpoint}
                    onChange={e => setMcpEndpoint(e.target.value)}
                    placeholder="/api/endpoint"
                  />
                </div>
              )}

              <div className="form-group">
                <div className="section-header">
                  <label>Parameters</label>
                  <button onClick={addParameter} className="add-param-button">+ Add Parameter</button>
                </div>

                {parameters.map((param, index) => (
                  <div key={index} className="parameter-item">
                    <input
                      type="text"
                      value={param.name}
                      onChange={e => updateParameter(index, { name: e.target.value })}
                      placeholder="Parameter name"
                      className="param-name"
                    />
                    <select
                      value={param.type}
                      onChange={e => updateParameter(index, { type: e.target.value as any })}
                      className="param-type"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="param-required">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={e => updateParameter(index, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <input
                      type="text"
                      value={param.prompt}
                      onChange={e => updateParameter(index, { prompt: e.target.value })}
                      placeholder="Prompt for this parameter"
                      className="param-prompt"
                    />
                    <button onClick={() => removeParameter(index)} className="remove-param">✕</button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button onClick={handleSave} className="save-button">Save</button>
                <button onClick={() => setIsEditing(false)} className="cancel-button">Cancel</button>
                {selectedScript && (
                  <button
                    onClick={() => handleDelete(selectedScript.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
