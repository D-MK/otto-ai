/**
 * URL utility functions
 * Handles base path for GitHub Pages and other deployments
 */

/**
 * Detect the base path from the current URL
 * For GitHub Pages deployments like https://username.github.io/repo-name/
 * this extracts '/repo-name' from the pathname
 */
function detectBasePath(): string {
  // First try Vite's BASE_URL (set during build)
  const viteBasePath = import.meta.env.BASE_URL;
  if (viteBasePath && viteBasePath !== '/') {
    return viteBasePath.replace(/\/$/, '');
  }
  
  // Fallback: detect from current URL for GitHub Pages
  // GitHub Pages URLs are like: https://username.github.io/repo-name/path
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  // Check if this looks like a GitHub Pages deployment
  if (hostname.endsWith('.github.io')) {
    // Extract the first path segment as the base path
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      // The first segment is likely the repo name
      return `/${pathParts[0]}`;
    }
  }
  
  return '';
}

/**
 * Get the base URL including the base path
 * This is important for GitHub Pages deployments where the app is at /repo-name/
 */
export function getBaseUrl(): string {
  const origin = window.location.origin;
  const basePath = detectBasePath();
  
  return `${origin}${basePath}`;
}

/**
 * Get the full URL for a given path
 */
export function getUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

