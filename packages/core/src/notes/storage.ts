/**
 * Note storage interface and implementation
 */

import {
  Note,
  NoteFilter,
  NoteSortOption,
  CreateNoteParams,
  UpdateNoteParams,
} from './types';

export interface NoteStorage {
  // CRUD operations
  create(params: CreateNoteParams): Note;
  get(id: string): Note | undefined;
  getAll(): Note[];
  update(id: string, params: UpdateNoteParams): Note;
  delete(id: string): void;

  // Query operations
  search(filter: NoteFilter): Note[];
  sort(notes: Note[], sortBy: NoteSortOption): Note[];

  // Tag operations
  getAllTags(): string[];
  getNotesByTag(tag: string): Note[];

  // Pin operations
  pin(id: string): void;
  unpin(id: string): void;
  getPinned(): Note[];

  // Link operations
  linkToNote(noteId: string, targetNoteId: string): void;
  unlinkFromNote(noteId: string, targetNoteId: string): void;
  getLinkedNotes(noteId: string): Note[];
  linkToScript(noteId: string, scriptId: string): void;
  unlinkFromScript(noteId: string, scriptId: string): void;
  getNotesByScript(scriptId: string): Note[];

  // Bulk operations
  bulkDelete(ids: string[]): void;
  bulkUpdateTags(ids: string[], tags: string[]): void;

  // Export/Import
  exportToJSON(ids?: string[]): string;
  exportToMarkdown(ids?: string[]): string;
  importFromJSON(json: string): Note[];
}

export class LocalNoteStorage implements NoteStorage {
  private storageKey = 'otto-notes';
  private notes: Map<string, Note> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const globalThis = this.getGlobalThis();
    if (!globalThis || !globalThis.localStorage) {
      return;
    }

