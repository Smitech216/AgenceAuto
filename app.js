/*
╔══════════════════════════════════════════════════════════════════════════╗
║                        AGENCEAUTO — app.js                              ║
║                                                                          ║
║  Ce fichier contient TOUTE la logique JavaScript de l'application.       ║
║                                                                          ║
║  Organisation :                                                          ║
║    1.  CONFIGURATION SUPABASE  ← à remplir avec tes vraies clés         ║
║    2.  CONFIGURATION STRIPE    ← à remplir avec tes vraies clés         ║
║    3.  ÉTAT DE L'APPLICATION   (données en mémoire)                      ║
║    4.  NAVIGATION              (entre les pages)                         ║
║    5.  AUTHENTIFICATION        (inscription, connexion, déconnexion)     ║
║    6.  DONNÉES CLIENTS         (charger, afficher, créer)                ║
║    7.  DONNÉES DEVIS           (charger, afficher, créer, signer)        ║
║    8.  DONNÉES FACTURES        (charger, afficher, marquer payée)        ║
║    9.  DONNÉES RAPPORTS        (afficher)                                ║
║   10.  PARAMÈTRES              (profil, plan, notifications)             ║
║   11.  MODALS                  (ouvrir, fermer, contenu)                 ║
║   12.  TOAST                   (notifications)                           ║
║   13.  UTILITAIRES             (formatage, FAQ, sidebar, etc.)           ║
║   14.  INITIALISATION          (au chargement de la page)                ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

// ── 1. CONFIGURATION SUPABASE ─────────────────────────────────────────────
// Remplace ces valeurs par tes vraies clés Supabase si ce n'est pas déjà fait !
const SUPABASE_URL  = "https://tqhcsfejebjlqwnxllsr.supabase.co"; 
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGNzZmVqZWJqbHF3bnhsbHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDQ4MjAsImV4cCI6MjA5ODgyMDgyMH0.4C3dUf0B7upW3nbctmMF0b16bvqvR0dVhJe2U9rjRoQ";

const supabaseLib = window.supabase;
var supabase = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON) {
    supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log("✅ Supabase connecté avec succès !");
  } else {
    console.warn("⚠️ Supabase tourne en mode démo.");
  }
} catch (e) {
  console.error("Erreur lors de l'initialisation de Supabase :", e.message);
}


/* ═══════════════════════════════════════════════════════════════════════
   2. CONFIGURATION STRIPE
   ▸ Va sur dashboard.stripe.com → ton compte → Développeurs → Clés API
   ▸ Copie la clé "Publishable key" (commence par pk_)
   ▸ Les Price ID se trouvent dans Stripe → Produits → ton produit → Prix
═══════════════════════════════════════════════════════════════════════ */

const STRIPE_PUBLIC_KEY = "pk_test_51Tol4C9AI6nFEqZd1nS0xi5dtb9Q5px1BviBoaXE5FoHkCYIWtqkKJBoh34Dgi2HSyM4gvexfO5O9yYtrRGg5cGY00vZDvW1B0";
// Exemple : "pk_test_51XXXXXXXXXXXXXXXXXXXXXX"
// ⚠️ Utilise pk_test_ pour les tests, pk_live_ pour la vraie production

/*
  ── IDs des prix Stripe (créés dans le tableau de bord Stripe) ──────────
  1. Va sur dashboard.stripe.com
  2. Clique "Produits" dans le menu de gauche
  3. Clique "+ Ajouter un produit"
  4. Crée les 3 produits (Solo 29€, Agence 79€, Studio 199€)
     → Pour chaque produit, note le "Price ID" qui commence par price_
  5. Colle les Price ID ci-dessous
  ───────────────────────────────────────────────────────────────────────
*/
const STRIPE_PRICES = {
  solo:   "price_COLLE_TON_PRICE_ID_SOLO",
  agence: "price_COLLE_TON_PRICE_ID_AGENCE",
  studio: "price_COLLE_TON_PRICE_ID_STUDIO",
};

// Initialisation Stripe
let stripe = null;
try {
  if (STRIPE_PUBLIC_KEY !== "COLLE_TA_CLE_STRIPE_ICI") {
    stripe = Stripe(STRIPE_PUBLIC_KEY);
    console.log("✅ Stripe initialisé");
  } else {
    console.warn("⚠️ Stripe non configuré. Les paiements redirigent vers l'inscription.");
  }
} catch (e) {
  console.error("Erreur Stripe :", e.message);
}

// ── ACCÈS / ESSAI GRATUIT ──────────────────────────────────────────────
// Durée de l'essai gratuit annoncée sur la landing page ("14 jours gratuits")
// Après ce délai, si l'abonnement n'est pas "active", l'accès au dashboard
// est bloqué par un paywall (voir applyAccessGate()).
const TRIAL_DAYS = 14;


/* ═══════════════════════════════════════════════════════════════════════
   3. ÉTAT DE L'APPLICATION
   Ces variables stockent les données en mémoire pendant la session.
   Si Supabase est configuré, elles sont remplies depuis la base.
   Sinon (mode démo), elles contiennent des données exemples.
═══════════════════════════════════════════════════════════════════════ */

// Utilisateur actuellement connecté
// → Rempli par handleLogin() ou handleRegister()
let currentUser = null;

