import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CompanyStepSchema } from "@/lib/onboarding/validation";

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/company
 * Met à jour les informations de l'entreprise (étape 2)
 */

export async function POST(request: Request) {
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

    const body = await request.json();

    // Validation Zod
    const validated = CompanyStepSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { companyId, name, siret, fleetSize, industry } = validated.data;

    // Vérifier que l'utilisateur appartient bien à cette entreprise
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.company_id !== companyId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Mise à jour de l'entreprise
    const { error } = await supabase
      .from("companies")
      .update({
        name,
        siret,
        fleet_size: fleetSize,
        industry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (error) {
      console.error("Error updating company:", error);
      return NextResponse.json(
        { error: "Erreur mise à jour entreprise" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in company onboarding:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
