export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MainContent } from "@/components/layout/main-content";
import { ClientLayout } from "./ClientLayout";
import { getUserWithCompany } from "@/lib/supabase/server";
import { RegulatoryAssistant } from "@/components/ai/RegulatoryAssistant";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { SupportWidget } from "@/components/support/SupportWidget";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FleetMaster Pro",
  description: "Gestion de flotte premium",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Récupérer l'utilisateur côté serveur
  const user = await getUserWithCompany();
  
  // Rediriger vers login si pas authentifié
  if (!user) {
    redirect("/login");
  }

  // Vérifier si l'utilisateur est en période d'essai
  const isTrialing = user.companies?.subscription_status === 'TRIALING';
  const trialEndsAt = user.companies?.trial_ends_at;

  return (
    <ClientLayout user={user as any}>
      <div className={`${inter.variable} font-sans min-h-screen bg-[#0a0f1a] relative`}>
        {isTrialing && trialEndsAt && (
          <TrialBanner 
            trialEndsAt={trialEndsAt} 
            companyId={user.companies?.id || ''} 
          />
        )}
        <Sidebar user={user as any} />
        <Header user={user as any} />
        <MainContent>
          {children}
        </MainContent>
        <RegulatoryAssistant plan={(user as any)?.companies?.subscription_plan || 'essential'} />
        <SupportWidget />
      </div>
    </ClientLayout>
  );
}
