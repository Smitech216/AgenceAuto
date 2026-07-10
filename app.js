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
═══════════════════════════════════════════════════════════════════════ */

const STRIPE_PUBLIC_KEY = "pk_test_51Tol4C9AI6nFEqZd1nS0xi5dtb9Q5px1BviBoaXE5FoHkCYIWtqkKJBoh34Dgi2HSyM4gvexfO5O9yYtrRGg5cGY00vZDvW1B0";

// ⚠️ IMPORTANT : ce sont des "prod_..." (Product ID), pas des "price_..." (Price ID) !
// Stripe Checkout a besoin du Price ID, pas du Product ID. Va sur ton
// Dashboard Stripe → Produits → clique sur chaque produit → dans la section
// "Tarification", copie l'ID qui commence par "price_" (pas "prod_").
// Tant que ce ne sera pas corrigé, le paiement échouera avec une erreur Stripe.
const STRIPE_PRICES = {
  solo:   "prod_Ur9dB8VjeDtZBq",   // ← à remplacer par un vrai "price_..."
  agence: "prod_Ur9dX22cPLm27f",   // ← à remplacer par un vrai "price_..."
  studio: "prod_Ur9eYfyGVycxek",   // ← à remplacer par un vrai "price_..."
};

// Initialisation Stripe
let stripe = null;
try {
  if (STRIPE_PUBLIC_KEY) {
    stripe = Stripe(STRIPE_PUBLIC_KEY);
    console.log("✅ Stripe initialisé");
  } else {
    console.warn("⚠️ Stripe non configuré. Les paiements redirigent vers l'inscription.");
  }
} catch (e) {
  console.error("Erreur Stripe :", e.message);
}

const TRIAL_DAYS = 14;


/* ═══════════════════════════════════════════════════════════════════════
   3. ÉTAT DE L'APPLICATION
═══════════════════════════════════════════════════════════════════════ */

let currentUser = null;

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
   4. NAVIGATION
═══════════════════════════════════════════════════════════════════════ */

function showPage(pageName) {
  const allPages = document.querySelectorAll(".page");
  allPages.forEach(p => p.classList.add("hidden"));

  const target = document.getElementById("page-" + pageName);
  if (target) {
    target.classList.remove("hidden");
  } else {
    console.error("Page introuvable :", pageName);
    return;
  }

  if (pageName === "landing") {
    animateCounters();
    initFaq();
  }

  if (pageName === "dashboard") {
    fillUserInfo();
    switchTabById("tab-home");
    loadAllData();
    applyAccessGate();
  }

  window.scrollTo(0, 0);
}

window.showPage = showPage;


/* ═══════════════════════════════════════════════════════════════════════
   4bis. ACCÈS / ESSAI GRATUIT / PAYWALL
═══════════════════════════════════════════════════════════════════════ */

function applyAccessGate() {
  removeTrialBanner();
  removePaywall();

  if (!supabase || currentUser?.id === "demo-user") return;

  const status = currentUser?.subscriptionStatus || "trial";

  if (status === "active") return;

  const created  = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const msLeft   = trialEnd.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  if (status === "trial" && msLeft > 0) {
    showTrialBanner(daysLeft);
    return;
  }

  showPaywall(status);
}

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

