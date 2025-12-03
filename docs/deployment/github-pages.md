# Deploying to GitHub Pages

This guide covers deploying Otto AI to GitHub Pages using GitHub Actions for automatic deployment.

## Prerequisites

- GitHub repository with the code
- GitHub Pages enabled in repository settings
- Push access to the repository

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the settings

### 2. Deploy

The deployment workflow will automatically run when you push to the `main` branch. You can also manually trigger it:

1. Go to the **Actions** tab
2. Select **Deploy to GitHub Pages**
3. Click **Run workflow**

### 3. Access Your App

Your app will be available at:
```
https://<username>.github.io/<repository-name>/
```

For example: `https://username.github.io/otto-ai/`

## Custom Base Path

The workflow automatically sets the base path based on your repository name. If you're using a custom domain or deploying from `username.github.io`, you can override the base path by:

- Setting the `VITE_BASE_PATH` environment variable in your repository secrets
- Or modifying the workflow file to set a different base path

## Manual Build (Alternative)

If you prefer to build and deploy manually:

```bash
# Build the app
npm run build

# The built files will be in packages/web/dist/
# You can deploy this folder to GitHub Pages or any static hosting service
```

## Configuring Supabase for GitHub Pages

When deploying to GitHub Pages with Supabase authentication, you need to configure the Site URL correctly:

### 1. Set Site URL in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → URL Configuration**
3. Set **Site URL** to your GitHub Pages URL (including the base path):
   - Example: `https://d-mk.github.io/otto-ai/`
   - **Important:** Include the trailing slash and the repository name path
4. Add the same URL to **Redirect URLs** (allowed redirect URLs list)

### 2. Configure GitHub OAuth (if using)

1. In your GitHub OAuth App settings, set the **Authorization callback URL** to:
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Replace `YOUR_PROJECT` with your Supabase project reference ID
2. Copy the Client ID and Client Secret to Supabase **Authentication → Providers → GitHub**

### 3. Enable Authentication Providers

1. In Supabase, go to **Authentication → Providers**
2. Enable **Email** provider (required for email/password login)
3. Optionally enable **GitHub** provider if you want OAuth login

## Common Issues

### "Invalid redirect URL"

**Solution:** Make sure the Site URL in Supabase matches your GitHub Pages URL exactly, including the base path (e.g., `/otto-ai/`)

### "Authorization path mismatch"

**Solution:** Ensure the Site URL includes the full path, not just the domain

### OAuth not working

**Solution:** Verify the GitHub OAuth callback URL is set to your Supabase callback URL, not your app URL

### "Unable to exchange external code"

**Solution:** This error means the Client Secret in Supabase is incorrect - regenerate it in GitHub and update Supabase

### OAuth 404 on redirect

**Solution:** Make sure the GitHub OAuth Client ID (not a placeholder) is entered in Supabase → Authentication → Providers → GitHub

## Troubleshooting

### Build Failures

- Check GitHub Actions logs for build errors
- Ensure Node.js version is 20+ in the workflow
- Verify all dependencies are in `package.json`

### Deployment Not Updating

- Check if the workflow ran successfully
- Verify the `main` branch is being used
- Clear browser cache if changes aren't visible

For more information, see the [GitHub Pages documentation](https://docs.github.com/en/pages).

