/*
╔══════════════════════════════════════════════════════════════════════════╗
║                        AGENCEAUTO — app.js                              ║
║                                                                          ║
║  Ce fichier contient TOUTE la logique JavaScript de l'application.      ║
║                                                                          ║
║  Organisation :                                                          ║
║    1.  CONFIGURATION SUPABASE  ← à remplir avec tes vraies clés         ║
║    2.  CONFIGURATION STRIPE    ← à remplir avec tes vraies clés         ║
║    3.  ÉTAT DE L'APPLICATION   (données en mémoire)                     ║
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


/*
╔══════════════════════════════════════════════════════════════════════════╗
║                        AGENCEAUTO — app.js                              ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

// ── 1. CONFIGURATION SUPABASE ─────────────────────────────────────────────
// Remplace ces valeurs par tes vraies clés Supabase si ce n'est pas déjà fait !
const SUPABASE_URL  = "https://tqhcsfejebjlqwnxllsr.supabase.co"; 
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGNzZmVqZWJqbHF3bnhsbHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDQ4MjAsImV4cCI6MjA5ODgyMDgyMH0.4C3dUf0B7upW3nbctmMF0b16bvqvR0dVhJe2U9rjRoQ";

// 💡 ASTUCE : On sauvegarde le module du CDN pour éviter le crash de doublon
const supabaseLib = window.supabase;

// On utilise 'var' pour écraser proprement l'initialisation sans erreur de syntaxe
var supabase = null; 

try {
  if (
    SUPABASE_URL  !== "https://tqhcsfejebjlqwnxllsr.supabase.co" &&
    SUPABASE_ANON !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGNzZmVqZWJqbHF3bnhsbHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDQ4MjAsImV4cCI6MjA5ODgyMDgyMH0.4C3dUf0B7upW3nbctmMF0b16bvqvR0dVhJe2U9rjRoQ"
  ) {
    // ✅ Connexion active à ta vraie base de données
    supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log("✅ Supabase connecté avec succès !");
  } else {
    // ⚠️ Mode démo si les clés ne sont pas encore détectées comme changées
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

const STRIPE_PUBLIC_KEY = "COLLE_TA_CLE_STRIPE_ICI";
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
  }

  // Remonte en haut de la page
  window.scrollTo(0, 0);
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
      await sleep(900); // Simule le délai réseau
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
      return;
    }

    // ── Vraie inscription Supabase ────────────────────────────────
    // Crée le compte dans auth.users
    // Le trigger SQL crée automatiquement le profil dans public.profiles
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Ces données sont transmises au trigger SQL
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
      // Met à jour le profil avec le plan choisi (sécurité en cas de délai du trigger)
      if (supabase) {
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, email, name, plan })
          .eq("id", data.user.id);
      }

      currentUser = { id: data.user.id, name, email, plan };
      showToast("Compte créé ! Bienvenue 🎉", "success");
      showPage("dashboard");
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
    .single();           // ← On attend un seul résultat

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
  if (!supabase) return; // Mode démo : pas de session persistante

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
      .select("*")                                        // ← Récupère toutes les colonnes
      .eq("user_id", currentUser.id)                     // ← Seulement les clients de cet utilisateur
      .order("created_at", { ascending: false });         // ← Les plus récents en premier

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
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
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
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("stat-revenue", formatEur(monthRevenue) || "14 820 €"); // Fallback démo
  setEl("stat-quotes",  appData.quotes.length   || "28");
  setEl("stat-clients", activeClients           || "47");
  setEl("stat-sign",    `${rate}%`              || "91%");
}


/* ═══════════════════════════════════════════════════════════════════════
   10. PARAMÈTRES
═══════════════════════════════════════════════════════════════════════ */

/**
 * Pré-remplit les champs des paramètres avec les infos de l'utilisateur connecté.
 */
function loadSettingsForm() {
  if (!currentUser) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
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
 *    stripe.billingPortal.sessions.create()
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
 * Gère le clic sur les abonnements depuis la landing page.
 * Si Stripe est configuré → redirige vers Stripe Checkout
 * Sinon → redirige vers l'inscription
 */
async function handleSubscribe(plan) {
  if (!stripe) {
    // Stripe non configuré → redirige vers l'inscription
    showPage("register");
    // Pré-sélectionne le bon plan
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
    showToast("Erreur paiement : " + err.message, "error");
    showPage("register");
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

    // ── MODAL : Nouvelle facture ───────────────────────────────────
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
          status:      "En attente",
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
    showToast("Paiement réussi ! Bienvenue sur AgenceAuto 🎉", "success");
    // Nettoie l'URL
    window.history.replaceState({}, "", window.location.pathname);
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
