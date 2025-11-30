/**
 * Intent router - orchestrates intent classification and execution
 */

import { IntentClassifier } from './classifier';
import { EntityExtractor } from './entity-extractor';
import { ScriptExecutor } from '../scripts/executor';
import { MCPClient } from '../mcp/client';
import { ConversationContext, IntentMatch } from './types';
import { Script, ScriptStorage } from '../scripts/types';

export interface RouterResponse {
  message: string;
  requiresUserInput?: boolean;
  promptForParam?: string;
  executionResult?: any;
  debug?: {
    intent: IntentMatch | null;
    confidence: number;
    requiresDisambiguation: boolean;
  };
}

export class IntentRouter {
  private classifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private scriptStorage: ScriptStorage;
  private scriptExecutor: ScriptExecutor;
  private mcpClient: MCPClient | null;

  constructor(
    scriptStorage: ScriptStorage,
    mcpClient: MCPClient | null = null
  ) {
    this.classifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.scriptStorage = scriptStorage;
    this.scriptExecutor = new ScriptExecutor();
    this.mcpClient = mcpClient;

    // Initialize classifier with scripts
    this.refreshScripts();
  }

  /**
   * Refresh the classifier with latest scripts
   */
  refreshScripts(): void {
    const scripts = this.scriptStorage.getAll();
    this.classifier.updateScripts(scripts);
  }

  /**
   * Route user input and generate response
   */
  async route(
    input: string,
    context: ConversationContext
  ): Promise<RouterResponse> {
    // Check if we're in the middle of collecting parameters
    if (context.activeScriptContext) {
      return this.continueParameterCollection(input, context);
    }

    // Classify the intent
    const classification = this.classifier.classify(input);

    // Handle disambiguation
    if (classification.requiresDisambiguation) {
      return this.handleDisambiguation(classification.matches);
    }

    // Route based on top match
    const topMatch = classification.topMatch;

    if (!topMatch || topMatch.confidence < 0.5) {
      // Fallback to general assistant
      return this.handleGeneralAssistant(input);
    }

    switch (topMatch.type) {
      case 'script':
        return this.handleScriptExecution(input, topMatch, context);
      case 'mcp':
        return this.handleMCPAction(input, topMatch);
      default:
        return this.handleGeneralAssistant(input);
    }
  }

  /**
   * Handle script execution
   */
  private async handleScriptExecution(
    input: string,
    match: IntentMatch,
    _context: ConversationContext
  ): Promise<RouterResponse> {
    const script = this.scriptStorage.getById(match.scriptId!);
    if (!script) {
      return { message: "I couldn't find that script." };
    }

    // Extract entities from input
    const extractedEntities = this.entityExtractor.extract(input, script.parameters);

    // Check for missing parameters
    const missingParams = this.entityExtractor.getMissingParameters(
      script.parameters,
      extractedEntities
    );

    if (missingParams.length > 0) {
      // Start parameter collection
      const firstMissing = missingParams[0];
      return {
        message: firstMissing.prompt,
        requiresUserInput: true,
        promptForParam: firstMissing.name,
        debug: {
          intent: match,
          confidence: match.confidence,
          requiresDisambiguation: false,
        },
      };
    }

    // All parameters collected, execute the script
    return this.executeScript(script, extractedEntities);
  }

