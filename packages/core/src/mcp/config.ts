/**
 * MCP client configuration types
 */

export type AuthType = 'none' | 'bearer' | 'api-key';

export interface MCPConfig {
  baseUrl: string;
  authType: AuthType;
  authToken?: string;
  timeout: number;
}

export interface MCPRequest {
  endpoint: string;
  method: 'GET' | 'POST';
  params?: Record<string, any>;
  body?: any;
  validateResponse?: any;  // JSONSchema for response validation
}

export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}
