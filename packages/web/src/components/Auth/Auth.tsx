/**
 * Authentication component for login and signup
 */

import React, { useState } from 'react';
import { getAuthService } from '../../services/supabaseAuth';
import './Auth.css';

interface AuthProps {
  onAuthSuccess: (userId: string, email: string) => void;
  onSkip?: () => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onSkip }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authService = getAuthService();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { session, error } = await authService.signIn(email, password);

      if (error) {
        setError(error.message);
        return;
      }

      if (session) {
        onAuthSuccess(session.user.id, session.user.email);
      } else {
        setError('Login failed - no session created');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await authService.signInWithGitHub();

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
      // Note: User will be redirected to GitHub, so we don't need to handle success here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { user, error } = await authService.signUp(email, password);

      if (error) {
        setError(error.message);
        return;
      }

      if (user) {
        setSuccessMessage('Account created! Please check your email to confirm your account, then log in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError('Signup failed - no user created');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { error } = await authService.resetPassword(email);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccessMessage('Password reset email sent! Check your inbox.');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="auth-form">
      <h2>Login to Otto AI</h2>
      <p className="auth-description">
        Sign in to sync your settings and scripts across devices
      </p>

      <button
        type="button"
        onClick={handleGitHubLogin}
        className="github-button"
        disabled={isLoading}
      >
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        {isLoading ? 'Connecting...' : 'Continue with GitHub'}
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <button type="submit" className="primary-button" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login with Email'}
      </button>

      <div className="auth-links">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="link-button"
          disabled={isLoading}
        >
          Don't have an account? Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode('reset')}
          className="link-button"
          disabled={isLoading}
        >
          Forgot password?
        </button>
      </div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="secondary-button skip-button"
          disabled={isLoading}
        >
          Skip for now
        </button>
      )}
    </form>
  );

  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="auth-form">
      <h2>Create Account</h2>
      <p className="auth-description">
        Sign up to sync your settings and scripts across devices
      </p>

      <button
        type="button"
        onClick={handleGitHubLogin}
        className="github-button"
        disabled={isLoading}
      >
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        {isLoading ? 'Connecting...' : 'Sign up with GitHub'}
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          required
          disabled={isLoading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <button type="submit" className="primary-button" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up with Email'}
      </button>

      <div className="auth-links">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="link-button"
          disabled={isLoading}
        >
          Already have an account? Login
        </button>
      </div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="secondary-button skip-button"
          disabled={isLoading}
        >
          Skip for now
        </button>
      )}
    </form>
  );

  const renderResetForm = () => (
    <form onSubmit={handleReset} className="auth-form">
      <h2>Reset Password</h2>
      <p className="auth-description">
        Enter your email to receive a password reset link
      </p>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isLoading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <button type="submit" className="primary-button" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>

      <div className="auth-links">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="link-button"
          disabled={isLoading}
        >
          Back to login
        </button>
      </div>
    </form>
  );

  return (
    <div className="auth-container">
      <div className="auth-box">
        {mode === 'login' && renderLoginForm()}
        {mode === 'signup' && renderSignupForm()}
        {mode === 'reset' && renderResetForm()}
      </div>
    </div>
  );
};

export default Auth;
