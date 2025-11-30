/**
 * Tests for ScriptExecutor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptExecutor } from '../src/scripts/executor';
import { Script } from '../src/scripts/types';

describe('ScriptExecutor', () => {
  let executor: ScriptExecutor;

  beforeEach(() => {
    executor = new ScriptExecutor();
  });

  describe('executeLocal', () => {
    it('should execute a valid script successfully', async () => {
      const script: Script = {
        id: '1',
        name: 'Test Script',
        description: 'A test script',
        tags: [],
        triggerPhrases: [],
        parameters: [
          { name: 'x', type: 'number', required: true, prompt: 'Enter x' },
          { name: 'y', type: 'number', required: true, prompt: 'Enter y' },
        ],
        executionType: 'local',
        code: 'return x + y;',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, { x: 5, y: 3 });

      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
    });

    it('should reject execution with missing required parameters', async () => {
      const script: Script = {
        id: '1',
        name: 'Test Script',
        description: 'A test script',
        tags: [],
        triggerPhrases: [],
        parameters: [
          { name: 'x', type: 'number', required: true, prompt: 'Enter x' },
          { name: 'y', type: 'number', required: true, prompt: 'Enter y' },
        ],
        executionType: 'local',
        code: 'return x + y;',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, { x: 5 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('should handle execution errors gracefully', async () => {
      const script: Script = {
        id: '1',
        name: 'Test Script',
        description: 'A test script',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'throw new Error("Test error");',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should timeout long-running scripts', async () => {
      const script: Script = {
        id: '1',
        name: 'Test Script',
        description: 'A test script',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        code: 'while(true) {}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution timeout');
    });

    it('should coerce parameter types correctly', async () => {
      const script: Script = {
        id: '1',
        name: 'Test Script',
        description: 'A test script',
        tags: [],
        triggerPhrases: [],
        parameters: [
          { name: 'num', type: 'number', required: true, prompt: 'Enter number' },
          { name: 'bool', type: 'boolean', required: true, prompt: 'Enter boolean' },
        ],
        executionType: 'local',
        code: 'return { num: typeof num, bool: typeof bool };',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeLocal(script, { num: '42', bool: 'true' });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ num: 'number', bool: 'boolean' });
    });
  });

  describe('validateCode', () => {
    it('should accept safe code', () => {
      const code = 'return x + y;';
      const validation = executor.validateCode(code);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject code with require statements', () => {
      const code = 'const fs = require("fs");';
      const validation = executor.validateCode(code);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject code with eval', () => {
      const code = 'eval("malicious code");';
      const validation = executor.validateCode(code);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject code with process access', () => {
      const code = 'process.exit(0);';
      const validation = executor.validateCode(code);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
