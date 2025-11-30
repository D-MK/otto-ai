/**
 * Tests for ScriptExecutor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScriptExecutor } from '../src/scripts/executor';
import { Script } from '../src/scripts/types';

describe('ScriptExecutor', () => {
  let executor: ScriptExecutor;

  beforeEach(() => {
    executor = new ScriptExecutor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeLocal', () => {
    it('should execute a simple script successfully', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [
          {
            name: 'x',
            type: 'number',
            required: true,
            prompt: 'Enter x',
          },
        ],
        executionType: 'local',
        code: 'return params.x * 2;',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, { x: 5 });

      expect(result.success).toBe(true);
      expect(result.result).toBe(10);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error when code is missing', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [],
        executionType: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No code provided for local execution');
    });

    it('should return error when required parameters are missing', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [
          {
            name: 'required',
            type: 'string',
            required: true,
            prompt: 'Enter required',
          },
        ],
        executionType: 'local',
        code: 'return params.required;',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('should coerce parameters to correct types', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [
          {
            name: 'num',
            type: 'number',
            required: true,
            prompt: 'Enter number',
          },
          {
            name: 'bool',
            type: 'boolean',
            required: true,
            prompt: 'Enter boolean',
          },
        ],
        executionType: 'local',
        code: 'return { num: params.num, bool: params.bool };',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {
        num: '42',
        bool: 'true',
      });

      expect(result.success).toBe(true);
      expect(result.result.num).toBe(42);
      expect(result.result.bool).toBe(true);
    });

    it('should handle script execution errors', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [],
        executionType: 'local',
        code: 'throw new Error("Test error");',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });

    it('should handle timeout', async () => {
      const script: Script = {
        id: 'test-id',
        name: 'Test Script',
        description: 'Test',
        tags: ['test'],
        triggerPhrases: ['test'],
        parameters: [],
        executionType: 'local',
        code: `
          const start = Date.now();
          while (Date.now() - start < 10000) {
            // Infinite loop
          }
          return 'done';
        `,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resultPromise = executor.executeLocal(script, {});

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(6000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);
  });

  describe('validateCode', () => {
    it('should validate safe code', () => {
      const safeCode = 'return params.x + params.y;';
      const result = executor.validateCode(safeCode);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect require() calls', () => {
      const dangerousCode = 'require("fs"); return 1;';
      const result = executor.validateCode(dangerousCode);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect eval() calls', () => {
      const dangerousCode = 'eval("malicious code");';
      const result = executor.validateCode(dangerousCode);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect process access', () => {
      const dangerousCode = 'process.exit(1);';
      const result = executor.validateCode(dangerousCode);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect multiple dangerous patterns', () => {
      const dangerousCode = 'require("fs"); eval("code"); process.exit();';
      const result = executor.validateCode(dangerousCode);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});

