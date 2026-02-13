import { Metadata } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ClientLayout } from "./ClientLayout";
import { getUserWithCompany } from "@/lib/supabase/server";

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

  return (
    <ClientLayout user={user}>
      <div className={`${inter.variable} font-sans min-h-screen bg-[#09090b]`}>
        <Sidebar user={user} />
        <Header user={user} />
        <main className="pt-16 pl-20 min-h-screen bg-[#09090b] relative z-10">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ClientLayout>
  );
}
