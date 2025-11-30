# Otto AI

A cross-platform AI automation assistant that lets users create, manage, and invoke scripts through natural language.

## Features

- **Natural Language Interface**: Interact with scripts using conversational language
- **Script Management**: Create, edit, and delete custom scripts with a user-friendly editor
- **AI Script Generator**: Generate scripts automatically using AI (Gemini or Claude) from natural language descriptions
- **Conversational AI**: Built-in Gemini chat for Q&A with conversation context (up to 3 exchanges)
- **Script Browser**: Sidebar with collapsible script list, clickable keywords, and script tags
- **Script Import/Export**: Import and export scripts as JSON for backup and sharing
- **Multiple Execution Types**: Run scripts locally (sandboxed JavaScript), via external MCP APIs, or through Gemini AI
- **Intent Classification**: Smart routing using embedding similarity and keyword matching
- **Parameter Collection**: Conversational parameter gathering across multiple turns
- **Text-to-Speech**: Optional TTS for bot responses
- **Debug Mode**: Detailed intent classification and execution information

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Build core package
cd packages/core
npm run build

# The MCP client now enforces typed JSON responses, so be sure your
# external MCP APIs return data that matches the expected schema.

# Start web app
cd ../web
npm run dev
```

The app will be available at `http://localhost:3000`.

### Using Seed Scripts

The app comes with several example scripts:

1. **BMI Calculator**: Calculate body mass index
   - Trigger: "calculate my bmi"
   - Parameters: weight (kg), height (cm)

2. **Currency Converter**: Convert between currencies (requires MCP setup)
   - Trigger: "convert currency"
   - Parameters: amount, from currency, to currency

3. **Daily Standup Summary**: Create work summaries
   - Trigger: "daily standup"
   - Parameters: yesterday's work, today's work, blockers

4. **Ask Gemini**: Conversational AI assistant powered by Gemini 2.5 Flash
   - Trigger: "ask gemini", "gemini", "hey gemini"
   - Parameters: question
   - Supports up to 3 back-and-forth exchanges before starting fresh
   - Automatically uses API key from AI Script Generator

5. **Insulin Calculator**: Calculate insulin dosage
   - Trigger: "insulin", "calculate insulin"
   - Parameters: value for calculation

## AI Script Generator

The app includes an AI-powered script generator that can create scripts automatically from natural language descriptions.

### Supported AI Providers

