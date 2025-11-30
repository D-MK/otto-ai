/**
 * SQLite-based storage for scripts
 */

import Database from 'better-sqlite3';
import { Script } from './types';
import { randomUUID } from 'crypto';

export class ScriptStorage {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        tags TEXT NOT NULL,
        trigger_phrases TEXT NOT NULL,
        parameters TEXT NOT NULL,
        execution_type TEXT NOT NULL,
        mcp_endpoint TEXT,
        code TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_scripts_name ON scripts(name);
      CREATE INDEX IF NOT EXISTS idx_scripts_tags ON scripts(tags);
    `);
  }

  create(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Script {
    const now = new Date();
    const newScript: Script = {
      ...script,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO scripts (
        id, name, description, tags, trigger_phrases, parameters,
        execution_type, mcp_endpoint, code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newScript.id,
      newScript.name,
      newScript.description,
      JSON.stringify(newScript.tags),
      JSON.stringify(newScript.triggerPhrases),
      JSON.stringify(newScript.parameters),
      newScript.executionType,
      newScript.mcpEndpoint || null,
      newScript.code || null,
      newScript.createdAt.getTime(),
      newScript.updatedAt.getTime()
    );

    return newScript;
  }

  getById(id: string): Script | null {
    const stmt = this.db.prepare('SELECT * FROM scripts WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToScript(row) : null;
  }

  getAll(): Script[] {
    const stmt = this.db.prepare('SELECT * FROM scripts ORDER BY name');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToScript(row));
  }

  update(id: string, updates: Partial<Omit<Script, 'id' | 'createdAt' | 'updatedAt'>>): Script | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated: Script = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE scripts SET
        name = ?, description = ?, tags = ?, trigger_phrases = ?,
        parameters = ?, execution_type = ?, mcp_endpoint = ?,
        code = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.description,
      JSON.stringify(updated.tags),
      JSON.stringify(updated.triggerPhrases),
      JSON.stringify(updated.parameters),
      updated.executionType,
      updated.mcpEndpoint || null,
      updated.code || null,
      updated.updatedAt.getTime(),
      id
    );

    return updated;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM scripts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  search(query: string): Script[] {
    const pattern = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM scripts
      WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
      ORDER BY name
    `);
    const rows = stmt.all(pattern, pattern, pattern) as any[];
    return rows.map(row => this.rowToScript(row));
  }

  exportToJSON(): string {
    const scripts = this.getAll();
    return JSON.stringify(scripts, null, 2);
  }

  importFromJSON(json: string): number {
    const scripts = JSON.parse(json) as Script[];
    let imported = 0;

    for (const script of scripts) {
      try {
        this.create(script);
        imported++;
      } catch (error) {
        console.error(`Failed to import script ${script.name}:`, error);
      }
    }

    return imported;
  }

  private rowToScript(row: any): Script {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tags: JSON.parse(row.tags),
      triggerPhrases: JSON.parse(row.trigger_phrases),
      parameters: JSON.parse(row.parameters),
      executionType: row.execution_type,
      mcpEndpoint: row.mcp_endpoint || undefined,
      code: row.code || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  close(): void {
    this.db.close();
  }
}
