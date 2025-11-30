/**
 * Sync service to manage data synchronization between localStorage and Supabase
 */

import { BrowserScriptStorage } from '@otto-ai/core';
import { SupabaseStorageService, Script } from './supabaseStorage';

export interface ScriptConflict {
  id: string;
  name: string;
  local: Script;
  remote: Script;
  reason: string;
}

export interface SyncResult {
  conflicts: ScriptConflict[];
  localOnly: Script[];
  remoteOnly: Script[];
  identical: Script[];
  syncedToLocal: number;
  syncedToRemote: number;
}

export type ConflictResolution = 'local' | 'remote';

export class SyncService {
  constructor(
    private localStorage: BrowserScriptStorage,
    private supabaseStorage: SupabaseStorageService
  ) {}

  /**
   * Compare local and remote storage to detect differences
   */
  async compare(): Promise<SyncResult> {
    const localScripts = this.getLocalScripts();
    const remoteScripts = await this.supabaseStorage.getAllScripts();

    const conflicts: ScriptConflict[] = [];
    const localOnly: Script[] = [];
    const remoteOnly: Script[] = [];
    const identical: Script[] = [];

    const localMap = new Map(localScripts.map((s) => [s.id, s]));
    const remoteMap = new Map(remoteScripts.map((s) => [s.id, s]));

    // Check all local scripts
    for (const [id, local] of localMap) {
      const remote = remoteMap.get(id);

      if (!remote) {
        localOnly.push(local);
      } else {
        const conflict = this.detectConflict(local, remote);
        if (conflict) {
          conflicts.push(conflict);
        } else {
          identical.push(local);
        }
        remoteMap.delete(id); // Mark as processed
      }
    }

    // Remaining remote scripts are remote-only
    for (const remote of remoteMap.values()) {
      remoteOnly.push(remote);
    }

    return {
      conflicts,
      localOnly,
      remoteOnly,
      identical,
      syncedToLocal: 0,
      syncedToRemote: 0,
    };
  }

  /**
   * Detect if two scripts are in conflict
   */
  private detectConflict(local: Script, remote: Script): ScriptConflict | null {
    // Check if they're identical
    if (this.areScriptsEqual(local, remote)) {
      return null;
    }

    // Conflict exists - determine the reason
    let reason = 'Content differs';

    const localDate = new Date(local.updatedAt).getTime();
    const remoteDate = new Date(remote.updatedAt).getTime();

    if (localDate > remoteDate) {
      reason = 'Local version is newer';
    } else if (remoteDate > localDate) {
      reason = 'Remote version is newer';
    } else {
      reason = 'Same timestamp but different content';
    }

    return {
      id: local.id,
      name: local.name,
      local,
      remote,
      reason,
    };
  }

  /**
   * Check if two scripts are equal
   */
  private areScriptsEqual(a: Script, b: Script): boolean {
    return (
      a.name === b.name &&
      a.description === b.description &&
      JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
      JSON.stringify(a.triggerPhrases) === JSON.stringify(b.triggerPhrases) &&
      JSON.stringify(a.parameters) === JSON.stringify(b.parameters) &&
      a.executionType === b.executionType &&
      a.code === b.code &&
      a.mcpEndpoint === b.mcpEndpoint
    );
  }

  /**
   * Sync all data, using automatic conflict resolution strategies
   */
  async autoSync(strategy: 'local-wins' | 'remote-wins' | 'newest-wins' = 'newest-wins'): Promise<SyncResult> {
    const result = await this.compare();

    // Auto-resolve conflicts based on strategy
    const resolutions = new Map<string, ConflictResolution>();

    for (const conflict of result.conflicts) {
      let resolution: ConflictResolution;

      switch (strategy) {
        case 'local-wins':
          resolution = 'local';
          break;
        case 'remote-wins':
          resolution = 'remote';
          break;
        case 'newest-wins':
          const localDate = new Date(conflict.local.updatedAt).getTime();
          const remoteDate = new Date(conflict.remote.updatedAt).getTime();
          resolution = localDate >= remoteDate ? 'local' : 'remote';
          break;
      }

      resolutions.set(conflict.id, resolution);
    }

    return await this.resolveAndSync(result, resolutions);
  }

  /**
   * Resolve conflicts and perform sync
   */
  async resolveAndSync(
    compareResult: SyncResult,
    resolutions: Map<string, ConflictResolution>
  ): Promise<SyncResult> {
    let syncedToLocal = 0;
    let syncedToRemote = 0;

    // Handle conflicts
    for (const conflict of compareResult.conflicts) {
      const resolution = resolutions.get(conflict.id);
      if (!resolution) continue;

      if (resolution === 'local') {
        // Keep local version, update remote
        await this.supabaseStorage.updateScript(conflict.id, conflict.local);
        syncedToRemote++;
      } else {
        // Keep remote version, update local
        this.updateLocalScript(conflict.remote);
        syncedToLocal++;
      }
    }

    // Sync local-only scripts to remote
    for (const script of compareResult.localOnly) {
      await this.supabaseStorage.createScript(script);
      syncedToRemote++;
    }

    // Sync remote-only scripts to local
    for (const script of compareResult.remoteOnly) {
      this.createLocalScript(script);
      syncedToLocal++;
    }

    return {
      ...compareResult,
      conflicts: [], // All resolved
      syncedToLocal,
      syncedToRemote,
    };
  }

  /**
   * Push all local scripts to Supabase (overwrite remote)
   */
  async pushToRemote(): Promise<number> {
    const localScripts = this.getLocalScripts();
    await this.supabaseStorage.bulkUpsert(localScripts);
    return localScripts.length;
  }

  /**
   * Pull all remote scripts to local (overwrite local)
   */
  async pullFromRemote(): Promise<number> {
    const remoteScripts = await this.supabaseStorage.getAllScripts();

    // Clear local storage
    const localScripts = this.getLocalScripts();
    for (const script of localScripts) {
      this.localStorage.delete(script.id);
    }

    // Add all remote scripts
    for (const script of remoteScripts) {
      this.createLocalScript(script);
    }

    return remoteScripts.length;
  }

  /**
   * Get all local scripts as Script objects
   */
  private getLocalScripts(): Script[] {
    const scripts = this.localStorage.getAll();
    return scripts.map((script) => ({
      id: script.id,
      name: script.name,
      description: script.description,
      tags: script.tags || [],
      triggerPhrases: script.triggerPhrases || [],
      parameters: script.parameters || [],
      executionType: script.executionType,
      code: script.code,
      mcpEndpoint: script.mcpEndpoint,
      createdAt: script.createdAt instanceof Date ? script.createdAt.toISOString() : (script.createdAt || new Date().toISOString()),
      updatedAt: script.updatedAt instanceof Date ? script.updatedAt.toISOString() : (script.updatedAt || new Date().toISOString()),
    }));
  }

  /**
   * Update a local script
   */
  private updateLocalScript(script: Script): void {
    // Use upsert to ensure the script is updated with the correct ID and dates
    const scriptToUpdate: any = {
      ...script,
      createdAt: new Date(script.createdAt),
      updatedAt: new Date(script.updatedAt),
    };
    this.localStorage.upsert(scriptToUpdate);
  }

  /**
   * Create a local script
   */
  private createLocalScript(script: Script): void {
    // Use upsert to preserve the script ID from remote
    const scriptToCreate: any = {
      ...script,
      createdAt: new Date(script.createdAt),
      updatedAt: new Date(script.updatedAt),
    };
    this.localStorage.upsert(scriptToCreate);
  }
}
