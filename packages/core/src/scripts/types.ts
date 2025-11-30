/**
 * Core type definitions for the script system
 */

export type ParameterType = 'string' | 'number' | 'boolean' | 'date';
export type ExecutionType = 'local' | 'mcp' | 'gemini-chat';

export interface ParameterDef {
  name: string;
  type: ParameterType;
  required: boolean;
  prompt: string;  // How bot asks for this, e.g., "What's your weight in kg?"
}

export interface Script {
  id: string;                    // UUID
  name: string;                  // Human-readable, e.g., "BMI Calculator"
  description: string;           // Used for intent matching
  tags: string[];                // ["health", "calculator"]
  triggerPhrases: string[];      // ["calculate my bmi", "what's my body mass index"]
  parameters: ParameterDef[];    // Required inputs
  executionType: ExecutionType;
  mcpEndpoint?: string;          // If executionType === 'mcp'
  code?: string;                 // If executionType === 'local' (safe JS subset)
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptExecutionContext {
  scriptId: string;
  collectedParams: Record<string, any>;
  missingParams: string[];
  result?: any;
  error?: string;
}

export interface ScriptExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

export interface ScriptStorage {
  getById(id: string): Script | null;
  getAll(): Script[];
}
