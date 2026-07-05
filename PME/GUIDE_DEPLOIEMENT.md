# AgenceAuto — Guide de mise en ligne complet

Ce guide part de zéro et t'emmène jusqu'au site en ligne avec vrais comptes et vrais paiements. Suis les étapes **dans l'ordre**.

Fichiers fournis dans ce dossier :
```
agenceauto/
├── index.html
├── style.css
├── app.js
├── sql-complement.sql
└── supabase/
    └── functions/
        ├── create-checkout-session/index.ts
        ├── stripe-portal/index.ts
        └── stripe-webhook/index.ts
```

---

## ÉTAPE 1 — Supabase (base de données + connexion)

1. Va sur [supabase.com](https://supabase.com) → crée un compte (connexion GitHub conseillée).
2. **New project** → nom `agenceauto` → note bien le mot de passe généré → région West EU (Ireland) → **Create**. Attends ~2 min.
3. Menu gauche → **SQL Editor** → **New query** → colle le bloc SQL du PDF (tables `profiles`, `clients`, `quotes`, `invoices` + RLS + trigger) → **Run**.
4. Toujours dans SQL Editor → **New query** → colle le contenu de `sql-complement.sql` (fourni ici) → **Run**.
5. Menu gauche → ⚙️ **Settings → API** → note :
   - `Project URL` (ex: `https://xxxxx.supabase.co`)
   - `anon public` key (commence par `eyJ...`)
6. Ouvre `app.js` ligne 33-36 → remplace :
   ```js
   const SUPABASE_URL  = "https://xxxxx.supabase.co";
   const SUPABASE_ANON = "eyJ...";
   ```

✅ Test : ouvre `index.html` en local → inscris-toi → vérifie dans Supabase → **Table Editor → profiles** que la ligne apparaît.

---

## ÉTAPE 2 — Stripe (créer les produits)

1. Va sur [stripe.com](https://stripe.com) → crée un compte. Reste en **mode Test** (bouton en haut à droite).
2. **Produits** → **+ Ajouter un produit** → crée les 3 :
   - Solo — 29€/mois — récurrent
   - Agence — 79€/mois — récurrent
   - Studio — 199€/mois — récurrent
3. Pour chaque produit, ouvre-le et note le **Price ID** (`price_xxx...`).
4. **Développeurs → Clés API** → note la **Publishable key** (`pk_test_...`) et la **Secret key** (`sk_test_...`, ne la partage JAMAIS publiquement).
5. Ouvre `app.js` ligne 80-98 → remplace :
   ```js
   const STRIPE_PUBLIC_KEY = "pk_test_...";
   const STRIPE_PRICES = {
     solo:   "price_...",
     agence: "price_...",
     studio: "price_...",
   };
   ```
6. Ouvre `supabase/functions/stripe-webhook/index.ts` → dans `priceIdToPlan()`, remplace les 3 `price_XXXXXXXXXXXX_...` par tes vrais Price ID.

---

## ÉTAPE 3 — Installer la CLI Supabase (pour déployer les fonctions)

Dans un terminal :
```bash
npm install -g supabase
supabase login
```

Depuis le dossier `agenceauto/` :
```bash
supabase link --project-ref TON_PROJECT_REF
```
(`TON_PROJECT_REF` = la partie dans ton URL Supabase, ex: si l'URL est `https://abcxyz.supabase.co`, le ref est `abcxyz`)

---

## ÉTAPE 4 — Déployer les 3 Edge Functions

### 4.1 Définir les secrets (une seule fois)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```
`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà injectées automatiquement par Supabase — pas besoin de les définir.

### 4.2 Déployer create-checkout-session
```bash
supabase functions deploy create-checkout-session
```

### 4.3 Déployer stripe-portal
```bash
supabase functions deploy stripe-portal
```
Puis dans Stripe : **Settings → Billing → Customer Portal** → Activer.

### 4.4 Déployer stripe-webhook (⚠️ flag spécial obligatoire)
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```
> Le flag `--no-verify-jwt` est indispensable : Stripe n'envoie pas de token d'authentification Supabase, sans ce flag la fonction rejettera tous les appels de Stripe.

---

## ÉTAPE 5 — Brancher le webhook Stripe → Supabase

1. Stripe → **Développeurs → Webhooks → Add endpoint**.
2. URL à coller : `https://TON_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Sélectionne ces événements :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Une fois créé, Stripe affiche un **Signing secret** (`whsec_...`) → copie-le.
5. Dans le terminal :
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

✅ Test : Stripe → ton webhook → **Send test webhook** → choisis `checkout.session.completed` → vérifie dans Supabase → **Edge Functions → stripe-webhook → Logs** que ça répond `200`.

---

## ÉTAPE 6 — GitHub + Vercel (mise en ligne)

```bash
cd chemin/vers/agenceauto
git init
git add .
git commit -m "Premier commit AgenceAuto"
```

Sur [github.com](https://github.com) → **New repository** → nom `agenceauto` → **Create**.

```bash
git remote add origin https://github.com/TON_PSEUDO/agenceauto.git
git branch -M main
git push -u origin main
```

Sur [vercel.com](https://vercel.com) → **Add New Project** → connecte GitHub → sélectionne `agenceauto` → **Deploy**.

> ⚠️ Ce projet est en HTML/CSS/JS pur (pas de build), donc pas besoin de configurer de "Build Command" particulier dans Vercel — laisse les réglages par défaut ("Other" / aucun framework détecté).

Ton site est en ligne sur une URL `xxx.vercel.app` en ~2 minutes.

---

## ÉTAPE 7 — Mettre à jour les URLs de callback

Une fois ton URL Vercel connue (ou ton domaine perso branché), reviens dans :
- **Supabase → Authentication → URL Configuration** : ajoute ton URL Vercel dans "Site URL" et "Redirect URLs" (nécessaire pour que Google OAuth et les emails de confirmation redirigent au bon endroit).

---

## ÉTAPE 8 — Passer en production (quand tu es prêt)

1. Stripe → active ton compte (vérification d'identité KYC).
2. Bascule le toggle "Mode Test" → "Mode Live" dans Stripe.
3. Recrée les 3 produits en mode Live (les Price ID de test ne fonctionnent pas en live) → note les nouveaux `price_live_...`.
4. Remplace dans `app.js` : `pk_test_` → `pk_live_`, et les 3 Price ID.
5. Remplace le secret : `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`
6. Recrée le webhook en mode Live (Stripe sépare complètement test et live) → nouveau `whsec_...` → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
7. `git add . && git commit -m "Passage en production" && git push` → Vercel redéploie automatiquement.

---

## Vérifications finales avant d'annoncer le site publiquement

- [ ] Inscription + connexion email fonctionnent en réel (pas juste en mode démo)
- [ ] Un paiement test (carte `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC) passe et le plan se met à jour dans `profiles`
- [ ] Le portail client Stripe s'ouvre depuis Paramètres → gérer l'abonnement
- [ ] RLS actif : un 2e compte ne voit pas les clients/devis/factures du 1er compte
- [ ] Domaine personnalisé branché (optionnel, ~10€/an chez OVH/Namecheap)
