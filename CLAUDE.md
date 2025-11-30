# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Otto AI is a cross-platform AI automation assistant with natural language interface. Users create and invoke scripts through conversational language. The system uses intent classification, entity extraction, and multi-turn parameter collection.

## Development Commands

### Build
```bash
# Build core package (required before running web)
cd packages/core
npm run build

# Build web package
cd packages/web
npm run build

# Build all packages
npm run build
```

### Development Server
```bash
# Start web dev server (localhost:3000)
npm run dev
# or
cd packages/web
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage for all packages
npm run test:coverage

# Core package tests
cd packages/core
npm test
npm run test:coverage

# Web package tests
cd packages/web
npm test
npm run test:coverage
npm run test:ui  # Interactive UI

# Run specific test file
cd packages/core
npm test -- __tests__/intent-router.test.ts

# E2E tests with Playwright
npm run test:e2e
npm run test:e2e:ui
```

### Linting
```bash
npm run lint
```

## Architecture

### Monorepo Structure

**Workspaces:**
- `packages/core/` - Core business logic (TypeScript, Node.js)
- `packages/web/` - React web application (Vite)

**Key Principle:** Core package is platform-agnostic and can be used by web, mobile (future), or CLI. Web package handles browser-specific features.

### Core Architecture (packages/core/src/)

**Intent Router** (`intent/router.ts`)
- Orchestrates entire conversation flow
- Classifies user input, extracts entities, manages multi-turn parameter collection
- Routes to appropriate execution handler (local script, MCP API, or web-layer services like Gemini chat)
- Handles active script context for parameter collection across multiple turns

**Intent Classifier** (`intent/classifier.ts`)
- Uses word overlap (Jaccard similarity) to match input against script trigger phrases, descriptions, and tags
- Flags disambiguation when top 2 matches are within 0.1 confidence
- Production should use embeddings (OpenAI, etc.) instead

**Script Executor** (`scripts/executor.ts`)
- Executes JavaScript in sandboxed environment using `new Function()`
- 5-second timeout, type coercion, no access to require/import/process/fs
- Basic sandbox - production should use `isolated-vm` or worker threads

**Entity Extractor** (`intent/entity-extractor.ts`)
- Extracts parameter values from user input
- Supports basic pattern matching for numbers, dates, strings
- Returns missing parameters for multi-turn collection

**MCP Client** (`mcp/client.ts`)
- External API integration with configurable auth (Bearer, API-Key, None)
- Request timeout handling, JSON schema validation

**Script Storage** (`scripts/storage.ts`, `scripts/browser-storage.ts`)
- SQLite-based persistence (better-sqlite3 for Node, sql.js for browser)
- Schema includes: id, name, description, tags, trigger_phrases, parameters, execution_type, code, timestamps
- Browser version uses localStorage/IndexedDB

**Notes System** (`notes/`)
- `storage.ts`: LocalStorage-based note persistence
- `ai-generator.ts`: AI-powered title/summary generation using Gemini
- `types.ts`: Note data structures

### Web Architecture (packages/web/src/)

**Zustand Store** (`stores/conversation.ts`)
- Central state management for messages, active script context, settings, notes, auth
- Handles Gemini chat execution by intercepting router signals
- Loads/saves settings with encryption, manages Supabase sync

**Services:**
- `geminiChat.ts`: Conversational AI using Gemini 2.5 Flash, auto-resets after 3 turns
- `encryption.ts`: API key encryption (device-specific or password-based using Web Crypto API)
- `syncedScriptStorage.ts`: Script sync between localStorage and Supabase
- `supabaseAuth.ts`: User authentication
- `supabaseSettings.ts`: User settings persistence
- `supabaseStorage.ts`: Cloud storage for scripts
- `syncService.ts`: Bi-directional sync with conflict resolution
- `csvExport.ts`: Script import/export

**Components:**
- `Chat/`: Main conversation interface
- `Sidebar/`: Script browser with tags and search
- `Settings/`: API keys, MCP servers, Supabase config, AI prompt customization, theme selector
- `Auth/`: Login/signup forms
- `ConflictResolver/`: UI for resolving sync conflicts
- `Notes/`: Note-taking interface with AI generation
- `TabContainer/`: Tabbed interface for Chat, Scripts, and Notes

### Execution Flow Patterns

**Web-Layer Execution Types:**
When core package encounters execution types that require browser-specific APIs:
1. Router returns special signal (e.g., `GEMINI_CHAT_EXECUTION_REQUIRED`)
2. Conversation store intercepts the signal
3. Web-layer service executes (e.g., GeminiChatService)
4. Result flows back through conversation store to UI

This pattern keeps browser dependencies (@google/genai, localStorage) out of core package.

**Multi-Turn Parameter Collection:**
1. User triggers script but parameters missing
2. Router prompts for first missing parameter
3. Sets `activeScriptContext` with scriptId, collectedParams, missingParams
4. Subsequent user input routed to `continueParameterCollection()`
5. When all params collected, executes script and clears context

### Storage Architecture

**Dual Storage Pattern:**
- Core package defines storage interfaces
- Node.js: better-sqlite3 (real SQLite)
- Browser: BrowserScriptStorage uses sql.js (SQLite in WASM)
- Vite alias resolves better-sqlite3 to stub for browser builds

**Supabase Integration:**
- Optional cloud sync for scripts and settings
- SyncedScriptStorage wraps BrowserScriptStorage
- Bidirectional sync with conflict detection/resolution
- Encrypted API keys stored locally

## Key Patterns and Conventions

### TypeScript
- Strict mode enabled
- Export types explicitly from index.ts files
- Use Zod for runtime validation (MCP responses)

