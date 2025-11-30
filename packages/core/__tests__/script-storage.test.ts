/**
 * Tests for ScriptStorage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptStorage } from '../src/scripts/storage';
import { Script } from '../src/scripts/types';

describe('ScriptStorage', () => {
  let storage: ScriptStorage;

  beforeEach(() => {
    storage = new ScriptStorage(':memory:');
  });

  describe('create', () => {
    it('should create a script with valid data', () => {
      const scriptData = {
        name: 'Test Script',
        description: 'A test script',
        tags: ['test', 'example'],
        triggerPhrases: ['test script', 'run test'],
        parameters: [
          {
            name: 'value',
            type: 'number' as const,
            required: true,
            prompt: 'Enter a value',
          },
        ],
        executionType: 'local' as const,
        code: 'return params.value * 2;',
      };

      const script = storage.create(scriptData);

      expect(script.id).toBeDefined();
      expect(script.name).toBe('Test Script');
      expect(script.description).toBe('A test script');
      expect(script.tags).toEqual(['test', 'example']);
      expect(script.triggerPhrases).toEqual(['test script', 'run test']);
      expect(script.createdAt).toBeInstanceOf(Date);
      expect(script.updatedAt).toBeInstanceOf(Date);
    });

    it('should create script with MCP endpoint', () => {
      const scriptData = {
        name: 'MCP Script',
        description: 'MCP test',
        tags: ['mcp'],
        triggerPhrases: ['mcp test'],
        parameters: [],
        executionType: 'mcp' as const,
        mcpEndpoint: '/api/test',
      };

      const script = storage.create(scriptData);

      expect(script.executionType).toBe('mcp');
      expect(script.mcpEndpoint).toBe('/api/test');
    });
  });

  describe('getById', () => {
    it('should retrieve a script by ID', () => {
      const scriptData = {
        name: 'Test Script',
        description: 'A test script',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [],
        executionType: 'local' as const,
        code: 'return 42;',
      };

      const created = storage.create(scriptData);
      const retrieved = storage.getById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Script');
    });

    it('should return null for non-existent ID', () => {
      const result = storage.getById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all scripts', () => {
      storage.create({
        name: 'Script 1',
        description: 'First script',
        tags: ['test'],
        triggerPhrases: ['script 1'],
        parameters: [],
        executionType: 'local' as const,
      });

      storage.create({
        name: 'Script 2',
        description: 'Second script',
        tags: ['test'],
        triggerPhrases: ['script 2'],
        parameters: [],
        executionType: 'local' as const,
      });

      const all = storage.getAll();
      expect(all.length).toBe(2);
      expect(all[0].name).toBe('Script 1');
      expect(all[1].name).toBe('Script 2');
    });

    it('should return empty array when no scripts exist', () => {
      const all = storage.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an existing script', () => {
      const created = storage.create({
        name: 'Original Name',
        description: 'Original description',
        tags: ['test'],
        triggerPhrases: ['original'],
        parameters: [],
        executionType: 'local' as const,
      });

      const updated = storage.update(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should return null for non-existent script', () => {
      const result = storage.update('non-existent-id', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a script by ID', () => {
      const created = storage.create({
        name: 'To Delete',
        description: 'Will be deleted',
        tags: ['test'],
        triggerPhrases: ['delete'],
        parameters: [],
        executionType: 'local' as const,
      });

      const deleted = storage.delete(created.id);
      expect(deleted).toBe(true);

      const retrieved = storage.getById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent script', () => {
      const result = storage.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      storage.create({
        name: 'BMI Calculator',
        description: 'Calculate body mass index',
        tags: ['health', 'calculator'],
        triggerPhrases: ['calculate bmi'],
        parameters: [],
        executionType: 'local' as const,
      });

      storage.create({
        name: 'Currency Converter',
        description: 'Convert between currencies',
        tags: ['finance', 'converter'],
        triggerPhrases: ['convert currency'],
        parameters: [],
        executionType: 'local' as const,
      });
    });

    it('should search by name', () => {
      const results = storage.search('BMI');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('BMI Calculator');
    });

    it('should search by description', () => {
      const results = storage.search('currency');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Currency Converter');
    });

    it('should search by tags', () => {
      const results = storage.search('health');
      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('health');
    });

    it('should return empty array for no matches', () => {
      const results = storage.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('exportToJSON', () => {
    it('should export all scripts as JSON', () => {
      storage.create({
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [],
        executionType: 'local' as const,
      });

      const json = storage.exportToJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].name).toBe('Test Script');
    });
  });

  describe('importFromJSON', () => {
    it('should import scripts from JSON', () => {
      const scripts: Script[] = [
        {
          id: 'test-id-1',
          name: 'Imported Script 1',
          description: 'First imported',
          tags: ['imported'],
          triggerPhrases: ['import 1'],
          parameters: [],
          executionType: 'local',
          code: 'return 1;',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-id-2',
          name: 'Imported Script 2',
          description: 'Second imported',
          tags: ['imported'],
          triggerPhrases: ['import 2'],
          parameters: [],
          executionType: 'local',
          code: 'return 2;',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const json = JSON.stringify(scripts);
      const imported = storage.importFromJSON(json);

      expect(imported).toBe(2);
      expect(storage.getAll().length).toBe(2);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      expect(() => storage.importFromJSON(invalidJson)).toThrow();
    });
  });

  describe('close', () => {
    it('should close the database connection', () => {
      expect(() => storage.close()).not.toThrow();
    });
  });
});

