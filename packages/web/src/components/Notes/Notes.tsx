/**
 * Notes component - manage and organize notes
 */

import React, { useState, useEffect } from 'react';
import { Note } from '@otto-ai/core';
import { useConversationStore } from '../../stores/conversation';
import NoteEditor from './NoteEditor';
import './Notes.css';

interface NotesProps {
  onClose: () => void;
  selectedNote?: Note | null;
  onNoteChange?: (note: Note | null) => void;
  onNoteSaved?: () => void;
}

const Notes: React.FC<NotesProps> = ({ selectedNote: propSelectedNote, onNoteChange, onNoteSaved }) => {
  const { noteStorage, loadNotes } = useConversationStore();
  const [selectedNote, setSelectedNote] = useState<Note | null>(propSelectedNote || null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Update local state when prop changes
  useEffect(() => {
    if (propSelectedNote) {
      setSelectedNote(propSelectedNote);
      setIsEditing(true);
    } else if (propSelectedNote === null) {
      // Explicitly null means create new note
      setSelectedNote(null);
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [propSelectedNote]);

  const handleNewNote = () => {
    if (onNoteChange) {
      onNoteChange(null);
    }
    setSelectedNote(null);
    setIsEditing(true);
  };

  const handleSaveNote = (savedNote?: Note) => {
    loadNotes();

    // Keep the note open after saving
    if (savedNote) {
      setSelectedNote(savedNote);
      setIsEditing(true);
      if (onNoteChange) {
        onNoteChange(savedNote);
      }
    } else if (selectedNote) {
      // If editing existing note, refresh it from storage
      const refreshedNote = noteStorage?.get(selectedNote.id);
      if (refreshedNote) {
        setSelectedNote(refreshedNote);
        if (onNoteChange) {
          onNoteChange(refreshedNote);
        }
      }
      setIsEditing(true);
    }

    if (onNoteSaved) {
      onNoteSaved();
    }

    setFeedback({ type: 'success', message: 'Note saved successfully!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedNote(null);
    if (onNoteChange) {
      onNoteChange(null);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const { deleteNote } = useConversationStore.getState();
      deleteNote(id);
      loadNotes();
      if (selectedNote?.id === id) {
        setIsEditing(false);
        setSelectedNote(null);
        if (onNoteChange) {
          onNoteChange(null);
        }
      }
      if (onNoteSaved) {
        onNoteSaved();
      }
      setFeedback({ type: 'success', message: 'Note deleted successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="notes-overlay">
      <div className="notes-container">
        {feedback && (
          <div className={`feedback-banner ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="notes-content">
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
                  <p>Select a note from the sidebar or create a new one</p>
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
