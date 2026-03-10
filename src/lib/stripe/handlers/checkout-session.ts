/**
 * Handlers Stripe — checkout.session.completed
 * - handleNewRegistration   : création compte après première souscription
 * - handleSubscriptionUpdate : mise à jour abonnement (upgrade depuis session)
 */

import { randomBytes } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe";
import { logger } from "@/lib/logger";
import { PlanType } from "@/lib/plans";
import { WEBHOOK_PLAN_LIMITS } from "@/lib/stripe/webhook-utils";

export async function handleNewRegistration(
  supabase: ReturnType<typeof createAdminClient>,
  session: import("stripe").Stripe.Checkout.Session
) {
  let planType: PlanType = "ESSENTIAL"; // défaut en dehors du try pour être accessible dans le catch

  try {
    // Récupérer la subscription pour avoir les métadonnées complètes
    const stripeSubscriptionId = session.subscription as string;
    let subscriptionMetadata: Record<string, string | null | undefined> = {};
    planType = "ESSENTIAL"; // Reset à la valeur par défaut

    if (stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        subscriptionMetadata = subscription.metadata || {};
        planType =
          ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) ||
          "ESSENTIAL";
      } catch (e) {
        logger.error(
          "Erreur récupération subscription",
          e instanceof Error ? e : new Error(String(e))
        );
        // Fallback sur session.metadata
        subscriptionMetadata = session.metadata || {};
        planType =
          ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) ||
          "ESSENTIAL";
      }
    } else {
      subscriptionMetadata = session.metadata || {};
      planType =
        ((subscriptionMetadata.plan_type as string)?.toUpperCase() as PlanType) ||
        "ESSENTIAL";
    }

    const email = subscriptionMetadata.email || session.customer_details?.email;
    const companyName = subscriptionMetadata.company_name;
    const siret = subscriptionMetadata.siret || "";
    const firstName = subscriptionMetadata.first_name || "";
    const lastName = subscriptionMetadata.last_name || "";
    const phone = subscriptionMetadata.phone || "";

    // RGPD : Récupérer le setup_token (pas le mot de passe!)
    const setupToken = subscriptionMetadata.setup_token;

    // Utiliser planType (qui est maintenant en majuscule) pour PLAN_LIMITS
    const plan = planType;

    if (!email || !companyName) {
      logger.error("Missing required metadata for registration");
      logger.error("Metadata reçues", {
        email: !!email,
        companyName: !!companyName,
        setupToken: !!setupToken,
      });
      return;
    }

    // Vérifier si l'utilisateur existe déjà (éviter les doublons - double sécurité)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingProfile) {
      logger.info("User already exists, skipping creation");
      return;
    }

    // ============================================================================
    // RGPD : Récupération sécurisée via setup_token
    // ============================================================================

    let passwordToUse = randomBytes(32).toString("hex"); // Valeur par défaut
    let tokenValid = false;
    let pendingReg: any = null;

    if (setupToken) {
      // Chercher le token dans pending_registrations
      const { data: pending, error: findError } = await (supabase
        .from("pending_registrations" as any) as any)
        .select("*")
        .eq("setup_token", setupToken)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (findError || !pending) {
        logger.error("Token invalide, expiré ou déjà utilisé", {
          setupToken: setupToken?.substring(0, 8) + "...",
        });
        logger.error("Détails token", { message: findError?.message });
        // Token invalide - on continue avec un mot de passe aléatoire (voir ci-dessous)
      } else {
        tokenValid = true;
        pendingReg = pending;
        passwordToUse = pending.password_hash;
        // Token valide trouvé, données récupérées localement
      }
    }

    // Si token invalide ou manquant, on garde le mot de passe aléatoire généré ci-dessus

    // 1. CRÉER L'UTILISATEUR SUPABASE AUTH
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: passwordToUse,
      email_confirm: true, // Email déjà vérifié par Stripe
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        plan: plan,
      },
    });

    if (authError || !authData.user) {
      logger.error(
        "Error creating user",
        authError instanceof Error ? authError : new Error(String(authError))
      );
      throw authError;
    }

    const userId = authData.user.id;

    // Si token valide, marquer comme utilisé
    if (tokenValid && pendingReg) {
      const { error: updateError } = await supabase
        .from("pending_registrations" as any)
        .update({
          used: true,
          user_id: userId,
          used_at: new Date().toISOString(),
        })
        .eq("id", pendingReg.id);

      if (updateError) {
        // Erreur mise à jour token (non bloquant)
        logger.error("Erreur mise à jour token", { message: updateError.message });
      }
    }

    // 2. CRÉER L'ENTREPRISE AVEC STATUT ACTIF
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        siret,
        address: "",
        postal_code: "",
        city: "",
        country: "France",
        phone,
        email,
        subscription_plan: plan.toLowerCase(),
        subscription_status: "active", // ✅ ACTIF car paiement réussi
        max_vehicles: WEBHOOK_PLAN_LIMITS[plan]?.maxVehicles || 3,
        max_drivers: WEBHOOK_PLAN_LIMITS[plan]?.maxDrivers || 2,
        stripe_customer_id: session.customer as string,
      })
      .select()
      .single();

    if (companyError) {
      // Rollback : supprimer l'utilisateur
      await supabase.auth.admin.deleteUser(userId);
      logger.error(
        "Error creating company",
        companyError instanceof Error ? companyError : new Error(String(companyError))
      );
      throw companyError;
    }

    // 3. CRÉER LE PROFIL
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "ADMIN",
      company_id: company.id,
    });

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from("companies").delete().eq("id", company.id);
      logger.error(
        "Error creating profile",
        profileError instanceof Error ? profileError : new Error(String(profileError))
      );
      throw profileError;
    }

    // 4. CRÉER L'ABONNEMENT
    if (stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const subData = subscription as unknown as import("stripe").Stripe.Subscription;

      await supabase.from("subscriptions").insert({
        company_id: company.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: subData.items.data[0].price.id,
        plan: plan,
        status: "ACTIVE",
        current_period_start: new Date(
          (subData as unknown as { current_period_start: number }).current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          (subData as unknown as { current_period_end: number }).current_period_end * 1000
        ).toISOString(),
        vehicle_limit: WEBHOOK_PLAN_LIMITS[plan]?.maxVehicles || 3,
        user_limit: WEBHOOK_PLAN_LIMITS[plan]?.maxDrivers || 2,
        features: WEBHOOK_PLAN_LIMITS[plan]?.features || [],
        trial_ends_at: subData.trial_end
          ? new Date(subData.trial_end * 1000).toISOString()
          : null,
      });
    }

    // 5. ENVOYER EMAIL DE BIENVENUE (ou récupération si token expiré)
    try {
      if (!tokenValid) {
        // Token expiré : envoyer email avec lien de récupération de mot de passe
        // Envoi email récupération (token expiré)

        const { data: recoveryData, error: recoveryError } =
          await supabase.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            },
          });

        if (recoveryError) {
          logger.error(
            "Erreur génération lien récupération",
            recoveryError instanceof Error
              ? recoveryError
              : new Error(String(recoveryError))
          );
        } else {
          // Envoyer l'email de récupération
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email,
                companyName: companyName,
                recoveryLink: recoveryData.properties.action_link,
                isRecovery: true, // Flag pour template email différent
                reason:
                  "Votre session de paiement a expiré. Veuillez définir votre mot de passe pour accéder à votre compte.",
              }),
            });
            // Email de récupération envoyé
          } catch (emailError) {
            console.error(
              "Erreur envoi email récupération:",
              emailError instanceof Error ? emailError.message : String(emailError)
            );
          }
        }
      } else {
        // Cas normal : envoyer magic link pour connexion sans mot de passe
        const { data: linkData, error: linkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: email,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            },
          });

        if (linkError) {
          logger.error(
            "Erreur génération magic link",
            linkError instanceof Error ? linkError : new Error(String(linkError))
          );
        } else {
          // Envoyer l'email via votre service
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email,
                companyName: companyName,
                magicLink: linkData.properties.action_link,
              }),
            });
          } catch (emailError) {
            logger.error(
              "Erreur envoi email",
              emailError instanceof Error ? emailError : new Error(String(emailError))
            );
          }

          logger.info("Magic link généré");
        }
      }
    } catch (magicLinkError) {
      logger.error(
        "Erreur lors de la génération du magic link",
        magicLinkError instanceof Error
          ? magicLinkError
          : new Error(String(magicLinkError))
      );
    }

    // User created after payment successfully

    // 6. LOGGING SÉCURISÉ (sans données sensibles)
    if (!tokenValid) {
      // Log pour suivi des cas où le token était expiré
      await supabase.from("webhook_errors").insert({
        event_type: "checkout.session.completed",
        error: JSON.stringify({
          warning: "Token expired or invalid - Recovery email sent",
          email_domain: email.split("@")[1], // uniquement le domaine pour privacy
        }),
        metadata: {
          setup_token_present: !!setupToken,
          plan: plan,
        },
      });
    }
  } catch (error) {
    logger.error(
      "Failed to create user after payment",
      error instanceof Error ? error : new Error(String(error))
    );
    // Logger l'erreur pour intervention manuelle (sans données sensibles)
    await supabase.from("webhook_errors").insert({
      event_type: "checkout.session.completed",
      error: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        step: "handleNewRegistration",
      }),
      metadata: {
        plan_type: planType,
      },
    });
  }
}

