/**
 * Script executor with sandboxing for local JavaScript execution
 */

import { Script, ScriptExecutionResult } from './types';

const EXECUTION_TIMEOUT = 5000; // 5 seconds

export class ScriptExecutor {
  /**
   * Execute a local script with provided parameters
   */
  async executeLocal(script: Script, params: Record<string, any>): Promise<ScriptExecutionResult> {
    if (!script.code) {
      return {
        success: false,
        error: 'No code provided for local execution',
        executionTimeMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Validate all required parameters are provided
      const missingParams = script.parameters
        .filter(p => p.required && !(p.name in params))
        .map(p => p.name);

      if (missingParams.length > 0) {
        return {
          success: false,
          error: `Missing required parameters: ${missingParams.join(', ')}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Type coercion
      const typedParams = this.coerceParameters(script, params);

      // Execute in sandboxed context
      const result = await this.executeSandboxed(script.code, typedParams);

      return {
        success: true,
        result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Execution failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Coerce parameters to their expected types
   */
  private coerceParameters(script: Script, params: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const paramDef of script.parameters) {
      const value = params[paramDef.name];
      if (value === undefined) continue;

      switch (paramDef.type) {
        case 'number':
          result[paramDef.name] = typeof value === 'number' ? value : parseFloat(value);
          break;
        case 'boolean':
          result[paramDef.name] = typeof value === 'boolean' ? value : value === 'true';
          break;
        case 'date':
          result[paramDef.name] = value instanceof Date ? value : new Date(value);
          break;
        default:
          result[paramDef.name] = String(value);
      }
    }

    return result;
  }

  /**
   * Execute code in a sandboxed context with timeout
   * SECURITY: Enhanced sandboxing to prevent access to dangerous globals
   * Note: This is still not perfect - for production, consider using Web Workers or server-side execution
   */
  private async executeSandboxed(code: string, params: Record<string, any>): Promise<any> {
    // First validate the code
    const validation = this.validateCode(code);
    if (!validation.valid) {
      throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, EXECUTION_TIMEOUT);

      try {
        // Create a sandboxed function with limited access
        // SECURITY: Explicitly provide only safe globals, prevent access to globalThis
        const paramNames = Object.keys(params);
        const paramValues = paramNames.map(name => params[name]);

        // Pre-create safe globals outside the sandboxed scope to avoid TDZ
        const safeMath = {
          abs: Math.abs.bind(Math),
          ceil: Math.ceil.bind(Math),
          floor: Math.floor.bind(Math),
          max: Math.max.bind(Math),
          min: Math.min.bind(Math),
          pow: Math.pow.bind(Math),
          round: Math.round.bind(Math),
          sqrt: Math.sqrt.bind(Math),
          random: Math.random.bind(Math),
          PI: Math.PI,
          E: Math.E,
        };

        const safeDate = {
          now: Date.now.bind(Date),
        };

        const safeJSON = {
          parse: JSON.parse.bind(JSON),
          stringify: JSON.stringify.bind(JSON),
        };

        const safeConsole = {
          log: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
        };

        // Create isolated scope without access to globalThis, window, document, etc.
        // Pass safe globals as parameters to avoid temporal dead zone
        const sandboxedFunction = new Function(
          'Math',
          'Date',
          'JSON',
          'console',
          ...paramNames,
          `
          'use strict';
          ${code}
          `
        );

        const result = sandboxedFunction(safeMath, safeDate, safeJSON, safeConsole, ...paramValues);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Validate script code for basic security issues
   * Enhanced validation to prevent access to dangerous globals
   */
  validateCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\./,
      /global\./,
      /__dirname/,
      /__filename/,
      /fs\./,
      /child_process/,
      // Prevent access to browser globals
      /\bglobalThis\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bfetch\b/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bWorker\b/,
      /\bimportScripts\b/,
      // Prevent prototype manipulation
      /\.__proto__/,
      /\.constructor\s*\./,
      /Object\.(defineProperty|getOwnPropertyDescriptor)/,
      // Prevent reflection
      /\bReflect\b/,
      /\bProxy\b/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
