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
- **Tabbed Interface**: Clean tabbed interface for Chat, Scripts, and Notes with improved UX
- **Notes System**: Full-featured note-taking with AI-powered title/summary generation, search, filtering, sorting, and tag management
- **Custom Themes**: Choose from 5 classic preset themes (Light, Dark, Blue, Green, Purple) or create your own custom theme

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- If using WSL, ensure Node.js 20+ is installed in your WSL environment (not just Windows)

### Installation

```bash
# Install dependencies
npm install

# Build core package
cd packages/core
npm run build

# Start web app
cd ../web
npm run dev
```

The app will be available at `http://localhost:3000`.

### Using Seed Scripts

The app comes with several example scripts. See the [Adding Scripts guide](docs/guides/adding-scripts.md) for details on creating and managing scripts.

## AI Script Generator

The app includes an AI-powered script generator that can create scripts automatically from natural language descriptions.

**Supported AI Providers:**
- **Google Gemini 2.5 Flash**: Fast and efficient model with free tier available, get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Claude by Anthropic**: High quality results, get your API key from [Anthropic Console](https://console.anthropic.com/)

**How to Use:**
1. Click the **✨ Generate New Script** button in the sidebar
2. Configure your AI provider and API key (encrypted and saved locally in browser)
3. Describe the script you want to create
4. Review the generated script
5. Save directly or edit before saving

**API Key Security:**
API keys are automatically encrypted before storage using the Web Crypto API with AES-GCM encryption. The app supports two encryption modes:
- **Device-Specific Encryption (Default)**: Seamless protection with no password required
- **Password-Based Encryption (Optional)**: Works across different devices and browsers

For detailed information on customizing the AI prompt, see the [AI Prompt Customization guide](docs/guides/ai-prompt-customization.md).

## Gemini Conversational AI

The app includes a built-in conversational AI powered by Gemini 2.5 Flash for answering questions and having natural discussions.

**Features:**
- Context-aware conversations with history tracking
- Automatically resets after 3 back-and-forth turns
- Shared API key with AI Script Generator
- Trigger with "ask gemini", "hey gemini", or just "gemini"

For more details, see the [Architecture documentation](docs/architecture/architecture.md#gemini-chat-service).

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

For detailed architecture information, see the [Architecture Overview](docs/architecture/architecture.md).

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

For detailed MCP integration setup, see the [MCP Integration guide](docs/integration/mcp-integration.md).

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

**Environment Variables:**
If you need to set environment variables for the build process, you can set them in Fly.io:
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

**Quick Start:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

For detailed testing information, see the [Testing Guide](docs/development/testing.md).

## Customization

### Color Themes

Otto AI includes 5 classic preset themes and supports custom theme creation:

**Preset Themes:**
- **Light**: Clean, bright default theme with modern blue accents
- **Dark**: Dark mode with slate colors for low-light environments
- **Blue**: Cool blue color scheme with professional styling
- **Green**: Natural green color scheme with earthy tones
- **Purple**: Vibrant purple color scheme with elegant styling

**Custom Themes:**
Create your own custom theme by selecting colors for sidebar tabs, chat header, accent colors, backgrounds, text, and borders.

**To change themes:**
1. Open Settings (click the settings icon)
2. Go to the "Appearance" tab
3. Choose between "Preset Themes" or "Custom Theme"
4. For presets: Select your preferred theme
5. For custom: Use color pickers or enter hex codes for each color option
6. The theme is applied immediately as you make changes
7. Click "Save" to persist your preference

Themes are stored in your browser's localStorage and persist across sessions.

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### User Guides
- **[Adding Scripts](docs/guides/adding-scripts.md)** - Complete guide to creating, configuring, and managing scripts
- **[AI Prompt Customization](docs/guides/ai-prompt-customization.md)** - How to customize the AI Script Generator system prompt

### Technical Documentation
- **[Architecture Overview](docs/architecture/architecture.md)** - System architecture, components, data flow, and design decisions
- **[Testing Guide](docs/development/testing.md)** - Testing infrastructure, unit tests, integration tests, and E2E testing
- **[MCP Integration](docs/integration/mcp-integration.md)** - Guide to integrating external APIs using the Model Context Protocol

### Reviews & Analysis
- **[Application Review](docs/reviews/app-review.md)** - Comprehensive feature analysis and technical assessment
- **[Portfolio/SAAS Readiness Review](docs/reviews/portfolio-saas-readiness-review.md)** - Production readiness assessment and recommendations
- **[Next Features & Roadmap](docs/reviews/next-features.md)** - Feature gap analysis and prioritized roadmap

See the [Documentation Index](docs/README.md) for a complete overview.

## Development Workflow

1. **Add a new script**: 
   - Use the AI Script Generator for quick creation
   - Use the Script Manager UI for manual creation
   - Or edit `seed-data/scripts.json` directly
2. **Test locally**: Use debug mode to see intent classification
3. **Iterate**: Adjust trigger phrases and parameters based on user feedback
4. **Share scripts**: Export scripts as JSON to share with others or backup your collection

For detailed development guidelines, see the [Testing Guide](docs/development/testing.md) and [Architecture Overview](docs/architecture/architecture.md).

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
- **Session-Based Password**: Master password stored only in sessionStorage (cleared when the browser closes)
- **Automatic Migration**: Existing keys are automatically re-encrypted when you set a master password

For detailed security information, see the [Architecture documentation](docs/architecture/architecture.md#security-considerations).

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

For development guidelines, see the [Testing Guide](docs/development/testing.md) and [Architecture Overview](docs/architecture/architecture.md).

## License

MIT
