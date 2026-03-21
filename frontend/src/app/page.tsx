'use client';

import { useAuth } from '@/lib/useAuth';

export default function HomePage() {
  const ready = useAuth();
  if (!ready) return null;

  return (
    <div className="min-h-screen relative z-[1] pointer-events-none" />
  );
}
