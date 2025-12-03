# Deploying to Other Platforms

Otto AI can be deployed to any static hosting service. This guide covers deployment to popular platforms.

## General Build Process

All platforms use the same build process:

```bash
# Install dependencies
npm install

# Build core package
cd packages/core
npm run build

# Build web app
cd ../web
npm run build
```

The built files will be in `packages/web/dist/` and can be deployed to any static hosting service.

## Vercel

### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the build settings
3. Configure build command: `npm run build`
4. Set output directory: `packages/web/dist`
5. Deploy

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

Set environment variables in Vercel dashboard:
- `VITE_MCP_BASE_URL`
- `VITE_MCP_AUTH_TYPE`
- `VITE_MCP_AUTH_TOKEN`

## Netlify

### Automatic Deployment

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `packages/web/dist`
3. Deploy

### Manual Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=packages/web/dist
```

### Environment Variables

Set environment variables in Netlify dashboard under Site settings → Environment variables.

## Cloudflare Pages

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `packages/web/dist`
3. Deploy

## AWS S3 + CloudFront

1. Build the app (see General Build Process above)
2. Upload `packages/web/dist/` to S3 bucket
3. Configure CloudFront distribution
4. Set up custom domain (optional)

## Azure Static Web Apps

1. Connect your GitHub repository
2. Configure build settings:
   - App location: `/`
   - Api location: (leave empty)
   - Output location: `packages/web/dist`
3. Deploy

## Important Notes

### Base Path Configuration

If deploying to a subdirectory (e.g., `/otto-ai/`), set the `VITE_BASE_PATH` environment variable:

```bash
VITE_BASE_PATH=/otto-ai/
```

### Supabase Configuration

When deploying to any platform, ensure your Supabase Site URL matches your deployment URL exactly, including any base path.

### Environment Variables

All Vite environment variables must be set at build time. They cannot be changed at runtime without rebuilding.

For platform-specific issues, refer to the hosting provider's documentation.

