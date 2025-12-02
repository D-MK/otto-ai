/**
 * Tests for SyncedScriptStorage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncedScriptStorage } from '../syncedScriptStorage';
import { SupabaseStorageService } from '../supabaseStorage';
import type { Script } from '@otto-ai/core';

// Mock SupabaseStorageService
vi.mock('../supabaseStorage', () => ({
  SupabaseStorageService: vi.fn().mockImplementation(() => ({
    ensureTableExists: vi.fn().mockResolvedValue(undefined),
    getScript: vi.fn(),
    getAllScripts: vi.fn(),
    createScript: vi.fn(),
    updateScript: vi.fn(),
    deleteScript: vi.fn(),
  })),
}));

describe('SyncedScriptStorage', () => {
  let storage: SyncedScriptStorage;
  let mockSupabaseStorage: any;

  const mockSettings = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseApiKey: 'test-api-key',
    storageMode: 'supabase' as const,
  };

  const mockScript: Script = {
    id: 'test-script-1',
    name: 'Test Script',
    description: 'A test script',
    tags: ['test'],
    triggerPhrases: ['test'],
    parameters: [],
    executionType: 'local',
    code: 'return "test";',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage using vi.stubGlobal (works with jsdom)
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    // Create storage instance
    storage = new SyncedScriptStorage(':memory:', mockSettings);

    // Get the mocked Supabase storage instance
    mockSupabaseStorage = (storage as any).supabaseStorage;
  });

  describe('shouldLoadFromSupabase', () => {
    it('should return true when local storage is empty and Supabase has scripts', async () => {
      // Mock: no local scripts, but Supabase has scripts
      mockSupabaseStorage.getAllScripts.mockResolvedValue([mockScript]);

      const result = await storage.shouldLoadFromSupabase();

      expect(result).toBe(true);
      expect(mockSupabaseStorage.getAllScripts).toHaveBeenCalled();
    });

    it('should return false when local storage already has scripts', async () => {
      // Add a script to local storage
      storage.create({
        name: 'Local Script',
        description: 'Already exists locally',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'return "local";',
      });

      const result = await storage.shouldLoadFromSupabase();

      expect(result).toBe(false);
      // Should not even check Supabase if local storage has scripts
      expect(mockSupabaseStorage.getAllScripts).not.toHaveBeenCalled();
    });

    it('should return false when local storage is empty and Supabase is also empty', async () => {
      // Mock: no scripts in Supabase
      mockSupabaseStorage.getAllScripts.mockResolvedValue([]);

      const result = await storage.shouldLoadFromSupabase();

      expect(result).toBe(false);
      expect(mockSupabaseStorage.getAllScripts).toHaveBeenCalled();
    });

    it('should return false when Supabase sync is not enabled', async () => {
      const localStorage = new SyncedScriptStorage(':memory:', {
        ...mockSettings,
        storageMode: 'local' as const,
      });

      const result = await localStorage.shouldLoadFromSupabase();

      expect(result).toBe(false);
    });

    it('should handle Supabase errors gracefully', async () => {
      mockSupabaseStorage.getAllScripts.mockRejectedValue(new Error('Network error'));

      const result = await storage.shouldLoadFromSupabase();

      expect(result).toBe(false);
    });
  });

  describe('loadFromSupabase', () => {
    it('should load scripts from Supabase when local storage is empty', async () => {
      const supabaseScripts = [
        {
          id: 'script-1',
          name: 'Script 1',
          description: 'First script',
          tags: ['tag1'],
          triggerPhrases: ['trigger1'],
          parameters: [],
          executionType: 'local',
          code: 'return 1;',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'script-2',
          name: 'Script 2',
          description: 'Second script',
          tags: ['tag2'],
          triggerPhrases: ['trigger2'],
          parameters: [],
          executionType: 'local',
          code: 'return 2;',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      mockSupabaseStorage.getAllScripts.mockResolvedValue(supabaseScripts);

      const result = await storage.loadFromSupabase();

      expect(result.loaded).toBe(2);
      expect(result.failed).toBe(0);

      // Verify scripts were added to local storage
      const localScripts = storage.getAll();
      expect(localScripts).toHaveLength(2);
      expect(localScripts[0].name).toBe('Script 1');
      expect(localScripts[1].name).toBe('Script 2');
    });

    it('should update existing local scripts with Supabase data', async () => {
      // Add a script to local storage with old data
      storage.create({
        name: 'Old Name',
        description: 'Old description',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'return "old";',
      });

      const localScript = storage.getAll()[0];

      // Mock Supabase returning updated version of the same script
      const supabaseScripts = [
        {
          id: localScript.id,
          name: 'Updated Name',
          description: 'Updated description',
          tags: ['new-tag'],
          triggerPhrases: ['new-trigger'],
          parameters: [],
          executionType: 'local',
          code: 'return "new";',
          createdAt: localScript.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockSupabaseStorage.getAllScripts.mockResolvedValue(supabaseScripts);

      const result = await storage.loadFromSupabase();

      expect(result.loaded).toBe(1);
      expect(result.failed).toBe(0);

      // Verify script was updated
      const updatedScript = storage.getById(localScript.id);
      expect(updatedScript?.name).toBe('Updated Name');
      expect(updatedScript?.description).toBe('Updated description');
      expect(updatedScript?.code).toBe('return "new";');
    });

    it('should handle partial failures gracefully', async () => {
      const supabaseScripts = [
        {
          id: 'valid-script',
          name: 'Valid Script',
          description: 'This is valid',
          tags: [],
          triggerPhrases: [],
          parameters: [],
          executionType: 'local',
          code: 'return "valid";',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          // Missing required fields - should fail
          id: 'invalid-script',
          name: null,
        } as any,
      ];

      mockSupabaseStorage.getAllScripts.mockResolvedValue(supabaseScripts);

      const result = await storage.loadFromSupabase();

      expect(result.loaded).toBe(1);
      expect(result.failed).toBe(1);

      // Verify only valid script was loaded
      const localScripts = storage.getAll();
      expect(localScripts).toHaveLength(1);
      expect(localScripts[0].id).toBe('valid-script');
    });

    it('should return zeros when Supabase sync is not enabled', async () => {
      const localStorage = new SyncedScriptStorage(':memory:', {
        ...mockSettings,
        storageMode: 'local' as const,
      });

      const result = await localStorage.loadFromSupabase();

      expect(result.loaded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle Supabase getAllScripts error', async () => {
      mockSupabaseStorage.getAllScripts.mockRejectedValue(new Error('Network error'));

      const result = await storage.loadFromSupabase();

      expect(result.loaded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('Auto-sync on create/update/delete', () => {
    it('should sync to Supabase when creating a script', async () => {
      mockSupabaseStorage.getScript.mockResolvedValue(null);
      mockSupabaseStorage.createScript.mockResolvedValue(undefined);

      const script = storage.create({
        name: 'New Script',
        description: 'Test',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'return "test";',
      });

      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSupabaseStorage.createScript).toHaveBeenCalledWith(
        expect.objectContaining({
          id: script.id,
          name: 'New Script',
        })
      );
    });

    it('should sync to Supabase when updating a script', async () => {
      const script = storage.create({
        name: 'Original Name',
        description: 'Test',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'return "test";',
      });

      mockSupabaseStorage.getScript.mockResolvedValue({ id: script.id });
      mockSupabaseStorage.updateScript.mockResolvedValue(undefined);

      storage.update(script.id, { name: 'Updated Name' });

      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSupabaseStorage.updateScript).toHaveBeenCalledWith(
        script.id,
        expect.objectContaining({
          name: 'Updated Name',
        })
      );
    });

    it('should sync to Supabase when deleting a script', async () => {
      const script = storage.create({
        name: 'To Delete',
        description: 'Test',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'return "test";',
      });

      mockSupabaseStorage.deleteScript.mockResolvedValue(undefined);

      storage.delete(script.id);

      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSupabaseStorage.deleteScript).toHaveBeenCalledWith(script.id);
    });
  });
});
