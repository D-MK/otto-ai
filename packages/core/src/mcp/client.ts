/**
 * MCP client for external API integration
 */

import { MCPConfig, MCPRequest, MCPResponse } from './config';

export class MCPClient {
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  /**
   * Execute an MCP request
   */
  async execute<T = any>(request: MCPRequest): Promise<MCPResponse<T>> {
    const url = this.buildUrl(request);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: request.method,
        headers: this.buildHeaders(request),
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: unknown = await response.json();

      // Validate response if schema provided
      if (request.validateResponse && !this.validateResponse(data, request.validateResponse)) {
        return {
          success: false,
          error: 'Response validation failed',
          statusCode: response.status,
        };
      }

      return {
        success: response.ok,
        data: response.ok ? (data as T) : undefined,
        error: response.ok ? undefined : this.extractErrorMessage(data, response.statusText),
        statusCode: response.status,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          statusCode: 408,
        };
      }

      return {
        success: false,
        error: error.message || 'Network error',
        statusCode: 0,
      };
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(request: MCPRequest): string {
    const url = new URL(request.endpoint, this.config.baseUrl);

    if (request.method === 'GET' && request.params) {
      Object.entries(request.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers including auth
   */
  private buildHeaders(_request: MCPRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication header
    if (this.config.authType === 'bearer' && this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    } else if (this.config.authType === 'api-key' && this.config.authToken) {
      headers['X-API-Key'] = this.config.authToken;
    }

    return headers;
  }

  /**
   * Basic JSON schema validation
   * For production, use a library like ajv
   */
  private validateResponse(data: any, schema: any): boolean {
    // Simplified validation - just check type
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      return actualType === schema.type;
    }
    return true;
  }

  /**
   * Normalize error messages coming from different APIs
   */
  private extractErrorMessage(data: unknown, fallback: string): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object' && 'error' in data) {
      const errorValue = (data as Record<string, unknown>).error;
      if (typeof errorValue === 'string') {
        return errorValue;
      }
    }

    return fallback;
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<MCPConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
