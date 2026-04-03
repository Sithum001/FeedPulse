'use client';

import AuthGuard from '@/components/AuthGuard';
import { removeToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (
    <AuthGuard>
      <main style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#e8e8f0',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem' }}>
          ⚡ FeedPulse Dashboard
        </h1>
        <p style={{ color: '#7070a0' }}>
          You are logged in. Full dashboard coming Day 6.
        </p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: '1rem',
            padding: '0.6rem 1.5rem',
            background: 'transparent',
            border: '1px solid #1e1e2e',
            borderRadius: '8px',
            color: '#7070a0',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
          }}
        >
          Log out
        </button>
      </main>
    </AuthGuard>
  );
}