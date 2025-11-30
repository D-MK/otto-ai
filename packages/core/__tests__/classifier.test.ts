/**
 * Tests for IntentClassifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../src/intent/classifier';
import { Script } from '../src/scripts/types';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;
  let sampleScripts: Script[];

  beforeEach(() => {
    classifier = new IntentClassifier();

    sampleScripts = [
      {
        id: '1',
        name: 'BMI Calculator',
        description: 'Calculate body mass index',
        tags: ['health', 'calculator'],
        triggerPhrases: ['calculate my bmi', 'body mass index'],
        parameters: [],
        executionType: 'local',
        code: 'return 25;',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Weather Checker',
        description: 'Check current weather',
        tags: ['weather'],
        triggerPhrases: ['what is the weather', 'check weather'],
        parameters: [],
        executionType: 'mcp',
        mcpEndpoint: '/weather',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    classifier.updateScripts(sampleScripts);
  });

  describe('classify', () => {
    it('should match high-confidence script intents', () => {
      const result = classifier.classify('calculate my bmi');

      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch?.type).toBe('script');
      expect(result.topMatch?.confidence).toBeGreaterThan(0.7);
      expect(result.topMatch?.scriptId).toBe('1');
    });

    it('should return low confidence for non-matching input', () => {
      const result = classifier.classify('hello world');

      expect(result.topMatch?.confidence || 0).toBeLessThan(0.7);
    });

    it('should trigger disambiguation when matches are close', () => {
      // Update scripts to have similar trigger phrases
      const similarScripts = [
        {
          ...sampleScripts[0],
          triggerPhrases: ['check my health'],
        },
        {
          ...sampleScripts[1],
          triggerPhrases: ['check my health status'],
        },
      ];

      classifier.updateScripts(similarScripts);
      const result = classifier.classify('check my health');

      // Should have multiple close matches
      expect(result.matches.length).toBeGreaterThan(1);
    });

    it('should detect MCP action verbs', () => {
      const result = classifier.classify('fetch user data from api');

      const mcpMatch = result.matches.find(m => m.type === 'mcp');
      expect(mcpMatch).toBeDefined();
      expect(mcpMatch?.confidence).toBeGreaterThan(0.5);
    });

    it('should handle empty input gracefully', () => {
      const result = classifier.classify('');

      expect(result.topMatch).toBeNull();
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('getTopMatches', () => {
    it('should return limited number of matches', () => {
      const matches = classifier.getTopMatches('calculate', 2);

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should return matches in descending confidence order', () => {
      const matches = classifier.getTopMatches('calculate bmi health');

      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].confidence).toBeGreaterThanOrEqual(matches[i + 1].confidence);
      }
    });
  });
});