export async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  session: import("stripe").Stripe.Checkout.Session
) {
  // Logique pour les upgrades existants - IDEMPOTENT par design (UPSERT)
  const companyId = session.metadata?.company_id;
  const plan = session.metadata?.plan as PlanType;

  if (!companyId || !plan) {
    logger.error("Missing metadata for subscription update");
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const subData = subscription as unknown as import("stripe").Stripe.Subscription;

  // UPSERT = idempotent (même résultat si appelé plusieurs fois)
  await supabase.from("subscriptions").upsert(
    {
      company_id: companyId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_price_id: subData.items.data[0].price.id,
      plan: plan,
      status: "ACTIVE",
      current_period_start: new Date(
        (subData as unknown as { current_period_start: number }).current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        (subData as unknown as { current_period_end: number }).current_period_end * 1000
      ).toISOString(),
      vehicle_limit: WEBHOOK_PLAN_LIMITS[plan]?.maxVehicles || 3,
      user_limit: WEBHOOK_PLAN_LIMITS[plan]?.maxDrivers || 2,
      features: WEBHOOK_PLAN_LIMITS[plan]?.features || [],
    },
    {
      onConflict: "company_id",
    }
  );

  // Mettre à jour le statut de l'entreprise
  await supabase
    .from("companies")
    .update({
      subscription_plan: plan.toLowerCase(),
      subscription_status: "active",
      max_vehicles: WEBHOOK_PLAN_LIMITS[plan]?.maxVehicles || 3,
      max_drivers: WEBHOOK_PLAN_LIMITS[plan]?.maxDrivers || 2,
    })
    .eq("id", companyId);

  // Subscription updated
}
