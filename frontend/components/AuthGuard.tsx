'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, verifyToken, removeToken } from '@/lib/auth';
import './AuthGuard.css';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      // Quick local check first
      if (!isLoggedIn()) {
        router.replace('/login');
        return;
      }

      // Verify with server that token is still valid
      const valid = await verifyToken();
      if (!valid) {
        removeToken();
        router.replace('/login');
        return;
      }

      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="auth-checking">
        <div className="auth-spinner" />
      </div>
    );
  }

  return <>{children}</>;
}