// Données de l'application (en mémoire)
// → Remplies depuis Supabase par les fonctions load...()
// → En mode démo, contiennent des exemples
let appData = {
  clients: [
    { id: 1, name: "StartupFlow",      contact: "Julie Chen",    email: "julie@startupflow.io",  status: "Actif",    billing_plan: "Annuel",   revenue: 8900 },
    { id: 2, name: "Atelier Créatif",  contact: "Marc Bernard",  email: "marc@atelier.fr",       status: "Actif",    billing_plan: "Mensuel",  revenue: 2400 },
    { id: 3, name: "Cabinet Renaud",   contact: "Pierre Renaud", email: "p.renaud@cabinet.fr",   status: "En pause", billing_plan: "Mensuel",  revenue: 1200 },
    { id: 4, name: "Boutique Lumière", contact: "Amina Kadi",    email: "amina@lumiere.fr",       status: "Actif",    billing_plan: "Mensuel",  revenue: 3600 },
    { id: 5, name: "TechVentures",     contact: "Samuel Roy",    email: "s.roy@techventures.fr", status: "Prospect", billing_plan: "—",        revenue: 0    },
  ],
  quotes: [
    { id: "DEV-047", client_name: "StartupFlow",      amount: 4200, status: "Signé",     created_at: "2025-06-28" },
    { id: "DEV-046", client_name: "Atelier Créatif",  amount: 1800, status: "En attente",created_at: "2025-06-25" },
    { id: "DEV-045", client_name: "Cabinet Renaud",   amount: 950,  status: "Refusé",    created_at: "2025-06-20" },
    { id: "DEV-044", client_name: "Boutique Lumière", amount: 3100, status: "Signé",     created_at: "2025-06-15" },
    { id: "DEV-043", client_name: "TechVentures",     amount: 6500, status: "Brouillon", created_at: "2025-06-10" },
  ],
  invoices: [
    { id: "FAC-038", client_name: "StartupFlow",      amount: 4200, status: "Payée",     due_date: "2025-06-15", paid_at: "2025-06-12" },
    { id: "FAC-037", client_name: "Boutique Lumière", amount: 3100, status: "En attente",due_date: "2025-06-30", paid_at: null },
    { id: "FAC-036", client_name: "Atelier Créatif",  amount: 1800, status: "En retard", due_date: "2025-06-20", paid_at: null },
    { id: "FAC-035", client_name: "Cabinet Renaud",   amount: 950,  status: "Payée",     due_date: "2025-06-01", paid_at: "2025-06-02" },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════
   4. NAVIGATION — Changer de page
   showPage() masque toutes les pages et affiche seulement celle demandée
═══════════════════════════════════════════════════════════════════════ */

/**
 * Affiche une page et masque les autres.
 * @param {string} pageName - "landing" | "login" | "register" | "dashboard"
 */
function showPage(pageName) {
  // Masque toutes les pages
  const allPages = document.querySelectorAll(".page");
  allPages.forEach(p => p.classList.add("hidden"));

  // Affiche la page demandée
  const target = document.getElementById("page-" + pageName);
  if (target) {
    target.classList.remove("hidden");
  } else {
    console.error("Page introuvable :", pageName);
    return;
  }

  // Actions spéciales selon la page
  if (pageName === "landing") {
    // Lance l'animation des compteurs
    animateCounters();
    // Initialise les accordéons FAQ
    initFaq();
  }

  if (pageName === "dashboard") {
    // Pré-remplit les infos utilisateur dans la sidebar
    fillUserInfo();
    // Affiche l'onglet d'accueil par défaut
    switchTabById("tab-home");
    // Charge les données depuis Supabase (ou garde les démos)
    loadAllData();
    // Vérifie l'essai gratuit / l'abonnement et bloque l'accès si besoin
    applyAccessGate();
  }

  // Remonte en haut de la page
  window.scrollTo(0, 0);
}

// 🚀 LA LIGNE À AJOUTER : Rend la fonction visible pour tes boutons HTML
window.showPage = showPage;


/* ═══════════════════════════════════════════════════════════════════════
   4bis. ACCÈS / ESSAI GRATUIT / PAYWALL

   C'est ici que se joue "est-ce que cette personne a le droit d'utiliser
   l'appli, ou doit-elle payer ?"

   Règles :
   ─────────
   · Mode démo pur (Supabase pas configuré, currentUser.id === "demo-user")
     → accès total, aucune restriction (c'est juste une vitrine).
   · subscription_status === "active" (Stripe a confirmé un paiement)
     → accès total.
   · subscription_status === "trial" ET on est encore dans les 14 jours
     → accès total + bannière "il te reste X jours".
   · Sinon (essai terminé, "past_due", "canceled"...)
     → paywall bloquant : le dashboard reste visible en fond mais
       inutilisable tant que la personne n'a pas choisi un plan.
═══════════════════════════════════════════════════════════════════════ */

function applyAccessGate() {
  // On repart toujours d'un état propre avant de recalculer l'accès
  removeTrialBanner();
  removePaywall();

  // Mode démo pur : Supabase non configuré → on ne bloque jamais rien
  if (!supabase || currentUser?.id === "demo-user") return;

  const status = currentUser?.subscriptionStatus || "trial";

  // Abonnement payant actif → accès complet, rien à afficher
  if (status === "active") return;

  // Calcule la fin de la période d'essai (14 jours après la création du compte)
  const created  = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const msLeft   = trialEnd.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  if (status === "trial" && msLeft > 0) {
    showTrialBanner(daysLeft);
    return;
  }

  // Essai terminé, ou abonnement en échec/résilié → on bloque l'accès
  showPaywall(status);
}

/**
 * Affiche une bannière discrète en haut du dashboard pendant l'essai gratuit.
 */
function showTrialBanner(daysLeft) {
  const content = document.getElementById("dashboard-content");
  if (!content) return;

  const banner = document.createElement("div");
  banner.id = "trial-banner";
  banner.className = "trial-banner";
  banner.innerHTML = `
    <span>⏳ Il te reste <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong> d'essai gratuit.</span>
    <button class="trial-banner-btn" onclick="handleSubscribe(currentUser?.plan || 'agence')">
      Passer à un plan payant →
    </button>
  `;
  content.prepend(banner);
}

function removeTrialBanner() {
  document.getElementById("trial-banner")?.remove();
}

/**
 * Affiche un paywall bloquant par-dessus le dashboard : la personne ne peut
 * plus rien faire tant qu'elle n'a pas choisi un plan (ou ne s'est pas déconnectée).
 */
function showPaywall(status) {
  if (document.getElementById("paywall-overlay")) return; // déjà affiché

  const messages = {
    trial:     "Ton essai gratuit de 14 jours est terminé.",
    past_due:  "Ton dernier paiement a échoué.",
    canceled:  "Ton abonnement a été résilié.",
  };
  const message = messages[status] || "Choisis un plan pour continuer à utiliser AgenceAuto.";

  const overlay = document.createElement("div");
  overlay.id = "paywall-overlay";
  overlay.className = "paywall-overlay";
  overlay.innerHTML = `
    <div class="paywall-card">
      <div class="paywall-icon">🔒</div>
      <h2 class="outfit">${message}</h2>
      <p>Choisis un plan ci-dessous pour retrouver l'accès à tes clients, devis et factures.</p>
      <div class="paywall-plans">
        <button class="btn-plan-ghost" onclick="handleSubscribe('solo')">Solo — 29€/mois</button>
        <button class="btn-plan-primary" onclick="handleSubscribe('agence')">Agence — 79€/mois</button>
        <button class="btn-plan-ghost" onclick="handleSubscribe('studio')">Studio — 199€/mois</button>
      </div>
      <button class="paywall-logout" onclick="handleLogout()">Se déconnecter</button>
    </div>
  `;
  document.getElementById("page-dashboard")?.appendChild(overlay);
}

function removePaywall() {
  document.getElementById("paywall-overlay")?.remove();
}

/* ═══════════════════════════════════════════════════════════════════════
   5. AUTHENTIFICATION

   Si Supabase est configuré → vraie auth en base de données
   Sinon → simulation locale (mode démo)
═══════════════════════════════════════════════════════════════════════ */

/**
 * Connexion avec Google OAuth.
 * Nécessite d'avoir activé Google dans Supabase → Auth → Providers
 */
async function loginWithGoogle() {
  if (!supabase) {
    // Mode démo : simule une connexion Google
    showToast("Mode démo : connexion Google simulée", "success");
    simulateLogin("Utilisateur Google", "google@demo.fr", "agence");
    return;
  }

  try {
    // Lance le flow OAuth Google
    // → L'utilisateur est redirigé vers Google pour s'authentifier
    // → Après connexion, Supabase redirige vers ton site avec un token
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
        // ← Supabase redirige ici après connexion Google
        // ← En production, mets l'URL de ton domaine : "https://agenceauto.fr"
      }
    });
    if (error) throw error;
  } catch (err) {
    showToast("Erreur Google OAuth : " + err.message, "error");
  }
}

/**
 * Connexion par email + mot de passe.
 * Appelé par le bouton "Se connecter" sur la page login.
 */
async function handleLogin() {
  // Récupère les valeurs des champs
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  // ── Validation côté client ────────────────────────────────────────
  hideError("login-error");
  if (!email || !password) {
    showError("login-error", "Email et mot de passe requis.");
    return;
  }
  if (password.length < 6) {
    showError("login-error", "Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  // ── Affiche le spinner sur le bouton ─────────────────────────────
  const btn = document.getElementById("login-btn");
  setButtonLoading(btn, true, "Connexion…");

  try {
    if (!supabase) {
      // ── Mode démo ──────────────────────────────────────────────
      await sleep(900);
      // Simule le délai réseau
      simulateLogin(email.split("@")[0], email, "agence");
      return;
    }

    // ── Vraie connexion Supabase ──────────────────────────────────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Traduit les messages d'erreur Supabase en français
      const msg = translateAuthError(error.message);
      showError("login-error", msg);
      return;
    }

    // Connexion réussie → récupère le profil complet
    const profile = await fetchProfile(data.user.id);
    currentUser = {
      id:    data.user.id,
      name:  profile?.name  || email.split("@")[0],
      email: profile?.email || email,
      plan:  profile?.plan  || "solo",
      // ── Infos d'abonnement, utilisées par applyAccessGate() ──────
      subscriptionStatus: profile?.subscription_status || "trial",
      createdAt: profile?.created_at || data.user.created_at,
    };

    showToast("Connexion réussie !", "success");
    showPage("dashboard");
  } catch (err) {
    showError("login-error", "Une erreur inattendue s'est produite.");
    console.error(err);
  } finally {
    // Retire toujours le spinner, même en cas d'erreur
    setButtonLoading(btn, false, "Se connecter");
  }
}

/**
 * Inscription d'un nouveau compte.
 * Appelé par le bouton "Créer mon compte" sur la page register.
 */
async function handleRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const plan     = document.getElementById("reg-plan").value;

  // ── Validation ────────────────────────────────────────────────────
  hideError("reg-error");
  if (!name) {
    showError("reg-error", "Votre prénom est requis.");
    return;
  }
  if (!email) {
    showError("reg-error", "L'adresse email est requise.");
    return;
  }
  if (!email.includes("@")) {
    showError("reg-error", "Adresse email invalide.");
    return;
  }
  if (password.length < 6) {
    showError("reg-error", "Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  const btn = document.getElementById("reg-btn");
  setButtonLoading(btn, true, "Création du compte…");
  
  try {
    if (!supabase) {
      // ── Mode démo ──────────────────────────────────────────────
      await sleep(1000);
      simulateLogin(name, email, plan);
      return; // S'arrête ici si on est en démo
    }

    // ── Vraie inscription Supabase ────────────────────────────────
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          plan: plan,
        }
      }
    });

    if (error) {
      showError("reg-error", translateAuthError(error.message));
      return;
    }

    if (data.user) {
      // Met à jour le profil avec le plan choisi, et récupère la ligne
      // pour connaître son subscription_status et sa date de création réels
      const { data: profileRow } = await supabase
        .from("profiles")
        .upsert({ id: data.user.id, email, name, plan })
        .select()
        .single();

      currentUser = {
        id: data.user.id,
        name, email, plan,
        // ── Infos d'abonnement, utilisées par applyAccessGate() ──────
        subscriptionStatus: profileRow?.subscription_status || "trial",
        createdAt: profileRow?.created_at || new Date().toISOString(),
      };
      showToast("Compte créé ! Bienvenue 🎉 Profitez de vos 14 jours d'essai gratuit.", "success");
      showPage("dashboard");
      return; 
    }

  } catch (err) {
    showError("reg-error", "Une erreur inattendue s'est produite.");
    console.error(err);
  } finally {
    setButtonLoading(btn, false, "Créer mon compte gratuitement");
  }
}

