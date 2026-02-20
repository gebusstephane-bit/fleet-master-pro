import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout Onboarding - Route Group isolé
 * Vérifie l'état d'onboarding et redirige si nécessaire
 */

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Vérifier auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer le profil avec company_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    // Pas de company - rediriger vers création (ou erreur)
    redirect("/login?error=no_company");
  }

  // Vérifier si onboarding déjà complété
  const { data: company } = await supabase
    .from("companies")
    .select("onboarding_completed, name")
    .eq("id", profile.company_id)
    .single();

  if (company?.onboarding_completed) {
    // Déjà complété - aller au dashboard
    redirect("/dashboard");
  }

  // Passer les données via les headers ou context (simplifié ici)
  return <>{children}</>;
}
