/**
 * Production-safe logger
 * Disables console logging in production builds to prevent information disclosure
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_DEBUG_MODE === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, consider sending to error tracking service (e.g., Sentry)
    // but don't expose sensitive information
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

