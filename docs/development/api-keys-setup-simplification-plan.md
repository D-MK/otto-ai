# API Keys and Links Setup Simplification Plan

## Overview

This document outlines a plan to simplify the initial setup process for API keys and links (Gemini API key, Supabase project name/URL, and Supabase API key) and improve the persistence experience for users.

## Guiding Principles

1. **Security-first experience** – every simplified step must maintain or improve current encryption and validation guarantees.
2. **One-time setup** – users should only enter credentials once per device (or once per account if cloud sync is enabled).
3. **Progressive disclosure** – show the minimum required fields first, reveal advanced configuration only when needed.
4. **Resilient persistence** – support automatic recovery through encrypted local storage, optional master password, and secure cloud syncing via Supabase.
5. **Auditable actions** – clearly communicate when secrets are stored, encrypted, synced, or deleted.

## Current State Analysis

### Current Setup Flow

1. **User opens Settings** → Navigate to Settings → API Keys tab
2. **Manual Entry Required**:
   - Gemini API Key (password field)
   - Supabase Project Name (text field with URL prefix/suffix)
   - Supabase API Key (password field)
3. **Storage Mode Selection**: Choose between localStorage and Supabase
4. **Manual Save**: Click "Save Settings" button
5. **Persistence**: Settings saved to localStorage (encrypted) and optionally synced to Supabase if authenticated

### Current Pain Points

1. **No Initial Setup Wizard**: First-time users must discover Settings manually
2. **Multiple Steps Required**: Users need to enter multiple fields across different sections
3. **No Validation Feedback**: Limited real-time validation (only on save)
4. **No Setup Completion Indicator**: Users may not know when setup is "complete"
5. **No Guided Flow**: No step-by-step guidance for first-time setup
6. **Settings Scattered**: API keys, MCP servers, and other settings are in different tabs
7. **No Quick Setup Option**: No streamlined path for essential configuration

## Proposed Solution

### Phase 1: First-Time Setup Wizard

#### 1.1 Detection and Trigger

- **Detect First-Time User**: Check if any API keys are configured
- **Auto-Show Wizard**: Automatically display setup wizard on first app load if no keys detected
- **Skip Option**: Allow users to skip and access Settings manually
- **Dismissible**: Users can close and return later

#### 1.2 Wizard Flow

The wizard should feel like an onboarding checklist with persistent progress. Each step must include inline validation, contextual help, and a short “Why we need this” message so that users understand the value and security implications.

**Step 1: Welcome & Overview**
- Brief introduction to Otto AI
- Explain what API keys are needed and why
- Show progress indicator (e.g., "Step 1 of 3")

**Step 2: Gemini API Key**
- Clear instructions on where to get the key
- Direct link to Google AI Studio
- Input field with show/hide toggle and “copy/paste tips”
- Real-time validation (format check + length)
- Optional “Test Connection” button with throttling
- Prompt to “Encrypt with master password” (recommended) with short explainer
- Skip option (can configure later)

**Step 3: Supabase Configuration (Optional)**
- Explain what Supabase is used for (cloud sync, authentication)
- Two input fields:
  - Project Name (with URL preview: `https://[project].supabase.co`)
  - API Key (anon/public key)
- Real-time validation (pattern + reachability check)
- "Test Connection" button that performs a lightweight ping to Supabase
- Skip option (can use encrypted localStorage only)
- Reminder that Supabase credentials are encrypted exactly like Gemini keys

**Step 4: Storage Mode Selection**
- If Supabase configured: Choose between localStorage (device-only) and Supabase (multi-device sync)
- If Supabase skipped: Auto-select encrypted localStorage
- Explain the difference plus security implications (e.g., Supabase inherits Supabase auth policies)
- Offer “Remember this device” toggle that stores an encrypted fingerprint for faster re-entry

**Step 5: Completion**
- Summary of configured settings
- "Start Using Otto AI" button
- Option to configure MCP servers now or later
- Offer “Backup options” quick links (download encrypted settings, copy Supabase instructions)