/**
 * Déconnexion.
 * Appelé par le bouton 🚪 dans la sidebar.
 */
async function handleLogout() {
  if (supabase) {
    // Détruit la session côté Supabase (supprime le cookie de session)
    await supabase.auth.signOut();
  }
  // Réinitialise l'état local
  currentUser = null;
  removePaywall();
  removeTrialBanner();
  showPage("landing");
  showToast("Vous êtes déconnecté.", "success");
}

/**
 * Récupère le profil d'un utilisateur depuis la table public.profiles.
 * @param {string} userId - UUID de l'utilisateur
 * @returns {object|null} Le profil ou null si non trouvé
 */
async function fetchProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")    // ← Table créée par le SQL dans Supabase
    .select("*")
    .eq("id", userId)    // ← Filtre par l'ID utilisateur
    .single();
  // ← On attend un seul résultat

  if (error) {
    console.error("Erreur fetchProfile :", error.message);
    return null;
  }
  return data;
}

/**
 * Simulation de connexion (mode démo, sans Supabase).
 */
function simulateLogin(name, email, plan) {
  currentUser = { id: "demo-user", name, email, plan };
  showToast("Connexion réussie !", "success");
  showPage("dashboard");
}

/**
 * Traduit les messages d'erreur Supabase Auth en français.
 */
function translateAuthError(msg) {
  const translations = {
    "Invalid login credentials":    "Email ou mot de passe incorrect.",
    "User already registered":      "Cet email est déjà utilisé. Connectez-vous.",
    "Email not confirmed":          "Confirmez votre email avant de vous connecter.",
    "Password should be at least 6 characters": "Mot de passe trop court (6 caractères minimum).",
    "Signup requires a valid password": "Mot de passe invalide.",
  };
  return translations[msg] || msg;
}

/**
 * Vérifie si l'utilisateur est déjà connecté au chargement de la page.
 * Si oui, le redirige directement vers le dashboard.
 */
