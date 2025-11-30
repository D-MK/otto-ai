/**
 * NoteList component - display list of notes
 */

import React from 'react';
import { Note } from '@otto-ai/core';

interface NoteListProps {
  notes: Note[];
  selectedId?: string;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onPinToggle: (id: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedId,
  onSelectNote,
  onDeleteNote,
  onPinToggle,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (notes.length === 0) {
    return (
      <div className="notes-empty">
        <p>No notes found</p>
      </div>
    );
  }

  return (
    <div className="note-list">
      {notes.map((note) => (
        <div
          key={note.id}
          className={`note-list-item ${selectedId === note.id ? 'selected' : ''}`}
          style={note.color ? { borderLeftColor: note.color } : {}}
          onClick={() => onSelectNote(note)}
        >
          <div className="note-list-item-header">
            <div className="note-list-item-title">
              {note.isPinned && <span className="pin-icon">📌</span>}
              {truncate(note.title, 50)}
            </div>
            <div className="note-list-item-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="note-action-btn pin-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onPinToggle(note.id);
                }}
                title={note.isPinned ? 'Unpin' : 'Pin'}
              >
                {note.isPinned ? '📌' : '📍'}
              </button>
              <button
                className="note-action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>

          {note.summary && (
            <div className="note-list-item-summary">
              {truncate(note.summary, 100)}
            </div>
          )}

          <div className="note-list-item-meta">
            <span className="note-date">{formatDate(note.updatedAt)}</span>
            {note.tags.length > 0 && (
              <span className="note-tags">
                {note.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="note-tag">
                    {tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className="note-tag-more">+{note.tags.length - 2}</span>
                )}
              </span>
            )}
          </div>

          {(note.linkedNoteIds.length > 0 || note.linkedScriptIds.length > 0) && (
            <div className="note-list-item-links">
              {note.linkedNoteIds.length > 0 && (
                <span className="link-badge" title="Linked notes">
                  🔗 {note.linkedNoteIds.length}
                </span>
              )}
              {note.linkedScriptIds.length > 0 && (
                <span className="link-badge" title="Linked scripts">
                  📜 {note.linkedScriptIds.length}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NoteList;
