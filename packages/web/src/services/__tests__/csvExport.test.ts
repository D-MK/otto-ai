/**
 * Tests for CSVExportService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CSVExportService } from '../csvExport';
import { Script } from '@otto-ai/core';

describe('CSVExportService', () => {
  const mockScript: Script = {
    id: 'test-id-1',
    name: 'Test Script',
    description: 'A test script',
    tags: ['test', 'example'],
    triggerPhrases: ['test script', 'run test'],
    parameters: [
      {
        name: 'value',
        type: 'number',
        required: true,
        prompt: 'Enter a value',
      },
    ],
    executionType: 'local',
    code: 'return params.value * 2;',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  };

  beforeEach(() => {
    // Mock document.createElement and related DOM methods
    global.document = {
      createElement: vi.fn(() => ({
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {},
        download: undefined,
      })) as any,
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      } as any,
    } as any;

    global.URL = {
      createObjectURL: vi.fn(() => 'blob:url'),
      revokeObjectURL: vi.fn(),
    } as any;

    global.Blob = vi.fn((parts, options) => ({
      parts,
      options,
    })) as any;
  });

  describe('exportToCSV', () => {
    it('should export scripts to CSV format', () => {
      const scripts: Script[] = [mockScript];
      const csv = CSVExportService.exportToCSV(scripts);

      expect(csv).toContain('ID,Name,Description');
      expect(csv).toContain('test-id-1');
      expect(csv).toContain('Test Script');
      expect(csv).toContain('A test script');
    });

    it('should handle empty scripts array', () => {
      const csv = CSVExportService.exportToCSV([]);

      expect(csv).toContain('ID,Name,Description');
      // Should only have header row
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
    });

    it('should escape special characters in CSV', () => {
      const scriptWithComma: Script = {
        ...mockScript,
        name: 'Script, with comma',
        description: 'Description with "quotes"',
      };

      const csv = CSVExportService.exportToCSV([scriptWithComma]);

      // Should properly escape commas and quotes
      expect(csv).toContain('"Script, with comma"');
      expect(csv).toContain('"Description with ""quotes"""');
    });

    it('should handle scripts with all execution types', () => {
      const scripts: Script[] = [
        { ...mockScript, executionType: 'local' },
        { ...mockScript, id: 'mcp-id', executionType: 'mcp', mcpEndpoint: '/api/test' },
        { ...mockScript, id: 'gemini-id', executionType: 'gemini-chat' },
      ];

      const csv = CSVExportService.exportToCSV(scripts);

      expect(csv).toContain('local');
      expect(csv).toContain('mcp');
      expect(csv).toContain('gemini-chat');
      expect(csv).toContain('/api/test');
    });

    it('should format dates correctly', () => {
      const csv = CSVExportService.exportToCSV([mockScript]);

      // Should contain ISO date format
      expect(csv).toContain('2024-01-01');
      expect(csv).toContain('2024-01-02');
    });

    it('should handle scripts with missing optional fields', () => {
      const minimalScript: Script = {
        id: 'minimal-id',
        name: 'Minimal Script',
        description: 'Minimal',
        tags: [],
        triggerPhrases: [],
        parameters: [],
        executionType: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const csv = CSVExportService.exportToCSV([minimalScript]);

      expect(csv).toContain('minimal-id');
      expect(csv).toContain('Minimal Script');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = CSVExportService.generateFilename();

      expect(filename).toMatch(/^otto-scripts_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
      expect(filename).toContain('otto-scripts');
    });
  });

  describe('downloadCSV', () => {
    it('should trigger download with default filename', () => {
      const scripts: Script[] = [mockScript];

      CSVExportService.downloadCSV(scripts);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalled();
    });

    it('should trigger download with custom filename', () => {
      const scripts: Script[] = [mockScript];
      const customFilename = 'custom-scripts.csv';

      CSVExportService.downloadCSV(scripts, customFilename);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
    });
  });
});

