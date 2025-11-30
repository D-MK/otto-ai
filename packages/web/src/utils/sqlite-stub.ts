/**
 * Stub for better-sqlite3 to prevent import errors in browser
 */

export default class Database {
  constructor(_path: string) {
    throw new Error('better-sqlite3 is not available in browser. Use BrowserScriptStorage instead.');
  }
}
