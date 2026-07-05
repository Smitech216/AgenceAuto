// ═══════════════════════════════════════════════════════════════════════
// EDGE FUNCTION : create-checkout-session
// ═══════════════════════════════════════════════════════════════════════
// Rôle : reçoit un plan choisi par l'utilisateur (solo/agence/studio),
// crée une session de paiement Stripe Checkout, et renvoie l'URL/sessionId
// vers laquelle rediriger l'utilisateur.
//
// Appelée depuis app.js par : supabase.functions.invoke("create-checkout-session", ...)
//
// À DÉPLOYER AVEC :
//   supabase functions deploy create-checkout-session
//
// SECRETS REQUIS (à définir avec `supabase secrets set`) :
//   STRIPE_SECRET_KEY   → clé secrète Stripe (sk_test_... ou sk_live_...)
//   SUPABASE_URL         → auto-injecté par Supabase
//   SUPABASE_SERVICE_ROLE_KEY → auto-injecté par Supabase
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

// En-têtes CORS : nécessaires pour que le navigateur autorise l'appel
// depuis ton site (Vercel) vers cette fonction (Supabase).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Réponse aux requêtes préliminaires CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, userId, userEmail, successUrl, cancelUrl } = await req.json();

    if (!priceId || !userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "priceId, userId et userEmail sont requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Vérifie si l'utilisateur a déjà un stripe_customer_id ─────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // ── 2. Sinon, crée un nouveau client Stripe et le sauvegarde ─────────
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId }, // ← lien crucial pour le webhook
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // ── 3. Crée la session Stripe Checkout ───────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription", // abonnement récurrent (pas paiement unique)
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { supabase_user_id: userId }, // ← récupéré dans le webhook
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erreur create-checkout-session:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
