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
  selectedScript?: Script | null;
  onScriptChange?: (script: Script | null) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'type-asc' | 'type-desc';

const ScriptEditor: React.FC<ScriptEditorProps> = ({ onClose, onScriptSaved, selectedScript: propSelectedScript, onScriptChange }) => {
  const { scriptStorage, router, settings, saveSettings } = useConversationStore();
  const [selectedScript, setSelectedScript] = useState<Script | null>(propSelectedScript || null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Update local state when prop changes
  useEffect(() => {
    if (propSelectedScript) {
      setSelectedScript(propSelectedScript);
      setIsEditing(true);
      setName(propSelectedScript.name);
      setDescription(propSelectedScript.description);
      setTags(propSelectedScript.tags.join(', '));
      setTriggerPhrases(propSelectedScript.triggerPhrases.join('\n'));
      setExecutionType(propSelectedScript.executionType);
      setCode(propSelectedScript.code || '');
      setMcpEndpoint(propSelectedScript.mcpEndpoint || '');
      setParameters(propSelectedScript.parameters);
    } else {
      setIsEditing(false);
      resetForm();
    }
  }, [propSelectedScript]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [triggerPhrases, setTriggerPhrases] = useState('');
  const [executionType, setExecutionType] = useState<ExecutionType>('local');
  const [code, setCode] = useState('');
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [parameters, setParameters] = useState<ParameterDef[]>([]);

  const handleNewScript = () => {
    if (onScriptChange) {
      onScriptChange(null);
    }
    setSelectedScript(null);
    setIsEditing(true);
    resetForm();
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
      setIsEditing(false);
      resetForm();

      // Clear selection after saving
      if (onScriptChange) {
        onScriptChange(null);
      }

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
        if (selectedScript?.id === id) {
          setIsEditing(false);
          resetForm();
          if (onScriptChange) {
            onScriptChange(null);
          }
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

        {feedback && (
          <div className={`feedback-banner ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="editor-content">
          {!isEditing && (
            <div className="script-editor-empty-state">
              <div className="empty-state-content">
                <h3>No script selected</h3>
                <p>Select a script from the sidebar or create a new one</p>
                <button onClick={handleNewScript} className="new-button-large">
                  + Create New Script
                </button>
              </div>
            </div>
          )}

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
                  <button onClick={addParameter} className="add-param-button">
                    <span className="add-param-text">+ Add Parameter</span>
                    <span className="add-param-icon">+</span>
                  </button>
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
