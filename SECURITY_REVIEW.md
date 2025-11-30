# Security Review for Otto AI

**Date:** 2024  
**Reviewer:** AI Security Audit  
**Status:** ⚠️ **CRITICAL ISSUES FOUND** - Not ready for public deployment without fixes

## Executive Summary

This application has several **critical security vulnerabilities** that must be addressed before deploying to the internet. The most severe issues involve script execution sandboxing, exposed environment variables, and information disclosure through console logging.

---

## 🔴 CRITICAL ISSUES

### 1. **Insecure Script Execution Sandbox** 
**Severity:** CRITICAL  
**Location:** `packages/core/src/scripts/executor.ts:99`

**Issue:**
The app uses `new Function()` to execute user-provided JavaScript code, which is **NOT a secure sandbox**. This allows malicious scripts to:
- Access global objects via `globalThis`
- Potentially escape the sandbox
- Execute arbitrary code

**Current Code:**
```typescript
const sandboxedFunction = new Function(
  'params',
  `
  'use strict';
  const { ${Object.keys(params).join(', ')} } = params;
  const Math = globalThis.Math;
  const Date = globalThis.Date;
  const JSON = globalThis.JSON;
  ${code}
  `
);
```

**Risk:**
- Malicious users can inject code that accesses `globalThis.window`, `globalThis.document`, `globalThis.localStorage`
- Can potentially access encrypted API keys from localStorage
- Can make arbitrary network requests
- Can manipulate the DOM

**Recommendation:**
- Use a proper sandboxing solution like `vm2` (Node.js) or `isolated-vm`
- For browser, consider using Web Workers with strict CSP
- Implement a whitelist-based code parser (AST analysis)
- Add runtime monitoring and kill switches

---

### 2. **Environment Variables Exposed in Client Bundle**
**Severity:** CRITICAL  
**Location:** `packages/web/src/App.tsx:99-106`

**Issue:**
Vite environment variables prefixed with `VITE_` are **embedded in the client bundle** and visible to anyone who inspects the JavaScript.

**Current Code:**
```typescript
const mcpConfig = import.meta.env.VITE_MCP_BASE_URL
  ? {
      baseUrl: import.meta.env.VITE_MCP_BASE_URL,
      authType: import.meta.env.VITE_MCP_AUTH_TYPE || 'none',
      authToken: import.meta.env.VITE_MCP_AUTH_TOKEN,  // ⚠️ EXPOSED!
      timeout: 10000,
    }
  : undefined;
```

**Risk:**
- MCP authentication tokens are visible in the browser
- Anyone can extract API endpoints and tokens from the bundle
- These tokens can be used to make unauthorized API calls

**Recommendation:**
- **NEVER** put authentication tokens in `VITE_` environment variables
- Move MCP configuration to user settings (encrypted in localStorage)
- Use server-side proxy for MCP calls if tokens are required
- Remove any hardcoded secrets from the build

---

### 3. **API Keys Stored in Browser localStorage**
**Severity:** HIGH  
**Location:** Multiple files using `localStorage`

**Issue:**
Even though API keys are encrypted, they're stored in browser localStorage which:
- Is accessible via browser DevTools
- Can be extracted by browser extensions
- Is vulnerable to XSS attacks
- Persists across sessions

**Current Implementation:**
- Encryption uses Web Crypto API (good)
- But encrypted keys are still in localStorage (risky)
- Device fingerprint can change (breaks decryption)

**Risk:**
- XSS attack could steal encrypted keys
- Malicious browser extension could access keys
- If encryption fails, keys stored in plaintext (fallback behavior)

**Recommendation:**
- Consider using IndexedDB with encryption
- Implement key rotation
- Add session-based key storage (cleared on tab close)
- Warn users that keys are stored locally
- Consider server-side key storage for production

---

### 4. **Information Disclosure via Console Logging**
**Severity:** MEDIUM-HIGH  
**Location:** Throughout codebase (58+ instances)

**Issue:**
Extensive use of `console.log`, `console.error`, `console.warn` throughout the codebase can leak:
- API keys (if encryption fails)
- Error messages with sensitive data
- Internal application state
- User data

**Examples:**
```typescript
console.error('Failed to decrypt API key from AI config');
console.warn('Password-encrypted key found but no password set');
console.error('Error loading settings from localStorage:', error);
```

**Risk:**
- Sensitive information visible in browser console
- Error messages may contain stack traces with file paths
- Debug information helps attackers understand the system

**Recommendation:**
- Remove or disable all console statements in production builds
- Use a logging service (e.g., Sentry) for production errors
- Sanitize error messages before logging
- Implement environment-based logging (dev vs production)

---

## 🟡 HIGH PRIORITY ISSUES

### 5. **Weak Script Code Validation**
**Severity:** HIGH  
**Location:** `packages/core/src/scripts/executor.ts:128-155`

**Issue:**
The code validation only checks for basic patterns but doesn't prevent:
- Access to `globalThis` properties
- Prototype pollution
- Timing attacks
- Infinite loops (only 5-second timeout)

**Current Validation:**
```typescript
const dangerousPatterns = [
  /require\s*\(/,
  /import\s+/,
  /eval\s*\(/,
  /Function\s*\(/,
  // ... but doesn't check for globalThis, window, document, etc.
];
```

