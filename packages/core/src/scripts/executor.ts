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
   * Note: This is a basic sandbox. For production, consider using vm2 or isolated-vm
   */
  private async executeSandboxed(code: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, EXECUTION_TIMEOUT);

      try {
        // Create a sandboxed function with limited access
        // Only provide safe globals and the params
        const sandboxedFunction = new Function(
          'params',
          `
          'use strict';
          const { ${Object.keys(params).join(', ')} } = params;

          // Safe globals
          const Math = globalThis.Math;
          const Date = globalThis.Date;
          const JSON = globalThis.JSON;
          const console = { log: () => {} }; // No-op console

          ${code}
          `
        );

        const result = sandboxedFunction(params);
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