#### 1.3 Implementation Details

**Components to Create:**
- `SetupWizard.tsx` - Main wizard component
- `SetupWizardStep.tsx` - Reusable step wrapper
- `ApiKeyInput.tsx` - Enhanced input with validation
- `ConnectionTest.tsx` - Test connection utility

**State Management:**
- Add `setupWizardCompleted` flag and `lastCompletedStep`
- Track wizard progress in component state and persist to encrypted localStorage
- Persist completion status per device + per user (if authenticated)
- Record whether the user opted into master password encryption

**Validation:**
- Gemini API key: Basic format validation (length, character set)
- Supabase project name: URL-safe characters, no spaces
- Supabase API key: Format validation
- Connection tests: Actual API calls to verify keys work

### Phase 2: Enhanced Settings UI

#### 2.1 Improved Settings Layout

**Reorganize Settings Tabs:**
- **Essential** (new tab): API keys, Supabase config, storage mode
- **Advanced**: MCP servers, AI prompt customization
- **Appearance**: Themes, fonts
- **Sync**: Cloud sync, export/import

**Quick Setup Section:**
- Prominent "Quick Setup" button or banner at top of Settings
- Opens simplified wizard for missing or invalid configurations
- Shows completion status (e.g., "2 of 3 secure steps complete") with CTA to finish remaining steps
- Provide “Secure Backup” status indicator (local only vs synced)

#### 2.2 Enhanced Input Components

**API Key Input Improvements:**
- Show/hide toggle (eye icon)
- Copy to clipboard button + “Copied!” toast
- "Test" button next to each key with cooldown + spinner
- Visual feedback (green checkmark on successful test, warning icon on failure)
- Error messages with helpful hints and “Try again” suggestions
- Surface encryption mode (device vs master password) with quick switch option

**Supabase Project Name:**
- Auto-complete suggestions (if possible)
- URL preview that updates in real-time
- Validation with helpful error messages
- Link to Supabase dashboard

#### 2.3 Auto-Save Feature

**Progressive Auto-Save:**
- Auto-save each field as user types (with debounce)
- Show "Saving..." indicator + “Encrypted locally” label
- Show "Saved" confirmation with timestamp (e.g., “Saved 10s ago”)
- No need for explicit "Save Settings" button (keep as fallback for accessibility)
- If master password absent, gently prompt user to set one, explaining benefits

**Conflict Resolution:**
- If user has unsaved changes and navigates away, show confirmation dialog
- Save on blur for each field

### Phase 3: Persistence Improvements

#### 3.1 Enhanced Persistence

**Current:**
- Settings saved to localStorage
- Optional sync to Supabase if authenticated

**Improvements:**
- **Auto-sync**: Automatically sync to Supabase when authenticated and credentials change
- **Conflict Resolution**: Handle conflicts between local and cloud settings with “keep local / keep cloud” options
- **Backup Reminder**: Periodic reminders to download encrypted backups and record master password
- **Export/Import**: Easy export/import of settings (JSON file encrypted with current method)
- **Device Trust List**: Show list of devices that have decrypted keys with option to revoke trust

#### 3.2 Setup Status Tracking

**Setup Completion Indicator:**
- Show setup status in header/sidebar
- Visual indicator (e.g., progress bar or checklist)
- "Complete Setup" button if incomplete
- Warn if required fields missing or keys failed validation
- Surface “Sync status” (Up to date / Needs attention)

**Required vs Optional:**
- Mark required fields clearly
- Show which optional features are available after setup
- Guide users through optional configurations

#### 3.3 Migration and Recovery

**Settings Migration:**
- Detect and migrate old settings format
- Preserve user data during updates
- Handle encryption key changes gracefully

**Recovery Options:**
- "Reset Settings" option
- Import from backup
- Restore from Supabase (if synced)