  /**
   * Continue collecting parameters for active script
   */
  private async continueParameterCollection(
    input: string,
    context: ConversationContext
  ): Promise<RouterResponse> {
    const activeContext = context.activeScriptContext!;
    const script = this.scriptStorage.getById(activeContext.scriptId);

    if (!script) {
      return { message: "I lost track of what we were doing. Let's start over." };
    }

    // Extract value from user's response
    const missingParam = script.parameters.find(
      p => activeContext.missingParams.includes(p.name)
    );

    if (!missingParam) {
      return this.executeScript(script, activeContext.collectedParams);
    }

    // Try to extract the parameter value
    const extracted = this.entityExtractor.extract(input, [missingParam]);

    if (extracted[missingParam.name] !== undefined) {
      activeContext.collectedParams[missingParam.name] = extracted[missingParam.name];
      activeContext.missingParams = activeContext.missingParams.filter(
        p => p !== missingParam.name
      );
    } else {
      // Couldn't extract, treat the whole input as the value
      activeContext.collectedParams[missingParam.name] = input;
      activeContext.missingParams = activeContext.missingParams.filter(
        p => p !== missingParam.name
      );
    }

    // Check if we still have missing params
    const stillMissing = this.entityExtractor.getMissingParameters(
      script.parameters,
      activeContext.collectedParams
    );

    if (stillMissing.length > 0) {
      return {
        message: stillMissing[0].prompt,
        requiresUserInput: true,
        promptForParam: stillMissing[0].name,
      };
    }

    // All parameters collected
    return this.executeScript(script, activeContext.collectedParams);
  }

  /**
   * Execute a script with all parameters
   */
  private async executeScript(
    script: Script,
    params: Record<string, any>
  ): Promise<RouterResponse> {
    if (script.executionType === 'local') {
      const result = await this.scriptExecutor.executeLocal(script, params);

      if (result.success) {
        return {
          message: this.formatResult(result.result),
          executionResult: result.result,
        };
      } else {
        return {
          message: `Execution failed: ${result.error}`,
        };
      }
    } else if (script.executionType === 'mcp') {
      if (!this.mcpClient) {
        return { message: "MCP client not configured." };
      }

      const mcpResult = await this.mcpClient.execute({
        endpoint: script.mcpEndpoint!,
        method: 'POST',
        body: params,
      });

      if (mcpResult.success) {
        return {
          message: this.formatResult(mcpResult.data),
          executionResult: mcpResult.data,
        };
      } else {
        return {
          message: `MCP request failed: ${mcpResult.error}`,
        };
      }
    } else if (script.executionType === 'gemini-chat') {
      // Gemini chat execution should be handled by the application layer
      return {
        message: "GEMINI_CHAT_EXECUTION_REQUIRED",
        executionResult: { type: 'gemini-chat', params },
      };
    }

    return { message: "Unknown execution type." };
  }

  /**
   * Handle MCP actions
   */
  private async handleMCPAction(
    _input: string,
    _match: IntentMatch
  ): Promise<RouterResponse> {
    if (!this.mcpClient) {
      return { message: "MCP client not configured." };
    }

    return {
      message: "MCP action routing not yet implemented. Please create a script for this action.",
    };
  }

  /**
   * Handle disambiguation
   */
  private handleDisambiguation(matches: IntentMatch[]): RouterResponse {
    const options = matches.slice(0, 3);
    const scriptOptions = options
      .filter(m => m.type === 'script')
      .map((m, i) => {
        const script = this.scriptStorage.getById(m.scriptId!);
        return `${i + 1}. ${script?.name} (${script?.description})`;
      });

    return {
      message: `I found a couple options — did you mean:\n${scriptOptions.join('\n')}`,
      requiresUserInput: true,
    };
  }

  /**
   * Handle general assistant queries
   */
  private handleGeneralAssistant(input: string): RouterResponse {
    // Simple pattern matching for common requests
    const lower = input.toLowerCase();

    if (lower.includes('remind')) {
      return {
        message: "I've noted that! (Note: reminders only work while the app is open in this version.)",
      };
    }

    if (lower.includes('hello') || lower.includes('hi')) {
      return {
        message: "Hello! I can help you run scripts and automations. What would you like to do?",
      };
    }

    return {
      message: "I'm not sure how to help with that. You can create a custom script for this task if you'd like.",
    };
  }

  /**
   * Format execution result for display
   */
  private formatResult(result: any): string {
    if (typeof result === 'string') {
      return result;
    }
    if (typeof result === 'number') {
      return result.toString();
    }
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  }
}
