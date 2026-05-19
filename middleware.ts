// ============================================================================
// middleware.ts — protege /dashboard e /api/payments com Supabase Auth.
// BYPASS_AUTH=true desativa a guarda (somente DEV local).
// ============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Dev bypass — nunca habilitar em produção
  if (process.env.BYPASS_AUTH === 'true') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Valida sessão — NÃO usar getSession() aqui (não é seguro no middleware)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { pathname } = request.nextUrl;

    // Rotas de API retornam 401 JSON
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Não autenticado. Faça login para continuar.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Páginas redirecionam para /login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/(.*)', '/api/payments'],
};
