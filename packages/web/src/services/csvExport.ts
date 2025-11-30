/**
 * CSV Export utility for scripts
 */

import { Script } from '@otto-ai/core';

export class CSVExportService {
  /**
   * Escape CSV field value
   */
  private static escapeCSVField(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string
    let str = String(value);

    // If the value contains comma, newline, or double quote, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  /**
   * Convert array to JSON string for CSV
   */
  private static arrayToString(arr: any[]): string {
    if (!arr || arr.length === 0) {
      return '';
    }
    return JSON.stringify(arr);
  }

  /**
   * Format date for CSV
   */
  private static formatDate(date: Date | string): string {
    if (!date) {
      return '';
    }
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  }

  /**
   * Export scripts to CSV format
   */
  static exportToCSV(scripts: Script[]): string {
    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Description',
      'Tags',
      'Trigger Phrases',
      'Parameters',
      'Execution Type',
      'Code',
      'MCP Endpoint',
      'Created At',
      'Updated At',
    ];

    // Build CSV rows
    const rows: string[] = [];

    // Add header row
    rows.push(headers.map(this.escapeCSVField).join(','));

    // Add data rows
    for (const script of scripts) {
      const row = [
        script.id,
        script.name,
        script.description,
        this.arrayToString(script.tags || []),
        this.arrayToString(script.triggerPhrases || []),
        JSON.stringify(script.parameters || []),
        script.executionType,
        script.code || '',
        script.mcpEndpoint || '',
        this.formatDate(script.createdAt),
        this.formatDate(script.updatedAt),
      ];

      rows.push(row.map(this.escapeCSVField).join(','));
    }

    return rows.join('\n');
  }

  /**
   * Trigger download of CSV file
   */
  static downloadCSV(scripts: Script[], filename: string = 'otto-scripts.csv'): void {
    const csv = this.exportToCSV(scripts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      // Create a link and trigger download
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(): string {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');
    return `otto-scripts_${timestamp}.csv`;
  }
}
