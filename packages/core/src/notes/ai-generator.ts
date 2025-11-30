/**
 * AI-powered note title and summary generation using Gemini
 */

import { AIGenerationResult } from './types';

export interface AIGenerator {
  generateTitleAndSummary(content: string): Promise<AIGenerationResult>;
}

export class GeminiNoteGenerator implements AIGenerator {
  private model: any; // GoogleGenerativeAI model

  constructor(_apiKey: string, geminiModel?: any) {
    this.model = geminiModel;
  }

  /**
   * Generate a concise title and summary for note content using Gemini
   */
  async generateTitleAndSummary(content: string): Promise<AIGenerationResult> {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    try {
      const prompt = `Analyze the following note content and generate:
1. A concise, descriptive title (max 60 characters)
2. A brief summary (max 150 characters)

Note content:
${content}

Return your response in this exact JSON format:
{
  "title": "Your concise title here",
  "summary": "Your brief summary here"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback: generate simple title and summary
        return this.generateFallback(content);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: this.truncate(parsed.title || 'Untitled Note', 60),
        summary: this.truncate(parsed.summary || '', 150),
      };
    } catch (error) {
      console.error('Failed to generate title and summary with Gemini:', error);
      return this.generateFallback(content);
    }
  }

  /**
   * Fallback method when AI generation fails
   */
  private generateFallback(content: string): AIGenerationResult {
    // Generate simple title from first line or first few words
    const firstLine = content.split('\n')[0].trim();
    const title = this.truncate(firstLine || 'Untitled Note', 60);

    // Generate simple summary from first sentence or paragraph
    const firstSentence = content.split(/[.!?]\s/)[0].trim();
    const summary = this.truncate(firstSentence, 150);

    return { title, summary };
  }

  /**
   * Truncate text to max length with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Create an AI generator instance
 */
export function createNoteAIGenerator(
  apiKey: string,
  geminiModel?: any
): AIGenerator {
  return new GeminiNoteGenerator(apiKey, geminiModel);
}
