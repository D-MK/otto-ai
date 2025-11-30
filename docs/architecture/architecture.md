# Architecture Overview

## System Design

The Automation Companion follows a layered architecture with clear separation between core logic and UI.

```
┌─────────────────────────────────────────────────┐
│                 Web UI Layer                    │
│  (React Components, Zustand Store)              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Core Business Logic                │
│  (Intent Router, Script Executor, MCP Client)   │
└─────────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ SQLite │  │ Sandbox │  │   MCP   │  │ Gemini  │
    │Storage │  │Executor │  │   API   │  │  Chat   │
    └────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Core Components

### 1. Intent Router (`packages/core/src/intent/router.ts`)

The heart of the system - orchestrates the entire conversation flow.

**Responsibilities:**
- Classify user input via `IntentClassifier`
- Extract entities via `EntityExtractor`
- Manage multi-turn parameter collection
- Route to appropriate execution handler
- Handle disambiguation

**Decision Flow:**
```
User Input
    │
    ▼
Has active script context? ──Yes──> Continue param collection
    │
    No
    ▼
Classify intent
    │
    ├──> Script (confidence > 0.7) ──> Execute or collect params
    ├──> MCP (has action verb) ──────> Route to MCP
    └──> Fallback ───────────────────> General assistant
```

### 2. Intent Classifier (`packages/core/src/intent/classifier.ts`)

Determines what the user wants to do.

**Algorithm:**
1. Compute similarity between input and each script's:
   - Trigger phrases (highest weight)
   - Description (medium weight)
   - Tags (bonus points)
2. Check for MCP action verbs (fetch, query, submit, etc.)
3. Sort matches by confidence
4. Flag disambiguation if top 2 matches within 0.1 confidence

**Similarity Metric:**
- Currently uses word overlap (Jaccard similarity)
- Production version should use actual embeddings (OpenAI, etc.)

### 3. Script Executor (`packages/core/src/scripts/executor.ts`)

Runs local JavaScript in a sandboxed environment.

**Safety Features:**
- No access to `require()`, `import`, `process`, `fs`, etc.
- 5-second execution timeout
- Type coercion for parameters
- Pre-execution code validation

**Sandbox Limitations:**
This is a basic sandbox using `new Function()`. For production:
- Use `isolated-vm` for true isolation
- Or run in separate worker threads
- Consider WebAssembly for compute-heavy tasks

### 4. MCP Client (`packages/core/src/mcp/client.ts`)

Interfaces with external APIs.

**Features:**
- Configurable authentication (Bearer, API-Key, None)
- Request timeout handling
- Optional JSON schema validation
- Automatic query parameter encoding

### 5. Gemini Chat Service (`packages/web/src/services/geminiChat.ts`)

Provides conversational AI capabilities using Gemini 2.5 Flash.

**Features:**
- Context-aware conversations with history tracking
- Automatic conversation reset after 3 turns
- Shared API key with AI Script Generator
- localStorage-based conversation persistence
- Turn count tracking and user feedback

**Architecture:**
- Web-layer service (not in core package)
- Router signals gemini-chat execution to web layer
- Conversation store intercepts and handles with GeminiChatService
- Maintains separate conversation history from main chat

**Conversation Flow:**
```
User Input → Router → GEMINI_CHAT_EXECUTION_REQUIRED
          → Conversation Store intercepts
          → GeminiChatService.chat()
          → Gemini API (via @google/genai SDK)
          → Response with turn count
          → Auto-reset after 3 turns
```

### 6. Script Storage (`packages/core/src/scripts/storage.ts`)

SQLite-based persistence.

**Schema:**
```sql
CREATE TABLE scripts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL,              -- JSON array
  trigger_phrases TEXT NOT NULL,   -- JSON array
  parameters TEXT NOT NULL,        -- JSON array
  execution_type TEXT NOT NULL,    -- 'local' | 'mcp' | 'gemini-chat'
  mcp_endpoint TEXT,
  code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Why SQLite?**
- Portable (single file or in-memory)
- No server setup required
- Works identically on web (via sql.js) and mobile (expo-sqlite)
- Fast for < 10k scripts

## Data Flow Example

### TOON: BMI Calculation

```
USER: "calculate my bmi"
  │
  ▼
[IntentRouter.route()]
  │
  ├─> [IntentClassifier.classify()]
  │     └─> Match: "BMI Calculator" (confidence: 0.92)
  │
  ├─> [EntityExtractor.extract()]
  │     └─> Params: {} (none found)
  │
  ├─> Missing params: [weight, height]
  │
  └─> Return: { message: "What's your weight in kg?", requiresUserInput: true }

USER: "82"
  │
  ▼
[IntentRouter.continueParameterCollection()]
  │
  ├─> Extract from "82" → weight: 82
  ├─> Still missing: [height]
  └─> Return: { message: "And your height in cm?", requiresUserInput: true }

USER: "178"
  │
  ▼
[IntentRouter.continueParameterCollection()]
  │
  ├─> Extract from "178" → height: 178
  ├─> All params collected
  │
  └─> [ScriptExecutor.executeLocal()]
        │
        ├─> Validate params
        ├─> Coerce types (string → number)
        ├─> Run sandboxed code
        └─> Return: { result: "Your BMI is 25.9..." }
```

