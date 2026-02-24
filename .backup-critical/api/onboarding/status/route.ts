import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/status
 * Retourne le statut d'onboarding de l'utilisateur courant
 */

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: "Pas d'entreprise associée" },
        { status: 404 }
      );
    }

    const { data: company } = await supabase
      .from("companies")
      .select("onboarding_completed, name")
      .eq("id", profile.company_id)
      .single();

    return NextResponse.json({
      companyId: profile.company_id,
      onboardingCompleted: company?.onboarding_completed || false,
      companyName: company?.name,
    });
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
