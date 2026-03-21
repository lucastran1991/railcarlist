'use client';

import { useState, FormEvent } from 'react';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(username, password)) {
      window.location.href = '/';
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(92,229,160,0.08)_0%,_transparent_70%)]" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Vopak Terminal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm text-foreground/70 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 h-12 bg-muted border border-border rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#5CE5A0] focus:border-transparent transition"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-foreground/70 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 h-12 bg-muted border border-border rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#5CE5A0] focus:border-transparent transition"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-red-400 bg-red-400/10 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-12 gradient-primary text-background font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#5CE5A0] focus:ring-offset-2 focus:ring-offset-background"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
