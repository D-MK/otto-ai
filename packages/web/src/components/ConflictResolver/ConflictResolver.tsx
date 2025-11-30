import React, { useState } from 'react';
import { ConflictResolution, SyncResult } from '../../services/syncService';
import { Script } from '../../services/supabaseStorage';
import './ConflictResolver.css';

interface ConflictResolverProps {
  isOpen: boolean;
  syncResult: SyncResult | null;
  onResolve: (resolutions: Map<string, ConflictResolution>) => Promise<void>;
  onCancel: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  isOpen,
  syncResult,
  onResolve,
  onCancel,
}) => {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || !syncResult) return null;

  const hasConflicts = syncResult.conflicts.length > 0;
  const hasLocalOnly = syncResult.localOnly.length > 0;
  const hasRemoteOnly = syncResult.remoteOnly.length > 0;
  const hasAnyChanges = hasConflicts || hasLocalOnly || hasRemoteOnly;

  const handleResolutionChange = (scriptId: string, resolution: ConflictResolution) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(scriptId, resolution);
    setResolutions(newResolutions);
  };

  const handleResolveAll = async (resolution: ConflictResolution) => {
    const newResolutions = new Map<string, ConflictResolution>();
    syncResult.conflicts.forEach((conflict) => {
      newResolutions.set(conflict.id, resolution);
    });
    setResolutions(newResolutions);
  };

  const handleSubmit = async () => {
    // Auto-select resolutions for any unresolved conflicts (default to newest)
    const finalResolutions = new Map(resolutions);
    for (const conflict of syncResult.conflicts) {
      if (!finalResolutions.has(conflict.id)) {
        const localDate = new Date(conflict.local.updatedAt).getTime();
        const remoteDate = new Date(conflict.remote.updatedAt).getTime();
        finalResolutions.set(conflict.id, localDate >= remoteDate ? 'local' : 'remote');
      }
    }

    setIsResolving(true);
    try {
      await onResolve(finalResolutions);
    } finally {
      setIsResolving(false);
    }
  };

  const toggleExpanded = (scriptId: string) => {
    setExpandedConflict(expandedConflict === scriptId ? null : scriptId);
  };

  const renderScriptDetails = (script: Script, label: string) => (
    <div className="script-details">
      <div className="script-details-header">{label}</div>
      <div className="script-detail-row">
        <span className="script-detail-label">Name:</span>
        <span>{script.name}</span>
      </div>
      <div className="script-detail-row">
        <span className="script-detail-label">Description:</span>
        <span>{script.description || '(none)'}</span>
      </div>
      <div className="script-detail-row">
        <span className="script-detail-label">Updated:</span>
        <span>{new Date(script.updatedAt).toLocaleString()}</span>
      </div>
      <div className="script-detail-row">
        <span className="script-detail-label">Tags:</span>
        <span>{script.tags.join(', ') || '(none)'}</span>
      </div>
      <div className="script-detail-row">
        <span className="script-detail-label">Triggers:</span>
        <span>{script.triggerPhrases.join(', ') || '(none)'}</span>
      </div>
      <div className="script-detail-row">
        <span className="script-detail-label">Type:</span>
        <span>{script.executionType}</span>
      </div>
    </div>
  );

  return (
    <div className="conflict-resolver-overlay" onClick={onCancel}>
      <div className="conflict-resolver-modal" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-resolver-header">
          <h2>Sync Conflicts</h2>
          <button className="conflict-resolver-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="conflict-resolver-content">
          {!hasAnyChanges && (
            <div className="sync-message success">
              <h3>Everything is in sync!</h3>
              <p>
                All {syncResult.identical.length} script{syncResult.identical.length !== 1 ? 's' : ''} are
                identical between localStorage and Supabase.
              </p>
            </div>
          )}

          {hasConflicts && (
            <div className="conflicts-section">
              <div className="section-header">
                <h3>Conflicts ({syncResult.conflicts.length})</h3>
                <div className="resolve-all-buttons">
                  <button
                    className="resolve-all-btn local"
                    onClick={() => handleResolveAll('local')}
                    disabled={isResolving}
                  >
                    Keep All Local
                  </button>
                  <button
                    className="resolve-all-btn remote"
                    onClick={() => handleResolveAll('remote')}
                    disabled={isResolving}
                  >
                    Keep All Remote
                  </button>
                </div>
              </div>

              <div className="conflicts-list">
                {syncResult.conflicts.map((conflict) => {
                  const isExpanded = expandedConflict === conflict.id;
                  const selectedResolution = resolutions.get(conflict.id);

                  return (
                    <div key={conflict.id} className="conflict-item">
                      <div className="conflict-header" onClick={() => toggleExpanded(conflict.id)}>
                        <div className="conflict-info">
                          <strong>{conflict.name}</strong>
                          <span className="conflict-reason">{conflict.reason}</span>
                        </div>
                        <button className="expand-btn">{isExpanded ? '▼' : '▶'}</button>
                      </div>

                      {isExpanded && (
                        <div className="conflict-details">
                          <div className="conflict-comparison">
                            {renderScriptDetails(conflict.local, 'Local Version')}
                            {renderScriptDetails(conflict.remote, 'Remote Version (Supabase)')}
                          </div>
                        </div>
                      )}

                      <div className="conflict-actions">
                        <button
                          className={`conflict-btn local ${selectedResolution === 'local' ? 'selected' : ''}`}
                          onClick={() => handleResolutionChange(conflict.id, 'local')}
                          disabled={isResolving}
                        >
                          Keep Local
                        </button>
                        <button
                          className={`conflict-btn remote ${selectedResolution === 'remote' ? 'selected' : ''}`}
                          onClick={() => handleResolutionChange(conflict.id, 'remote')}
                          disabled={isResolving}
                        >
                          Keep Remote
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasLocalOnly && (
            <div className="sync-section">
              <h3>Local Only ({syncResult.localOnly.length})</h3>
              <p className="section-description">
                These scripts exist only in localStorage and will be synced to Supabase.
              </p>
              <ul className="script-list">
                {syncResult.localOnly.map((script) => (
                  <li key={script.id}>{script.name}</li>
                ))}
              </ul>
            </div>
          )}

          {hasRemoteOnly && (
            <div className="sync-section">
              <h3>Remote Only ({syncResult.remoteOnly.length})</h3>
              <p className="section-description">
                These scripts exist only in Supabase and will be synced to localStorage.
              </p>
              <ul className="script-list">
                {syncResult.remoteOnly.map((script) => (
                  <li key={script.id}>{script.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="conflict-resolver-footer">
          <button onClick={onCancel} className="conflict-btn-secondary" disabled={isResolving}>
            Cancel
          </button>
          {hasAnyChanges && (
            <button onClick={handleSubmit} className="conflict-btn-primary" disabled={isResolving}>
              {isResolving ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
