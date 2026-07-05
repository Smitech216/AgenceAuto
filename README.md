# AgenceAuto

Application web de gestion pour agences et freelances : clients, devis, factures, et abonnements — avec authentification et paiements intégrés.

**Stack** : HTML / CSS / JavaScript vanilla · [Supabase](https://supabase.com) (base de données + auth) · [Stripe](https://stripe.com) (paiements) · [Vercel](https://vercel.com) (hébergement)

Aucun framework, aucun build — le site fonctionne en ouvrant simplement `index.html`.

---

## ✨ Fonctionnalités

- **Landing page** publique avec présentation, tarifs et FAQ
- **Authentification** email/mot de passe + Google OAuth (via Supabase)
- **Dashboard** avec 6 sections :
  - Accueil (statistiques, activité récente)
  - Clients (CRUD complet)
  - Devis (création, envoi, signature)
  - Factures (suivi payé / en attente / en retard)
  - Rapports
  - Paramètres (profil, plan, notifications)
- **Abonnements Stripe** — 3 plans (Solo, Agence, Studio) avec Stripe Checkout et portail client
- **Sécurité** — Row Level Security Supabase : chaque utilisateur ne voit que ses propres données
- **Mode démo** intégré — le site fonctionne avec des données d'exemple même sans configurer Supabase/Stripe

---

## 📁 Structure du projet

```
agenceauto/
├── index.html                          # Structure HTML de toutes les pages
├── style.css                           # Styles (variables de couleur dans :root)
├── app.js                              # Logique applicative (auth, données, Stripe)
├── sql-complement.sql                  # Contraintes SQL additionnelles
├── GUIDE_DEPLOIEMENT.md                # Guide de mise en ligne pas à pas
└── supabase/
    └── functions/
        ├── create-checkout-session/    # Crée une session de paiement Stripe
        ├── stripe-portal/              # Portail de gestion d'abonnement
        └── stripe-webhook/             # Synchronise les paiements → Supabase
```

---

## 🚀 Démarrage rapide (mode démo, sans configuration)

```bash
git clone https://github.com/TON_PSEUDO/agenceauto.git
cd agenceauto
```

Ouvre simplement `index.html` dans ton navigateur. Le site tourne en mode démo avec des données d'exemple — aucune clé API requise.

---

## ⚙️ Configuration (mode production)

Pour activer les vrais comptes utilisateurs et les vrais paiements, voir le guide complet : **[GUIDE_DEPLOIEMENT.md](./GUIDE_DEPLOIEMENT.md)**

Résumé des étapes :

1. **Supabase** — créer le projet, exécuter le SQL, récupérer les clés API
2. **Stripe** — créer les 3 produits d'abonnement, récupérer les clés
3. Renseigner les clés dans `app.js` (en haut du fichier)
4. **Déployer les Edge Functions** Supabase (`create-checkout-session`, `stripe-portal`, `stripe-webhook`)
5. **Brancher le webhook** Stripe → Supabase
6. **Déployer** sur Vercel via GitHub

### Variables à renseigner dans `app.js`

```js
const SUPABASE_URL  = "https://xxxxx.supabase.co";
const SUPABASE_ANON = "eyJ...";

const STRIPE_PUBLIC_KEY = "pk_test_...";
const STRIPE_PRICES = {
  solo:   "price_...",
  agence: "price_...",
  studio: "price_...",
};
```

### Secrets à définir côté Supabase (jamais dans le code)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🗄️ Modèle de données

| Table       | Rôle                                              |
|-------------|----------------------------------------------------|
| `profiles`  | Profil utilisateur, plan, statut d'abonnement Stripe |
| `clients`   | Clients de l'agence                                |
| `quotes`    | Devis (brouillon → envoyé → signé/refusé)          |
| `invoices`  | Factures (en attente → payée / en retard)          |

Row Level Security activé sur toutes les tables : chaque utilisateur n'accède qu'aux lignes où `user_id = auth.uid()`.

---

## 🔐 Sécurité

- Clé Supabase utilisée côté client = **anon key** uniquement (jamais la service role key)
- La **service role key** et la **clé secrète Stripe** ne vivent que dans les secrets des Edge Functions, jamais dans le code front
- Toutes les insertions HTML dynamiques passent par `escapeHtml()` pour prévenir les injections XSS

---

## 📄 Licence

Projet privé — tous droits réservés.
