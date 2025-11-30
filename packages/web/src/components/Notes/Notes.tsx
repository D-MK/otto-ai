/**
 * Notes component - manage and organize notes
 */

import React, { useState, useEffect } from 'react';
import { Note, NoteFilter, NoteSortOption } from '@otto-ai/core';
import { useConversationStore } from '../../stores/conversation';
import NoteEditor from './NoteEditor';
import NoteList from './NoteList';
import './Notes.css';

interface NotesProps {
  onClose: () => void;
}

const Notes: React.FC<NotesProps> = ({ onClose }) => {
  const { noteStorage, loadNotes, settings } = useConversationStore();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<NoteSortOption>((settings as any).noteSortPreference || 'pinned-first');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Get all unique tags from all notes
  const allTags = noteStorage ? noteStorage.getAllTags() : [];

  // Build filter
  const filter: NoteFilter = {
    searchQuery: searchQuery || undefined,
    tags: selectedTags.size > 0 ? Array.from(selectedTags) : undefined,
    isPinned: showPinnedOnly ? true : undefined,
  };

  // Filter and sort notes
  const filteredNotes = noteStorage ? noteStorage.search(filter) : [];
  const sortedNotes = noteStorage ? noteStorage.sort(filteredNotes, sortBy) : [];

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
    setShowPinnedOnly(false);
  };

  const handleSortChange = async (newSort: NoteSortOption) => {
    setSortBy(newSort);
    // Save to settings
    const { saveSettings } = useConversationStore.getState();
    try {
      await saveSettings({
        ...settings,
        noteSortPreference: newSort,
      } as any);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
  };

  const handleSaveNote = (savedNote?: Note) => {
    loadNotes();

    // Keep the note open after saving
    if (savedNote) {
      setSelectedNote(savedNote);
      setIsEditing(true);
    } else if (selectedNote) {
      // If editing existing note, refresh it from storage
      const refreshedNote = noteStorage?.get(selectedNote.id);
      if (refreshedNote) {
        setSelectedNote(refreshedNote);
      }
      setIsEditing(true);
    }

    setFeedback({ type: 'success', message: 'Note saved successfully!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedNote(null);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const { deleteNote } = useConversationStore.getState();
      deleteNote(id);
      loadNotes();
      if (selectedNote?.id === id) {
        setIsEditing(false);
        setSelectedNote(null);
      }
      setFeedback({ type: 'success', message: 'Note deleted successfully!' });
      setTimeout(() => setFeedback(null), 3000);
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
      loadNotes();
    }
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    selectedTags.size +
    (showPinnedOnly ? 1 : 0);

  return (
    <div className="notes-overlay">
      <div className="notes-container">
        <div className="notes-header">
          <h2>Notes</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {feedback && (
          <div className={`feedback-banner ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="notes-content">
          <div className="notes-sidebar">
            <div className="sidebar-header">
              <h3>All Notes ({sortedNotes.length})</h3>
              <button onClick={handleNewNote} className="new-note-button">+ New</button>
            </div>

            <div className="search-sort-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as NoteSortOption)}
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

            <div className="filter-controls">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={showPinnedOnly}
                  onChange={(e) => setShowPinnedOnly(e.target.checked)}
                />
                Show pinned only
              </label>

              {activeFiltersCount > 0 && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear all ({activeFiltersCount})
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="tag-filter-section">
                <div className="tag-filter-header">
                  <span className="filter-label">Filter by tags:</span>
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

            <NoteList
              notes={sortedNotes}
              selectedId={selectedNote?.id}
              onSelectNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onPinToggle={handlePinToggle}
            />
          </div>

          <div className="notes-main">
            {isEditing ? (
              <NoteEditor
                note={selectedNote}
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
                onDelete={selectedNote ? handleDeleteNote : undefined}
              />
            ) : (
              <div className="notes-empty-state">
                <div className="empty-state-content">
                  <h3>No note selected</h3>
                  <p>Select a note from the list or create a new one</p>
                  <button onClick={handleNewNote} className="new-note-button-large">
                    + Create New Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;
