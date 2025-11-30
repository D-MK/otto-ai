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

export interface AIConfig {
  id: string;
  systemPrompt: string;
  geminiModel: string;
  claudeModel: string;
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

  async getAIConfig(id: string = 'default'): Promise<AIConfig | null> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await this.client
      .from('ai_config')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch AI config: ${error.message}`);
    }

    return data ? this.mapAIConfigFromSupabase(data) : null;
  }

  async updateAIConfig(config: Partial<AIConfig> & { id: string }): Promise<AIConfig> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const configData: any = {
      updated_at: new Date().toISOString(),
    };

    if (config.systemPrompt !== undefined) {
      configData.system_prompt = config.systemPrompt;
    }
    if (config.geminiModel !== undefined) {
      configData.gemini_model = config.geminiModel;
    }
    if (config.claudeModel !== undefined) {
      configData.claude_model = config.claudeModel;
    }

    const { data, error } = await this.client
      .from('ai_config')
      .update(configData)
      .eq('id', config.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update AI config: ${error.message}`);
    }

    return this.mapAIConfigFromSupabase(data);
  }

  async upsertAIConfig(config: AIConfig): Promise<AIConfig> {
    if (!this.client) {
      throw new Error('Supabase client not configured');
    }

    const configData = {
      id: config.id,
      system_prompt: config.systemPrompt,
      gemini_model: config.geminiModel,
      claude_model: config.claudeModel,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
    };

    const { data, error } = await this.client
      .from('ai_config')
      .upsert(configData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert AI config: ${error.message}`);
    }

    return this.mapAIConfigFromSupabase(data);
  }

  private mapAIConfigFromSupabase(data: any): AIConfig {
    return {
      id: data.id,
      systemPrompt: data.system_prompt,
      geminiModel: data.gemini_model || 'gemini-2.5-flash',
      claudeModel: data.claude_model || 'claude-3-5-sonnet-20241022',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
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
