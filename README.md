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
