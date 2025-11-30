/**
 * Intent classifier using embedding similarity and keyword matching
 */

import { Script } from '../scripts/types';
import { IntentMatch, IntentClassificationResult } from './types';

export class IntentClassifier {
  private scripts: Script[] = [];
  private mcpActionVerbs = ['fetch', 'query', 'submit', 'get', 'post', 'retrieve'];

  /**
   * Update the classifier with current scripts
   */
  updateScripts(scripts: Script[]): void {
    this.scripts = scripts;
  }

  /**
   * Classify user input and return potential matches
   */
  classify(input: string): IntentClassificationResult {
    const normalizedInput = input.toLowerCase().trim();

    // Handle empty input
    if (normalizedInput === '') {
      return {
        matches: [],
        topMatch: null,
        requiresDisambiguation: false,
      };
    }

    const matches: IntentMatch[] = [];

    // 1. Check for script matches
    for (const script of this.scripts) {
      const confidence = this.computeScriptConfidence(normalizedInput, script);
      if (confidence > 0.3) {  // Only include matches above threshold
        matches.push({
          type: 'script',
          confidence,
          scriptId: script.id,
        });
      }
    }

    // 2. Check for MCP action matches
    const mcpConfidence = this.computeMCPConfidence(normalizedInput);
    if (mcpConfidence > 0.5) {
      matches.push({
        type: 'mcp',
        confidence: mcpConfidence,
        mcpAction: this.extractMCPAction(normalizedInput),
      });
    }

    // 3. Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // 4. Determine top match and if disambiguation is needed
    const topMatch = matches[0] || null;
    const requiresDisambiguation =
      matches.length >= 2 &&
      Math.abs(matches[0].confidence - matches[1].confidence) < 0.1;

    return {
      matches,
      topMatch,
      requiresDisambiguation,
    };
  }

  /**
   * Compute confidence score for a script match
   * Uses a simplified embedding similarity approach based on word overlap
   */
  private computeScriptConfidence(input: string, script: Script): number {
    let maxScore = 0;

    // Check trigger phrases
    for (const phrase of script.triggerPhrases) {
      const score = this.computeSimilarity(input, phrase.toLowerCase());
      maxScore = Math.max(maxScore, score);
    }

    // Check description
    const descScore = this.computeSimilarity(input, script.description.toLowerCase());
    maxScore = Math.max(maxScore, descScore * 0.8);  // Weight description lower

    // Boost for exact tag matches
    for (const tag of script.tags) {
      if (input.includes(tag.toLowerCase())) {
        maxScore = Math.min(1.0, maxScore + 0.2);
      }
    }

    return maxScore;
  }

  /**
   * Compute similarity between two strings using word overlap
   * This is a simplified version. For production, use actual embeddings.
   */
  private computeSimilarity(str1: string, str2: string): number {
    // Exact match
    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;

    // Filter out numbers from word comparison
    const filterNumbers = (words: string[]) => words.filter(w => !/^\d+\.?\d*$/.test(w));

    // Word overlap (excluding numbers)
    const words1 = filterNumbers(str1.split(/\s+/));
    const words2 = filterNumbers(str2.split(/\s+/));

    // Check for prefix matches (e.g., "insul" matches "insulin")
    let prefixScore = 0;
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1.startsWith(w2) || w2.startsWith(w1)) {
          prefixScore = Math.max(prefixScore, 0.85);
        }
      }
    }

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(w => set2.has(w)));
    const union = new Set([...words1, ...words2]);

    const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;

    // Return the higher of Jaccard or prefix score
    return Math.max(jaccardScore, prefixScore);
  }

  /**
   * Check if input indicates an MCP action
   */
  private computeMCPConfidence(input: string): number {
    let score = 0;

    for (const verb of this.mcpActionVerbs) {
      if (input.includes(verb)) {
        score += 0.6;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Extract MCP action from input
   */
  private extractMCPAction(input: string): string {
    for (const verb of this.mcpActionVerbs) {
      if (input.includes(verb)) {
        return verb;
      }
    }
    return 'unknown';
  }

  /**
   * Get top N matches
   */
  getTopMatches(input: string, n: number = 3): IntentMatch[] {
    const result = this.classify(input);
    return result.matches.slice(0, n);
  }
}
