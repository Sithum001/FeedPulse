'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, saveToken, isLoggedIn } from '@/lib/auth';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (isLoggedIn()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const { token } = await loginAdmin(email.trim(), password);
      saveToken(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-root">
      <div className="bg-grid" aria-hidden="true" />
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      <div className="login-container">
        {/* Logo */}
        <div className="logo-mark">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">FeedPulse</span>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Admin Login</h1>
            <p className="card-subtitle">
              Sign in to access the feedback dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="form">
            {/* Email */}
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="admin@feedpulse.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="error-banner">
                <span>⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn-submit" disabled={loading}>
              <span className="btn-inner">
                {loading ? (
                  <><span className="spinner" /> Signing in…</>
                ) : (
                  <>Sign In →</>
                )}
              </span>
            </button>
          </form>
        </div>

        <p className="back-link">
          <a href="/">← Back to feedback form</a>
        </p>
      </div>

    </main>
  );
}