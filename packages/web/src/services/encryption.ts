/**
 * Encryption Service
 * Provides device-specific or password-based encryption for API keys using Web Crypto API
 * If master password is set, uses password-based encryption (works across devices)
 * Otherwise, uses device-specific encryption (seamless but device-bound)
 */

const ENCRYPTION_PREFIX = 'encrypted:';
const PASSWORD_ENCRYPTION_PREFIX = 'encrypted:password:';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits

const PASSWORD_STORAGE_KEY = 'encryption_password';

interface EncryptedData {
  data: string; // base64 encoded ciphertext
  iv: string; // base64 encoded IV
  salt: string; // base64 encoded salt
}

/**
 * Get device fingerprint from browser characteristics
 */
function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
  ];
  return parts.join('|');
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key from device fingerprint using PBKDF2
 */
async function deriveKeyFromFingerprint(fingerprint: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import fingerprint as key material
  const fingerprintKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(fingerprint),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    fingerprintKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate random IV
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Base64 encode Uint8Array
 */
function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Base64 decode to Uint8Array
 */
function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  return new Uint8Array(binary.split('').map((char) => char.charCodeAt(0)));
}

export class EncryptionService {
  /**
   * Set master password (stored in sessionStorage, cleared on browser close)
   */
  static setMasterPassword(password: string): void {
    sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
  }

  /**
   * Check if master password is set
   */
  static hasMasterPassword(): boolean {
    return !!sessionStorage.getItem(PASSWORD_STORAGE_KEY);
  }

  /**
   * Get master password (if set)
   */
  static getMasterPassword(): string | null {
    return sessionStorage.getItem(PASSWORD_STORAGE_KEY);
  }

  /**
   * Clear master password from session
   */
  static clearMasterPassword(): void {
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
  }

  /**
   * Check if a string is encrypted (has encryption marker)
   */
  static isEncrypted(data: string): boolean {
    return data.startsWith(ENCRYPTION_PREFIX) || data.startsWith(PASSWORD_ENCRYPTION_PREFIX);
  }

  /**
   * Check if data is password-encrypted
   */
  static isPasswordEncrypted(data: string): boolean {
    return data.startsWith(PASSWORD_ENCRYPTION_PREFIX);
  }

  /**
   * Encrypt plaintext using password-based encryption
   */
  private static async encryptWithPassword(plaintext: string, password: string): Promise<string> {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKeyFromPassword(password, salt);

    // Encrypt the data
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Package encrypted data
    const encryptedData: EncryptedData = {
      data: base64Encode(new Uint8Array(ciphertext)),
      iv: base64Encode(iv),
      salt: base64Encode(salt),
    };

    // Return with password prefix
    return PASSWORD_ENCRYPTION_PREFIX + JSON.stringify(encryptedData);
  }

  /**
   * Decrypt ciphertext using password-based encryption
   */
  private static async decryptWithPassword(ciphertext: string, password: string): Promise<string | null> {
    try {
      // Remove prefix and parse
      const encryptedJson = ciphertext.substring(PASSWORD_ENCRYPTION_PREFIX.length);
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);

      const salt = base64Decode(encryptedData.salt);
      const iv = base64Decode(encryptedData.iv);
      const key = await deriveKeyFromPassword(password, salt);

      // Decrypt the data
      const ciphertextBytes = base64Decode(encryptedData.data);
      const plaintextBytes = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertextBytes
      );

      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      console.error('Password decryption failed:', error);
      return null;
    }
  }

  /**
   * Encrypt plaintext using device-specific encryption
   */
  private static async encryptWithDeviceFingerprint(plaintext: string): Promise<string> {
    const fingerprint = getDeviceFingerprint();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKeyFromFingerprint(fingerprint, salt);

    // Encrypt the data
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Package encrypted data
    const encryptedData: EncryptedData = {
      data: base64Encode(new Uint8Array(ciphertext)),
      iv: base64Encode(iv),
      salt: base64Encode(salt),
    };

    // Return with standard prefix
    return ENCRYPTION_PREFIX + JSON.stringify(encryptedData);
  }

  /**
   * Decrypt ciphertext using device-specific encryption
   */
  private static async decryptWithDeviceFingerprint(ciphertext: string): Promise<string | null> {
    try {
      // Remove prefix and parse
      const encryptedJson = ciphertext.substring(ENCRYPTION_PREFIX.length);
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);

      const fingerprint = getDeviceFingerprint();
      const salt = base64Decode(encryptedData.salt);
      const iv = base64Decode(encryptedData.iv);
      const key = await deriveKeyFromFingerprint(fingerprint, salt);

      // Decrypt the data
      const ciphertextBytes = base64Decode(encryptedData.data);
      const plaintextBytes = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertextBytes
      );

      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      console.error('Device fingerprint decryption failed:', error);
      return null;
    }
  }

  /**
   * Encrypt plaintext - uses password if available, otherwise device fingerprint
   */
  static async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return plaintext;
    }

    try {
      const password = this.getMasterPassword();
      
      if (password) {
        // Use password-based encryption
        return this.encryptWithPassword(plaintext, password);
      } else {
        // Use device-specific encryption
        return this.encryptWithDeviceFingerprint(plaintext);
      }
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback: return plaintext with warning
      console.warn('Falling back to plaintext storage due to encryption failure');
      return plaintext;
    }
  }

  /**
   * Decrypt ciphertext - tries password first, then device fingerprint
   */
  static async decrypt(ciphertext: string): Promise<string | null> {
    if (!ciphertext) {
      return ciphertext;
    }

    // If not encrypted, return as-is (for migration)
    if (!this.isEncrypted(ciphertext)) {
      return ciphertext;
    }

    // Try password-based decryption first
    const password = this.getMasterPassword();
    if (password && this.isPasswordEncrypted(ciphertext)) {
      const result = await this.decryptWithPassword(ciphertext, password);
      if (result !== null) {
        return result;
      }
      // Password decryption failed - might be wrong password
      console.warn('Password decryption failed. Please verify your master password.');
      return null;
    }

    // Try device-specific decryption
    if (!this.isPasswordEncrypted(ciphertext)) {
      const result = await this.decryptWithDeviceFingerprint(ciphertext);
      if (result !== null) {
        return result;
      }
    }

    // Both methods failed
    console.warn(
      'Failed to decrypt API key. This may happen if device characteristics changed or password is incorrect. Please re-enter your API key.'
    );
    return null;
  }

  /**
   * Re-encrypt data with current encryption method (password or device)
   * Used when user sets/changes password
   */
  static async reencrypt(ciphertext: string): Promise<string | null> {
    if (!ciphertext || !this.isEncrypted(ciphertext)) {
      return ciphertext;
    }

    // Decrypt first
    const decrypted = await this.decrypt(ciphertext);
    if (decrypted === null) {
      return null;
    }

    // Re-encrypt with current method
    return this.encrypt(decrypted);
  }

  /**
   * Encrypt a value if it's not already encrypted
   * Used for migration from plaintext to encrypted
   */
  static async encryptIfNeeded(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    if (this.isEncrypted(value)) {
      return value; // Already encrypted
    }

    return this.encrypt(value);
  }
}
