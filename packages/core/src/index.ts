/**
 * Core module exports
 */

// Script types and classes
export * from './scripts/types';
export { ScriptStorage } from './scripts/storage';
export { BrowserScriptStorage } from './scripts/browser-storage';
export { ScriptExecutor } from './scripts/executor';

// Intent classification
export * from './intent/types';
export { IntentClassifier } from './intent/classifier';
export { EntityExtractor } from './intent/entity-extractor';
export { IntentRouter } from './intent/router';
export type { RouterResponse } from './intent/router';

// MCP client
export * from './mcp/config';
export { MCPClient } from './mcp/client';

// Notes
export * from './notes/types';
export { LocalNoteStorage } from './notes/storage';
export type { NoteStorage } from './notes/storage';
export { createNoteAIGenerator } from './notes/ai-generator';
export type { AIGenerator } from './notes/ai-generator';
