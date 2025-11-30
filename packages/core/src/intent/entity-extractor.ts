/**
 * Entity extraction for parameters
 */

import { ParameterDef, ParameterType } from '../scripts/types';

export class EntityExtractor {
  /**
   * Extract entities from user input based on parameter definitions
   */
  extract(input: string, parameters: ParameterDef[]): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract all numbers first
    const allNumbers = this.extractAllNumbers(input);

    // Only auto-extract numbers when there's a SINGLE parameter being asked for
    // This makes the extraction conservative and allows for progressive parameter collection
    if (parameters.length === 1 && parameters[0].type === 'number' && allNumbers.length > 0) {
      // Single parameter case - extract the first number
      entities[parameters[0].name] = allNumbers[0];
    }
    // For multiple parameters, don't auto-extract - use progressive collection instead

    // Extract non-number parameters
    for (const param of parameters) {
      if (param.type !== 'number' && !(param.name in entities)) {
        const value = this.extractParameter(input, param);
        if (value !== null) {
          entities[param.name] = value;
        }
      }
    }

    return entities;
  }

  /**
   * Extract all numbers from input
   */
  private extractAllNumbers(input: string): number[] {
    const numbers: number[] = [];
    const regex = /\b\d+\.?\d*\b/g;
    let match;
    while ((match = regex.exec(input)) !== null) {
      const num = parseFloat(match[0]);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
    return numbers;
  }

  /**
   * Extract a single parameter from input
   */
  private extractParameter(input: string, param: ParameterDef): any {
    switch (param.type) {
      case 'number':
        return this.extractNumber(input);
      case 'boolean':
        return this.extractBoolean(input);
      case 'date':
        return this.extractDate(input);
      case 'string':
        return this.extractString(input, param.name);
      default:
        return null;
    }
  }

  /**
   * Extract numbers from input
   */
  private extractNumber(input: string): number | null {
    // Try to find numbers in the input
    const matches = input.match(/\b\d+\.?\d*\b/);
    if (matches) {
      const num = parseFloat(matches[0]);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Extract boolean from input
   */
  private extractBoolean(input: string): boolean | null {
    const lower = input.toLowerCase();
    if (lower.includes('yes') || lower.includes('true') || lower.includes('yep')) {
      return true;
    }
    if (lower.includes('no') || lower.includes('false') || lower.includes('nope')) {
      return false;
    }
    return null;
  }

  /**
   * Extract date from input
   */
  private extractDate(input: string): Date | null {
    // Simple date extraction - look for common patterns
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/,  // YYYY-MM-DD
      /\d{1,2}\/\d{1,2}\/\d{4}/,  // MM/DD/YYYY
    ];

    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        const date = new Date(match[0]);
        return isNaN(date.getTime()) ? null : date;
      }
    }

    // Try parsing the whole input as a date
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Extract string value (simple extraction of quoted text or specific patterns)
   */
  private extractString(input: string, paramName: string): string | null {
    // Look for quoted strings
    const quotedMatch = input.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // For currency codes (e.g., USD, EUR)
    if (paramName.toLowerCase().includes('currency')) {
      const currencyMatch = input.match(/\b[A-Z]{3}\b/);
      if (currencyMatch) {
        return currencyMatch[0];
      }
    }

    return null;
  }

  /**
   * Check which parameters are still missing
   */
  getMissingParameters(
    parameters: ParameterDef[],
    collected: Record<string, any>
  ): ParameterDef[] {
    return parameters.filter(p => p.required && !(p.name in collected));
  }

  /**
   * Validate collected parameters
   */
  validateParameters(
    parameters: ParameterDef[],
    values: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of parameters) {
      if (param.required && !(param.name in values)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      const value = values[param.name];
      if (value === undefined) continue;

      // Type validation
      const expectedType = this.getJSType(param.type);
      const actualType = typeof value;

      if (actualType !== expectedType && !(param.type === 'date' && value instanceof Date)) {
        errors.push(`Parameter ${param.name} should be ${param.type}, got ${actualType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getJSType(paramType: ParameterType): string {
    switch (paramType) {
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'object';
      case 'string': return 'string';
      default: return 'unknown';
    }
  }
}
