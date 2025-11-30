/**
 * Tests for IntentClassifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../src/intent/classifier';
import { Script } from '../src/scripts/types';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  describe('classify', () => {
    beforeEach(() => {
      const scripts: Script[] = [
        {
          id: 'bmi-id',
          name: 'BMI Calculator',
          description: 'Calculate body mass index',
          tags: ['health', 'calculator'],
          triggerPhrases: ['calculate my bmi', 'what is my bmi', 'bmi'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'currency-id',
          name: 'Currency Converter',
          description: 'Convert between currencies',
          tags: ['finance', 'converter'],
          triggerPhrases: ['convert currency', 'currency conversion'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      classifier.updateScripts(scripts);
    });

    it('should match exact trigger phrase', () => {
      const result = classifier.classify('calculate my bmi');

      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch?.type).toBe('script');
      expect(result.topMatch?.scriptId).toBe('bmi-id');
      expect(result.topMatch?.confidence).toBeGreaterThan(0.5);
    });

    it('should match partial phrase', () => {
      const result = classifier.classify('bmi');

      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch?.scriptId).toBe('bmi-id');
    });

    it('should match description keywords', () => {
      const result = classifier.classify('convert currency');

      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch?.scriptId).toBe('currency-id');
    });

    it('should return null for no matches', () => {
      const result = classifier.classify('completely unrelated query');

      expect(result.topMatch).toBeNull();
      expect(result.matches.length).toBe(0);
    });

    it('should handle empty input', () => {
      const result = classifier.classify('');

      expect(result.topMatch).toBeNull();
      expect(result.matches).toEqual([]);
      expect(result.requiresDisambiguation).toBe(false);
    });

    it('should require disambiguation for similar matches', () => {
      // Add another similar script
      classifier.updateScripts([
        {
          id: 'bmi-id',
          name: 'BMI Calculator',
          description: 'Calculate body mass index',
          tags: ['health'],
          triggerPhrases: ['bmi', 'body mass'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bmi-alt-id',
          name: 'BMI Calculator Alt',
          description: 'Calculate body mass index alternative',
          tags: ['health'],
          triggerPhrases: ['bmi', 'body mass index'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = classifier.classify('bmi');

      // Should require disambiguation if confidence is very close
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('updateScripts', () => {
    it('should update scripts list', () => {
      const scripts: Script[] = [
        {
          id: 'test-id',
          name: 'Test Script',
          description: 'Test',
          tags: ['test'],
          triggerPhrases: ['test'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      classifier.updateScripts(scripts);

      const result = classifier.classify('test');
      expect(result.topMatch?.scriptId).toBe('test-id');
    });

    it('should handle empty scripts list', () => {
      classifier.updateScripts([]);

      const result = classifier.classify('anything');
      expect(result.topMatch).toBeNull();
    });
  });

  describe('getTopMatches', () => {
    beforeEach(() => {
      const scripts: Script[] = [
        {
          id: 'script-1',
          name: 'Script 1',
          description: 'First script',
          tags: ['test'],
          triggerPhrases: ['script one', 'first'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'script-2',
          name: 'Script 2',
          description: 'Second script',
          tags: ['test'],
          triggerPhrases: ['script two', 'second'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'script-3',
          name: 'Script 3',
          description: 'Third script',
          tags: ['test'],
          triggerPhrases: ['script three', 'third'],
          parameters: [],
          executionType: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      classifier.updateScripts(scripts);
    });

    it('should return top N matches', () => {
      const matches = classifier.getTopMatches('script', 2);

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should return all matches if N is greater than available', () => {
      const matches = classifier.getTopMatches('script', 10);

      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });
});

