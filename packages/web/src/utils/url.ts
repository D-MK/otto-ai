/**
 * URL utility functions
 * Handles base path for GitHub Pages and other deployments
 */

/**
 * Get the base URL including the base path
 * This is important for GitHub Pages deployments where the app is at /repo-name/
 */
export function getBaseUrl(): string {
  // Vite provides BASE_URL which includes the base path (e.g., '/otto-ai/')
  const basePath = import.meta.env.BASE_URL || '/';
  
  // Remove trailing slash from origin and ensure base path starts with /
  const origin = window.location.origin;
  const normalizedBasePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  
  return `${origin}${normalizedBasePath}`;
}

/**
 * Get the full URL for a given path
 */
export function getUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