function showPaywall(status) {
  if (document.getElementById("paywall-overlay")) return;

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
═══════════════════════════════════════════════════════════════════════ */

async function loginWithGoogle() {
  if (!supabase) {
    showToast("Mode démo : connexion Google simulée", "success");
    simulateLogin("Utilisateur Google", "google@demo.fr", "agence");
    return;
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    showToast("Erreur Google OAuth : " + err.message, "error");
  }
}

async function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  hideError("login-error");
  if (!email || !password) {
    showError("login-error", "Email et mot de passe requis.");
    return;
  }
  if (password.length < 6) {
    showError("login-error", "Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  const btn = document.getElementById("login-btn");
  setButtonLoading(btn, true, "Connexion…");

  try {
    if (!supabase) {
      await sleep(900);
      simulateLogin(email.split("@")[0], email, "agence");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = translateAuthError(error.message);
      showError("login-error", msg);
      return;
    }

    const profile = await fetchProfile(data.user.id);
    currentUser = {
      id:    data.user.id,
      name:  profile?.name  || email.split("@")[0],
      email: profile?.email || email,
      plan:  profile?.plan  || "solo",
      subscriptionStatus: profile?.subscription_status || "trial",
      createdAt: profile?.created_at || data.user.created_at,
    };

    showToast("Connexion réussie !", "success");
    showPage("dashboard");
  } catch (err) {
    showError("login-error", "Une erreur inattendue s'est produite.");
    console.error(err);
  } finally {
    setButtonLoading(btn, false, "Se connecter");
  }
}

async function handleRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const plan     = document.getElementById("reg-plan").value;

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
      await sleep(1000);
      simulateLogin(name, email, plan);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name, plan: plan } }
    });

    if (error) {
      showError("reg-error", translateAuthError(error.message));
      return;
    }

    if (data.user) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .upsert({ id: data.user.id, email, name, plan })
        .select()
        .single();

      currentUser = {
        id: data.user.id,
        name, email, plan,
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

async function handleLogout() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  currentUser = null;
  removePaywall();
  removeTrialBanner();
  showPage("landing");
  showToast("Vous êtes déconnecté.", "success");
}

async function fetchProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erreur fetchProfile :", error.message);
    return null;
  }
  return data;
}

function simulateLogin(name, email, plan) {
  currentUser = { id: "demo-user", name, email, plan };
  showToast("Connexion réussie !", "success");
  showPage("dashboard");
}

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

