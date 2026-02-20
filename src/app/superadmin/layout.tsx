export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Layout SuperAdmin - Fleet Master Pro
 * Style dark mode professionnel (Vercel/Stripe Dashboard inspired)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SuperAdminSidebar } from '@/components/superadmin/sidebar';
import { SuperAdminHeader } from '@/components/superadmin/header';
import { getSuperadminEmail, isSuperadminEmail } from '@/lib/superadmin';

export const metadata = {
  title: 'SuperAdmin | Fleet Master Pro',
  description: 'Espace d\'administration Fleet Master Pro',
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification côté serveur (double sécurité avec le middleware)
  const supabase = await createClient();
  
  // Utiliser getUser() au lieu de getSession() pour plus de sécurité
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('🔐 Layout SuperAdmin:', { 
    hasUser: !!user, 
    email: user?.email,
    error: error?.message 
  });

  if (!user) {
    console.log('❌ Layout: Pas d\'utilisateur, redirect 404');
    redirect('/404');
  }

  // Utiliser l'utilitaire centralisé pour la vérification email (insensible à la casse)
  if (!isSuperadminEmail(user.email)) {
    console.log('❌ Layout: Email non autorisé:', user.email);
    redirect('/404');
  }

  console.log('✅ Layout: Accès SuperAdmin confirmé pour', user.email);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <SuperAdminSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Passer juste l'email (string sérialisable) */}
          <SuperAdminHeader email={user.email || ''} />
          
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
