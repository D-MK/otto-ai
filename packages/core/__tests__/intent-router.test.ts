/**
 * Integration tests for IntentRouter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRouter } from '../src/intent/router';
import { ScriptStorage } from '../src/scripts/storage';
import { MCPClient } from '../src/mcp/client';
import { ConversationContext } from '../src/intent/types';
import { Script } from '../src/scripts/types';

describe('IntentRouter', () => {
  let router: IntentRouter;
  let storage: ScriptStorage;

  beforeEach(() => {
    storage = new ScriptStorage(':memory:');
    router = new IntentRouter(storage, null);
  });

  describe('route', () => {
    beforeEach(() => {
      // Add test scripts
      storage.create({
        name: 'BMI Calculator',
        description: 'Calculate body mass index',
        tags: ['health', 'calculator'],
        triggerPhrases: ['calculate my bmi', 'bmi'],
        parameters: [
          {
            name: 'weight',
            type: 'number',
            required: true,
            prompt: 'What is your weight in kg?',
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            prompt: 'What is your height in cm?',
          },
        ],
        executionType: 'local',
        code: 'return params.weight / ((params.height / 100) ** 2);',
      });
    });

    it('should route to script execution when all parameters provided', async () => {
      const context: ConversationContext = {
        activeScriptContext: undefined,
        collectedParams: {},
      };

      const response = await router.route('calculate my bmi weight 75 height 180', context);

      expect(response.requiresUserInput).toBeUndefined();
      expect(response.executionResult).toBeDefined();
      expect(typeof response.executionResult).toBe('number');
    });

    it('should prompt for missing parameters', async () => {
      const context: ConversationContext = {
        activeScriptContext: undefined,
        collectedParams: {},
      };

      const response = await router.route('calculate my bmi', context);

      expect(response.requiresUserInput).toBe(true);
      expect(response.promptForParam).toBeDefined();
    });

    it('should continue parameter collection', async () => {
      const script = storage.getAll()[0];
      const context: ConversationContext = {
        activeScriptContext: {
          scriptId: script.id,
          collectedParams: {},
          missingParams: ['weight', 'height'],
        },
        collectedParams: {},
      };

      const response = await router.route('75', context);

      // Should prompt for next parameter
      expect(response.requiresUserInput).toBe(true);
      expect(response.promptForParam).toBe('height');
    });

    it('should handle general assistant queries', async () => {
      const context: ConversationContext = {
        activeScriptContext: undefined,
        collectedParams: {},
      };

      const response = await router.route('hello', context);

      expect(response.message).toContain('Hello');
    });

    it('should refresh scripts when updated', async () => {
      await router.route('calculate my bmi', {
        activeScriptContext: undefined,
        collectedParams: {},
      });

      // Add new script
      storage.create({
        name: 'New Script',
        description: 'New script',
        tags: ['test'],
        triggerPhrases: ['new script'],
        parameters: [],
        executionType: 'local',
        code: 'return "new";',
      });

      router.refreshScripts();

      // Router should now recognize the new script
      expect(storage.getAll().length).toBe(2);
    });
  });
});