### State Management
- Zustand for global state (simple, no reducers)
- Async initialization: settings load asynchronously without blocking app startup

### Performance
- Code splitting: vendor chunks for React, AI libraries, Supabase
- Lazy loading: ScriptEditor, AIScriptGenerator, Settings loaded on-demand
- Vite pre-bundles core package for faster dependency resolution

### Testing
- Vitest for unit/integration tests
- Target: 80%+ code coverage
- Playwright for E2E tests
- Core tests focus on: intent classification, script execution, parameter extraction
- Web tests focus on: UI components, services, state management

### Security
- API keys encrypted via Web Crypto API (AES-GCM, PBKDF2)
- Dual encryption modes: device-specific (default) or password-based
- Script sandbox prevents require/import/process/fs access
- MCP client enforces HTTPS

## Important Files

- `packages/core/src/index.ts` - Core package exports
- `packages/web/src/App.tsx` - App entry point
- `packages/web/src/stores/conversation.ts` - Central state management
- `packages/web/vite.config.ts` - Build configuration with aliases and chunks
- `seed-data/scripts.json` - Example scripts
- `migrations/` - Supabase SQL migrations
- `.github/workflows/test.yml` - CI/CD configuration

## Adding Features

### New Execution Type

**Core-level (Node.js/browser agnostic):**
1. Add to `ExecutionType` union in `packages/core/src/scripts/types.ts`
2. Implement in `packages/core/src/scripts/executor.ts`
3. Update router switch case in `packages/core/src/intent/router.ts`

**Web-level (requires browser APIs):**
1. Add to `ExecutionType` union in types
2. Return signal from router (e.g., `NEW_TYPE_EXECUTION_REQUIRED`)
3. Create service in `packages/web/src/services/`
4. Intercept signal in conversation store
5. Execute and return result

### New Script
Use AI Script Generator UI (✨ Generate New Script button) or manually edit `seed-data/scripts.json` with:
- `name`, `description`, `tags`
- `triggerPhrases` - natural language patterns
- `parameters` - name, type, prompt, required
- `executionType` - local, mcp, or gemini-chat
- `code` - JavaScript for local execution

## Environment Variables

**Root `.env`:**
```bash
MCP_BASE_URL=https://api.example.com/mcp
MCP_AUTH_TYPE=bearer|api-key|none
MCP_AUTH_TOKEN=your-token
TTS_ENABLED_DEFAULT=false
TTS_VOICE=en-US
DEBUG_MODE=true
LOG_LEVEL=debug
```

**Web `.env` (`packages/web/.env`):**
```bash
VITE_DEBUG_MODE=true
VITE_MCP_BASE_URL=https://api.example.com/mcp
VITE_MCP_AUTH_TYPE=bearer
VITE_MCP_AUTH_TOKEN=your-token
```

Note: Vite env vars are embedded at build time.

## Deployment

**Fly.io (configured):**
```bash
fly auth login
fly apps create otto-ai  # if needed
fly deploy
fly open
```

**Static Hosting (Vercel, Netlify, GitHub Pages):**
```bash
npm run build
# Deploy packages/web/dist/
```

**Docker:**
Multi-stage build configured in Dockerfile:
- Build stage: Installs deps, builds core and web
- Production stage: Node.js serving static files via server.mjs
- Exposed port: 8080

## Troubleshooting

**Build fails on core package:**
- Ensure you're running Node.js 18+
- Run `npm ci` to clean install dependencies

**Web app can't find core package:**
- Run `cd packages/core && npm run build`
- Vite alias resolves `@otto-ai/core` to `../core/src`

**Tests fail in web package:**
- Ensure sql.js is in devDependencies (browser SQLite)
- Check vitest.config.ts has jsdom environment

**Encryption issues:**
- Device-specific encryption fails if device characteristics change (browser, screen, timezone)
- Set master password in Settings → API Keys for cross-device encryption
- Password stored in sessionStorage (cleared on browser close)

## Notes System

**Features:**
- AI-powered title/summary generation via Gemini
- LocalStorage persistence
- Markdown support (future)
- Integration with script system (future: notes can trigger scripts)
- After saving a new note, it automatically opens in Edit Note view for immediate editing

**Key Files:**
- `packages/core/src/notes/` - Core note logic
- `packages/web/src/components/Notes/` - Note UI components
- Store integration in `conversation.ts`

**Recent Improvements:**
- Fixed: Newly created notes now properly show in Edit Note view after saving
- `createNote` in store now returns the created note as a Promise
- NoteEditor properly handles async note creation

## Theme System

**Features:**
- 5 built-in color themes: Light, Dark, Blue, Green, Purple
- Instant theme preview and application
- Theme preference saved to settings and localStorage
- CSS variables updated dynamically for all UI components

**Key Files:**
- `packages/web/src/services/themeService.ts` - Theme management service
- `packages/web/src/components/Settings/Settings.tsx` - Theme selector in Appearance tab
- `packages/web/src/index.css` - CSS variables for theming

**Usage:**
- Themes are applied via CSS custom properties (CSS variables)
- ThemeService manages theme state and applies themes to document root
- Settings component includes Appearance tab with theme selector
- Theme preference is stored in settings and loaded on app initialization

## Tabbed Interface

**Features:**
- Clean tabbed interface for Chat, Scripts, and Notes
- Improved UX with hover effects and smooth transitions
- Active tab highlighting with accent color
- Responsive design

**Key Files:**
- `packages/web/src/components/TabContainer/` - Tab container component
- `packages/web/src/App.tsx` - Tab state management

**Recent Improvements:**
- Enhanced tab button styling with hover effects
- Better visual feedback for active tabs
- Improved spacing and alignment
