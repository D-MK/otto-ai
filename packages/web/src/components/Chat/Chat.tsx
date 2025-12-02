/**
 * Chat component - main conversation interface
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { Message } from '@otto-ai/core';
import { sanitizeText } from '../../utils/sanitize';
import './Chat.css';

export interface ChatHandle {
  setInput: (text: string) => void;
  focusInput: () => void;
}

interface ChatProps {
  onScriptClick?: (scriptPhrase: string) => void;
}

const Chat = forwardRef<ChatHandle, ChatProps>(({ onScriptClick }, ref) => {
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
    sendMessage,
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

    // SECURITY: Sanitize user input before sending
    const sanitizedInput = sanitizeText(input.trim());
    if (!sanitizedInput) {
      // Invalid input - don't send
      return;
    }

    const message = sanitizedInput;
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
      <div className="messages">
        {messageHistory.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome to Otto AI</h3>
            <p>I can help you run scripts and automations. Try asking me to:</p>
            <ul>
              <li
                className="clickable-suggestion"
                onClick={() => onScriptClick?.('calculate my bmi')}
              >
                Calculate your BMI
              </li>
              <li
                className="clickable-suggestion"
                onClick={() => onScriptClick?.('create daily standup summary')}
              >
                Create a daily standup summary
              </li>
              <li className="non-clickable">Or create your own custom scripts!</li>
            </ul>
          </div>
        )}

        {messageHistory.map((message: Message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {/* SECURITY: Sanitize message content before rendering */}
              {sanitizeText(message.content)}
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
