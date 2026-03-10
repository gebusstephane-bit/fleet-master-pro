import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const SkipSchema = z.object({
  companyId: z.string().uuid(),
});

/**
 * POST /api/onboarding/skip
 * Permet de skipper l'onboarding (marque comme complété sans données)
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
    const validated = SkipSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      );
    }

    const { companyId } = validated.data;

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

    // Marquer comme complété (skip)
    const { error } = await supabase
      .from("companies")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (error) {
      console.error("Error skipping onboarding:", error);
      return NextResponse.json(
        { error: "Erreur" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, skipped: true });
  } catch (error) {
    console.error("Error in skip onboarding:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
