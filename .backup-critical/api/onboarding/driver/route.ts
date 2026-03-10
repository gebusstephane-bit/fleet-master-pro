import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DriverStepSchema } from "@/lib/onboarding/validation";

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/driver
 * Crée le premier chauffeur (étape 4 - optionnel)
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
    const validated = DriverStepSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { companyId, firstName, lastName, email, phone } = validated.data;

    // Vérifier l'appartenance
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id !== companyId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Création du chauffeur
    const { data: driver, error } = await (supabase as any)
      .from("drivers")
      .insert({
        company_id: companyId as any,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        status: "ACTIVE" as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating driver:", error);
      return NextResponse.json(
        { error: "Erreur création chauffeur" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, driverId: driver.id });
  } catch (error) {
    console.error("Error in driver onboarding:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
