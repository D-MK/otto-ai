/**
 * NoteEditor component - create and edit notes
 */

import React, { useState, useEffect } from 'react';
import { Note, NoteColor } from '@otto-ai/core';
import { useConversationStore } from '../../stores/conversation';
import { MagicWandIcon } from '../Icons/Icons';

interface NoteEditorProps {
  note: Note | null;
  onSave: (savedNote?: Note) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const NOTE_COLORS: NoteColor[] = [
  '#FFE5E5', // Light red
  '#FFF4E5', // Light orange
  '#FFFBE5', // Light yellow
  '#E5FFE5', // Light green
  '#E5F5FF', // Light blue
  '#F0E5FF', // Light purple
  '#FFE5F5', // Light pink
];

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onCancel, onDelete }) => {
  const { createNote, updateNote, noteStorage, scripts } = useConversationStore();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState<NoteColor | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkedScriptIds, setLinkedScriptIds] = useState<string[]>([]);
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  // Available notes for linking (excluding current note)
  const availableNotes = noteStorage?.getAll().filter((n) => n.id !== note?.id) || [];
  const availableScripts = scripts || [];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSummary(note.summary);
      setTags(note.tags.join(', '));
      setColor(note.color);
      setIsPinned(note.isPinned);
      setLinkedScriptIds(note.linkedScriptIds || []);
      setLinkedNoteIds(note.linkedNoteIds || []);
    } else {
      setTitle('');
      setContent('');
      setSummary('');
      setTags('');
      setColor(undefined);
      setIsPinned(false);
      setLinkedScriptIds([]);
      setLinkedNoteIds([]);
    }
  }, [note]);

  const handleGenerateTitleAndSummary = async () => {
    if (!content.trim()) {
      alert('Please enter some content first');
      return;
    }

    setIsGenerating(true);
    try {
      const { generateNoteTitleAndSummary } = useConversationStore.getState();
      const result = await generateNoteTitleAndSummary(content);
      setTitle(result.title);
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to generate title and summary:', error);
      alert('Failed to generate title and summary. Using fallback.');
      // Fallback: use first line as title
      const firstLine = content.split('\n')[0].trim();
      setTitle(firstLine.substring(0, 60) || 'Untitled Note');
      const firstSentence = content.split(/[.!?]\s/)[0].trim();
      setSummary(firstSentence.substring(0, 150));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Note content is required');
      return;
    }

    // Auto-generate title if not provided
    let finalTitle = title.trim();
    let finalSummary = summary.trim();

    if (!finalTitle || !finalSummary) {
      await handleGenerateTitleAndSummary();
      // Use the generated values
      finalTitle = title.trim() || content.split('\n')[0].substring(0, 60) || 'Untitled Note';
      finalSummary = summary.trim() || content.split(/[.!?]\s/)[0].substring(0, 150);
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let savedNoteId: string;

    if (note) {
      // Update existing note
      updateNote(note.id, {
        title: finalTitle,
        content,
        summary: finalSummary,
        tags: tagArray,
        color,
        isPinned,
        linkedScriptIds,
        linkedNoteIds,
      });
      savedNoteId = note.id;
      
      // Get the updated note from storage and pass it to onSave
      const { noteStorage } = useConversationStore.getState();
      const savedNote = noteStorage?.get(savedNoteId);
      onSave(savedNote);
    } else {
      // Create new note
      const createdNote = await createNote({
        content,
        title: finalTitle,
        summary: finalSummary,
        tags: tagArray,
        color,
        isPinned,
        linkedScriptIds,
        linkedNoteIds,
      });
      
      // Pass the created note directly to onSave
      onSave(createdNote || undefined);
    }
  };

  const toggleScriptLink = (scriptId: string) => {
    setLinkedScriptIds((prev) =>
      prev.includes(scriptId)
        ? prev.filter((id) => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const toggleNoteLink = (noteId: string) => {
    setLinkedNoteIds((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="note-editor">
      <div className="note-editor-header">
        <h3>{note ? 'Edit Note' : 'New Note'}</h3>
        <div className="note-editor-actions">
          <button
            onClick={handleGenerateTitleAndSummary}
            className="generate-button"
            disabled={isGenerating || !content.trim()}
            title="Generate title and summary using AI"
          >
            {isGenerating ? (
              <>⏳ Generating...</>
            ) : (
              <>
                <MagicWandIcon size={16} style={{ marginRight: '0.5rem' }} />
                Generate Title & Summary
              </>
            )}
          </button>
        </div>
      </div>

      <div className="note-editor-form">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auto-generated if left empty"
            className="note-title-input"
          />
        </div>

        <div className="form-group">
          <label>Summary</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Auto-generated if left empty"
            className="note-summary-input"
          />
        </div>

        <div className="form-group">
          <label>Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={12}
            className="note-content-textarea"
          />
          <div className="content-stats">
            {wordCount} words, {charCount} characters
          </div>
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="work, ideas, important"
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            <button
              className={`color-option no-color ${!color ? 'selected' : ''}`}
              onClick={() => setColor(undefined)}
              title="No color"
            >
              None
            </button>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                className={`color-option ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            Pin this note
          </label>
        </div>

        <div className="form-group">
          <div className="link-section-header">
            <label>Links</label>
            <button
              className="toggle-link-menu"
              onClick={() => setShowLinkMenu(!showLinkMenu)}
            >
              {showLinkMenu ? '▼ Hide' : '▶ Show'} ({linkedScriptIds.length + linkedNoteIds.length})
            </button>
          </div>

          {showLinkMenu && (
            <div className="link-menu">
              <div className="link-category">
                <h4>Linked Scripts ({linkedScriptIds.length})</h4>
                <div className="link-list">
                  {availableScripts.length === 0 ? (
                    <div className="no-items">No scripts available</div>
                  ) : (
                    availableScripts.map((script) => (
                      <label key={script.id} className="link-item">
                        <input
                          type="checkbox"
                          checked={linkedScriptIds.includes(script.id)}
                          onChange={() => toggleScriptLink(script.id)}
                        />
                        {script.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="link-category">
                <h4>Linked Notes ({linkedNoteIds.length})</h4>
                <div className="link-list">
                  {availableNotes.length === 0 ? (
                    <div className="no-items">No other notes available</div>
                  ) : (
                    availableNotes.map((n) => (
                      <label key={n.id} className="link-item">
                        <input
                          type="checkbox"
                          checked={linkedNoteIds.includes(n.id)}
                          onChange={() => toggleNoteLink(n.id)}
                        />
                        {n.title}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button onClick={handleSave} className="save-button">
            Save Note
          </button>
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          {note && onDelete && (
            <button
              onClick={() => onDelete(note.id)}
              className="delete-button"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