## State Management

### Zustand Store (`packages/web/src/stores/conversation.ts`)

```typescript
interface ConversationState {
  messageHistory: Message[];           // All messages
  activeScriptContext?: {              // Current param collection
    scriptId: string;
    collectedParams: Record<string, any>;
    missingParams: string[];
  };
  router: IntentRouter;
  scriptStorage: ScriptStorage;
  ttsEnabled: boolean;
  isProcessing: boolean;
}
```

**Why Zustand?**
- Simpler than Redux for small apps
- Direct state updates (no reducers)
- Good TypeScript support
- Easy to test

## Security Considerations

### Script Execution
- ✅ Sandboxed environment
- ✅ No filesystem/network access
- ✅ Timeout protection
- ⚠️ Basic sandbox (upgrade for production)

### MCP Integration
- ✅ Configurable auth
- ✅ HTTPS enforcement
- ⚠️ No rate limiting (add for production)
- ⚠️ No request signing (add if needed)

### Data Storage
- ✅ Local-only (no cloud exposure)
- ⚠️ No encryption at rest (add for sensitive data)
- ⚠️ No script signing (scripts are trusted)

### Gemini Chat
- ✅ API key stored in localStorage
- ✅ Conversation auto-reset after 3 turns
- ✅ Uses official @google/genai SDK
- ⚠️ No conversation encryption (plaintext in localStorage)
- ⚠️ No API rate limiting (relies on Gemini quotas)

## Performance

### Intent Classification
- **Current**: O(n) where n = number of scripts
- **Optimization**: Use vector database (Pinecone, Weaviate) for > 100 scripts
- **Target**: < 100ms for 50 scripts

### Script Execution
- **Timeout**: 5 seconds
- **Parallelization**: Not implemented (future enhancement)

### Storage
- **In-Memory**: Fast but volatile
- **File-Based**: Persistent, still fast for < 1000 scripts
- **Indexing**: Name and tags indexed

## Extensibility Points

### Adding New Execution Types

**For core-level execution types (local, mcp):**
1. Add type to `ExecutionType` union in `types.ts`
2. Implement executor in `executor.ts`
3. Update router switch case in `router.ts`

**For web-level execution types (gemini-chat):**
1. Add type to `ExecutionType` union in `types.ts`
2. Return special signal from router (e.g., `GEMINI_CHAT_EXECUTION_REQUIRED`)
3. Implement service in web package
4. Intercept signal in conversation store
5. Handle execution in web layer

Example: `gemini-chat` execution type uses this pattern to keep browser-specific code (localStorage, @google/genai) out of the core package.

### Custom Entity Extractors
Implement `IEntityExtractor` interface:
```typescript
interface IEntityExtractor {
  extract(input: string, params: ParameterDef[]): Record<string, any>;
}
```

### Alternative Storage Backends
Implement `IScriptStorage` interface:
```typescript
interface IScriptStorage {
  create(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Script;
  getById(id: string): Script | null;
  getAll(): Script[];
  update(id: string, updates: Partial<Script>): Script | null;
  delete(id: string): boolean;
}
```

## Testing Strategy

### Unit Tests (Vitest)
- **Core modules**: 80%+ coverage
- **Focus areas**: Intent classification, script execution, parameter extraction
- **Mocking**: Fetch API for MCP tests

### Integration Tests (Future)
- End-to-end conversation flows
- Multi-turn parameter collection
- Error recovery

### Performance Tests (Future)
- Intent classification latency
- Script execution throughput
- Database query performance

## Deployment

### Web (Current)
```bash
npm run build
# Deploy dist/ to any static host
```

### Mobile (Future - React Native)
- Same core package
- Platform-specific storage (expo-sqlite)
- Platform-specific TTS (expo-speech)

## Future Enhancements

1. **Vector Embeddings**: Replace word overlap with OpenAI embeddings
2. **Script Marketplace**: Share and discover scripts
3. **Voice Input**: Add STT for hands-free use
4. **Multi-User**: Add auth and user-specific scripts
5. **Cloud Sync**: Backup scripts to cloud storage
6. **Advanced Sandbox**: Use isolated-vm or WebAssembly
7. **Scheduling**: Cron-like scheduling for scripts
8. **Webhooks**: Trigger scripts from external events