async function checkExistingSession() {
  if (!supabase) return;
  // Mode démo : pas de session persistante

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Session active trouvée → récupère le profil et va au dashboard
      const profile = await fetchProfile(session.user.id);
      currentUser = {
        id:    session.user.id,
        name:  profile?.name  || session.user.email.split("@")[0],
        email: profile?.email || session.user.email,
        plan:  profile?.plan  || "solo",
        // ── Infos d'abonnement, utilisées par applyAccessGate() ──────
        subscriptionStatus: profile?.subscription_status || "trial",
        createdAt: profile?.created_at || session.user.created_at,
      };
      showPage("dashboard");
    }
  } catch (err) {
    console.error("Erreur vérification session :", err.message);
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   6. DONNÉES CLIENTS
═══════════════════════════════════════════════════════════════════════ */

/**
 * Charge les clients depuis Supabase (ou garde les démos).
 * Filtre automatiquement par user_id grâce au Row Level Security de Supabase.
 */
async function loadClients() {
  if (supabase && currentUser?.id !== "demo-user") {
    const { data, error } = await supabase
      .from("clients")                                    // ← Table clients dans Supabase
      .select("*")                         
      // ← Récupère toutes les colonnes
      .eq("user_id", currentUser.id)                     // ← Seulement les clients de cet utilisateur
      .order("created_at", { ascending: false });
    // ← Les plus récents en premier

    if (error) {
      console.error("Erreur loadClients :", error.message);
    } else {
      appData.clients = data || [];
    }
  }

  // Affiche dans le tableau HTML
  renderClients();
}

/**
 * Génère le HTML du tableau des clients et l'injecte dans la page.
 */
function renderClients() {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  // Compteur en sous-titre
  const countEl = document.getElementById("clients-count");
  if (countEl) {
    const actifs = appData.clients.filter(c => c.status === "Actif").length;
    countEl.textContent = `${appData.clients.length} clients · ${actifs} actifs`;
  }

  // Si pas de clients
  if (appData.clients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:3rem;text-align:center;color:var(--muted)">
          Aucun client pour l'instant. Cliquez sur "+ Ajouter un client".
        </td>
      </tr>`;
    return;
  }

  // Génère une ligne par client
  tbody.innerHTML = appData.clients.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:9px;background:rgba(79,110,247,.2);
               display:flex;align-items:center;justify-content:center;
               font-size:12px;font-weight:800;color:var(--accent);
               font-family:var(--font-display);flex-shrink:0">
            
            ${c.name.slice(0, 2).toUpperCase()}
          </div>
          <strong>${escapeHtml(c.name)}</strong>
        </div>
      </td>
      <td style="color:var(--muted)">${escapeHtml(c.contact || "—")}</td>
      <td style="color:var(--accent)">${escapeHtml(c.email || "—")}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="color:var(--muted)">${escapeHtml(c.billing_plan || "—")}</td>
      <td style="font-weight:700;color:var(--mint)">${c.revenue > 0 ? formatEur(c.revenue) : "—"}</td>
    </tr>
  `).join("");
}

/**
 * Crée un nouveau client.
 * Appelé depuis le modal "Ajouter un client".
 */
async function submitNewClient() {
  const name    = document.getElementById("nc-name").value.trim();
  const contact = document.getElementById("nc-contact").value.trim();
  const email   = document.getElementById("nc-email").value.trim();
  const plan    = document.getElementById("nc-plan").value;
  if (!name || !email) {
    showToast("Nom et email requis.", "error");
    return;
  }

  const btn = document.getElementById("modal-submit-btn");
  setButtonLoading(btn, true, "Création…");

  try {
    if (supabase && currentUser?.id !== "demo-user") {
      // ── Vrai INSERT dans Supabase ──────────────────────────────
      const { data, error } = await supabase
        .from("clients")
        .insert([{
          user_id:      currentUser.id,  // ← Lié à l'utilisateur connecté (RLS l'exige)
          name,
          contact,
          email,
          billing_plan: plan,
          status:       "Prospect",
          revenue:      0,
        }])
        .select()   // ← Récupère la ligne insérée avec son UUID généré
        .single();
      if (error) throw error;

      // Ajoute en tête de liste sans recharger tout
      appData.clients.unshift(data);
    } else {
      // ── Mode démo : ajoute en mémoire ─────────────────────────
      const newClient = {
        id:           Date.now(),
        name, contact, email,
        billing_plan: plan,
        status:       "Prospect",
        revenue:      0,
        created_at:   new Date().toISOString(),
      };
      appData.clients.unshift(newClient);
    }

    renderClients();
    closeModal();
    showToast(`Client "${name}" ajouté avec succès !`, "success");

  } catch (err) {
    showToast("Erreur lors de la création : " + err.message, "error");
    console.error(err);
  } finally {
    setButtonLoading(btn, false, "Ajouter le client");
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   7. DONNÉES DEVIS
═══════════════════════════════════════════════════════════════════════ */

/**
 * Charge les devis depuis Supabase.
 */
async function loadQuotes() {
  if (supabase && currentUser?.id !== "demo-user") {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erreur loadQuotes :", error.message);
    } else {
      appData.quotes = data || [];
    }
  }
  renderQuotes();
}

/**
 * Génère le HTML du tableau des devis.
 */
function renderQuotes() {
  const tbody = document.getElementById("quotes-tbody");
  if (!tbody) return;
  // Compteur
  const countEl = document.getElementById("quotes-count");
  if (countEl) {
    const signed  = appData.quotes.filter(q => q.status === "Signé").length;
    const waiting = appData.quotes.filter(q => q.status === "En attente").length;
    countEl.textContent = `${appData.quotes.length} devis · ${signed} signés · ${waiting} en attente`;
  }

  if (appData.quotes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:3rem;text-align:center;color:var(--muted)">
          Aucun devis. Cliquez sur "+ Nouveau devis".
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = appData.quotes.map(q => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">${escapeHtml(q.id || q.reference || "—")}</td>
      <td>${escapeHtml(q.client_name || "—")}</td>
      <td style="font-weight:700">${formatEur(q.amount)}</td>
      <td>${statusBadge(q.status)}</td>
      <td style="color:var(--muted)">${formatDate(q.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button
            class="btn-accent-sm"
            onclick="sendQuote('${q.id || q.reference}')">
            Envoyer
          </button>
          ${q.status === "En attente" ? `
            <button
              class="btn-accent-sm"
              style="background:rgba(14,207,164,.15);color:var(--mint)"
              onclick="markQuoteSigned('${q.id || q.reference}')">
               Marquer signé
            </button>
          ` : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

/**
 * Simule l'envoi d'un devis par email.
 * En production : connecter un service email comme Resend ou SendGrid.
 */
function sendQuote(quoteId) {
  showToast(`Devis ${quoteId} envoyé par email.`, "success");
  // TODO : Appeler ton service d'envoi d'email ici
  // Exemple avec Resend : POST /api/send-quote { quoteId }
}

/**
 * Marque un devis comme signé.
 */
async function markQuoteSigned(quoteId) {
  try {
    if (supabase && currentUser?.id !== "demo-user") {
      // ── UPDATE dans Supabase ───────────────────────────────────
      const { error } = await supabase
        .from("quotes")
        .update({
          status:    "Signé",
          signed_at: new Date().toISOString(),
        })
        .eq("id", quoteId);
      if (error) throw error;
    }

    // Mise à jour locale immédiate (sans recharger)
    const q = appData.quotes.find(x => (x.id || x.reference) === quoteId);
    if (q) q.status = "Signé";

    renderQuotes();
    showToast(`Devis ${quoteId} marqué comme signé ✓`, "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  }
}

/**
 * Crée un nouveau devis.
 * Appelé depuis le modal "Nouveau devis".
 */
async function submitNewQuote() {
  const client = document.getElementById("nq-client").value.trim();
  const title  = document.getElementById("nq-title").value.trim();
  const amount = parseFloat(document.getElementById("nq-amount").value);
  const notes  = document.getElementById("nq-notes").value.trim();
  if (!client || isNaN(amount) || amount <= 0) {
    showToast("Client et montant requis.", "error");
    return;
  }

  const btn = document.getElementById("modal-submit-btn");
  setButtonLoading(btn, true, "Création…");

  // Génère une référence lisible : DEV-YYYYMMDD-XXX
  const today  = new Date();
  const pad    = n => String(n).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 900) + 100);
  const ref    = `DEV-${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}-${random}`;

  try {
    if (supabase && currentUser?.id !== "demo-user") {
      // ── INSERT dans Supabase ───────────────────────────────────
      const { data, error } = await supabase
        .from("quotes")
        .insert([{
          user_id:      currentUser.id,
          client_name:  client,
          reference:    ref,
          title,
          amount,
          notes,
          status:       "Brouillon",
          validity_days: 30,
        }])
        .select()
        .single();
      if (error) throw error;
      appData.quotes.unshift(data);

    } else {
      // Mode démo
      appData.quotes.unshift({
        id:          ref,
        client_name: client,
        amount,
        status:      "Brouillon",
        created_at:  new Date().toISOString(),
      });
    }

    renderQuotes();
    closeModal();
    showToast(`Devis ${ref} créé avec succès !`, "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
    console.error(err);
  } finally {
    setButtonLoading(btn, false, "Créer le devis");
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   8. DONNÉES FACTURES
═══════════════════════════════════════════════════════════════════════ */

/**
 * Charge les factures depuis Supabase.
 */
async function loadInvoices() {
  if (supabase && currentUser?.id !== "demo-user") {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erreur loadInvoices :", error.message);
    } else {
      appData.invoices = data || [];
    }
  }
  renderInvoices();
}

/**
 * Génère le HTML du tableau des factures.
 */
function renderInvoices() {
  const tbody = document.getElementById("invoices-tbody");
  if (!tbody) return;
  // Calcule les totaux par statut
  const paid    = appData.invoices.filter(f => f.status === "Payée").reduce((s, f) => s + Number(f.amount), 0);
  const pending = appData.invoices.filter(f => f.status === "En attente").reduce((s, f) => s + Number(f.amount), 0);
  const late    = appData.invoices.filter(f => f.status === "En retard").reduce((s, f) => s + Number(f.amount), 0);
  // Met à jour les résumés
  const setEl = (id, val) => { const el = document.getElementById(id);
  if (el) el.textContent = val; };
  setEl("inv-paid",    formatEur(paid));
  setEl("inv-pending", formatEur(pending));
  setEl("inv-late",    formatEur(late));
  setEl("invoices-overdue", `${formatEur(late)} en retard`);

  if (appData.invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:3rem;text-align:center;color:var(--muted)">
          Aucune facture.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = appData.invoices.map(inv => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">${escapeHtml(inv.id || inv.reference || "—")}</td>
      <td>${escapeHtml(inv.client_name || "—")}</td>
      <td style="font-weight:700">${formatEur(inv.amount)}</td>
      <td>${statusBadge(inv.status)}</td>
      <td style="color:var(--muted)">${inv.due_date ? formatDate(inv.due_date) : "—"}</td>
      <td style="color:var(--muted)">${inv.paid_at ? formatDate(inv.paid_at) : "—"}</td>
      <td>
        ${inv.status !== "Payée" ? `
          <button
            class="btn-accent-sm"
            style="background:rgba(14,207,164,.15);color:var(--mint)"
            onclick="markInvoicePaid('${inv.id || inv.reference}')">
            Marquer payée
          </button>
        ` : `<span style="font-size:11px;color:var(--muted)">✓ Archivée</span>`}
      </td>
    </tr>
  `).join("");
}

/**
 * Marque une facture comme payée.
 */
async function markInvoicePaid(invoiceId) {
  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { error } = await supabase
        .from("invoices")
        .update({
          status:  "Payée",
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);
      if (error) throw error;
    }

    // Mise à jour locale immédiate
    const inv = appData.invoices.find(x => (x.id || x.reference) === invoiceId);
    if (inv) { inv.status = "Payée"; inv.paid_at = new Date().toISOString(); }

    renderInvoices();
    showToast(`Facture ${invoiceId} marquée comme payée ✓`, "success");

  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   9. CHARGEMENT GLOBAL + STATS DASHBOARD
═══════════════════════════════════════════════════════════════════════ */

/**
 * Charge toutes les données en parallèle au chargement du dashboard.
 */
async function loadAllData() {
  // Lance les 3 chargements en simultané (plus rapide)
  await Promise.all([
    loadClients(),
    loadQuotes(),
    loadInvoices(),
  ]);
  // Met à jour les stats de la page d'accueil
  updateDashboardStats();
}

/**
 * Calcule et affiche les statistiques sur la page d'accueil du dashboard.
 */
function updateDashboardStats() {
  // Revenus du mois en cours (factures payées ce mois-ci)
  const now          = new Date();
  const monthRevenue = appData.invoices
    .filter(inv => {
      if (inv.status !== "Payée" || !inv.paid_at) return false;
      const d = new Date(inv.paid_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  // Taux de signature (devis signés / devis envoyés)
  const sent   = appData.quotes.filter(q => ["Signé", "Refusé", "En attente"].includes(q.status)).length;
  const signed = appData.quotes.filter(q => q.status === "Signé").length;
  const rate   = sent > 0 ? Math.round((signed / sent) * 100) : 0;

  // Clients actifs
  const activeClients = appData.clients.filter(c => c.status === "Actif").length;
  // Met à jour le DOM
  // ⚠️ Piège corrigé ici : "0 || '28'" retombe sur '28' car 0 est "falsy" en JS.
  // Un compte neuf avec 0 devis affichait donc "28" au lieu du vrai "0".
  // On affiche maintenant toujours la vraie valeur calculée, jamais un fallback démo.
  const setEl = (id, val) => { const el = document.getElementById(id);
  if (el) el.textContent = val; };
  setEl("stat-revenue", formatEur(monthRevenue));
  setEl("stat-quotes",  appData.quotes.length);
  setEl("stat-clients", activeClients);
  setEl("stat-sign",    `${rate}%`);

  // Remplace le fil d'activité et le graphique statiques par les vraies données,
  // et affiche un petit tuto si le compte est tout neuf (0 client, 0 devis).
  renderActivityFeed();
  renderRevenueChart();
  renderOnboardingCard();
}

/**
 * Remplace le fil "Activité récente" (codé en dur dans le HTML à l'origine)
 * par les vrais événements du compte : devis signés, factures payées.
 * Sur un compte neuf, affiche un message d'accueil au lieu de fausses activités.
 */
function renderActivityFeed() {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;

  // Mode démo pur (Supabase non configuré) : on garde les exemples du HTML
  if (!supabase || currentUser?.id === "demo-user") return;

  const events = [];
  appData.quotes.forEach(q => {
    if (q.status === "Signé") {
      events.push({
        date:  q.signed_at || q.created_at,
        text:  `Devis ${q.id || q.reference || ""} signé · ${q.client_name || ""}`,
        color: "mint",
      });
    }
  });
  appData.invoices.forEach(inv => {
    if (inv.status === "Payée" && inv.paid_at) {
      events.push({
        date:  inv.paid_at,
        text:  `Facture payée — ${formatEur(inv.amount)}`,
        color: "accent",
      });
    }
  });
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (events.length === 0) {
    feed.innerHTML = `
      <div style="text-align:center;padding:2rem 1rem;color:var(--muted);font-size:13px;line-height:1.6">
        Aucune activité pour l'instant.<br/>
        Ajoute ton premier client pour commencer 🚀
      </div>`;
    return;
  }

  feed.innerHTML = events.slice(0, 5).map(e => `
    <div class="activity-item">
      <div class="activity-dot ${e.color}"></div>
      <div class="activity-text">
        <p>${escapeHtml(e.text)}</p>
        <span>${formatDate(e.date)}</span>
      </div>
    </div>
  `).join("");
}

/**
 * Remplace le graphique "Revenus mensuels" (barres codées en dur à l'origine)
 * par les vrais totaux encaissés des 6 derniers mois. Sur un compte neuf,
 * affiche un message au lieu de fausses barres.
 */
function renderRevenueChart() {
  const chart = document.querySelector(".bar-chart-main");
  if (!chart) return;

  // Mode démo pur : on garde les barres d'exemple du HTML
  if (!supabase || currentUser?.id === "demo-user") return;

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), m: d.getMonth(), y: d.getFullYear(), total: 0 });
  }

  appData.invoices.forEach(inv => {
    if (inv.status === "Payée" && inv.paid_at) {
      const d = new Date(inv.paid_at);
      const bucket = months.find(x => x.m === d.getMonth() && x.y === d.getFullYear());
      if (bucket) bucket.total += Number(inv.amount);
    }
  });

  const hasData = months.some(x => x.total > 0);
  if (!hasData) {
    chart.innerHTML = `
      <div style="width:100%;text-align:center;color:var(--muted);font-size:13px;padding:2rem 0">
        Pas encore de revenus enregistrés.<br/>Ce graphique se remplira avec tes premières factures payées.
      </div>`;
    return;
  }

  const max = Math.max(...months.map(x => x.total), 1);
  chart.innerHTML = months.map((x, i) => `
    <div class="bar-wrap">
      <div class="bar-fill ${i === months.length - 1 ? "bar-fill-active" : ""}"
           style="height:${Math.max(6, Math.round((x.total / max) * 100))}%"></div>
      <span>${x.label}</span>
    </div>
  `).join("");
}

/**
 * Remplace les rapports "Juin/Mai/Avril 2025" codés en dur dans le HTML
 * par un vrai état honnête pour les comptes réels.
 *
 * ⚠️ Note honnête : il n'y a pas encore de vraie génération automatique de
 * rapports côté serveur (pas de table "reports", pas de cron/Edge Function
 * pour ça). Donc pour un compte réel, on ne peut pas afficher de "vrais"
 * rapports passés — on affiche un état vide au lieu d'inventer des chiffres.
 * Si tu veux cette fonctionnalité un jour, il faudra une table `reports` +
 * une Edge Function planifiée (cron) qui génère un PDF le 1er du mois.
 */
function renderReports() {
  const list = document.querySelector(".reports-list");
  const nextCard = document.querySelector(".next-report-card");
  if (!list) return;

  // Mode démo pur (Supabase non configuré) : on garde les exemples du HTML
  if (!supabase || currentUser?.id === "demo-user") return;

  list.innerHTML = `
    <div class="card" style="text-align:center;padding:3rem 1.5rem;color:var(--muted);font-size:14px;line-height:1.6">
      Aucun rapport généré pour l'instant.<br/>
      Cette fonctionnalité arrive bientôt : le premier rapport sera créé automatiquement
      le 1er du mois, dès que tu auras des clients actifs.
    </div>`;

  if (nextCard) {
    const activeClients = appData.clients.filter(c => c.status === "Actif").length;
    const meta = nextCard.querySelector("p:not(.outfit)");
    if (meta) {
      meta.textContent = activeClients > 0
        ? `Sera généré automatiquement dès que la fonctionnalité sera activée — ${activeClients} client${activeClients > 1 ? "s" : ""} actif${activeClients > 1 ? "s" : ""} concerné${activeClients > 1 ? "s" : ""}.`
        : `Ajoute des clients actifs pour que cette fonctionnalité te soit utile.`;
    }
  }
}

/**
 * Affiche une petite carte "Bienvenue, voici comment démarrer" tant que le
 * compte est tout neuf (0 client ET 0 devis). Disparaît dès que la personne
 * a commencé à utiliser l'app pour de vrai. Propose aussi de lancer le
 * tuto interactif guidé (voir startTutorial()).
 */
function renderOnboardingCard() {
  document.getElementById("onboarding-card")?.remove();

  if (!supabase || currentUser?.id === "demo-user") return;
  if (appData.clients.length > 0 || appData.quotes.length > 0) return;

  const header = document.querySelector("#tab-home .tab-header");
  if (!header) return;

  const card = document.createElement("div");
  card.id = "onboarding-card";
  card.className = "card onboarding-card";
  card.innerHTML = `
    <p class="outfit" style="font-size:16px;font-weight:700;margin-bottom:.5rem">
      👋 Bienvenue ! Ton espace est encore vide, c'est normal.
    </p>
    <p style="color:var(--muted);font-size:14px;margin-bottom:1rem">
      Suis le tuto guidé (30 secondes) pour découvrir où tout se trouve.
    </p>
    <button class="btn-primary" onclick="startTutorial()">🎬 Lancer le tuto interactif</button>
  `;
  header.after(card);

  // Lance automatiquement le tuto la toute première fois que ce
  // navigateur voit le dashboard (une seule fois, jamais réaffiché après).
  if (!localStorage.getItem("agenceauto_tutorial_done")) {
    setTimeout(() => startTutorial(), 600);
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   TUTO INTERACTIF — met en surbrillance les vrais boutons de l'appli,
   un par un, comme un tutoriel de jeu vidéo (spotlight + bulle d'aide).
═══════════════════════════════════════════════════════════════════════ */

const TUTORIAL_STEPS = [
  {
    selector: '[data-tab="tab-home"]',
    title: "Ton tableau de bord",
    text: "Ici tu retrouves un résumé de ton activité : revenus, devis, clients actifs.",
  },
  {
    selector: '.quick-action[onclick*="client"]',
    title: "1. Ajoute ton premier client",
    text: "Clique ici pour enregistrer les infos d'un client : nom, contact, email.",
  },
  {
    selector: '.quick-action[onclick*="quote"]',
    title: "2. Crée un devis",
    text: "Une fois ton client ajouté, génère-lui un devis en quelques secondes.",
  },
  {
    selector: '[data-tab="tab-invoices"]',
    title: "3. Suis tes factures",
    text: "Quand un devis est signé, transforme-le en facture et suis les paiements ici.",
  },
  {
    selector: '#trial-banner .trial-banner-btn, [data-tab="tab-settings"]',
    title: "4. Ton abonnement",
    text: "Tu as 14 jours gratuits. Passe à un plan payant ici quand tu es prêt à continuer.",
  },
];

let tutorialStepIndex = 0;

function startTutorial() {
  tutorialStepIndex = 0;
  document.getElementById("onboarding-card")?.remove();
  showTutorialStep();
}

function showTutorialStep() {
  removeTutorialUI();

  // Cherche le premier sélecteur du pas actuel qui existe réellement dans le DOM
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step) { endTutorial(); return; }

  const target = document.querySelector(step.selector);
  if (!target) {
    // L'élément n'est pas visible sur cet onglet : on passe au pas suivant
    tutorialStepIndex++;
    showTutorialStep();
    return;
  }

  const rect = target.getBoundingClientRect();
  const pad = 8;

  // Overlay sombre avec un "trou" lumineux exactement sur l'élément ciblé
  const overlay = document.createElement("div");
  overlay.id = "tutorial-overlay";
  overlay.className = "tutorial-overlay";
  document.body.appendChild(overlay);

  const spot = document.createElement("div");
  spot.id = "tutorial-spotlight";
  spot.className = "tutorial-spotlight";
  spot.style.top    = `${rect.top - pad}px`;
  spot.style.left   = `${rect.left - pad}px`;
  spot.style.width  = `${rect.width + pad * 2}px`;
  spot.style.height = `${rect.height + pad * 2}px`;
  document.body.appendChild(spot);

  // Bulle d'aide, positionnée sous l'élément (ou au-dessus s'il n'y a pas la place)
  const tooltip = document.createElement("div");
  tooltip.id = "tutorial-tooltip";
  tooltip.className = "tutorial-tooltip";
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < 180;
  tooltip.style.top  = placeAbove ? `${rect.top - 12}px`    : `${rect.bottom + 16}px`;
  tooltip.style.left = `${Math.min(Math.max(rect.left, 16), window.innerWidth - 340)}px`;
  if (placeAbove) tooltip.style.transform = "translateY(-100%)";

  tooltip.innerHTML = `
    <p class="tutorial-step-count">Étape ${tutorialStepIndex + 1} / ${TUTORIAL_STEPS.length}</p>
    <p class="outfit tutorial-title">${step.title}</p>
    <p class="tutorial-text">${step.text}</p>
    <div class="tutorial-actions">
      <button class="tutorial-skip" onclick="endTutorial()">Passer</button>
      <button class="tutorial-next" onclick="nextTutorialStep()">
        ${tutorialStepIndex === TUTORIAL_STEPS.length - 1 ? "Terminer ✓" : "Suivant →"}
      </button>
    </div>
  `;
  document.body.appendChild(tooltip);

  target.scrollIntoView({ block: "center", behavior: "smooth" });
}

function nextTutorialStep() {
  tutorialStepIndex++;
  showTutorialStep();
}

function endTutorial() {
  removeTutorialUI();
  localStorage.setItem("agenceauto_tutorial_done", "1");
  showToast("Tuto terminé ! Tu es prêt à gérer ton agence 🚀", "success");
}

function removeTutorialUI() {
  document.getElementById("tutorial-overlay")?.remove();
  document.getElementById("tutorial-spotlight")?.remove();
  document.getElementById("tutorial-tooltip")?.remove();
}


/* ═══════════════════════════════════════════════════════════════════════
   10. PARAMÈTRES
═══════════════════════════════════════════════════════════════════════ */

/**
 * Pré-remplit les champs des paramètres avec les infos de l'utilisateur connecté.
 */
function loadSettingsForm() {
  if (!currentUser) return;
  const setVal = (id, val) => { const el = document.getElementById(id);
  if (el) el.value = val || ""; };
  setVal("set-name",  currentUser.name);
  setVal("set-email", currentUser.email);
  // Affiche le plan actuel
  const planNames = { solo: "Plan Solo", agence: "Plan Agence", studio: "Plan Studio" };
  const planMetas = { solo: "29€/mois", agence: "79€/mois", studio: "199€/mois" };
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt("set-plan-name", planNames[currentUser.plan] || "Plan Agence");
  setTxt("set-plan-meta", `${planMetas[currentUser.plan] || "79€/mois"} · Renouvellement le 1er août 2025`);
}

/**
 * Sauvegarde le profil dans Supabase.
 * Appelé par le bouton "Sauvegarder" dans les paramètres.
 */
async function saveProfile() {
  const name    = document.getElementById("set-name")?.value.trim();
  const company = document.getElementById("set-company")?.value.trim();
  const website = document.getElementById("set-website")?.value.trim();
  if (!name) { showToast("Le nom est requis.", "error"); return; }

  try {
    if (supabase && currentUser?.id !== "demo-user") {
      // Met à jour la table profiles dans Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ name, company_name: company, website })
        .eq("id", currentUser.id);
      if (error) throw error;
    }

    // Met à jour l'état local
    currentUser.name = name;
    fillUserInfo();  // Rafraîchit la sidebar
    showToast("Profil sauvegardé !", "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  }
}

/**
 * Ouvre le portail Stripe pour gérer l'abonnement.
 * Nécessite une Edge Function Supabase configurée.
 *
 * ── Comment configurer le portail Stripe ──────────────────────────────
 * 1. Dans Stripe → Settings → Billing → Customer Portal → Activer
 * 2. Créer une Supabase Edge Function "stripe-portal" qui appelle
 * stripe.billingPortal.sessions.create()
 * 3. Remplacer l'URL ci-dessous par l'URL de ta fonction
 * ────────────────────────────────────────────────────────────────────
 */
async function openStripePortal() {
  if (!stripe || !supabase || currentUser?.id === "demo-user") {
    showToast("Stripe non configuré — mode démo.", "error");
    return;
  }

  try {
    showToast("Redirection vers le portail d'abonnement…", "success");
    // Appelle la Edge Function Supabase qui crée une session portail Stripe
    const { data, error } = await supabase.functions.invoke("stripe-portal", {
      body: { userId: currentUser.id }
      // ← Cette Edge Function est à créer dans Supabase → Edge Functions
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;

  } catch (err) {
    showToast("Erreur portail Stripe : " + err.message, "error");
  }
}

/**
 * Gère le clic sur un plan (depuis la landing page, la bannière d'essai,
 * ou le paywall qui bloque le dashboard).
 *
 * ⚠️ IMPORTANT — ancien bug corrigé ici :
 * Avant, la moindre erreur Stripe (Edge Function pas encore déployée,
 * Price ID encore en placeholder…) renvoyait la personne vers la page
 * d'inscription. Comme handleRegister() ne demande jamais de carte,
 * n'importe qui pouvait donc créer un compte gratuit illimité en
 * cliquant "S'abonner" puis en laissant l'erreur se produire.
 * Résultat : personne ne payait jamais, tout le monde restait en accès
 * complet "gratuit à vie" sans le savoir.
 *
 * Maintenant : si la personne n'est PAS connectée (clic depuis la landing
 * page publique) → on l'envoie s'inscrire normalement, c'est voulu.
 * Si la personne EST déjà connectée (clic depuis la bannière d'essai ou
 * le paywall) → on ne la renvoie JAMAIS vers l'inscription gratuite,
 * on affiche l'erreur telle quelle pour que le vrai problème (Stripe pas
 * configuré) soit visible et corrigé, au lieu d'être contourné.
 */
async function handleSubscribe(plan) {
  if (!stripe) {
    if (currentUser) {
      showToast(
        "Le paiement n'est pas encore activé sur ce site (ÉTAPE 2 du guide de déploiement : clé Stripe et Price ID à configurer).",
        "error"
      );
    } else {
      // Clic depuis la landing page publique, personne connecté : parcours normal → inscription
      showPage("register");
      const planEl = document.getElementById("reg-plan");
      if (planEl) planEl.value = plan;
    }
    return;
  }

  if (!currentUser) {
    // Pas encore de compte : on inscrit d'abord, le paiement viendra juste après
    showPage("register");
    const planEl = document.getElementById("reg-plan");
    if (planEl) planEl.value = plan;
    return;
  }

  try {
    showToast("Redirection vers le paiement…", "success");
    // ── Stripe Checkout ───────────────────────────────────────────
    // Nécessite une Edge Function Supabase "create-checkout-session"
    // Cette fonction crée une session Stripe et retourne un sessionId
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        priceId:   STRIPE_PRICES[plan],
        userId:    currentUser?.id,
        userEmail: currentUser?.email,
        // ← URLs de retour après paiement
        successUrl: `${window.location.origin}?payment=success`,
        cancelUrl:  `${window.location.origin}?payment=cancel`,
      }
    });
    if (error) throw error;

    // Redirige vers la page de paiement Stripe
    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  } catch (err) {
    // Erreur réelle (Edge Function absente, Price ID invalide…) :
    // on l'affiche clairement, on NE renvoie PLUS vers l'inscription gratuite.
    showToast("Erreur paiement : " + err.message, "error");
    console.error("Erreur Stripe Checkout :", err);
  }
}

/**
 * Active/désactive un toggle de notification.
 */
function toggleNotif(el) {
  el.classList.toggle("active");
  const isActive = el.classList.contains("active");
  showToast(isActive ? "Notification activée" : "Notification désactivée", "success");
  // TODO : Sauvegarder la préférence dans Supabase → table user_preferences
}


/* ═══════════════════════════════════════════════════════════════════════
   11. MODALS — Popups de création
═══════════════════════════════════════════════════════════════════════ */

/**
 * Ouvre un modal avec le bon contenu selon le type.
 * @param {string} type - "quote" | "client" | "invoice"
 */
function openModal(type) {
  const overlay   = document.getElementById("modal-overlay");
  const titleEl   = document.getElementById("modal-title");
  const bodyEl    = document.getElementById("modal-body");

  if (!overlay || !titleEl || !bodyEl) return;
  // Contenu selon le type
  const contents = {

    // ── MODAL : Nouveau devis ──────────────────────────────────────
    quote: {
      title: "Nouveau devis",
      html: `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group">
            <label class="form-label">Client</label>
            <input id="nq-client" class="form-input" placeholder="Nom de l'entreprise"/>
          </div>
 
          <div class="form-group">
            <label class="form-label">Titre / Objet</label>
            <input id="nq-title" class="form-input" placeholder="Refonte site web, Mission SEO…"/>
          </div>
          <div class="form-group">
            <label class="form-label">Montant HT (€)</label>
            <input id="nq-amount" type="number" min="0" step="0.01" class="form-input" placeholder="1500"/>
  
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="nq-notes" class="form-input" rows="3" style="resize:vertical" placeholder="Détails de la prestation, conditions…"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" onclick="closeModal()">Annuler</button>
            
            <button id="modal-submit-btn" class="btn-primary" onclick="submitNewQuote()">Créer le devis</button>
          </div>
        </div>`
    },

    // ── MODAL : Ajouter un client ──────────────────────────────────
    client: {
      title: "Ajouter un client",
      html: `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group">
            <label class="form-label">Entreprise</label>
        
            <input id="nc-name" class="form-input" placeholder="Atelier Créatif"/>
          </div>
          <div class="form-group">
            <label class="form-label">Contact principal</label>
            <input id="nc-contact" class="form-input" placeholder="Marie Dupont"/>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
       
             <input id="nc-email" type="email" class="form-input" placeholder="marie@atelier.fr"/>
          </div>
          <div class="form-group">
            <label class="form-label">Plan de facturation</label>
            <select id="nc-plan" class="form-input">
              <option value="Mensuel">Mensuel</option>
              <option value="Annuel">Annuel</option>
           
              <option value="Ponctuel">Ponctuel</option>
            </select>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" onclick="closeModal()">Annuler</button>
            <button id="modal-submit-btn" class="btn-primary" onclick="submitNewClient()">Ajouter le client</button>
          </div>
        </div>`
    },

    // ── MODAL : Nouvelle facture 
    invoice: {
      title: "Nouvelle facture",
      html: `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group">
            <label class="form-label">Client</label>
            <select id="ni-client" class="form-input">
              ${appData.clients.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("")}
            </select>
    
          </div>
          <div class="form-group">
            <label class="form-label">Montant HT (€)</label>
            <input id="ni-amount" type="number" min="0" step="0.01" class="form-input" placeholder="1500"/>
          </div>
          <div class="form-group">
            <label class="form-label">Date d'échéance</label>
            <input id="ni-due" type="date" class="form-input"/>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" onclick="closeModal()">Annuler</button>
            <button id="modal-submit-btn" class="btn-primary" onclick="submitNewInvoice()">Créer la facture</button>
          </div>
        </div>`
    },
  };
  const content = contents[type];
  if (!content) return;

  titleEl.textContent = content.title;
  bodyEl.innerHTML    = content.html;

  overlay.classList.remove("hidden");
}

/**
 * Ferme le modal.
 */
function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.classList.add("hidden");
}

/**
 * Crée une nouvelle facture depuis le modal.
 */
async function submitNewInvoice() {
  const client = document.getElementById("ni-client")?.value;
  const amount = parseFloat(document.getElementById("ni-amount")?.value);
  const due    = document.getElementById("ni-due")?.value;
  if (!client || isNaN(amount) || amount <= 0) {
    showToast("Client et montant requis.", "error");
    return;
  }

  const btn = document.getElementById("modal-submit-btn");
  setButtonLoading(btn, true, "Création…");

  const ref = `FAC-${String(appData.invoices.length + 1).padStart(3, "0")}`;
  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { data, error } = await supabase
        .from("invoices")
        .insert([{
          user_id:     currentUser.id,
          client_name: client,
          reference:   ref,
          amount,
          status: "En attente",
          due_date:    due || null,
        }])
        .select()
        .single();
      if (error) throw error;
      appData.invoices.unshift(data);

    } else {
      appData.invoices.unshift({
        id:          ref,
        client_name: client,
        amount,
        status:      "En attente",
        due_date:    due,
        paid_at:     null,
        created_at:  new Date().toISOString(),
 
      });
    }

    renderInvoices();
    closeModal();
    showToast(`Facture ${ref} créée !`, "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  } finally {
    setButtonLoading(btn, false, "Créer la facture");
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   12. TOAST — Notifications
═══════════════════════════════════════════════════════════════════════ */

let toastTimer = null;
/**
 * Affiche une notification en bas à droite.
 * @param {string} message - Le texte à afficher
 * @param {"success"|"error"} type - Type de notification
 */
function showToast(message, type = "success") {
  const toast  = document.getElementById("toast");
  const icon   = document.getElementById("toast-icon");
  const msgEl  = document.getElementById("toast-msg");

  if (!toast) return;
  // Contenu
  if (icon)  icon.textContent  = type === "error" ? "✕" : "✓";
  if (msgEl) msgEl.textContent = message;

  // Style selon le type
  toast.className = "toast" + (type === "error" ? " toast-error" : "");
  toast.classList.remove("hidden");

  // Auto-fermeture après 3.5 secondes
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3500);
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.add("hidden");
}


/* ═══════════════════════════════════════════════════════════════════════
   13. UTILITAIRES
═══════════════════════════════════════════════════════════════════════ */

/**
 * Change l'onglet actif dans le dashboard.
 * @param {HTMLElement} clickedBtn - Le bouton cliqué dans la sidebar
 */
function switchTab(clickedBtn) {
  // Désactive tous les onglets
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));

  // Active l'onglet cliqué
  clickedBtn.classList.add("active");
  const tabId = clickedBtn.getAttribute("data-tab");
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.remove("hidden");
  // Met à jour le titre dans la topbar
  const titleEl = document.getElementById("topbar-title");
  if (titleEl) {
    const label = clickedBtn.querySelector(".nav-label");
    titleEl.textContent = label ? label.textContent : "";
  }

  // Actions spécifiques par onglet
  if (tabId === "tab-settings") loadSettingsForm();
  if (tabId === "tab-reports")  renderReports();
}

/**
 * Ouvre un onglet par son ID (sans cliquer le bouton).
 * Utilisé par les actions rapides de la page d'accueil.
 */
function switchTabById(tabId) {
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn) switchTab(btn);
}

/**
 * Affiche les initiales et le nom de l'utilisateur dans la sidebar et la topbar.
 */
function fillUserInfo() {
  if (!currentUser) return;

  const initials = currentUser.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  // Salutation sur la page d'accueil
  const greeting = document.getElementById("dash-greeting");
  if (greeting) greeting.textContent = `Bonjour, ${currentUser.name.split(" ")[0]} 👋`;
  // Sidebar
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("sidebar-avatar", initials);
  setEl("sidebar-name",   currentUser.name);
  setEl("sidebar-email",  currentUser.email);

  // Topbar
  setEl("topbar-avatar", initials);
}

/**
 * Rétrécit ou agrandit la sidebar.
 */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const btn     = document.getElementById("sidebar-toggle-btn");
  if (!sidebar || !btn) return;

  sidebar.classList.toggle("collapsed");
  btn.textContent = sidebar.classList.contains("collapsed") ? "›" : "‹";
}

/**
 * Affiche/masque le mot de passe dans un champ.
 * @param {string} inputId - ID du champ mot de passe
 * @param {HTMLElement} btn - Le bouton cliqué
 */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "🙈" : "👁";
}

/**
 * Initialise les accordéons FAQ.
 * Doit être appelé après l'affichage de la page landing.
 */
function initFaq() {
  document.querySelectorAll(".faq-question").forEach(btn => {
    // Retire les anciens écouteurs pour éviter les doublons
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;

      const isOpen = item.classList.contains("open");

      // Ferme tous les éléments ouverts
      document.querySelectorAll(".faq-item.open").forEach(el => el.classList.remove("open"));

      // Ouvre celui cliqué (si ce n'était pas déjà ouvert)
      if (!isOpen) item.classList.add("open");
    });
  });
}

/**
 * Lance l'animation des compteurs sur la page hero.
 */
function animateCounters() {
  const counters = document.querySelectorAll("[data-target]");
  counters.forEach(el => {
    const target  = parseInt(el.getAttribute("data-target"));
    const prefix  = el.getAttribute("data-prefix") || "";
    const suffix  = el.getAttribute("data-suffix") || "";
    const dur     = 1800; // durée en ms
    const step    = 16;   // 60fps
    const steps   = dur / step;
    let i = 0;

    const timer = setInterval(() => {
      i++;
      const progress = Math.min(i / steps, 1);
      // Easing (accélère puis décélère)
      const ease  = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const value = Math.round(target * ease);

      // Format spécial pour l'euro
      if (prefix === "€ ") {
        el.textContent = new Intl.NumberFormat("fr-FR").format(value) + " €";
      } else {
    
        el.textContent = prefix + value + suffix;
      }

      if (i >= steps) clearInterval(timer);
    }, step);
  });
}

/**
 * Formate un nombre en euros.
 * @param {number} n
 * @returns {string} Ex: "4 200 €"
 */
function formatEur(n) {
  return new Intl.NumberFormat("fr-FR", {
    style:    "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Formate une date ISO en date lisible française.
 * @param {string} isoStr - Ex: "2025-06-28T10:30:00Z"
 * @returns {string} Ex: "28 juin 2025"
 */
function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("fr-FR", {
      day:   "numeric",
      month: "long",
      year:  "numeric",
    });
  } catch {
    return isoStr;
  }
}

/**
 * Génère un badge HTML coloré selon le statut.
 * @param {string} status
 * @returns {string} HTML du badge
 */
function statusBadge(status) {
  const config = {
    "Actif":       { cls: "badge-mint",   label: "Actif" },
    "En pause":    { cls: "badge-amber",  label: "En pause" },
    "Prospect":    { cls: "badge-muted",  label: "Prospect" },
    "Signé":       { cls: "badge-mint",   label: "Signé" },
    "En attente":  { cls: "badge-amber",  label: "En attente" },
   
    "Refusé":      { cls: "badge-red",    label: "Refusé" },
    "Brouillon":   { cls: "badge-muted",  label: "Brouillon" },
    "Payée":       { cls: "badge-mint",   label: "Payée" },
    "En retard":   { cls: "badge-red",    label: "En retard" },
  };
  const c = config[status] || { cls: "badge-muted", label: status };
  return `<span class="badge ${c.cls}">${c.label}</span>`;
}

/**
 * Protège contre les injections XSS en échappant le HTML.
 * TOUJOURS utiliser cette fonction avant d'injecter des données utilisateur dans le DOM.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

/**
 * Affiche un message d'erreur dans un champ.
 */
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

/**
 * Cache le message d'erreur d'un champ.
 */
function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add("hidden");
}

/**
 * Met un bouton en état de chargement (spinner + texte).
 */
function setButtonLoading(btn, isLoading, loadingText) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.style.opacity = isLoading ? ".65" : "1";
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  } else {
    btn.innerHTML = btn.dataset.originalText || loadingText;
  }
}

/**
 * Pause asynchrone (pour simuler des délais réseau en mode démo).
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gère les hoveurs des cartes features sur la landing page.
 * Change la couleur de la bordure selon data-color.
 */
function initFeatureCards() {
  document.querySelectorAll(".feature-card").forEach(card => {
    const color = card.getAttribute("data-color");
    if (!color) return;
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = color;
    });
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "";
    });
  });
}


/* ═══════════════════════════════════════════════════════════════════════
   14. INITIALISATION
   Tout ce qui se passe au chargement de la page.
═══════════════════════════════════════════════════════════════════════ */

/**
 * Point d'entrée principal.
 * Appelé quand le DOM est entièrement chargé.
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 AgenceAuto chargé");

  // ── 1. Vérifie si une session Supabase existe déjà ───────────────
  // (Utilisateur qui revient sur le site sans s'être déconnecté)
  await checkExistingSession();

  // ── 2. Si aucune session → affiche la landing page ───────────────
  if (!currentUser) {
    showPage("landing");
  }

  // ── 3. Initialise les interactions de la landing ─────────────────
  initFeatureCards();

  // ── 4. Écoute les changements de session Supabase ────────────────
  // Gère les cas : token expiré, déconnexion depuis un autre onglet, etc.
  if (supabase) {
 
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event :", event);

      if (event === "SIGNED_OUT") {
        // L'utilisateur a été déconnecté (depuis un autre onglet ou token expiré)
        currentUser = null;
        showPage("landing");
        showToast("Session expirée. Reconnectez-vous.", "error");
      }

      if (event === "SIGNED_IN" && session && !currentUser) {
        // Connexion via Google OAuth (retour de la redirection)
        fetchProfile(session.user.id).then(profile => {
          currentUser = {
            id:    session.user.id,
            name:  profile?.name  || session.user.email.split("@")[0],
            email: profile?.email || session.user.email,
            plan:  profile?.plan  || "solo",
            // ── Infos d'abonnement, utilisées par applyAccessGate() ──────
            subscriptionStatus: profile?.subscription_status || "trial",
            createdAt: profile?.created_at || session.user.created_at,
          };
          showPage("dashboard");
          showToast("Connexion réussie !", "success");
        });
      }
    });
  }

  // ── 5. Gère les paramètres URL après paiement Stripe ─────────────
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    window.history.replaceState({}, "", window.location.pathname);

    // Le webhook Stripe met à jour subscription_status="active" en base,
    // mais currentUser en mémoire ne le sait pas encore : on re-fetch le
    // profil avant de relever le paywall, sinon il resterait affiché
    // malgré le paiement réussi.
    if (supabase && currentUser?.id) {
      const freshProfile = await fetchProfile(currentUser.id);
      if (freshProfile) {
        currentUser.subscriptionStatus = freshProfile.subscription_status;
        currentUser.plan = freshProfile.plan || currentUser.plan;
      }
    }
    showToast("Paiement réussi ! Bienvenue sur AgenceAuto 🎉", "success");
    applyAccessGate();
  }
  if (params.get("payment") === "cancel") {
    showToast("Paiement annulé.", "error");
    window.history.replaceState({}, "", window.location.pathname);
  }
});

/*
  ═══════════════════════════════════════════════════════════════════
  FIN DU FICHIER app.js

  Récapitulatif des TODO pour connecter les vraies fonctionnalités :
  ─────────────────────────────────────────────────────────────────
  [ ] Remplir STRIPE_PUBLIC_KEY et STRIPE_PRICES (section 2)
  [ ] Créer les produits dans Stripe (29€, 79€, 199€)
  [ ] Créer les Edge Functions Supabase :
      - create-checkout-session (pour le paiement Stripe)
      - stripe-portal (pour gérer l'abonnement)
      - stripe-webhook (pour synchroniser les paiements)
  [ ] Activer Google OAuth dans Supabase (optionnel)
  [ ] Connecter un service d'envoi d'email (Resend, SendGrid)
      pour sendQuote() et les relances automatiques
  ═══════════════════════════════════════════════════════════════════
*/
