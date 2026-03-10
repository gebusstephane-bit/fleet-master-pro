import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { VehicleStepSchema } from "@/lib/onboarding/validation";

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/vehicle
 * Crée le premier véhicule (étape 3)
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
    const validated = VehicleStepSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validated.error.issues },
        { status: 400 }
      );
    }

    const {
      companyId,
      registrationNumber,
      brand,
      model,
      mileage,
    } = validated.data;

    // Vérifier l'appartenance à l'entreprise
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

    // Création du véhicule
    const { data: vehicle, error } = await (supabase as any)
      .from("vehicles")
      .insert({
        company_id: companyId as any,
        registration_number: registrationNumber,
        brand,
        model,
        mileage,
        status: "ACTIVE" as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating vehicle:", error);
      return NextResponse.json(
        { error: "Erreur création véhicule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, vehicleId: vehicle.id });
  } catch (error) {
    console.error("Error in vehicle onboarding:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
