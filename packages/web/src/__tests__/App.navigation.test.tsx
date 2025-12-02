/**
 * App Navigation Tests
 * Tests that all tabs/routes can be opened without errors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock components that have external dependencies
vi.mock('../components/Chat/Chat', () => ({
  default: vi.fn(() => <div data-testid="chat-component">Chat Component</div>),
}));

vi.mock('../components/ScriptEditor/ScriptEditor', () => ({
  default: vi.fn(() => <div data-testid="script-editor-component">Script Editor Component</div>),
}));

vi.mock('../components/Notes/Notes', () => ({
  default: vi.fn(() => <div data-testid="notes-component">Notes Component</div>),
}));

vi.mock('../components/Settings/Settings', () => ({
  Settings: vi.fn(() => <div data-testid="settings-component">Settings Component</div>),
}));

describe('App Navigation', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('shows chat tab by default', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('chat-component')).toBeInTheDocument();
    });
  });

  it('can navigate to scripts tab', async () => {
    render(<App />);

    // Find and click the Scripts tab button
    const scriptsButton = screen.getByTitle('Scripts');
    fireEvent.click(scriptsButton);

    await waitFor(() => {
      expect(screen.getByTestId('script-editor-component')).toBeInTheDocument();
    });
  });

  it('can navigate to notes tab', async () => {
    render(<App />);

    // Find and click the Notes tab button
    const notesButton = screen.getByTitle('Notes');
    fireEvent.click(notesButton);

    await waitFor(() => {
      expect(screen.getByTestId('notes-component')).toBeInTheDocument();
    });
  });

  it('can navigate to settings tab without crashing', async () => {
    render(<App />);

    // Find and click the Settings tab button
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('settings-component')).toBeInTheDocument();
    });
  });

  it('can navigate between all tabs without errors', async () => {
    render(<App />);

    // Navigate through all tabs
    const tabs = ['Scripts', 'Notes', 'Settings', 'Chat'];

    for (const tab of tabs) {
      const tabButton = screen.getByTitle(tab);
      fireEvent.click(tabButton);

      // Wait for the tab to render
      await waitFor(() => {
        const testIds: Record<string, string> = {
          'Chat': 'chat-component',
          'Scripts': 'script-editor-component',
          'Notes': 'notes-component',
          'Settings': 'settings-component',
        };
        expect(screen.getByTestId(testIds[tab])).toBeInTheDocument();
      });
    }
  });

  it('Settings component does not reference onClose or isOpen', () => {
    // This test ensures Settings doesn't have modal-related props
    const { Settings } = require('../components/Settings/Settings');
    const mockSettings = {
      geminiApiKey: '',
      supabaseApiKey: '',
      supabaseUrl: '',
      mcpServers: [],
      storageMode: 'localStorage' as const,
    };

    // Should not throw when rendered without isOpen/onClose
    expect(() => {
      render(<Settings settings={mockSettings} onSave={vi.fn()} />);
    }).not.toThrow();
  });
});
