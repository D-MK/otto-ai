/**
 * Supabase User Settings Service
 * Manages user-specific settings stored in Supabase
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { SettingsData } from '../components/Settings/Settings';
import { logger } from '../utils/logger';

export interface UserSettings extends SettingsData {
  userId: string;
  updatedAt: string;
}

export class SupabaseSettingsService {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Ensure the user_settings table exists
   */
  async ensureTableExists(): Promise<void> {
    // Check if table exists by trying to query it
    const { error } = await this.client
      .from('user_settings')
      .select('user_id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      // Table doesn't exist, we need to create it
      // Note: In production, you should create this via Supabase migrations
      logger.warn('user_settings table does not exist. Please create it in your Supabase dashboard with the following SQL:');
      logger.warn(`
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gemini_api_key TEXT,
  supabase_api_key TEXT,
  supabase_url TEXT,
  storage_mode TEXT DEFAULT 'localStorage',
  mcp_servers JSONB DEFAULT '[]'::jsonb,
  script_sort_preference TEXT DEFAULT 'name-asc',
  setup_wizard_completed BOOLEAN DEFAULT FALSE,
  setup_wizard_last_step INTEGER DEFAULT 0,
  setup_wizard_dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own settings
CREATE POLICY "Users can read own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);
      `);
      throw new Error('user_settings table does not exist. Please create it in Supabase.');
    }
  }

  /**
   * Get settings for a specific user
   */
  async getUserSettings(userId: string): Promise<SettingsData | null> {
    const { data, error } = await this.client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found for this user
        return null;
      }
      throw new Error(`Failed to load user settings: ${error.message}`);
    }

    return this.mapFromSupabase(data);
  }

  /**
   * Save settings for a specific user (upsert)
   */
  async saveUserSettings(userId: string, settings: SettingsData): Promise<void> {
    const settingsData = {
      user_id: userId,
      gemini_api_key: settings.geminiApiKey || null,
      supabase_api_key: settings.supabaseApiKey || null,
      supabase_url: settings.supabaseUrl || null,
      storage_mode: settings.storageMode,
      mcp_servers: settings.mcpServers,
      script_sort_preference: settings.scriptSortPreference || 'name-asc',
      setup_wizard_completed: settings.setupWizardCompleted || false,
      setup_wizard_last_step: settings.setupWizardLastStep || 0,
      setup_wizard_dismissed_at: settings.setupWizardDismissedAt || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.client
      .from('user_settings')
      .upsert(settingsData, {
        onConflict: 'user_id',
      });

    if (error) {
      throw new Error(`Failed to save user settings: ${error.message}`);
    }
  }

  /**
   * Delete settings for a specific user
   */
  async deleteUserSettings(userId: string): Promise<void> {
    const { error } = await this.client
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete user settings: ${error.message}`);
    }
  }

  /**
   * Map Supabase data to SettingsData
   */
  private mapFromSupabase(data: any): SettingsData {
    return {
      geminiApiKey: data.gemini_api_key || '',
      supabaseApiKey: data.supabase_api_key || '',
      supabaseUrl: data.supabase_url || '',
      storageMode: data.storage_mode || 'localStorage',
      mcpServers: data.mcp_servers || [],
      scriptSortPreference: data.script_sort_preference || 'name-asc',
      setupWizardCompleted: data.setup_wizard_completed ?? false,
      setupWizardLastStep: data.setup_wizard_last_step ?? 0,
      setupWizardDismissedAt: data.setup_wizard_dismissed_at || null,
    };
  }
}
