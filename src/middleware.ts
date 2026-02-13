/**
 * Middleware Next.js pour FleetMaster Pro
 * Gère l'authentification et la protection des routes par rôle
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes publiques
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/auth/callback', '/unauthorized'];

// SUPERADMIN - Email hardcoded autorisé
const SUPERADMIN_EMAIL = 'contact@fleet-master.fr';

// Routes par rôle requis
const roleRoutes = {
  admin: ['/admin'],
  manager: ['/settings/users', '/settings/company'],
  operational: ['/inspection', '/maintenance/new', '/fuel'],
  all: ['/dashboard', '/vehicles', '/drivers', '/routes', '/agenda', '/maintenance', '/alerts', '/inspections', '/settings'],
};

// Logger conditionnel (uniquement en développement)
const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    }
  },
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // 🔐 SUPERADMIN PROTECTION (Hardcoded)
  // ============================================
  if (pathname.startsWith('/superadmin')) {
    const response = NextResponse.next();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.email?.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    return response;
  }

  // Routes publiques - laisser passer
  if (publicRoutes.some(route => pathname === route || pathname.startsWith('/api/auth'))) {
    return NextResponse.next();
  }

  // Vérifier la session
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Récupérer le rôle depuis les user_metadata OU depuis la base
  let userRole = user.user_metadata?.role;
  
  if (!userRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role) {
      userRole = profile.role;
    } else {
      userRole = 'ADMIN';
    }
  }
  
  // Vérifier les permissions par rôle pour certaines routes
  if (roleRoutes.admin.some(route => pathname.startsWith(route))) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  if (roleRoutes.manager.some(route => pathname.startsWith(route))) {
    if (!['ADMIN', 'DIRECTEUR'].includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  if (roleRoutes.operational.some(route => pathname.startsWith(route))) {
    if (userRole === 'EXPLOITANT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
