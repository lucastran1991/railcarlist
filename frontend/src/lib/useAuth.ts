'use client';
import { useEffect, useState } from 'react';
import { isAuthenticated } from './auth';

export function useAuth() {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
    } else {
      setChecked(true);
    }
  }, []);
  return checked;
}
