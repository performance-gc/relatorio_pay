'use client';
// ============================================================================
// app/login/page.tsx — Tela de login SSO Google via Supabase
// ============================================================================

import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorParam   = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    auth_failed:    'Falha na autenticação. Tente novamente.',
    access_denied:  'Acesso negado pelo Google.',
  };
  const errorMsg = errorParam ? (errorMessages[errorParam] ?? 'Erro ao fazer login. Tente novamente.') : null;

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // O browser é redirecionado — não precisa setar loading false
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #142d4c, #1f4e79)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, Helvetica, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        textAlign: 'center',
      }}>
        {/* Logo / Título */}
        <div style={{
          width: '56px', height: '56px',
          background: 'linear-gradient(135deg, #142d4c, #1f4e79)',
          borderRadius: '16px',
          margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '24px' }}>💊</span>
        </div>

        <h1 style={{
          margin: '0 0 6px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#142d4c',
        }}>
          Central Farma
        </h1>
        <p style={{
          margin: '0 0 32px',
          fontSize: '14px',
          color: '#6b7280',
        }}>
          Painel Operacional — acesso restrito
        </p>

        {/* Erro */}
        {errorMsg && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '13px',
          }}>
            {errorMsg}
          </div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: loading ? '#f3f4f6' : 'white',
            border: '1.5px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            color: loading ? '#9ca3af' : '#1f2937',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all .15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          onMouseEnter={e => { if(!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
          onMouseLeave={e => { if(!loading) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
        >
          {/* Ícone Google SVG */}
          {loading ? (
            <span style={{ fontSize: '18px', animation: 'spin .7s linear infinite', display: 'inline-block' }}>↻</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Redirecionando…' : 'Entrar com Google'}
        </button>

        <p style={{
          marginTop: '24px',
          fontSize: '12px',
          color: '#9ca3af',
          lineHeight: '1.5',
        }}>
          Acesso restrito a colaboradores autorizados.<br />
          Use sua conta Google corporativa.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Suspense necessário por causa do useSearchParams no App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
