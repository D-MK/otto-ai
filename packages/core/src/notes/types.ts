/**
 * Note types and interfaces
 */

export interface Note {
  id: string;
  title: string; // Auto-generated using Gemini if not provided
  content: string;
  summary: string; // Auto-generated using Gemini
  tags: string[];
  linkedNoteIds: string[]; // Bi-directional linking to other notes
  linkedScriptIds: string[]; // Link to scripts
  linkedConversationId?: string; // Optional link to conversation
  isPinned: boolean;
  color?: NoteColor;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    wordCount: number;
    characterCount: number;
    lastViewedAt?: Date;
    viewCount?: number;
  };
}

export type NoteColor =
  | '#FFE5E5' // Light red
  | '#FFF4E5' // Light orange
  | '#FFFBE5' // Light yellow
  | '#E5FFE5' // Light green
  | '#E5F5FF' // Light blue
  | '#F0E5FF' // Light purple
  | '#FFE5F5'; // Light pink

export interface NoteFilter {
  searchQuery?: string;
  tags?: string[];
  isPinned?: boolean;
  linkedToScript?: string;
  linkedToNote?: string;
  color?: NoteColor;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type NoteSortOption =
  | 'created-asc'
  | 'created-desc'
  | 'updated-asc'
  | 'updated-desc'
  | 'title-asc'
  | 'title-desc'
  | 'pinned-first';

export interface CreateNoteParams {
  content: string;
  title?: string; // Optional - will be auto-generated if not provided
  tags?: string[];
  linkedNoteIds?: string[];
  linkedScriptIds?: string[];
  linkedConversationId?: string;
  color?: NoteColor;
  isPinned?: boolean;
}

export interface UpdateNoteParams {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  linkedNoteIds?: string[];
  linkedScriptIds?: string[];
  color?: NoteColor;
  isPinned?: boolean;
}

export interface AIGenerationResult {
  title: string;
  summary: string;
}
