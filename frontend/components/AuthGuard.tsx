'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, verifyToken, removeToken } from '@/lib/auth';

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
        <style jsx>{`
          .auth-checking {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0f;
          }
          .auth-spinner {
            width: 32px; height: 32px;
            border: 3px solid #1e1e2e;
            border-top-color: #5b5bd6;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}