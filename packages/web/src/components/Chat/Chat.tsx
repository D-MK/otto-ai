/**
 * Chat component - main conversation interface
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { Message } from '@otto-ai/core';
import './Chat.css';

export interface ChatHandle {
  setInput: (text: string) => void;
  focusInput: () => void;
}

interface ChatProps {
  onScriptsClick?: () => void;
  onDebugClick?: () => void;
  onSettingsClick?: () => void;
  showDebug?: boolean;
}

const Chat = forwardRef<ChatHandle, ChatProps>(({ onScriptsClick, onDebugClick, onSettingsClick, showDebug = false }, ref) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setInput(text);
    },
    focusInput: () => {
      inputRef.current?.focus();
    },
  }));

  const {
    messageHistory,
    isProcessing,
    ttsEnabled,
    sendMessage,
    toggleTTS,
  } = useConversationStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);

    // Refocus input after message is sent
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Otto AI</h2>
        <div className="header-buttons">
          {onScriptsClick && (
            <button onClick={onScriptsClick} className="header-button">
              Scripts
            </button>
          )}
          {onDebugClick && (
            <button onClick={onDebugClick} className="header-button">
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          )}
          {onSettingsClick && (
            <button onClick={onSettingsClick} className="header-button">
              Settings
            </button>
          )}
          <button
            className={`tts-toggle ${ttsEnabled ? 'active' : ''}`}
            onClick={toggleTTS}
            title={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
          >
            {ttsEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <div className="messages">
        {messageHistory.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome to Otto AI</h3>
            <p>I can help you run scripts and automations. Try asking me to:</p>
            <ul>
              <li>Calculate your BMI</li>
              <li>Create a daily standup summary</li>
              <li>Or create your own custom scripts!</li>
            </ul>
          </div>
        )}

        {messageHistory.map((message: Message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="message assistant">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isProcessing}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
});

Chat.displayName = 'Chat';

export default Chat;