async function checkExistingSession() {
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      currentUser = {
        id:    session.user.id,
        name:  profile?.name  || session.user.email.split("@")[0],
        email: profile?.email || session.user.email,
        plan:  profile?.plan  || "solo",
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

async function loadClients() {
  if (supabase && currentUser?.id !== "demo-user") {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur loadClients :", error.message);
    } else {
      appData.clients = data || [];
    }
  }
  renderClients();
}

function renderClients() {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  const countEl = document.getElementById("clients-count");
  if (countEl) {
    const actifs = appData.clients.filter(c => c.status === "Actif").length;
    countEl.textContent = `${appData.clients.length} clients · ${actifs} actifs`;
  }

  if (appData.clients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:3rem;text-align:center;color:var(--muted)">
          Aucun client pour l'instant. Cliquez sur "+ Ajouter un client".
        </td>
      </tr>`;
    return;
  }

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
      const { data, error } = await supabase
        .from("clients")
        .insert([{
          user_id:      currentUser.id,
          name, contact, email,
          billing_plan: plan,
          status:       "Prospect",
          revenue:      0,
        }])
        .select()
        .single();
      if (error) throw error;
      appData.clients.unshift(data);
    } else {
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

function renderQuotes() {
  const tbody = document.getElementById("quotes-tbody");
  if (!tbody) return;
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
          <button class="btn-accent-sm" onclick="sendQuote('${q.id || q.reference}')">Envoyer</button>
          ${q.status === "En attente" ? `
            <button class="btn-accent-sm" style="background:rgba(14,207,164,.15);color:var(--mint)"
              onclick="markQuoteSigned('${q.id || q.reference}')">Marquer signé</button>
          ` : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

function sendQuote(quoteId) {
  showToast(`Devis ${quoteId} envoyé par email.`, "success");
}

async function markQuoteSigned(quoteId) {
  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "Signé", signed_at: new Date().toISOString() })
        .eq("id", quoteId);
      if (error) throw error;
    }

    const q = appData.quotes.find(x => (x.id || x.reference) === quoteId);
    if (q) q.status = "Signé";

    renderQuotes();
    showToast(`Devis ${quoteId} marqué comme signé ✓`, "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  }
}

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

  const today  = new Date();
  const pad    = n => String(n).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 900) + 100);
  const ref    = `DEV-${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}-${random}`;

  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { data, error } = await supabase
        .from("quotes")
        .insert([{
          user_id:      currentUser.id,
          client_name:  client,
          reference:    ref,
          title, amount, notes,
          status:       "Brouillon",
          validity_days: 30,
        }])
        .select()
        .single();
      if (error) throw error;
      appData.quotes.unshift(data);
    } else {
      appData.quotes.unshift({
        id: ref, client_name: client, amount,
        status: "Brouillon", created_at: new Date().toISOString(),
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

function renderInvoices() {
  const tbody = document.getElementById("invoices-tbody");
  if (!tbody) return;
  const paid    = appData.invoices.filter(f => f.status === "Payée").reduce((s, f) => s + Number(f.amount), 0);
  const pending = appData.invoices.filter(f => f.status === "En attente").reduce((s, f) => s + Number(f.amount), 0);
  const late    = appData.invoices.filter(f => f.status === "En retard").reduce((s, f) => s + Number(f.amount), 0);
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("inv-paid",    formatEur(paid));
  setEl("inv-pending", formatEur(pending));
  setEl("inv-late",    formatEur(late));
  setEl("invoices-overdue", `${formatEur(late)} en retard`);

  if (appData.invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:3rem;text-align:center;color:var(--muted)">Aucune facture.</td>
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
          <button class="btn-accent-sm" style="background:rgba(14,207,164,.15);color:var(--mint)"
            onclick="markInvoicePaid('${inv.id || inv.reference}')">Marquer payée</button>
        ` : `<span style="font-size:11px;color:var(--muted)">✓ Archivée</span>`}
      </td>
    </tr>
  `).join("");
}

async function markInvoicePaid(invoiceId) {
  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "Payée", paid_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
    }

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

async function loadAllData() {
  await Promise.all([loadClients(), loadQuotes(), loadInvoices()]);
  updateDashboardStats();
}

function updateDashboardStats() {
  const now          = new Date();
  const monthRevenue = appData.invoices
    .filter(inv => {
      if (inv.status !== "Payée" || !inv.paid_at) return false;
      const d = new Date(inv.paid_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const sent   = appData.quotes.filter(q => ["Signé", "Refusé", "En attente"].includes(q.status)).length;
  const signed = appData.quotes.filter(q => q.status === "Signé").length;
  const rate   = sent > 0 ? Math.round((signed / sent) * 100) : 0;

  const activeClients = appData.clients.filter(c => c.status === "Actif").length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("stat-revenue", formatEur(monthRevenue));
  setEl("stat-quotes",  appData.quotes.length);
  setEl("stat-clients", activeClients);
  setEl("stat-sign",    `${rate}%`);

  renderActivityFeed();
  renderRevenueChart();
  renderOnboardingCard();
}

function renderActivityFeed() {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;
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
      events.push({ date: inv.paid_at, text: `Facture payée — ${formatEur(inv.amount)}`, color: "accent" });
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

function renderRevenueChart() {
  const chart = document.querySelector(".bar-chart-main");
  if (!chart) return;
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

function renderReports() {
  const list = document.querySelector(".reports-list");
  const nextCard = document.querySelector(".next-report-card");
  if (!list) return;
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

  if (!localStorage.getItem("agenceauto_tutorial_done")) {
    setTimeout(() => startTutorial(), 600);
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   TUTO INTERACTIF
═══════════════════════════════════════════════════════════════════════ */

const TUTORIAL_STEPS = [
  { selector: '[data-tab="tab-home"]', title: "Ton tableau de bord",
    text: "Ici tu retrouves un résumé de ton activité : revenus, devis, clients actifs." },
  { selector: '.quick-action[onclick*="client"]', title: "1. Ajoute ton premier client",
    text: "Clique ici pour enregistrer les infos d'un client : nom, contact, email." },
  { selector: '.quick-action[onclick*="quote"]', title: "2. Crée un devis",
    text: "Une fois ton client ajouté, génère-lui un devis en quelques secondes." },
  { selector: '[data-tab="tab-invoices"]', title: "3. Suis tes factures",
    text: "Quand un devis est signé, transforme-le en facture et suis les paiements ici." },
  { selector: '#trial-banner .trial-banner-btn, [data-tab="tab-settings"]', title: "4. Ton abonnement",
    text: "Tu as 14 jours gratuits. Passe à un plan payant ici quand tu es prêt à continuer." },
];

let tutorialStepIndex = 0;

function startTutorial() {
  tutorialStepIndex = 0;
  document.getElementById("onboarding-card")?.remove();
  showTutorialStep();
}

function showTutorialStep() {
  removeTutorialUI();
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step) { endTutorial(); return; }

  const target = document.querySelector(step.selector);
  if (!target) {
    tutorialStepIndex++;
    showTutorialStep();
    return;
  }

  const rect = target.getBoundingClientRect();
  const pad = 8;

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

function loadSettingsForm() {
  if (!currentUser) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  setVal("set-name",  currentUser.name);
  setVal("set-email", currentUser.email);
  const planNames = { solo: "Plan Solo", agence: "Plan Agence", studio: "Plan Studio" };
  const planMetas = { solo: "29€/mois", agence: "79€/mois", studio: "199€/mois" };
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt("set-plan-name", planNames[currentUser.plan] || "Plan Agence");
  setTxt("set-plan-meta", `${planMetas[currentUser.plan] || "79€/mois"} · Renouvellement le 1er août 2025`);
}

async function saveProfile() {
  const name    = document.getElementById("set-name")?.value.trim();
  const company = document.getElementById("set-company")?.value.trim();
  const website = document.getElementById("set-website")?.value.trim();
  if (!name) { showToast("Le nom est requis.", "error"); return; }

  try {
    if (supabase && currentUser?.id !== "demo-user") {
      const { error } = await supabase
        .from("profiles")
        .update({ name, company_name: company, website })
        .eq("id", currentUser.id);
      if (error) throw error;
    }

    currentUser.name = name;
    fillUserInfo();
    showToast("Profil sauvegardé !", "success");
  } catch (err) {
    showToast("Erreur : " + err.message, "error");
  }
}

/**
 * Ouvre le portail Stripe pour gérer l'abonnement.
 * ⚠️ BUG CORRIGÉ ICI : le nom de l'Edge Function invoquée était par erreur
 * remplacé par ta clé publique Stripe ("pk_test_...") au lieu du vrai nom
 * "stripe-portal". Avec l'ancien code, cet appel n'aurait jamais pu
 * fonctionner, même une fois l'Edge Function déployée.
 */
async function openStripePortal() {
  if (!stripe || !supabase || currentUser?.id === "demo-user") {
    showToast("Stripe non configuré — mode démo.", "error");
    return;
  }

  try {
    showToast("Redirection vers le portail d'abonnement…", "success");
    const { data, error } = await supabase.functions.invoke("stripe-portal", {
      body: { userId: currentUser.id }
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;
  } catch (err) {
    showToast("Erreur portail Stripe : " + err.message, "error");
  }
}

async function handleSubscribe(plan) {
  if (!stripe) {
    if (currentUser) {
      showToast(
        "Le paiement n'est pas encore activé sur ce site (ÉTAPE 2 du guide de déploiement : clé Stripe et Price ID à configurer).",
        "error"
      );
    } else {
      showPage("register");
      const planEl = document.getElementById("reg-plan");
      if (planEl) planEl.value = plan;
    }
    return;
  }

  if (!currentUser) {
    showPage("register");
    const planEl = document.getElementById("reg-plan");
    if (planEl) planEl.value = plan;
    return;
  }

  try {
    showToast("Redirection vers le paiement…", "success");
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        priceId:   STRIPE_PRICES[plan],
        userId:    currentUser?.id,
        userEmail: currentUser?.email,
        successUrl: `${window.location.origin}?payment=success`,
        cancelUrl:  `${window.location.origin}?payment=cancel`,
      }
    });
    if (error) throw error;

    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  } catch (err) {
    showToast("Erreur paiement : " + err.message, "error");
    console.error("Erreur Stripe Checkout :", err);
  }
}

function toggleNotif(el) {
  el.classList.toggle("active");
  const isActive = el.classList.contains("active");
  showToast(isActive ? "Notification activée" : "Notification désactivée", "success");
}


/* ═══════════════════════════════════════════════════════════════════════
   11. MODALS
═══════════════════════════════════════════════════════════════════════ */

function openModal(type) {
  const overlay   = document.getElementById("modal-overlay");
  const titleEl   = document.getElementById("modal-title");
  const bodyEl    = document.getElementById("modal-body");
  if (!overlay || !titleEl || !bodyEl) return;

  const contents = {
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

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.classList.add("hidden");
}

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
          user_id: currentUser.id, client_name: client, reference: ref,
          amount, status: "En attente", due_date: due || null,
        }])
        .select()
        .single();
      if (error) throw error;
      appData.invoices.unshift(data);
    } else {
      appData.invoices.unshift({
        id: ref, client_name: client, amount, status: "En attente",
        due_date: due, paid_at: null, created_at: new Date().toISOString(),
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
   12. TOAST
═══════════════════════════════════════════════════════════════════════ */

let toastTimer = null;

function showToast(message, type = "success") {
  const toast  = document.getElementById("toast");
  const icon   = document.getElementById("toast-icon");
  const msgEl  = document.getElementById("toast-msg");
  if (!toast) return;

  if (icon)  icon.textContent  = type === "error" ? "✕" : "✓";
  if (msgEl) msgEl.textContent = message;

  toast.className = "toast" + (type === "error" ? " toast-error" : "");
  toast.classList.remove("hidden");

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

function switchTab(clickedBtn) {
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));

  clickedBtn.classList.add("active");
  const tabId = clickedBtn.getAttribute("data-tab");
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.remove("hidden");

  const titleEl = document.getElementById("topbar-title");
  if (titleEl) {
    const label = clickedBtn.querySelector(".nav-label");
    titleEl.textContent = label ? label.textContent : "";
  }

  if (tabId === "tab-settings") loadSettingsForm();
  if (tabId === "tab-reports")  renderReports();
}

function switchTabById(tabId) {
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn) switchTab(btn);
}

function fillUserInfo() {
  if (!currentUser) return;
  const initials = currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const greeting = document.getElementById("dash-greeting");
  if (greeting) greeting.textContent = `Bonjour, ${currentUser.name.split(" ")[0]} 👋`;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("sidebar-avatar", initials);
  setEl("sidebar-name",   currentUser.name);
  setEl("sidebar-email",  currentUser.email);
  setEl("topbar-avatar", initials);
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const btn     = document.getElementById("sidebar-toggle-btn");
  if (!sidebar || !btn) return;
  sidebar.classList.toggle("collapsed");
  btn.textContent = sidebar.classList.contains("collapsed") ? "›" : "‹";
}

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "🙈" : "👁";
}

function initFaq() {
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(el => el.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-target]");
  counters.forEach(el => {
    const target  = parseInt(el.getAttribute("data-target"));
    const prefix  = el.getAttribute("data-prefix") || "";
    const suffix  = el.getAttribute("data-suffix") || "";
    const dur     = 1800;
    const step    = 16;
    const steps   = dur / step;
    let i = 0;

    const timer = setInterval(() => {
      i++;
      const progress = Math.min(i / steps, 1);
      const ease  = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const value = Math.round(target * ease);

      if (prefix === "€ ") {
        el.textContent = new Intl.NumberFormat("fr-FR").format(value) + " €";
      } else {
        el.textContent = prefix + value + suffix;
      }
      if (i >= steps) clearInterval(timer);
    }, step);
  });
}

function formatEur(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return isoStr;
  }
}

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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add("hidden");
}

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function initFeatureCards() {
  document.querySelectorAll(".feature-card").forEach(card => {
    const color = card.getAttribute("data-color");
    if (!color) return;
    card.addEventListener("mouseenter", () => { card.style.borderColor = color; });
    card.addEventListener("mouseleave", () => { card.style.borderColor = ""; });
  });
}


/* ═══════════════════════════════════════════════════════════════════════
   14. INITIALISATION
═══════════════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 AgenceAuto chargé");

  await checkExistingSession();

  if (!currentUser) {
    showPage("landing");
  }

  initFeatureCards();

  if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event :", event);

      if (event === "SIGNED_OUT") {
        currentUser = null;
        showPage("landing");
        showToast("Session expirée. Reconnectez-vous.", "error");
      }

      if (event === "SIGNED_IN" && session && !currentUser) {
        fetchProfile(session.user.id).then(profile => {
          currentUser = {
            id:    session.user.id,
            name:  profile?.name  || session.user.email.split("@")[0],
            email: profile?.email || session.user.email,
            plan:  profile?.plan  || "solo",
            subscriptionStatus: profile?.subscription_status || "trial",
            createdAt: profile?.created_at || session.user.created_at,
          };
          showPage("dashboard");
          showToast("Connexion réussie !", "success");
        });
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    window.history.replaceState({}, "", window.location.pathname);

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
  ═══════════════════════════════════════════════════════════════════
*/