### Phase 4: User Experience Enhancements

#### 4.1 Help and Documentation

**Contextual Help:**
- Tooltips for each field explaining what it's for
- "Learn more" links to documentation
- Inline help text with examples

**Video Tutorials:**
- Optional embedded video tutorials
- Step-by-step screenshots
- Common issues and solutions

#### 4.2 Validation and Feedback

**Real-Time Validation:**
- Validate as user types
- Show errors immediately
- Suggest fixes for common mistakes

**Connection Testing:**
- Test buttons for each API key
- Show connection status
- Provide helpful error messages if test fails

#### 4.3 Accessibility

**Keyboard Navigation:**
- Full keyboard support for wizard
- Tab order optimization
- Screen reader support

**Mobile Optimization:**
- Responsive wizard layout
- Touch-friendly inputs
- Mobile-specific help text

## Implementation Priority

### High Priority (MVP)
1. ✅ First-time setup wizard with security prompts
2. ✅ Enhanced input validation + connection testing
3. ✅ Auto-save functionality with encryption awareness
4. ✅ Setup completion tracking + status indicators

### Medium Priority
5. Settings reorganization + Quick Setup section
6. Enhanced persistence (auto-sync, conflict resolution)
7. Contextual help + inline documentation links
8. Device trust list + backup reminders

### Low Priority (Future)
9. Video tutorials
10. Advanced migration tools
11. Settings backup/restore UI with encrypted exports
12. Multi-device sync management dashboard

## Technical Considerations

### Security
- Maintain current encryption standards
- Never expose API keys in plain text
- Secure storage in localStorage
- Encrypted sync to Supabase

### Performance
- Lazy load wizard components
- Debounce auto-save operations
- Cache connection test results
- Optimize settings load time

### Compatibility
- Maintain backward compatibility with existing settings
- Support migration from old format
- Handle missing fields gracefully

## Success Metrics

### User Experience
- **Setup Time**: Reduce from ~5 minutes to ~2 minutes
- **Completion Rate**: Increase from ~60% to ~90%
- **Error Rate**: Reduce configuration errors by 50%
- **User Satisfaction**: Positive feedback on setup experience
- **Retention**: <5% of users forced to re-enter keys on same device

### Technical
- **Settings Persistence**: 100% success rate across restarts
- **Validation Accuracy**: Catch 95% of common errors
- **Connection Test Success**: Accurate results for 99% of valid keys
- **Encryption Coverage**: 100% of stored secrets encrypted (device or master password)
- **Sync Reliability**: Supabase sync success > 98% with retries

## Security Safeguards

1. **Mandatory Encryption:** All secrets continue to use AES-GCM with PBKDF2-derived keys; master password strongly encouraged.
2. **Zero Plaintext Storage:** Clipboard helpers never log or persist plaintext; temporary views auto-clear after timeout.
3. **Session Awareness:** Warn users before clearing session storage (which drops master password).
4. **Audit Trail:** Log (locally) when keys are added, updated, synced, or deleted for debugging.
5. **Least Privilege:** Wizard uses minimal scopes/permissions; Supabase keys remain anon/public.
6. **Secure Defaults:** Devices default to encrypted local storage with gentle nudges toward Supabase sync for redundancy.

## Future Enhancements

1. **OAuth Integration**: Allow users to connect accounts instead of entering keys
2. **Template Presets**: Pre-configured templates for common setups
3. **Team Sharing**: Share settings across team members
4. **Environment Profiles**: Support for dev/staging/prod configurations
5. **API Key Rotation**: Automatic reminders and rotation tools

## Conclusion

This plan provides a comprehensive approach to simplifying API keys and links setup while maintaining security and improving user experience. The phased approach allows for incremental improvements while delivering value at each stage. By combining encryption-aware onboarding, progressive auto-save, and resilient persistence, users can set up Otto AI once and trust that their configuration remains secure and available across sessions and devices without repeated manual entry.

