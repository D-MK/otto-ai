# API Keys and Links Setup Simplification Plan

## Overview

This document outlines a plan to simplify the initial setup process for API keys and links (Gemini API key, Supabase project name/URL, and Supabase API key) and improve the persistence experience for users.

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

**Step 1: Welcome & Overview**
- Brief introduction to Otto AI
- Explain what API keys are needed and why
- Show progress indicator (e.g., "Step 1 of 3")

**Step 2: Gemini API Key**
- Clear instructions on where to get the key
- Direct link to Google AI Studio
- Input field with show/hide toggle
- Real-time validation (format check)
- "Test Connection" button (optional)
- Skip option (can configure later)

**Step 3: Supabase Configuration (Optional)**
- Explain what Supabase is used for (cloud sync, authentication)
- Two input fields:
  - Project Name (with URL preview: `https://[project].supabase.co`)
  - API Key (anon/public key)
- Real-time validation
- "Test Connection" button
- Skip option (can use localStorage only)

**Step 4: Storage Mode Selection**
- If Supabase configured: Choose between localStorage and Supabase
- If Supabase skipped: Auto-select localStorage
- Explain the difference

**Step 5: Completion**
- Summary of configured settings
- "Start Using Otto AI" button
- Option to configure MCP servers now or later

#### 1.3 Implementation Details

**Components to Create:**
- `SetupWizard.tsx` - Main wizard component
- `SetupWizardStep.tsx` - Reusable step wrapper
- `ApiKeyInput.tsx` - Enhanced input with validation
- `ConnectionTest.tsx` - Test connection utility

**State Management:**
- Add `setupWizardCompleted` flag to settings
- Track wizard progress in component state
- Persist completion status

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
- Prominent "Quick Setup" button at top of Settings
- Opens simplified wizard for missing configurations
- Shows completion status (e.g., "2 of 3 configured")

#### 2.2 Enhanced Input Components

**API Key Input Improvements:**
- Show/hide toggle (eye icon)
- Copy to clipboard button
- "Test" button next to each key
- Visual feedback (green checkmark on successful test)
- Error messages with helpful hints

**Supabase Project Name:**
- Auto-complete suggestions (if possible)
- URL preview that updates in real-time
- Validation with helpful error messages
- Link to Supabase dashboard

#### 2.3 Auto-Save Feature

**Progressive Auto-Save:**
- Auto-save each field as user types (with debounce)
- Show "Saving..." indicator
- Show "Saved" confirmation
- No need for explicit "Save Settings" button (or make it optional)

**Conflict Resolution:**
- If user has unsaved changes and navigates away, show confirmation dialog
- Save on blur for each field

### Phase 3: Persistence Improvements

#### 3.1 Enhanced Persistence

**Current:**
- Settings saved to localStorage
- Optional sync to Supabase if authenticated

**Improvements:**
- **Auto-sync**: Automatically sync to Supabase when authenticated
- **Conflict Resolution**: Handle conflicts between local and cloud settings
- **Backup Reminder**: Periodic reminders to backup settings
- **Export/Import**: Easy export/import of settings (JSON file)

#### 3.2 Setup Status Tracking

**Setup Completion Indicator:**
- Show setup status in header/sidebar
- Visual indicator (e.g., progress bar or checklist)
- "Complete Setup" button if incomplete

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
1. ✅ First-time setup wizard
2. ✅ Enhanced input validation
3. ✅ Auto-save functionality
4. ✅ Setup completion tracking

### Medium Priority
5. Settings reorganization
6. Connection testing
7. Enhanced persistence (auto-sync)
8. Contextual help

### Low Priority (Future)
9. Video tutorials
10. Advanced migration tools
11. Settings backup/restore UI
12. Multi-device sync management

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

### Technical
- **Settings Persistence**: 100% success rate
- **Validation Accuracy**: Catch 95% of common errors
- **Connection Test Success**: Accurate results for 99% of valid keys

## Future Enhancements

1. **OAuth Integration**: Allow users to connect accounts instead of entering keys
2. **Template Presets**: Pre-configured templates for common setups
3. **Team Sharing**: Share settings across team members
4. **Environment Profiles**: Support for dev/staging/prod configurations
5. **API Key Rotation**: Automatic reminders and rotation tools

## Conclusion

This plan provides a comprehensive approach to simplifying API keys and links setup while maintaining security and improving user experience. The phased approach allows for incremental improvements while delivering value at each stage.

