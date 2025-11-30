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
        {isLoading ? 'Logging in...' : 'Login'}
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
        {isLoading ? 'Creating account...' : 'Sign Up'}
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
