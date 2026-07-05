// ═══════════════════════════════════════════════════════════════════════
// EDGE FUNCTION : stripe-webhook
// ═══════════════════════════════════════════════════════════════════════
// Rôle : Stripe appelle CETTE fonction automatiquement à chaque événement
// (paiement réussi, abonnement annulé, échec de paiement...).
// C'est ELLE qui met à jour la table `profiles` dans Supabase.
//
// ⚠️ SANS CETTE FONCTION : un utilisateur peut payer sur Stripe, mais son
// plan ne sera JAMAIS mis à jour dans ta base de données. C'est la pièce
// la plus importante du système de paiement.
//
// À DÉPLOYER AVEC :
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   (--no-verify-jwt est OBLIGATOIRE : Stripe n'envoie pas de token Supabase)
//
// PUIS DANS STRIPE :
//   Developers → Webhooks → Add endpoint
//   URL : https://TON_PROJET.supabase.co/functions/v1/stripe-webhook
//   Événements à écouter :
//     - checkout.session.completed
//     - customer.subscription.updated
//     - customer.subscription.deleted
//     - invoice.payment_failed
//   → Copie le "Signing secret" (whsec_...) dans STRIPE_WEBHOOK_SECRET
//
// SECRETS REQUIS :
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Convertit un Price ID Stripe en nom de plan interne.
// ⚠️ À adapter avec TES vrais Price ID une fois créés dans Stripe.
function priceIdToPlan(priceId: string): string {
  const map: Record<string, string> = {
    "price_XXXXXXXXXXXX_SOLO":   "solo",
    "price_XXXXXXXXXXXX_AGENCE": "agence",
    "price_XXXXXXXXXXXX_STUDIO": "studio",
  };
  return map[priceId] || "solo";
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Signature manquante.", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Vérifie que l'événement vient bien de Stripe (sécurité anti-fraude)
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature webhook invalide :", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Paiement initial réussi (première souscription) ───────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;

        if (userId) {
          // Récupère le plan depuis la subscription Stripe
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const priceId = subscription.items.data[0]?.price.id;
          const plan = priceIdToPlan(priceId);

          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              plan: plan,
              subscription_status: "active",
            })
            .eq("id", userId);

          console.log(`✅ Abonnement activé : user ${userId} → plan ${plan}`);
        }
        break;
      }

      // ── Abonnement modifié (changement de plan, renouvellement) ───────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceIdToPlan(priceId);

        // Statut Stripe → statut interne
        const status = subscription.status === "active" ? "active"
          : subscription.status === "past_due" ? "past_due"
          : subscription.status === "canceled" ? "canceled"
          : subscription.status;

        await supabaseAdmin
          .from("profiles")
          .update({ plan, subscription_status: status })
          .eq("stripe_customer_id", customerId);

        console.log(`🔄 Abonnement mis à jour : customer ${customerId} → ${plan} (${status})`);
        break;
      }

      // ── Abonnement résilié / arrivé à expiration ───────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);

        console.log(`❌ Abonnement résilié : customer ${customerId}`);
        break;
      }

      // ── Échec de paiement (carte refusée, fonds insuffisants...) ──────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log(`⚠️ Paiement échoué : customer ${customerId}`);
        break;
      }

      default:
        console.log(`Événement non géré : ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Erreur traitement webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
