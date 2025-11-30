/**
 * Browser-compatible storage for scripts using localStorage
 * This is a drop-in replacement for ScriptStorage that works in browsers
 */

import { Script } from './types';

export class BrowserScriptStorage {
  private storageKey: string;
  private scripts: Map<string, Script>;

  constructor(dbPath: string = ':memory:') {
    this.storageKey = dbPath === ':memory:' ? 'otto-ai-scripts' : `otto-ai-scripts-${dbPath}`;
    this.scripts = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const globalThis = this.getGlobalThis();
    if (!globalThis || !globalThis.localStorage) {
      return;
    }

    try {
      const stored = globalThis.localStorage.getItem(this.storageKey);
      if (stored) {
        const scripts = JSON.parse(stored) as Script[];
        scripts.forEach(script => {
          // Convert date strings back to Date objects
          script.createdAt = new Date(script.createdAt);
          script.updatedAt = new Date(script.updatedAt);
          this.scripts.set(script.id, script);
        });
      }
    } catch (error) {
      console.error('Failed to load scripts from storage:', error);
    }
  }

  private saveToStorage(): void {
    const globalThis = this.getGlobalThis();
    if (!globalThis || !globalThis.localStorage) {
      return;
    }

    try {
      const scripts = Array.from(this.scripts.values());
      globalThis.localStorage.setItem(this.storageKey, JSON.stringify(scripts));
    } catch (error) {
      console.error('Failed to save scripts to storage:', error);
    }
  }

  private getGlobalThis(): any {
    // Check for browser environment
    if (typeof (globalThis as any)?.window !== 'undefined') {
      return (globalThis as any).window;
    }
    // Check for Node environment
    if (typeof (globalThis as any)?.global !== 'undefined') {
      return (globalThis as any).global;
    }
    // Fallback to globalThis
    return globalThis as any;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  create(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Script {
    const now = new Date();
    const newScript: Script = {
      ...script,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    this.scripts.set(newScript.id, newScript);
    this.saveToStorage();
    return newScript;
  }

  getById(id: string): Script | null {
    return this.scripts.get(id) || null;
  }

  getAll(): Script[] {
    return Array.from(this.scripts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  update(id: string, updates: Partial<Omit<Script, 'id' | 'createdAt' | 'updatedAt'>>): Script | null {
    const existing = this.scripts.get(id);
    if (!existing) return null;

    const updated: Script = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.scripts.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.scripts.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  search(query: string): Script[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.scripts.values())
      .filter(script => {
        const name = script.name.toLowerCase();
        const description = script.description.toLowerCase();
        const tags = script.tags.join(' ').toLowerCase();
        return name.includes(lowerQuery) || description.includes(lowerQuery) || tags.includes(lowerQuery);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  exportToJSON(): string {
    const scripts = this.getAll();
    return JSON.stringify(scripts, null, 2);
  }

  importFromJSON(json: string): number {
    try {
      const scripts = JSON.parse(json) as Script[];
      let imported = 0;

      for (const script of scripts) {
        try {
          // Check if script already exists
          const existing = Array.from(this.scripts.values()).find(s => s.name === script.name);
          if (!existing) {
            this.create(script);
            imported++;
          }
        } catch (error) {
          console.error(`Failed to import script ${script.name}:`, error);
        }
      }

      return imported;
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return 0;
    }
  }

  /**
   * Upsert a script with a specific ID (for syncing purposes)
   */
  upsert(script: Script): Script {
    // Convert date strings to Date objects if needed
    const scriptToStore: Script = {
      ...script,
      createdAt: script.createdAt instanceof Date ? script.createdAt : new Date(script.createdAt),
      updatedAt: script.updatedAt instanceof Date ? script.updatedAt : new Date(script.updatedAt),
    };

    this.scripts.set(scriptToStore.id, scriptToStore);
    this.saveToStorage();
    return scriptToStore;
  }

  close(): void {
    // No-op for browser storage
  }
}
