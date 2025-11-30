/**
 * Synced script storage - wraps BrowserScriptStorage and automatically syncs to Supabase
 */

import { BrowserScriptStorage, Script } from '@otto-ai/core';
import { SupabaseStorageService } from './supabaseStorage';
import type { SettingsData } from '../components/Settings/Settings';

export class SyncedScriptStorage extends BrowserScriptStorage {
  private supabaseStorage: SupabaseStorageService | null = null;
  private settings: SettingsData;

  constructor(dbPath: string = ':memory:', settings: SettingsData) {
    super(dbPath);
    this.settings = settings;
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    if (
      this.settings.supabaseUrl &&
      this.settings.supabaseApiKey &&
      this.settings.storageMode === 'supabase'
    ) {
      try {
        this.supabaseStorage = new SupabaseStorageService(
          this.settings.supabaseUrl,
          this.settings.supabaseApiKey
        );
        // Ensure table exists
        this.supabaseStorage.ensureTableExists().catch((error) => {
          console.error('Failed to ensure Supabase table exists:', error);
        });
      } catch (error) {
        console.error('Failed to initialize Supabase storage:', error);
        this.supabaseStorage = null;
      }
    }
  }

  /**
   * Update settings and reinitialize Supabase if needed
   */
  updateSettings(settings: SettingsData): void {
    this.settings = settings;
    this.initializeSupabase();
  }

  /**
   * Check if Supabase sync is enabled
   */
  private isSupabaseSyncEnabled(): boolean {
    return this.supabaseStorage !== null && this.settings.storageMode === 'supabase';
  }

  /**
   * Convert Script to Supabase format
   */
  private toSupabaseFormat(script: Script): any {
    return {
      id: script.id,
      name: script.name,
      description: script.description,
      tags: script.tags || [],
      triggerPhrases: script.triggerPhrases || [],
      parameters: script.parameters || [],
      executionType: script.executionType,
      code: script.code,
      mcpEndpoint: script.mcpEndpoint,
      createdAt: script.createdAt instanceof Date ? script.createdAt.toISOString() : script.createdAt,
      updatedAt: script.updatedAt instanceof Date ? script.updatedAt.toISOString() : script.updatedAt,
    };
  }

  /**
   * Sync a script to Supabase in the background
   */
  private async syncToSupabase(script: Script): Promise<void> {
    if (!this.isSupabaseSyncEnabled() || !this.supabaseStorage) {
      return;
    }

    try {
      const supabaseScript = this.toSupabaseFormat(script);

      // Check if script exists in Supabase
      const existing = await this.supabaseStorage.getScript(script.id);

      if (existing) {
        // Update existing
        await this.supabaseStorage.updateScript(script.id, supabaseScript);
      } else {
        // Create new
        await this.supabaseStorage.createScript(supabaseScript);
      }
    } catch (error) {
      console.error('Failed to sync script to Supabase:', error);
      // Don't throw - we don't want to break local operations
    }
  }

  /**
   * Delete a script from Supabase in the background
   */
  private async deleteFromSupabase(id: string): Promise<void> {
    if (!this.isSupabaseSyncEnabled() || !this.supabaseStorage) {
      return;
    }

    try {
      await this.supabaseStorage.deleteScript(id);
    } catch (error) {
      console.error('Failed to delete script from Supabase:', error);
      // Don't throw - we don't want to break local operations
    }
  }

  /**
   * Override create to auto-sync to Supabase
   */
  override create(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Script {
    const newScript = super.create(script);

    // Sync to Supabase in background (don't await)
    this.syncToSupabase(newScript).catch((error) => {
      console.error('Background sync to Supabase failed:', error);
    });

    return newScript;
  }

  /**
   * Override update to auto-sync to Supabase
   */
  override update(
    id: string,
    updates: Partial<Omit<Script, 'id' | 'createdAt' | 'updatedAt'>>
  ): Script | null {
    const updatedScript = super.update(id, updates);

    if (updatedScript) {
      // Sync to Supabase in background (don't await)
      this.syncToSupabase(updatedScript).catch((error) => {
        console.error('Background sync to Supabase failed:', error);
      });
    }

    return updatedScript;
  }

  /**
   * Override delete to auto-sync to Supabase
   */
  override delete(id: string): boolean {
    const deleted = super.delete(id);

    if (deleted) {
      // Delete from Supabase in background (don't await)
      this.deleteFromSupabase(id).catch((error) => {
        console.error('Background delete from Supabase failed:', error);
      });
    }

    return deleted;
  }

  /**
   * Override upsert to auto-sync to Supabase
   */
  override upsert(script: Script): Script {
    const upsertedScript = super.upsert(script);

    // Sync to Supabase in background (don't await)
    this.syncToSupabase(upsertedScript).catch((error) => {
      console.error('Background sync to Supabase failed:', error);
    });

    return upsertedScript;
  }

  /**
   * Manually trigger a full sync to Supabase
   */
  async syncAllToSupabase(): Promise<{ success: number; failed: number }> {
    if (!this.isSupabaseSyncEnabled() || !this.supabaseStorage) {
      return { success: 0, failed: 0 };
    }

    const scripts = this.getAll();
    let success = 0;
    let failed = 0;

    for (const script of scripts) {
      try {
        await this.syncToSupabase(script);
        success++;
      } catch (error) {
        console.error(`Failed to sync script ${script.name}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }
}