**Recommendation:**
- Use AST parsing to validate code structure
- Implement a whitelist of allowed operations
- Add resource limits (CPU, memory)
- Implement better timeout handling

---

### 6. **No Input Sanitization for User Content**
**Severity:** HIGH  
**Location:** Chat, Notes, Script Editor components

**Issue:**
User input is rendered without explicit sanitization. While React escapes by default, custom components might not.

**Risk:**
- XSS if React's escaping is bypassed
- Script injection in notes/chat messages
- Stored XSS in Supabase

**Recommendation:**
- Use `DOMPurify` for any HTML rendering
- Validate and sanitize all user input
- Implement Content Security Policy (CSP)
- Use React's built-in escaping (already in place, but verify)

---

### 7. **Supabase API Key Exposure**
**Severity:** HIGH  
**Location:** `packages/web/src/services/supabaseStorage.ts`

**Issue:**
Supabase API keys are stored in localStorage (encrypted) but:
- The anon key is meant to be public, but service role key should NEVER be in client
- No validation that the correct key type is being used

**Risk:**
- If service role key is accidentally used, full database access
- Keys visible in network requests
- No key rotation mechanism

**Recommendation:**
- Verify only Supabase anon key is used (not service role)
- Implement Row Level Security (RLS) policies in Supabase
- Use Supabase Auth for user-specific data access
- Never expose service role keys

---

### 8. **No Rate Limiting**
**Severity:** MEDIUM-HIGH  
**Location:** API calls to Gemini, MCP endpoints

**Issue:**
No rate limiting on:
- Gemini API calls (could exhaust quota)
- MCP endpoint calls
- Script execution
- Supabase operations

**Risk:**
- API quota exhaustion
- Cost overruns
- DoS attacks
- Resource exhaustion

**Recommendation:**
- Implement client-side rate limiting
- Add server-side rate limiting for MCP endpoints
- Monitor API usage
- Set usage quotas per user

---

## 🟢 MEDIUM PRIORITY ISSUES

### 9. **Missing Content Security Policy (CSP)**
**Severity:** MEDIUM  
**Location:** `index.html`, build configuration

**Issue:**
No Content Security Policy headers defined, allowing:
- Inline scripts
- External script loading
- eval() usage

**Recommendation:**
- Implement strict CSP headers
- Use nonce-based script loading
- Restrict external resource loading

---

### 10. **No HTTPS Enforcement**
**Severity:** MEDIUM  
**Location:** Deployment configuration

**Issue:**
No explicit HTTPS enforcement (though GitHub Pages provides it).

**Recommendation:**
- Ensure HTTPS-only deployment
- Implement HSTS headers
- Redirect HTTP to HTTPS

---

### 11. **Error Messages May Leak Information**
**Severity:** MEDIUM  
**Location:** Error handling throughout

**Issue:**
Error messages shown to users may contain:
- Stack traces
- File paths
- Internal error codes
- Database errors

**Recommendation:**
- Sanitize error messages for users
- Log detailed errors server-side only
- Use generic error messages for users
- Implement error boundaries in React

---

### 12. **No CORS Configuration**
**Severity:** MEDIUM  
**Location:** MCP client, API calls

**Issue:**
No explicit CORS handling for MCP endpoints.

**Recommendation:**
- Configure CORS on MCP server endpoints
- Validate origin headers
- Use credentials only when necessary

---

## ✅ SECURITY STRENGTHS

1. **Encryption Implementation**: Good use of Web Crypto API with AES-GCM
2. **Password-Based Encryption**: Supports cross-device encryption
3. **No SQL Injection Risk**: Uses parameterized queries (Supabase handles this)
4. **React Default Escaping**: React automatically escapes user input
5. **No eval() in UI**: Doesn't use eval() for rendering (only in script executor)

---

## 📋 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] **CRITICAL:** Replace `new Function()` with proper sandboxing solution
- [ ] **CRITICAL:** Remove all `VITE_` prefixed secrets from environment
- [ ] **CRITICAL:** Move MCP tokens to user settings (not env vars)
- [ ] **HIGH:** Remove/disable console logging in production builds
- [ ] **HIGH:** Implement input sanitization with DOMPurify
- [ ] **HIGH:** Verify Supabase RLS policies are enabled
- [ ] **HIGH:** Implement rate limiting
- [ ] **MEDIUM:** Add Content Security Policy headers
- [ ] **MEDIUM:** Sanitize error messages
- [ ] **MEDIUM:** Add CORS configuration
- [ ] **MEDIUM:** Implement monitoring and logging service

---

## 🔒 RECOMMENDED SECURITY IMPROVEMENTS

### Immediate (Before Deployment):
1. Fix script execution sandbox
2. Remove exposed environment variables
3. Disable console logging in production
4. Add input sanitization

### Short-term (Within 1-2 weeks):
1. Implement rate limiting
2. Add CSP headers
3. Improve error handling
4. Add security monitoring

### Long-term (Future enhancements):
1. Server-side script execution proxy
2. Key rotation mechanism
3. Audit logging
4. Penetration testing

---

## 📚 REFERENCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

**Conclusion:** The application has good security foundations (encryption, React escaping) but **critical vulnerabilities** in script execution and environment variable handling make it **unsafe for public deployment** without fixes. Address the critical issues before going live.

