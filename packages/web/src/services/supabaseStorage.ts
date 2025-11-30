/**
 * Supabase storage service for scripts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Script {
  id: string;
  name: string;
  description: string;
  tags: string[];
  triggerPhrases: string[];
  parameters: any[];
  executionType: string;
  code?: string;
  mcpEndpoint?: string;
  createdAt: string;
  updatedAt: string;
}

export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private supabaseUrl: string = '';
  private supabaseKey: string = '';

  constructor(url?: string, key?: string) {
    if (url && key) {
      this.configure(url, key);
    }
  }

  configure(url: string, key: string): void {
    this.supabaseUrl = url;
    this.supabaseKey = key;
    this.client = createClient(url, key);
  }

  isConfigured(): boolean {
    return this.client !== null && this.supabaseUrl !== '' && this.supabaseKey !== '';
  }

  async ensureTableExists(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    // Check if the scripts table exists by attempting to query it
    const { error } = await this.client
      .from('scripts')
      .select('id')
      .limit(1);

    if (error) {
      console.warn('Scripts table may not exist. Please create it with the following schema:');
      console.warn(`
        CREATE TABLE scripts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          tags JSONB DEFAULT '[]'::jsonb,
          trigger_phrases JSONB DEFAULT '[]'::jsonb,
          parameters JSONB DEFAULT '[]'::jsonb,
          execution_type TEXT NOT NULL,
          code TEXT,
          mcp_endpoint TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    }
  }

  async getAllScripts(): Promise<Script[]> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await this.client
      .from('scripts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scripts: ${error.message}`);
    }

    return (data || []).map(this.mapFromSupabase);
  }

  async getScript(id: string): Promise<Script | null> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await this.client
      .from('scripts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch script: ${error.message}`);
    }

    return data ? this.mapFromSupabase(data) : null;
  }

  async createScript(script: Omit<Script, 'createdAt' | 'updatedAt'>): Promise<Script> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const now = new Date().toISOString();
    const scriptData = {
      ...this.mapToSupabase(script as Script),
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.client
      .from('scripts')
      .insert(scriptData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create script: ${error.message}`);
    }

    return this.mapFromSupabase(data);
  }

  async updateScript(id: string, script: Partial<Script>): Promise<Script> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const scriptData = {
      ...this.mapToSupabase(script as Script),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('scripts')
      .update(scriptData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update script: ${error.message}`);
    }

    return this.mapFromSupabase(data);
  }

  async deleteScript(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const { error } = await this.client
      .from('scripts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete script: ${error.message}`);
    }
  }

  async bulkUpsert(scripts: Script[]): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const scriptsData = scripts.map((script) => ({
      ...this.mapToSupabase(script),
      created_at: script.createdAt,
      updated_at: script.updatedAt,
    }));

    const { error } = await this.client
      .from('scripts')
      .upsert(scriptsData, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to bulk upsert scripts: ${error.message}`);
    }
  }

  private mapFromSupabase(data: any): Script {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      tags: data.tags || [],
      triggerPhrases: data.trigger_phrases || [],
      parameters: data.parameters || [],
      executionType: data.execution_type,
      code: data.code,
      mcpEndpoint: data.mcp_endpoint,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToSupabase(script: Script): any {
    const data: any = {
      id: script.id,
      name: script.name,
      description: script.description,
      tags: script.tags,
      trigger_phrases: script.triggerPhrases,
      parameters: script.parameters,
      execution_type: script.executionType,
    };

    if (script.code !== undefined) {
      data.code = script.code;
    }
    if (script.mcpEndpoint !== undefined) {
      data.mcp_endpoint = script.mcpEndpoint;
    }

    return data;
  }
}
