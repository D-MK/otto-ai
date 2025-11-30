/**
 * AI Script Generator Service
 * Integrates with Gemini or Claude API to generate scripts
 */

import { GoogleGenAI } from '@google/genai';
import { EncryptionService } from './encryption';

export type AIProvider = 'gemini' | 'claude';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

export interface GeneratedScript {
  name: string;
  description: string;
  tags: string[];
  triggerPhrases: string[];
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    prompt: string;
  }>;
  executionType: 'local';
  code: string;
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are an expert at creating automation scripts. Generate a script based on the user's description.

The script should be returned as a JSON object with the following structure:
{
  "name": "Script Name",
  "description": "Brief description of what the script does",
  "tags": ["tag1", "tag2"],
  "triggerPhrases": ["phrase1", "phrase2", "phrase3"],
  "parameters": [
    {
      "name": "paramName",
      "type": "string|number|boolean|date",
      "required": true,
      "prompt": "What should I ask the user?"
    }
  ],
  "executionType": "local",
  "code": "JavaScript code that uses the parameters and returns a string result"
}

Important guidelines:
1. The code should be clean, sandboxed JavaScript that only uses Math, Date, and JSON globals
2. Parameters are available as variables in the code
3. The code MUST return a string (use return statement)
4. Create 3-4 relevant trigger phrases based on keywords from the user's description
5. Analyze the user's description for key concepts and add 2-4 relevant tags (e.g., "math", "finance", "time", "conversion", "calculation")
6. Look for keywords the user mentions and ensure trigger phrases include variations of those keywords
7. Keep parameter names simple and lowercase
8. The code should handle edge cases gracefully
9. Tags should be lowercase and relevant to the script's domain/purpose

Example code format:
const result = someCalculation;
return \`The result is \${result}\`;

Return ONLY the JSON object, no additional text or explanation.`;

export class AIScriptGenerator {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateScript(description: string): Promise<GeneratedScript> {
    if (this.config.provider === 'gemini') {
      return this.generateWithGemini(description);
    } else {
      return this.generateWithClaude(description);
    }
  }

  private async generateWithGemini(description: string): Promise<GeneratedScript> {
    const prompt = `${SYSTEM_PROMPT}\n\nUser request: ${description}`;

    // Initialize the Google GenAI client with the API key
    const ai = new GoogleGenAI({
      apiKey: this.config.apiKey,
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text;

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Gemini response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateWithClaude(description: string): Promise<GeneratedScript> {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPT}\n\nUser request: ${description}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  }

  static async saveConfig(config: AIConfig): Promise<void> {
    // Encrypt API key before storage
    const encryptedApiKey = await EncryptionService.encrypt(config.apiKey);
    const configToSave: AIConfig = {
      ...config,
      apiKey: encryptedApiKey,
    };
    localStorage.setItem('ai_config', JSON.stringify(configToSave));
  }

  static async loadConfig(): Promise<AIConfig | null> {
    const saved = localStorage.getItem('ai_config');
    if (!saved) return null;
    
    try {
      const config: AIConfig = JSON.parse(saved);
      
      // Decrypt API key if encrypted, or migrate if plaintext
      if (config.apiKey) {
        if (EncryptionService.isEncrypted(config.apiKey)) {
          const decrypted = await EncryptionService.decrypt(config.apiKey);
          if (decrypted === null) {
            // Check if it's password-encrypted and password is not set
            if (EncryptionService.isPasswordEncrypted(config.apiKey) && !EncryptionService.hasMasterPassword()) {
              console.warn('Password-encrypted key found but no password set. User needs to enter password.');
            } else {
              console.warn('Failed to decrypt API key. Device characteristics may have changed or password is incorrect.');
            }
            return null; // Force re-entry
          }
          config.apiKey = decrypted;
        } else {
          // Migrate: encrypt plaintext key
          const encrypted = await EncryptionService.encrypt(config.apiKey);
          config.apiKey = encrypted;
          localStorage.setItem('ai_config', JSON.stringify({ ...config, apiKey: encrypted }));
          // Return decrypted value for use
          const decrypted = await EncryptionService.decrypt(encrypted);
          if (decrypted) {
            config.apiKey = decrypted;
          }
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error loading AI config:', error);
      return null;
    }
  }

  static clearConfig(): void {
    localStorage.removeItem('ai_config');
  }
}