    try {
      const stored = globalThis.localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notes = new Map(
          parsed.map((note: any) => [
            note.id,
            {
              ...note,
              createdAt: new Date(note.createdAt),
              updatedAt: new Date(note.updatedAt),
            },
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load notes from storage:', error);
    }
  }

  private saveToStorage(): void {
    const globalThis = this.getGlobalThis();
    if (!globalThis || !globalThis.localStorage) {
      return;
    }

    try {
      const notesArray = Array.from(this.notes.values());
      globalThis.localStorage.setItem(this.storageKey, JSON.stringify(notesArray));
    } catch (error) {
      console.error('Failed to save notes to storage:', error);
    }
  }

  private getGlobalThis(): any {
    // Check for browser environment
    if (typeof (globalThis as any)?.window !== 'undefined') {
      return (globalThis as any).window;
    }
    // Check for Node environment
    if (typeof (globalThis as any)?.global !== 'undefined') {
      return (globalThis as any).global;
    }
    // Fallback to globalThis
    return globalThis as any;
  }

  private generateId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  create(params: CreateNoteParams): Note {
    const id = this.generateId();
    const now = new Date();
    const wordCount = this.calculateWordCount(params.content);

    const note: Note = {
      id,
      title: params.title || 'Untitled Note', // Will be updated by AI
      content: params.content,
      summary: '', // Will be updated by AI
      tags: params.tags || [],
      linkedNoteIds: params.linkedNoteIds || [],
      linkedScriptIds: params.linkedScriptIds || [],
      linkedConversationId: params.linkedConversationId,
      isPinned: params.isPinned || false,
      color: params.color,
      createdAt: now,
      updatedAt: now,
      metadata: {
        wordCount,
        characterCount: params.content.length,
        viewCount: 0,
      },
    };

    this.notes.set(id, note);
    this.saveToStorage();
    return note;
  }

  get(id: string): Note | undefined {
    const note = this.notes.get(id);
    if (note && note.metadata) {
      // Update view count and last viewed
      note.metadata.lastViewedAt = new Date();
      note.metadata.viewCount = (note.metadata.viewCount || 0) + 1;
      this.saveToStorage();
    }
    return note;
  }

  getAll(): Note[] {
    return Array.from(this.notes.values());
  }

  update(id: string, params: UpdateNoteParams): Note {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note with id ${id} not found`);
    }

    const updated: Note = {
      ...note,
      ...params,
      updatedAt: new Date(),
    };

    if (params.content !== undefined && note.metadata) {
      updated.metadata = {
        ...note.metadata,
        wordCount: this.calculateWordCount(params.content),
        characterCount: params.content.length,
      };
    }

    this.notes.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): void {
    // Remove this note from all notes that link to it
    this.notes.forEach((note) => {
      if (note.linkedNoteIds.includes(id)) {
        note.linkedNoteIds = note.linkedNoteIds.filter((nId) => nId !== id);
      }
    });

    this.notes.delete(id);
    this.saveToStorage();
  }

  search(filter: NoteFilter): Note[] {
    let results = this.getAll();

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.summary.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((note) =>
        filter.tags!.some((tag) => note.tags.includes(tag))
      );
    }

    if (filter.isPinned !== undefined) {
      results = results.filter((note) => note.isPinned === filter.isPinned);
    }

    if (filter.linkedToScript) {
      results = results.filter((note) =>
        note.linkedScriptIds.includes(filter.linkedToScript!)
      );
    }

    if (filter.linkedToNote) {
      results = results.filter((note) =>
        note.linkedNoteIds.includes(filter.linkedToNote!)
      );
    }

    if (filter.color) {
      results = results.filter((note) => note.color === filter.color);
    }

    if (filter.dateRange) {
      results = results.filter(
        (note) =>
          note.createdAt >= filter.dateRange!.start &&
          note.createdAt <= filter.dateRange!.end
      );
    }

    return results;
  }

  sort(notes: Note[], sortBy: NoteSortOption): Note[] {
    const sorted = [...notes];

    switch (sortBy) {
      case 'created-asc':
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case 'created-desc':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'updated-asc':
        return sorted.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      case 'updated-desc':
        return sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'pinned-first':
        return sorted.sort((a, b) => {
          if (a.isPinned === b.isPinned) {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
          return a.isPinned ? -1 : 1;
        });
      default:
        return sorted;
    }
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.notes.forEach((note) => {
      note.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  getNotesByTag(tag: string): Note[] {
    return this.getAll().filter((note) => note.tags.includes(tag));
  }

  pin(id: string): void {
    const note = this.notes.get(id);
    if (note) {
      note.isPinned = true;
      note.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  unpin(id: string): void {
    const note = this.notes.get(id);
    if (note) {
      note.isPinned = false;
      note.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  getPinned(): Note[] {
    return this.getAll().filter((note) => note.isPinned);
  }

  linkToNote(noteId: string, targetNoteId: string): void {
    const note = this.notes.get(noteId);
    const targetNote = this.notes.get(targetNoteId);

    if (!note || !targetNote) {
      throw new Error('Note not found');
    }

    if (!note.linkedNoteIds.includes(targetNoteId)) {
      note.linkedNoteIds.push(targetNoteId);
      note.updatedAt = new Date();
    }

    // Create bi-directional link
    if (!targetNote.linkedNoteIds.includes(noteId)) {
      targetNote.linkedNoteIds.push(noteId);
      targetNote.updatedAt = new Date();
    }

    this.saveToStorage();
  }

  unlinkFromNote(noteId: string, targetNoteId: string): void {
    const note = this.notes.get(noteId);
    const targetNote = this.notes.get(targetNoteId);

    if (!note || !targetNote) {
      throw new Error('Note not found');
    }

    note.linkedNoteIds = note.linkedNoteIds.filter((id) => id !== targetNoteId);
    note.updatedAt = new Date();

    // Remove bi-directional link
    targetNote.linkedNoteIds = targetNote.linkedNoteIds.filter((id) => id !== noteId);
    targetNote.updatedAt = new Date();

    this.saveToStorage();
  }

  getLinkedNotes(noteId: string): Note[] {
    const note = this.notes.get(noteId);
    if (!note) return [];

    return note.linkedNoteIds
      .map((id) => this.notes.get(id))
      .filter((n): n is Note => n !== undefined);
  }

  linkToScript(noteId: string, scriptId: string): void {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    if (!note.linkedScriptIds.includes(scriptId)) {
      note.linkedScriptIds.push(scriptId);
      note.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  unlinkFromScript(noteId: string, scriptId: string): void {
    const note = this.notes.get(noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    note.linkedScriptIds = note.linkedScriptIds.filter((id) => id !== scriptId);
    note.updatedAt = new Date();
    this.saveToStorage();
  }

  getNotesByScript(scriptId: string): Note[] {
    return this.getAll().filter((note) =>
      note.linkedScriptIds.includes(scriptId)
    );
  }

  bulkDelete(ids: string[]): void {
    ids.forEach((id) => this.delete(id));
  }

  bulkUpdateTags(ids: string[], tags: string[]): void {
    ids.forEach((id) => {
      const note = this.notes.get(id);
      if (note) {
        note.tags = [...new Set([...note.tags, ...tags])];
        note.updatedAt = new Date();
      }
    });
    this.saveToStorage();
  }

  exportToJSON(ids?: string[]): string {
    const notesToExport = ids
      ? ids.map((id) => this.notes.get(id)).filter((n): n is Note => n !== undefined)
      : this.getAll();

    return JSON.stringify(notesToExport, null, 2);
  }

  exportToMarkdown(ids?: string[]): string {
    const notesToExport = ids
      ? ids.map((id) => this.notes.get(id)).filter((n): n is Note => n !== undefined)
      : this.getAll();

    return notesToExport
      .map(
        (note) => `# ${note.title}

${note.summary ? `> ${note.summary}\n` : ''}
${note.content}

---
**Tags:** ${note.tags.join(', ') || 'None'}
**Created:** ${note.createdAt.toLocaleDateString()}
**Updated:** ${note.updatedAt.toLocaleDateString()}
${note.linkedNoteIds.length > 0 ? `**Linked Notes:** ${note.linkedNoteIds.length}` : ''}
${note.linkedScriptIds.length > 0 ? `**Linked Scripts:** ${note.linkedScriptIds.length}` : ''}

`
      )
      .join('\n\n');
  }

  importFromJSON(json: string): Note[] {
    try {
      const parsed = JSON.parse(json);
      const imported: Note[] = [];

      const notesArray = Array.isArray(parsed) ? parsed : [parsed];

      notesArray.forEach((noteData: any) => {
        const note: Note = {
          ...noteData,
          id: this.generateId(), // Generate new ID to avoid conflicts
          createdAt: new Date(noteData.createdAt),
          updatedAt: new Date(noteData.updatedAt),
        };
        this.notes.set(note.id, note);
        imported.push(note);
      });

      this.saveToStorage();
      return imported;
    } catch (error) {
      console.error('Failed to import notes:', error);
      throw new Error('Invalid JSON format');
    }
  }
}
