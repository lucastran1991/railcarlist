'use client';

import { useState, FormEvent } from 'react';
import { login } from '@/lib/auth';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));

    if (login(username, password)) {
      window.location.href = '/';
    } else {
      setError('Invalid username or password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(92,229,160,0.06)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(86,205,231,0.06)_0%,_transparent_50%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent,#5CE5A0)]/20 to-transparent" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[var(--color-accent,#5CE5A0)]/20">
            <Lock size={22} className="text-background" />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">Vopak Terminal</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 h-11 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#5CE5A0)]/50 focus:border-[var(--color-accent,#5CE5A0)]/30 transition text-sm"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 h-11 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#5CE5A0)]/50 focus:border-[var(--color-accent,#5CE5A0)]/30 transition text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    rememberMe
                      ? 'bg-[var(--color-accent,#5CE5A0)] border-[var(--color-accent,#5CE5A0)]'
                      : 'border-border group-hover:border-muted-foreground'
                  }`}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground/80 transition select-none">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-xs text-[var(--color-accent,#5CE5A0)] hover:underline transition">
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-[var(--color-danger,#E53E3E)] bg-[var(--color-danger,#E53E3E)]/10 rounded-lg p-3 text-sm border border-[var(--color-danger,#E53E3E)]/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 6.25a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-primary text-background font-semibold rounded-xl transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#5CE5A0)]/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Social logins */}
          <div className="grid grid-cols-3 gap-3">
            <button className="flex items-center justify-center h-11 rounded-xl border border-border bg-muted hover:bg-muted/80 transition group">
              <GoogleIcon />
            </button>
            <button className="flex items-center justify-center h-11 rounded-xl border border-border bg-muted hover:bg-muted/80 transition group">
              <MicrosoftIcon />
            </button>
            <button className="flex items-center justify-center h-11 rounded-xl border border-border bg-muted hover:bg-muted/80 transition group">
              <LinkedInIcon />
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-[11px] text-muted-foreground/60">
            By signing in, you agree to our{' '}
            <a href="#" className="text-muted-foreground hover:text-foreground transition underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-muted-foreground hover:text-foreground transition underline">Privacy Policy</a>
          </p>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Vopak Terminal Management System v1.0
        </p>
      </div>
    </div>
  );
}
