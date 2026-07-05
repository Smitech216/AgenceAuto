-- ═══════════════════════════════════════════════════════════════════════
-- SQL COMPLÉMENTAIRE — à coller APRÈS le SQL du PDF (SQL Editor Supabase)
-- ═══════════════════════════════════════════════════════════════════════
-- Le webhook Stripe écrit les valeurs : 'active', 'past_due', 'canceled'
-- dans subscription_status. On ajoute une contrainte CHECK pour éviter
-- les valeurs invalides, et un index pour accélérer les recherches du
-- webhook par stripe_customer_id.

ALTER TABLE public.profiles
  ADD CONSTRAINT subscription_status_check
  CHECK (subscription_status IN ('trial','active','past_due','canceled'));

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id);
