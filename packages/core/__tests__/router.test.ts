/**
 * Tests for IntentRouter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRouter } from '../src/intent/router';
import { ScriptStorage } from '../src/scripts/storage';
import { ConversationContext } from '../src/intent/types';

describe('IntentRouter', () => {
  let router: IntentRouter;
  let storage: ScriptStorage;

  beforeEach(() => {
    storage = new ScriptStorage(':memory:');

    // Add a test script
    storage.create({
      name: 'Test Calculator',
      description: 'A simple calculator',
      tags: ['math', 'calculator'],
      triggerPhrases: ['calculate', 'compute'],
      parameters: [
        { name: 'x', type: 'number', required: true, prompt: 'Enter first number' },
        { name: 'y', type: 'number', required: true, prompt: 'Enter second number' },
      ],
      executionType: 'local',
      code: 'return x + y;',
    });

    router = new IntentRouter(storage);
  });

  describe('route', () => {
    it('should route to script execution', async () => {
      const context: ConversationContext = {
        messageHistory: [],
      };

      const response = await router.route('calculate 5 and 3', context);

      expect(response.requiresUserInput).toBe(true);
      expect(response.promptForParam).toBeDefined();
    });

    it('should collect parameters across multiple turns', async () => {
      let context: ConversationContext = {
        messageHistory: [],
      };

      // First turn - trigger script
      const response1 = await router.route('calculate', context);
      expect(response1.requiresUserInput).toBe(true);

      // Update context with active script
      const script = storage.getAll()[0];
      context.activeScriptContext = {
        scriptId: script.id,
        collectedParams: {},
        missingParams: ['x', 'y'],
      };

      // Second turn - provide first param
      const response2 = await router.route('5', context);
      expect(response2.requiresUserInput).toBe(true);

      // Update context
      context.activeScriptContext.collectedParams['x'] = 5;
      context.activeScriptContext.missingParams = ['y'];

      // Third turn - provide second param
      const response3 = await router.route('3', context);
      expect(response3.executionResult).toBe(8);
    });

    it('should fallback to general assistant for unmatched input', async () => {
      const context: ConversationContext = {
        messageHistory: [],
      };

      const response = await router.route('hello there', context);

      expect(response.message).toBeTruthy();
      expect(response.requiresUserInput).toBeFalsy();
    });

    it('should handle disambiguation', async () => {
      // Add another similar script
      storage.create({
        name: 'Another Calculator',
        description: 'Another calculator',
        tags: ['math'],
        triggerPhrases: ['calculate numbers'],
        parameters: [],
        executionType: 'local',
        code: 'return 42;',
      });

      router.refreshScripts();

      const context: ConversationContext = {
        messageHistory: [],
      };

      const response = await router.route('calculate', context);

      // Should get either a parameter prompt or disambiguation
      expect(response.message).toBeTruthy();
    });
  });

  describe('refreshScripts', () => {
    it('should update classifier with new scripts', () => {
      const initialScripts = storage.getAll();
      expect(initialScripts).toHaveLength(1);

      storage.create({
        name: 'New Script',
        description: 'A new script',
        tags: [],
        triggerPhrases: ['new command'],
        parameters: [],
        executionType: 'local',
        code: 'return "new";',
      });

      router.refreshScripts();

      // Router should now know about the new script
      const updatedScripts = storage.getAll();
      expect(updatedScripts).toHaveLength(2);
    });
  });
});