- **Google Gemini 2.5 Flash**: Fast and efficient model with free tier available, get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Claude by Anthropic**: High quality results, get your API key from [Anthropic Console](https://console.anthropic.com/)

### How to Use

1. Click the **✨ Generate New Script** button in the sidebar
2. Configure your AI provider and API key (encrypted and saved locally in browser)
3. Describe the script you want to create (e.g., "Create a script that calculates the tip amount for a restaurant bill")
4. Review the generated script (name, description, tags, trigger phrases, parameters, and code)
5. Save directly or edit before saving

### API Key Security

API keys are automatically encrypted before storage using the Web Crypto API with AES-GCM encryption. The app supports two encryption modes:

1. **Device-Specific Encryption (Default)**: Keys are encrypted using your device's fingerprint (browser, screen resolution, timezone, etc.). This provides seamless protection with no password required. However, if your device characteristics change significantly, you may need to re-enter your API keys.

2. **Password-Based Encryption (Optional)**: Set a master password in Settings to enable password-based encryption. This allows your API keys to work across different devices and browsers. The password is stored in sessionStorage (cleared when the browser closes) and never saved to disk.

**Setting a Master Password:**
- Go to Settings → API Keys tab
- Click "Set Master Password"
- Enter a password (minimum 8 characters)
- Confirm the password
- Existing API keys will be automatically re-encrypted with the new password

**Benefits of Master Password:**
- Works across devices and browsers
- More secure than device-specific encryption
- Keys persist even if device characteristics change
- Password is never stored permanently (only in sessionStorage)

**Note**: If you forget your master password, you'll need to re-enter your API keys. The password is required each browser session to decrypt your keys.

The AI generator creates complete scripts with:
- Intelligent keyword analysis from your description
- Context-aware trigger phrases based on keywords you mention
- Relevant tags automatically assigned based on the script's domain (e.g., "math", "finance", "conversion")
- Parameter definitions with user-friendly prompts
- Sandboxed JavaScript code

### Customizing the AI Prompt

You can customize the system prompt used by the AI Script Generator to better suit your needs. This allows you to:
- Adjust the tone and style of generated scripts
- Add specific guidelines or constraints
- Include examples relevant to your use case
- Modify the output format requirements

**To customize the prompt:**

1. Go to **Settings** → **AI Prompt** tab
2. Edit the system prompt in the textarea
3. Click **Save Prompt to Supabase** to persist your changes
4. The custom prompt will be automatically used for all future script generations

**Note:** 
- Requires Supabase to be configured (URL and API key)
- The prompt is stored in Supabase in the `ai_config` table
- If no custom prompt is found, the default prompt is used
- Changes take effect immediately for new script generations

**Database Setup:**

If you haven't already, run the migration to create the `ai_config` table:

```sql
-- See migrations/001_create_ai_config_table.sql
```

Or run it directly in your Supabase SQL editor.

## Gemini Conversational AI

The app includes a built-in conversational AI powered by Gemini 2.5 Flash for answering questions and having natural discussions.

### Features

- **Context-Aware**: Maintains conversation history across multiple exchanges
- **Conversation Limits**: Automatically resets after 3 back-and-forth turns to keep responses focused
- **Shared API Key**: Uses the same Gemini API key configured in the AI Script Generator
- **Easy Access**: Trigger with "ask gemini", "hey gemini", or just "gemini"

### How to Use

1. Make sure you have a Gemini API key configured (via AI Script Generator)
2. Say "ask gemini what is quantum computing?"
3. Follow up with related questions (up to 2 more exchanges)
4. After 3 turns, the conversation automatically resets for the next topic

### Example Conversation

```
You: ask gemini what is machine learning?
Bot: [Explains machine learning] [2 turn(s) remaining in this conversation]

You: what are some examples?
Bot: [Provides examples] [1 turn(s) remaining in this conversation]

You: how is it different from AI?
Bot: [Explains difference] [Conversation limit reached. Next message will start a new conversation.]

You: tell me about neural networks
Bot: [New conversation started] [Explains neural networks] [2 turn(s) remaining]
```

## Project Structure

```
otto-ai/
├── packages/
│   ├── core/                 # Shared business logic
│   │   ├── src/
│   │   │   ├── scripts/      # Script storage & execution
│   │   │   ├── intent/       # Intent classification & routing
│   │   │   └── mcp/          # MCP client
│   │   └── __tests__/        # Unit tests
│   │
│   └── web/                  # React web application
│       ├── src/
│       │   ├── components/   # UI components
│       │   └── stores/       # Zustand state management
│       └── vite.config.ts
│
├── seed-data/                # Example scripts
├── docs/                     # Documentation
└── .env.example              # Environment configuration
```

## Environment Variables

Create a `.env` file in the root:

```bash
# MCP Configuration
MCP_BASE_URL=https://api.example.com/mcp
MCP_AUTH_TYPE=bearer          # none | bearer | api-key
MCP_AUTH_TOKEN=your-token-here

# TTS Configuration
TTS_ENABLED_DEFAULT=false
TTS_VOICE=en-US

# Debug Settings
DEBUG_MODE=true
LOG_LEVEL=debug
```

For the web app, create `packages/web/.env`:

```bash
VITE_DEBUG_MODE=true
VITE_MCP_BASE_URL=https://api.example.com/mcp
VITE_MCP_AUTH_TYPE=bearer
VITE_MCP_AUTH_TOKEN=your-token-here
```

## Deployment

### Deploying to Fly.io

The app is configured for deployment on [Fly.io](https://fly.io). 

**Prerequisites:**
- [Fly.io CLI](https://fly.io/docs/getting-started/installing-flyctl/) installed
- Fly.io account created

**Deployment Steps:**

1. **Login to Fly.io:**
   ```bash
   fly auth login
   ```

2. **Create a new app (if not already created):**
   ```bash
   fly apps create otto-ai
   ```
   Note: Update the `app` name in `fly.toml` if you use a different name.

3. **Deploy:**
   ```bash
   fly deploy
   ```

4. **Open your app:**
   ```bash
   fly open
   ```

The deployment includes:
- Multi-stage Docker build for optimized image size
- Static file server for the React app
- Automatic HTTPS via Fly.io
- Auto-scaling (machines start/stop based on traffic)

**Environment Variables:**
If you need to set environment variables for the build process (e.g., Vite environment variables), you can set them in Fly.io:
```bash
fly secrets set VITE_MCP_BASE_URL=https://api.example.com/mcp
fly secrets set VITE_MCP_AUTH_TYPE=bearer
fly secrets set VITE_MCP_AUTH_TOKEN=your-token-here
```

Note: Vite environment variables are embedded at build time, so you'll need to rebuild and redeploy if you change them.

### Other Deployment Options

The app can also be deployed to any static hosting service:
- **Vercel**: Connect your repository and deploy
- **Netlify**: Connect your repository and deploy
- **GitHub Pages**: Build and push the `dist` folder

For static hosting, build the app first:
```bash
npm run build
# Deploy packages/web/dist/ to your hosting service
```

## Running Tests

Otto AI uses a comprehensive testing suite with unit tests, integration tests, and E2E tests.

### Unit Tests

**Core Package:**
```bash
cd packages/core
npm test

# With coverage
npm run test:coverage
```

**Web Package:**
```bash
cd packages/web
npm test

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

**All Tests:**
```bash
# From root directory
npm test

# With coverage for all packages
npm run test:coverage
```

### Integration Tests

Integration tests verify that multiple components work together correctly:

```bash
cd packages/core
npm test -- __tests__/intent-router.test.ts
```

### E2E Tests

End-to-end tests use Playwright to test user journeys:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Test Coverage

The project aims for **80%+ code coverage**. Coverage reports are generated in:
- `packages/core/coverage/`
- `packages/web/coverage/`

### CI/CD

Tests run automatically on:
- Every push to `main` or `develop` branches
- Every pull request

See `.github/workflows/test.yml` for the CI configuration.

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Adding Scripts](docs/adding-scripts.md)
- [MCP Integration](docs/mcp-integration.md)
- [Portfolio/SAAS Readiness Review](docs/portfolio-saas-readiness-review.md)

## Development Workflow

1. **Add a new script**: 
   - Use the AI Script Generator for quick creation
   - Use the Script Manager UI for manual creation
   - Or edit `seed-data/scripts.json` directly
2. **Test locally**: Use debug mode to see intent classification
3. **Iterate**: Adjust trigger phrases and parameters based on user feedback
4. **Share scripts**: Export scripts as JSON to share with others or backup your collection

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | Fast development & HMR |
| State | Zustand | Simple, reactive state |
| Backend | TypeScript + Node | Type-safe core logic |
| Storage | better-sqlite3 / localStorage | Local, portable database (browser uses localStorage) |
| Testing | Vitest | Fast unit tests |

## Performance Optimizations

The web app has been optimized for fast initial load times:

- **Code Splitting**: Large dependencies (React, AI libraries, Supabase) are split into separate chunks
- **Lazy Loading**: Conditional components (ScriptEditor, AIScriptGenerator, Settings, etc.) are loaded on-demand
- **Vite Optimization**: Core package is pre-bundled for faster dependency resolution
- **Non-blocking Initialization**: Settings load asynchronously without blocking app startup

## Security Features

- **API Key Encryption**: API keys are automatically encrypted before storage using the Web Crypto API
- **Dual Encryption Modes**: 
  - Device-specific encryption (default) - seamless, no password needed
  - Password-based encryption (optional) - works across devices, more secure
- **Web Crypto API**: Uses browser-native encryption (AES-GCM) with PBKDF2 key derivation
- **Session-Based Password**: Master password stored only in sessionStorage (cleared on browser close)
- **Automatic Migration**: Existing keys are automatically re-encrypted when you set a master password

## Limitations (MVP Scope)

- No user authentication
- No cloud sync
- Text input only (no voice STT)
- Basic in-memory reminders only
- Single-user local storage

## Contributing

This is an MVP prototype. To contribute:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT
