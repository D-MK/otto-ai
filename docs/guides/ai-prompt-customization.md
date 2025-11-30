# AI Prompt Customization

This document describes how to customize the system prompt used by the AI Script Generator.

## Overview

The AI Script Generator uses a system prompt to instruct the AI model (Gemini or Claude) on how to generate scripts. By default, this prompt is hardcoded, but you can now customize it and save it to Supabase for persistence across sessions.

## Features

- **Customizable System Prompt**: Edit the prompt used for script generation
- **Supabase Persistence**: Save your custom prompt to Supabase for cloud storage
- **Automatic Loading**: The custom prompt is automatically loaded when generating scripts
- **Fallback to Default**: If no custom prompt is found, the default prompt is used

## Setup

### 1. Database Migration

First, create the `ai_config` table in your Supabase database by running the migration:

```sql
-- Run migrations/001_create_ai_config_table.sql in your Supabase SQL editor
```

Or manually create the table:

```sql
CREATE TABLE IF NOT EXISTS ai_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  system_prompt TEXT NOT NULL,
  gemini_model TEXT DEFAULT 'gemini-2.5-flash',
  claude_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Configure Supabase

Make sure you have:
- Supabase URL configured in Settings → API Keys
- Supabase API Key configured in Settings → API Keys

## Usage

### Editing the Prompt

1. Open **Settings** (gear icon)
2. Navigate to the **AI Prompt** tab
3. The current prompt will be loaded automatically (or default if none exists)
4. Edit the prompt in the textarea
5. Click **Save Prompt to Supabase** to persist your changes

### How It Works

1. When you generate a script, the system checks if Supabase is configured
2. If configured, it attempts to load the custom prompt from the `ai_config` table
3. If a custom prompt is found, it's used; otherwise, the default prompt is used
4. The prompt is passed to the AI model (Gemini or Claude) along with your script description

## Prompt Guidelines

When customizing the prompt, keep in mind:

1. **JSON Structure**: The prompt must instruct the AI to return a JSON object with the required structure:
   - `name`: Script name
   - `description`: Brief description
   - `tags`: Array of tags
   - `triggerPhrases`: Array of trigger phrases
   - `parameters`: Array of parameter objects
   - `executionType`: "local" for JavaScript scripts
   - `code`: JavaScript code string

2. **Code Constraints**: Remind the AI that:
   - Code must be sandboxed JavaScript (only Math, Date, JSON globals)
   - Code must return a string
   - Parameters are available as variables

3. **Output Format**: Specify that the response should be ONLY the JSON object, no additional text

## Example Custom Prompt

Here's an example of a customized prompt that emphasizes code quality:

```
You are an expert at creating automation scripts. Generate a script based on the user's description.

[Include all the standard structure requirements...]

Important guidelines:
1. Write clean, well-commented code
2. Include error handling for edge cases
3. Use descriptive variable names
4. Add comments explaining complex logic
5. [Your custom guidelines here...]

Return ONLY the JSON object, no additional text or explanation.
```

## API Reference

### SupabaseStorageService Methods

- `getAIConfig(id: string = 'default'): Promise<AIConfig | null>`
  - Fetches the AI config from Supabase
  
- `updateAIConfig(config: Partial<AIConfig> & { id: string }): Promise<AIConfig>`
  - Updates an existing AI config
  
- `upsertAIConfig(config: AIConfig): Promise<AIConfig>`
  - Creates or updates an AI config

### AIScriptGenerator Method

- `generateScript(description: string, customPrompt?: string): Promise<GeneratedScript>`
  - Generates a script using the provided description and optional custom prompt

## Troubleshooting

### Prompt Not Loading

- Check that Supabase is configured (URL and API key)
- Verify the `ai_config` table exists in your Supabase database
- Check browser console for errors

### Changes Not Taking Effect

- Make sure you clicked "Save Prompt to Supabase"
- Verify the save was successful (green success message)
- Try reloading the prompt with "Reload from Supabase"

### Default Prompt Still Being Used

- The system falls back to the default prompt if:
  - Supabase is not configured
  - The `ai_config` table doesn't exist
  - No config with id 'default' is found
  - An error occurs while loading

This is intentional behavior to ensure script generation always works, even without Supabase.

