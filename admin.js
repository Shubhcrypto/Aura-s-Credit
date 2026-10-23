/* Client portal — login/register + enquiries view (Supabase Auth).
   Only the publishable key is used here. Access to the data is enforced by
   Row Level Security in supabase-auth-setup.sql, not by this page. */
const SUPABASE_URL = "https://ylxdnffevgldwboorfop.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q7zTa1w3uu3n_KtVNirezw_KGDoqFVA";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let mode = "login";
let rows = [];

/* ---------- Auth UI ---------- */
function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("authTitle").textContent = reg ? "Create your account." : "Welcome back.";
  $("authSubmit").textContent = reg ? "Register" : "Log in";
  $("switchText").textContent = reg ? "Already registered?" : "First time here?";
  $("switchBtn").textContent = reg ? "Log in" : "Register";
  $("aPass").autocomplete = reg ? "new-password" : "current-password";
  $("authMsg").textContent = "";
}
$("switchBtn").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("aEmail").value.trim();
  const password = $("aPass").value;
  const msg = $("authMsg");
  msg.style.color = "#c94f4f";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Enter a valid email."; return; }
  if (password.length < 8) { msg.textContent = "Password must be at least 8 characters."; return; }

  const btn = $("authSubmit");
  btn.disabled = true;
  msg.style.color = "";
  msg.textContent = "Please wait…";
  try {
    if (mode === "register") {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        msg.textContent = "Account created. Check your email to confirm, then log in.";
        setMode("login");
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    msg.style.color = "#c94f4f";
    msg.textContent = err.message || "Something went wrong.";
  } finally {
    btn.disabled = false;
  }
});

$("logoutBtn").addEventListener("click", () => sb.auth.signOut());

/* ---------- Enquiries ---------- */
function render(list) {
  $("enqBody").innerHTML = list.map(r => `
    <tr>
      <td>${esc(new Date(r.created_at).toLocaleString())}</td>
      <td>${esc(r.full_name)}</td>
      <td>${esc(r.company)}</td>
      <td><a href="tel:${esc(r.mobile)}">${esc(r.mobile)}</a></td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
      <td>${esc(r.city)}</td>
      <td>${esc(r.product_focus)}</td>
      <td>${esc(r.quantity)}</td>
      <td>${esc(r.project_type)}</td>
      <td>${esc(r.message)}</td>
    </tr>`).join("");
  $("enqCount").textContent = `${list.length} enquir${list.length === 1 ? "y" : "ies"}`;
}

async function loadEnquiries() {
  const msg = $("dashMsg");
  msg.style.color = "";
  msg.textContent = "Loading…";
  const { data, error } = await sb.from("enquiries").select("*").order("created_at", { ascending: false });
  if (error) { msg.style.color = "#c94f4f"; msg.textContent = "Could not load enquiries: " + error.message; return; }
  rows = data || [];
  msg.textContent = rows.length ? "" : "No enquiries to show. If you expect some, this account may not have access yet.";
  applySearch();
}

function applySearch() {
  const q = $("searchBox").value.trim().toLowerCase();
  render(!q ? rows : rows.filter(r =>
    [r.full_name, r.company, r.city, r.email, r.mobile, r.product_focus, r.message]
      .some(v => (v || "").toLowerCase().includes(q))));
}
$("searchBox").addEventListener("input", applySearch);
$("refreshBtn").addEventListener("click", loadEnquiries);

$("csvBtn").addEventListener("click", () => {
  const cols = ["created_at", "full_name", "company", "mobile", "email", "city", "product_focus", "quantity", "project_type", "message"];
  const cell = v => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // block spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "enquiries.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- Session handling ---------- */
function showSession(session) {
  const on = !!session;
  $("authView").hidden = on;
  $("dashView").hidden = !on;
  $("portalUser").hidden = !on;
  if (on) { $("userEmail").textContent = session.user.email; loadEnquiries(); }
  else { rows = []; $("enqBody").innerHTML = ""; $("aPass").value = ""; }
}
sb.auth.onAuthStateChange((_evt, session) => showSession(session));
sb.auth.getSession().then(({ data }) => showSession(data.session));
