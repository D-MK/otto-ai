# Deploying to Fly.io

This guide covers deploying Otto AI to [Fly.io](https://fly.io), a platform for running full-stack apps and databases close to your users.

## Prerequisites

- [Fly.io CLI](https://fly.io/docs/getting-started/installing-flyctl/) installed
- Fly.io account created ([sign up here](https://fly.io/app/sign-up))
- Node.js 20+ installed locally

## Quick Start

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

## Configuration

### Environment Variables

If you need to set environment variables for the build process, you can set them in Fly.io:

```bash
fly secrets set VITE_MCP_BASE_URL=https://api.example.com/mcp
fly secrets set VITE_MCP_AUTH_TYPE=bearer
fly secrets set VITE_MCP_AUTH_TOKEN=your-token-here
```

**Important:** Vite environment variables are embedded at build time, so you'll need to rebuild and redeploy if you change them.

### Build Configuration

The app uses Vite for building. The build process:
- Builds the core package first
- Then builds the web package
- Outputs static files to `packages/web/dist/`

## Recent Build Fixes

- ✅ Fixed TypeScript compilation errors in NoteEditor component
- ✅ Excluded test files from production TypeScript builds
- ✅ Configured @testing-library/jest-dom matchers for Vitest test environment
- ✅ Fixed TypeScript `any` types in conversation store

## Troubleshooting

### Build Failures

If the build fails, check:
- Node.js version (requires 20+)
- All dependencies are installed (`npm install`)
- Core package is built (`cd packages/core && npm run build`)

### Runtime Issues

- Check logs: `fly logs`
- SSH into the instance: `fly ssh console`
- Check app status: `fly status`

## Scaling

Fly.io automatically scales based on traffic. You can configure scaling in `fly.toml`:

```toml
[services.concurrency]
  type = "connections"
  hard_limit = 25
  soft_limit = 20
```

## Custom Domains

To use a custom domain:

1. Add your domain in Fly.io dashboard
2. Configure DNS records as instructed
3. Update `fly.toml` if needed

For more information, see the [Fly.io documentation](https://fly.io/docs/).

