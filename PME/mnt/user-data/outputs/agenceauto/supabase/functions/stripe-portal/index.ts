// ═══════════════════════════════════════════════════════════════════════
// EDGE FUNCTION : stripe-portal
// ═══════════════════════════════════════════════════════════════════════
// Rôle : crée un lien vers le "Customer Portal" Stripe, où l'utilisateur
// peut voir ses factures, changer de carte, changer de plan, ou résilier.
//
// Appelée depuis app.js par : supabase.functions.invoke("stripe-portal", ...)
//
// À DÉPLOYER AVEC :
//   supabase functions deploy stripe-portal
//
// PRÉREQUIS STRIPE :
//   Stripe → Settings → Billing → Customer Portal → Activer
//
// SECRETS REQUIS (identiques à create-checkout-session) :
//   STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId est requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupère le stripe_customer_id lié à ce profil
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (error || !profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Aucun abonnement Stripe trouvé pour cet utilisateur." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crée la session du portail client Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.get("origin") || "https://agenceauto.fr"}`,
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erreur stripe-portal:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
