/**
 * Supabase Authentication Service
 */

import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { getBaseUrl, getUrl } from '../utils/url';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class SupabaseAuthService {
  private client: SupabaseClient | null = null;
  private supabaseUrl: string = '';
  private supabaseKey: string = '';

  constructor(url?: string, key?: string) {
    if (url && key) {
      this.configure(url, key);
    }
  }

  configure(url: string, key: string): void {
    this.supabaseUrl = url;
    this.supabaseKey = key;
    this.client = createClient(url, key);
  }

  isConfigured(): boolean {
    return this.client !== null && this.supabaseUrl !== '' && this.supabaseKey !== '';
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    if (!this.client) {
      return { user: null, error: new Error('Supabase not configured') as AuthError };
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error };
    }

    if (!data.user) {
      return { user: null, error: new Error('User creation failed') as AuthError };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        createdAt: data.user.created_at,
      },
      error: null,
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ session: AuthSession | null; error: AuthError | null }> {
    if (!this.client) {
      return { session: null, error: new Error('Supabase not configured') as AuthError };
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { session: null, error };
    }

    if (!data.session || !data.user) {
      return { session: null, error: new Error('Sign in failed') as AuthError };
    }

    return {
      session: {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          createdAt: data.user.created_at,
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
      },
      error: null,
    };
  }

  /**
   * Sign in with GitHub OAuth
   */
  async signInWithGitHub(): Promise<{ error: AuthError | null }> {
    if (!this.client) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: getUrl('/'),
      },
    });

    return { error };
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    if (!this.client) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    const { error } = await this.client.auth.signOut();
    return { error };
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    if (!this.client) {
      return null;
    }

    const { data } = await this.client.auth.getSession();

    if (!data.session) {
      return null;
    }

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email || '',
        createdAt: data.session.user.created_at,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at || 0,
    };
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.client) {
      return null;
    }

    const { data } = await this.client.auth.getUser();

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      createdAt: data.user.created_at,
    };
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    if (!this.client) {
      return () => {};
    }

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        callback({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            createdAt: session.user.created_at,
          },
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });
      } else {
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  /**
   * Reset password (send email)
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    if (!this.client) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: getUrl('/reset-password'),
    });

    return { error };
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    if (!this.client) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    const { error } = await this.client.auth.updateUser({
      password: newPassword,
    });

    return { error };
  }

  /**
   * Get Supabase client for direct access
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }
}

// Singleton instance
let authServiceInstance: SupabaseAuthService | null = null;

export const getAuthService = (): SupabaseAuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new SupabaseAuthService();
  }
  return authServiceInstance;
};
