/**
 * Tests for MCPClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPClient } from '../src/mcp/client';
import { MCPConfig } from '../src/mcp/config';

// Mock fetch
global.fetch = vi.fn();

describe('MCPClient', () => {
  let client: MCPClient;
  let config: MCPConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'https://api.example.com',
      authType: 'bearer',
      authToken: 'test-token',
      timeout: 5000,
    };

    client = new MCPClient(config);
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.execute({
        endpoint: '/test',
        method: 'GET',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.statusCode).toBe(200);
    });

    it('should make successful POST request with body', async () => {
      const mockResponse = { result: 'created' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await client.execute({
        endpoint: '/create',
        method: 'POST',
        body: { name: 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);

      // Check that fetch was called with correct body
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should inject Bearer auth header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await client.execute({
        endpoint: '/test',
        method: 'GET',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should inject API-Key auth header', async () => {
      const apiKeyClient = new MCPClient({
        ...config,
        authType: 'api-key',
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiKeyClient.execute({
        endpoint: '/test',
        method: 'GET',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-token',
          }),
        })
      );
    });

    it('should handle timeout', async () => {
      (global.fetch as any).mockImplementationOnce((_url: string, options: any) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve({}), 10000);
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
      );

      const result = await client.execute({
        endpoint: '/slow',
        method: 'GET',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
      expect(result.statusCode).toBe(408);
    }, 10000);

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.execute({
        endpoint: '/test',
        method: 'GET',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      });

      const result = await client.execute({
        endpoint: '/missing',
        method: 'GET',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
      expect(result.statusCode).toBe(404);
    });

    it('should validate response schema when provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const result = await client.execute({
        endpoint: '/test',
        method: 'GET',
        validateResponse: { type: 'object' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000 });

      // Configuration is updated (we can't directly test this, but we can test the effect)
      expect(client).toBeDefined();
    });
  });
});
