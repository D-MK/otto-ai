/**
 * Intent classification and routing types
 */

export type IntentType = 'script' | 'mcp' | 'general';

export interface IntentMatch {
  type: IntentType;
  confidence: number;
  scriptId?: string;
  mcpAction?: string;
  entities?: Record<string, any>;
}

export interface IntentClassificationResult {
  matches: IntentMatch[];
  topMatch: IntentMatch | null;
  requiresDisambiguation: boolean;
}

export interface ConversationContext {
  messageHistory: Message[];
  activeScriptContext?: {
    scriptId: string;
    collectedParams: Record<string, any>;
    missingParams: string[];
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: IntentMatch;
    executionResult?: any;
  };
}
