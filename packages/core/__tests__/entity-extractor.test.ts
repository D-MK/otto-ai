/**
 * Tests for EntityExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityExtractor } from '../src/intent/entity-extractor';
import { ParameterDef } from '../src/scripts/types';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;

  beforeEach(() => {
    extractor = new EntityExtractor();
  });

  describe('extract', () => {
    it('should extract number from input', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'weight',
          type: 'number',
          required: true,
          prompt: 'Enter weight',
        },
      ];

      const result = extractor.extract('I weigh 75 kilograms', parameters);

      expect(result.weight).toBe(75);
    });

    it('should extract boolean from input', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'enabled',
          type: 'boolean',
          required: true,
          prompt: 'Enable?',
        },
      ];

      expect(extractor.extract('yes', parameters).enabled).toBe(true);
      expect(extractor.extract('no', parameters).enabled).toBe(false);
      expect(extractor.extract('true', parameters).enabled).toBe(true);
      expect(extractor.extract('false', parameters).enabled).toBe(false);
    });

    it('should extract date from input', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'date',
          type: 'date',
          required: true,
          prompt: 'Enter date',
        },
      ];

      const result = extractor.extract('2024-01-15', parameters);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2024);
    });

    it('should extract string from quoted text', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          prompt: 'Enter name',
        },
      ];

      const result = extractor.extract('My name is "John Doe"', parameters);

      expect(result.name).toBe('John Doe');
    });

    it('should extract currency codes', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'fromCurrency',
          type: 'string',
          required: true,
          prompt: 'From currency',
        },
      ];

      const result = extractor.extract('Convert from USD to EUR', parameters);

      expect(result.fromCurrency).toBe('USD');
    });

    it('should not auto-extract numbers when multiple parameters exist', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'weight',
          type: 'number',
          required: true,
          prompt: 'Enter weight',
        },
        {
          name: 'height',
          type: 'number',
          required: true,
          prompt: 'Enter height',
        },
      ];

      const result = extractor.extract('I am 75 kg and 180 cm', parameters);

      // Should not auto-extract when multiple number params exist
      // (progressive collection should handle this)
      expect(result.weight).toBeUndefined();
      expect(result.height).toBeUndefined();
    });
  });

  describe('getMissingParameters', () => {
    it('should identify missing required parameters', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'required1',
          type: 'string',
          required: true,
          prompt: 'Enter required1',
        },
        {
          name: 'required2',
          type: 'string',
          required: true,
          prompt: 'Enter required2',
        },
        {
          name: 'optional',
          type: 'string',
          required: false,
          prompt: 'Enter optional',
        },
      ];

      const collected = { required1: 'value1' };
      const missing = extractor.getMissingParameters(parameters, collected);

      expect(missing.length).toBe(1);
      expect(missing[0].name).toBe('required2');
    });

    it('should return empty array when all required parameters are present', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'required',
          type: 'string',
          required: true,
          prompt: 'Enter required',
        },
      ];

      const collected = { required: 'value' };
      const missing = extractor.getMissingParameters(parameters, collected);

      expect(missing).toEqual([]);
    });
  });

  describe('validateParameters', () => {
    it('should validate correct parameter types', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'num',
          type: 'number',
          required: true,
          prompt: 'Enter number',
        },
        {
          name: 'str',
          type: 'string',
          required: true,
          prompt: 'Enter string',
        },
        {
          name: 'bool',
          type: 'boolean',
          required: true,
          prompt: 'Enter boolean',
        },
      ];

      const values = {
        num: 42,
        str: 'hello',
        bool: true,
      };

      const result = extractor.validateParameters(parameters, values);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required parameters', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'required',
          type: 'string',
          required: true,
          prompt: 'Enter required',
        },
      ];

      const values = {};

      const result = extractor.validateParameters(parameters, values);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required parameter');
    });

    it('should detect type mismatches', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'num',
          type: 'number',
          required: true,
          prompt: 'Enter number',
        },
      ];

      const values = { num: 'not a number' };

      const result = extractor.validateParameters(parameters, values);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate date parameters', () => {
      const parameters: ParameterDef[] = [
        {
          name: 'date',
          type: 'date',
          required: true,
          prompt: 'Enter date',
        },
      ];

      const values = { date: new Date() };

      const result = extractor.validateParameters(parameters, values);

      expect(result.valid).toBe(true);
    });
  });
});

