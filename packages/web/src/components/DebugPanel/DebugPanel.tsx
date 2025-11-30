/**
 * DebugPanel component - shows intent classification and execution details
 */

import React from 'react';
import { useConversationStore } from '../../stores/conversation';
import { Message } from '@otto-ai/core';
import './DebugPanel.css';

interface DebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onToggle }) => {
  const { messageHistory, activeScriptContext } = useConversationStore();

  const lastMessage = messageHistory[messageHistory.length - 1];
  const debugInfo = lastMessage?.metadata;

  return (
    <div className={`debug-panel ${isOpen ? 'open' : ''}`}>
      <div className="debug-header">
        <h3>Debug Info</h3>
        <button onClick={onToggle} className="toggle-button">
          {isOpen ? '→' : '←'}
        </button>
      </div>

      {isOpen && (
        <div className="debug-content">
          <div className="debug-section">
            <h4>Active Script Context</h4>
            {activeScriptContext ? (
              <div className="debug-data">
                <div><strong>Script ID:</strong> {activeScriptContext.scriptId}</div>
                <div><strong>Collected Params:</strong></div>
                <pre>{JSON.stringify(activeScriptContext.collectedParams, null, 2)}</pre>
                <div><strong>Missing Params:</strong> {activeScriptContext.missingParams.join(', ') || 'None'}</div>
              </div>
            ) : (
              <div className="debug-empty">No active script context</div>
            )}
          </div>

          {debugInfo?.intent && (
            <div className="debug-section">
              <h4>Last Intent</h4>
              <div className="debug-data">
                <div><strong>Type:</strong> {debugInfo.intent.type}</div>
                <div><strong>Confidence:</strong> {(debugInfo.intent.confidence * 100).toFixed(1)}%</div>
                {debugInfo.intent.scriptId && (
                  <div><strong>Script ID:</strong> {debugInfo.intent.scriptId}</div>
                )}
                {debugInfo.intent.mcpAction && (
                  <div><strong>MCP Action:</strong> {debugInfo.intent.mcpAction}</div>
                )}
              </div>
            </div>
          )}

          {debugInfo?.executionResult && (
            <div className="debug-section">
              <h4>Execution Result</h4>
              <pre className="debug-data">
                {JSON.stringify(debugInfo.executionResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="debug-section">
            <h4>Message History</h4>
            <div className="debug-data">
              <div><strong>Total Messages:</strong> {messageHistory.length}</div>
              <div><strong>User Messages:</strong> {messageHistory.filter((m: Message) => m.role === 'user').length}</div>
              <div><strong>Assistant Messages:</strong> {messageHistory.filter((m: Message) => m.role === 'assistant').length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
