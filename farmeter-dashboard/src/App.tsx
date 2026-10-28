import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Command, Database, Download, Leaf,
  LayoutDashboard, LoaderCircle, LogOut, MapPin, Menu, Plus, RefreshCw,
  Search, ShieldCheck, Truck, Users, Weight, X, AlertCircle
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { AppRole, Collector, Pickup, Supplier, createPickup, getCollectors, getPickups, getRole, getSuppliers, updatePickup } from "./lib/data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type SessionUser = { id: string; email?: string };

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleError, setRoleError] = useState("");

  const loadRole = useCallback(async (id: string) => {
    try {
      setRoleError("");
      const found = await getRole(id);
      setRole(found);
    } catch (e) {
      setRole(null);
      setRoleError(e instanceof Error ? e.message : "Could not read your role.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const current = data.session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
      if (current) await loadRole(current.id);
      if (active) setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
      if (current) {
        setTimeout(() => void loadRole(current.id), 0);
      } else {
        setRole(null);
      }
      setAuthReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadRole]);

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }
  if (!authReady) return <div className="full-loader"><LoaderCircle className="spin" /> Connecting to FarMeter…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <RoleRedirect role={role} /> : <LoginPage onLogin={(u) => setUser(u)} />} />
      <Route path="/admin" element={<Protected user={user} role={role} required="admin"><Dashboard role="admin" user={user!} onSignOut={signOut} roleError={roleError} /></Protected>} />
      <Route path="/ops" element={<Protected user={user} role={role} required="ops"><Dashboard role="ops" user={user!} onSignOut={signOut} roleError={roleError} /></Protected>} />
      <Route path="*" element={<Navigate to={user ? (role === "ops" ? "/ops" : role === "admin" ? "/admin" : "/login") : "/login"} replace />} />
    </Routes>
  );

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  }
}

function SetupScreen() {
  return <div className="setup-wrap"><div className="setup-card"><div className="brand-mark"><Leaf /></div><p className="eyebrow">FARMETER / SETUP</p><h1>Connect your database.</h1><p className="muted">Create a local <code>.env</code> file from <code>.env.example</code>, then add your Supabase project URL and publishable key.</p><pre>cp .env.example .env</pre><p className="muted">Restart the Vite server after editing environment variables.</p></div></div>;
}

function RoleRedirect({ role }: { role: AppRole | null }) {
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "ops") return <Navigate to="/ops" replace />;
  return <Navigate to="/login?role=missing" replace />;
}

function Protected({ user, role, required, children }: { user: SessionUser | null; role: AppRole | null; required: AppRole; children: React.ReactNode }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!role) return <NoRolePage />;
  if (role !== required) return <Navigate to={role === "admin" ? "/admin" : "/ops"} replace />;
  return <>{children}</>;
}

function LoginPage({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError || !data.user) {
      setError(authError?.message ?? "Could not sign in.");
      return;
    }
    onLogin({ id: data.user.id, email: data.user.email });
    const { data: roleData, error: roleLookupError } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
    if (roleLookupError) {
      setError(`Signed in, but role lookup failed: ${roleLookupError.message}`);
      return;
    }
    if (roleData?.role === "admin") navigate("/admin", { replace: true });
    else if (roleData?.role === "ops") navigate("/ops", { replace: true });
    else {
      await supabase.auth.signOut();
      setError("Your account has no admin/ops role yet. Ask the project owner to assign one in Supabase.");
    }
  }

  return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="login-visual-top"><div className="brand"><span className="brand-mark"><Leaf size={20}/></span><span>FarMeter<span className="brand-dot">.</span></span></div><span className="secure-label"><ShieldCheck size={14}/> SECURE WORKSPACE</span></div>
        <div className="visual-copy"><p className="eyebrow">WASTE INTELLIGENCE PLATFORM</p><h1>Make every<br/><em>pickup count.</em></h1><p className="visual-desc">One place to track collections, coordinate field operations, and turn waste streams into measurable impact.</p><div className="visual-stats"><div><strong>01</strong><span>Observe</span></div><div><strong>02</strong><span>Coordinate</span></div><div><strong>03</strong><span>Improve</span></div></div></div>
        <div className="login-visual-bottom"><span><span className="live-dot"/> SYSTEM WORKSPACE</span><span>BUILT FOR BETTER CIRCULARITY ↗</span></div>
      </div>
      <div className="login-form-side">
        <div className="mobile-brand brand"><span className="brand-mark"><Leaf size={20}/></span><span>FarMeter<span className="brand-dot">.</span></span></div>
        <div className="login-form-wrap"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your<br/>workspace.</h2><p className="muted">Use your registered FarMeter account to continue.</p>
          <form className="login-form" onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"/></label>
            {error && <div className="error-banner"><AlertCircle size={16}/>{error}</div>}
            {new URLSearchParams(location.search).get("role") === "missing" && <div className="error-banner"><AlertCircle size={16}/>This account has no dashboard role assigned.</div>}
            <button className="btn btn-primary btn-full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null} Sign in <span>↗</span></button>
          </form>
          <div className="login-note"><ShieldCheck size={16}/><span>Your workspace is protected by Supabase authentication and role-based access.</span></div>
        </div>
        <div className="form-footer"><span>© {new Date().getFullYear()} FarMeter</span><span>Privacy · Security · Support</span></div>
      </div>
    </div>
  );
}

function NoRolePage() {
  const [busy, setBusy] = useState(false);
  async function logout() { setBusy(true); await supabase.auth.signOut(); window.location.href = "/login"; }
  return <div className="setup-wrap"><div className="setup-card"><div className="brand-mark"><ShieldCheck/></div><p className="eyebrow">ACCESS NOT ASSIGNED</p><h1>No dashboard role yet.</h1><p className="muted">Your account is signed in, but it isn't assigned the <code>admin</code> or <code>ops</code> role. Ask the project owner to assign your role in Supabase.</p><button className="btn btn-primary" onClick={logout} disabled={busy}>Sign out</button></div></div>;
}

function Dashboard({ role, user, onSignOut, roleError }: { role: AppRole; user: SessionUser; onSignOut: () => Promise<void>; roleError: string }) {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [collectorError, setCollectorError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(roleError);
  const [query, setQuery] = useState("");
  const [networkQuery, setNetworkQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState<"all" | "collectors" | "suppliers">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ wasteType: "Food waste", address: "", estimatedWeight: "5", notes: "" });
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const [pickupResult, collectorResult, supplierResult] = await Promise.allSettled([
      getPickups(),
      getCollectors(),
      getSuppliers(),
    ]);

    if (pickupResult.status === "fulfilled") {
      setPickups(pickupResult.value);
    } else {
      setError(getErrorMessage(pickupResult.reason, "Could not load pickup data."));
    }

    if (collectorResult.status === "fulfilled") {
      setCollectors(collectorResult.value);
      setCollectorError("");
    } else {
      setCollectors([]);
      setCollectorError(getErrorMessage(collectorResult.reason, "Could not load collector profiles."));
    }

    if (supplierResult.status === "fulfilled") {
      setSuppliers(supplierResult.value);
      setSupplierError("");
    } else {
      setSuppliers([]);
      setSupplierError(getErrorMessage(supplierResult.reason, "Could not load supplier profiles."));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const counts = useMemo(() => {
    const completed = pickups.filter((p) => ["completed", "collected"].includes(p.status.toLowerCase()));
    const pending = pickups.filter((p) => ["pending", "available"].includes(p.status.toLowerCase()));
    const active = pickups.filter((p) => ["assigned", "en route", "arrived", "picked_up", "in transit", "at plant"].includes(p.status.toLowerCase()));
    return {
      total: pickups.length,
      pending: pending.length,
      active: active.length,
      completed: completed.length,
      weight: completed.reduce((sum, p) => sum + Number(p.actual_weight ?? p.estimated_weight ?? 0), 0),
    };
  }, [pickups]);

  const filtered = useMemo(() => pickups.filter((p) => {
    const matchesQuery = [p.waste_type, p.pickup_address, p.supplier_name, p.collector_name, p.status].some((v) => (v ?? "").toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter;
    return matchesQuery && matchesStatus;
  }), [pickups, query, statusFilter]);

  const filteredNetwork = useMemo(() => {
    const profiles = [
      ...collectors.map((profile) => ({ ...profile, kind: "Collector" as const, is_active: null })),
      ...suppliers.map((profile) => ({ ...profile, kind: "Supplier" as const, status_label: "" })),
    ];
    const normalizedQuery = networkQuery.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesKind = networkFilter === "all" || (networkFilter === "collectors" ? profile.kind === "Collector" : profile.kind === "Supplier");
      const matchesQuery = [profile.display_name, profile.phone, profile.email, profile.location, profile.kind]
        .some((value) => (value ?? "").toLowerCase().includes(normalizedQuery));
      return matchesKind && matchesQuery;
    });
  }, [collectors, suppliers, networkFilter, networkQuery]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
      return { date: d, day: d.toLocaleDateString("en", { weekday: "short" }), pickups: 0, kg: 0 };
    });
    pickups.forEach((p) => {
      const d = new Date(p.created_at); d.setHours(0,0,0,0);
      const slot = days.find((x) => x.date.getTime() === d.getTime());
      if (slot) { slot.pickups += 1; slot.kg += Number(p.actual_weight ?? p.estimated_weight ?? 0); }
    });
    return days;
  }, [pickups]);

  async function changeStatus(pickup: Pickup, status: string) {
    setSavingId(pickup.id);
    setToast("");
    try {
      await updatePickup(pickup, status, status.toLowerCase() === "completed" || status.toLowerCase() === "collected" ? pickup.actual_weight ?? pickup.estimated_weight : undefined);
      setToast("Pickup status updated.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update pickup.");
    } finally { setSavingId(""); }
  }

  async function submitPickup(e: FormEvent) {
    e.preventDefault();
    const weight = Number(form.estimatedWeight);
    if (!form.address.trim() || !Number.isFinite(weight) || weight <= 0) {
      setError("Enter a pickup address and a positive estimated weight.");
      return;
    }
    setSavingId("create");
    setError("");
    try {
      await createPickup({ userId: user.id, wasteType: form.wasteType, address: form.address.trim(), estimatedWeight: weight, notes: form.notes.trim() });
      setShowCreate(false);
      setForm({ wasteType: "Food waste", address: "", estimatedWeight: "5", notes: "" });
      setToast("Pickup created in Supabase.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create pickup.");
    } finally { setSavingId(""); }
  }

  function exportCsv() {
    const headers = ["id","source","waste_type","pickup_address","estimated_weight","actual_weight","status","created_at"];
    const csv = [headers.join(","), ...filtered.map((p) => headers.map((h) => {
      const val = String((p as any)[h] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "farmeter-pickups.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMobileNav(false)}/>}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><span className="brand-mark"><Leaf size={19}/></span><span>FarMeter<span className="brand-dot">.</span></span><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <div className="workspace-switch"><div className="workspace-icon"><Command size={16}/></div><div><strong>FarMeter HQ</strong><span>Operations workspace</span></div><ChevronDown size={15}/></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="side-nav">
          <button className="nav-item active"><LayoutDashboard size={18}/>{isAdmin ? "Admin overview" : "Ops overview"}<span className="nav-active-dot"/></button>
          <button className="nav-item" onClick={() => document.getElementById("pickup-table")?.scrollIntoView({ behavior: "smooth" })}><ClipboardList size={18}/>Pickups<span className="nav-count">{pickups.length}</span></button>
          <button className="nav-item" onClick={() => { setNetworkFilter("collectors"); document.getElementById("collector-card")?.scrollIntoView({ behavior: "smooth" }); }}><Users size={18}/>Collectors<span className="nav-count">{collectors.length}</span></button>
          <button className="nav-item" onClick={() => { setNetworkFilter("suppliers"); document.getElementById("collector-card")?.scrollIntoView({ behavior: "smooth" }); }}><Truck size={18}/>Suppliers<span className="nav-count">{suppliers.length}</span></button>
        </nav>
        <p className="nav-label nav-label-spaced">INSIGHTS</p>
        <nav className="side-nav"><button className="nav-item" onClick={() => document.getElementById("activity-chart")?.scrollIntoView({ behavior: "smooth" })}><Activity size={18}/>Activity analytics</button><button className="nav-item" onClick={exportCsv}><Download size={18}/>Export report</button></nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Get help with your workspace and operations.</p><button onClick={() => setToast("Ask your project administrator for workspace support.")}>Contact support ↗</button></div><div className="user-profile"><div className="avatar">{(user.email?.[0] ?? "U").toUpperCase()}</div><div className="user-meta"><strong>{user.email?.split("@")[0] ?? "Workspace user"}</strong><span>{isAdmin ? "Administrator" : "Operations"}</span></div><button className="icon-btn" title="Sign out" onClick={() => void onSignOut()}><LogOut size={17}/></button></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)}><Menu size={20}/></button><span className="crumb-muted">Workspace</span><span className="crumb-slash">/</span><strong>{isAdmin ? "Admin overview" : "Ops overview"}</strong></div><div className="topbar-right"><div className="system-status"><span className="live-dot"/><span>Supabase connected</span></div><button className="icon-btn notification-btn" title="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{(user.email?.[0] ?? "U").toUpperCase()}</div></div></header>

        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">{isAdmin ? "ADMINISTRATION" : "FIELD OPERATIONS"} <span className="heading-date">/ {new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span></p><h1>{isAdmin ? "Good work starts with" : "Operations at a"} <em>{isAdmin ? "visibility." : "glance."}</em></h1><p className="muted">{isAdmin ? "Your collection network, in one clear view." : "Track collection progress and keep every pickup moving."}</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button>{isAdmin && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16}/> New pickup</button>}</div></div>

          {error && <div className="error-banner page-alert"><AlertCircle size={17}/><span>{error}</span><button className="icon-btn" onClick={() => setError("")}><X size={16}/></button></div>}
          {toast && <div className="success-banner page-alert"><CheckCircle2 size={17}/><span>{toast}</span><button className="icon-btn" onClick={() => setToast("")}><X size={16}/></button></div>}

          <div className="metric-grid">
            <MetricCard label="Total pickups" value={loading ? "—" : counts.total.toLocaleString()} sub="Across connected tables" icon={<ClipboardList size={18}/>} tone="green" trend="Live database"/>
            <MetricCard label="Awaiting collection" value={loading ? "—" : counts.pending.toLocaleString()} sub="Pending or available" icon={<Clock3 size={18}/>} tone="amber" trend="Needs attention"/>
            <MetricCard label="In progress" value={loading ? "—" : counts.active.toLocaleString()} sub="Assigned and moving" icon={<Truck size={18}/>} tone="blue" trend="Active workflow"/>
            <MetricCard label="Waste recovered" value={loading ? "—" : `${counts.weight.toLocaleString()} kg`} sub={`${counts.completed} completed pickups`} icon={<Weight size={18}/>} tone="purple" trend="Actual weight when recorded"/>
          </div>

          <div className="content-grid">
            <section className="panel chart-panel" id="activity-chart"><div className="panel-heading"><div><h3>Pickup activity</h3><p>Records created over the last 7 days</p></div><span className="panel-chip"><span className="live-dot"/> Live data</span></div><div className="chart-legend"><span><i className="legend-dot pickups-dot"/> Pickup records</span><span className="chart-total">{chartData.reduce((s,d)=>s+d.pickups,0)} this week</span></div><div className="chart-wrap">{loading ? <div className="chart-empty">Loading activity…</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}><defs><linearGradient id="pickupFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70b69a" stopOpacity={0.28}/><stop offset="100%" stopColor="#70b69a" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8eeea"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8b9991", fontSize: 11 }}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8b9991", fontSize: 11 }}/><Tooltip contentStyle={{ border: "1px solid #e1e9e4", borderRadius: 12, fontSize: 12 }}/><Area type="monotone" dataKey="pickups" name="Pickups" stroke="#438a70" strokeWidth={2.5} fill="url(#pickupFill)" activeDot={{ r: 5, strokeWidth: 0 }}/></AreaChart></ResponsiveContainer>}</div></section>
            <section className="panel collector-panel" id="collector-card">
              <div className="panel-heading"><div><h3>People network</h3><p>Manage collectors and suppliers together</p></div><span className="icon-bubble"><Users size={17}/></span></div>
              <div className="collector-summary">
                <div><strong>{loading ? "—" : collectors.length + suppliers.length}</strong><span>Total profiles</span></div>
                <div className="summary-divider"/>
                <div><strong>{loading ? "—" : collectors.length}</strong><span>Collectors</span></div>
                <div className="summary-divider"/>
                <div><strong>{loading ? "—" : suppliers.length}</strong><span>Suppliers</span></div>
              </div>
              <div className="table-toolbar">
                <label className="search-box"><Search size={16}/><input aria-label="Search people network" value={networkQuery} onChange={(event) => setNetworkQuery(event.target.value)} placeholder="Search name or contact"/></label>
                <div className="heading-actions" aria-label="Filter profiles">
                  <button className={`btn ${networkFilter === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setNetworkFilter("all")}>All</button>
                  <button className={`btn ${networkFilter === "collectors" ? "btn-primary" : "btn-secondary"}`} onClick={() => setNetworkFilter("collectors")}>Collectors</button>
                  <button className={`btn ${networkFilter === "suppliers" ? "btn-primary" : "btn-secondary"}`} onClick={() => setNetworkFilter("suppliers")}>Suppliers</button>
                </div>
              </div>
              <div className="collector-list">
                {collectorError && networkFilter !== "suppliers" && <div className="error-banner"><AlertCircle size={16}/><span>{collectorError}</span></div>}
                {supplierError && networkFilter !== "collectors" && <div className="error-banner"><AlertCircle size={16}/><span>{supplierError}</span></div>}
                {loading ? <p className="empty-inline">Loading profiles…</p> : filteredNetwork.length === 0
                  ? <div className="empty-state compact"><div className="empty-icon"><Users size={20}/></div><strong>No matching profiles</strong><p>Try another search or filter.</p></div>
                  : filteredNetwork.map((profile) => {
                    const status = profile.kind === "Collector"
                      ? profile.status_label
                      : (profile.is_active === null ? "Registered" : profile.is_active ? "Active" : "Inactive");
                    const statusClass = ["offline", "inactive", "unavailable"].includes(status.toLowerCase())
                      ? "status-offline"
                      : "status-online";
                    const contact = [profile.phone, profile.email, profile.location].filter(Boolean).join(" · ") || "No contact details listed";
                    return <div className="collector-row" key={`${profile.kind}-${profile.id}`}>
                      <div className="collector-avatar">{profile.display_name[0]?.toUpperCase() ?? (profile.kind === "Collector" ? "C" : "S")}</div>
                      <div className="collector-details"><strong>{profile.display_name}</strong><span>{contact}</span></div>
                      <span className="status-pill status-progress">{profile.kind}</span>
                      <span className={`status-pill ${statusClass}`}><i/>{status}</span>
                    </div>;
                  })}
              </div>
              <div className="panel-footnote"><span>{filteredNetwork.length} matching profiles · Live Supabase data</span><ArrowUpRight size={15}/></div>
            </section>
          </div>

          <section className="panel table-panel" id="pickup-table"><div className="panel-heading table-heading"><div><h3>{isAdmin ? "All pickup requests" : "Live pickup queue"}</h3><p>{isAdmin ? "Review and manage records across both pickup tables." : "Monitor collection requests and update workflow status."}</p></div><button className="btn btn-secondary btn-sm" onClick={exportCsv}><Download size={14}/> Export CSV</button></div><div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pickups, type, address…"/></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{[...new Set(pickups.map((p) => p.status.toLowerCase()))].sort().map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select><span className="result-count">{filtered.length} records</span></div><div className="table-scroll"><table><thead><tr><th>Pickup / source</th><th>Waste type</th><th>Location</th><th>Weight</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}><div className="table-message"><LoaderCircle className="spin" size={18}/> Loading records from Supabase…</div></td></tr> : filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><Database size={22}/></div><strong>No matching pickup records</strong><p>Try another search, or create a pickup request.</p></div></td></tr> : filtered.map((p) => <tr key={`${p.source}-${p.id}`}><td><div className="pickup-id"><span className="pickup-icon"><Leaf size={15}/></span><span><strong>#{p.id.slice(0,8).toUpperCase()}</strong><small>{p.source === "fm_pickups" ? "FarMeter app" : "Legacy app"}</small></span></div></td><td><span className="waste-type">{p.waste_type || "Unspecified"}</span></td><td><div className="location-cell"><MapPin size={14}/><span title={p.pickup_address}>{p.pickup_address || "Address not set"}</span></div></td><td><strong className="weight-value">{p.actual_weight ?? p.estimated_weight} kg</strong><small className="weight-sub">{p.actual_weight == null ? "Estimated" : "Actual"}</small></td><td><StatusPill status={p.status}/></td><td><span className="date-cell">{new Date(p.created_at).toLocaleDateString("en", { month:"short", day:"numeric", year:"numeric" })}</span></td><td><select className="status-select" value={p.status} disabled={savingId === p.id} aria-label={`Update status for pickup ${p.id}`} onChange={(e) => void changeStatus(p, e.target.value)}>{(p.source === "fm_pickups" ? ["pending","assigned","picked_up","completed","cancelled"] : ["Available","Assigned","En route","Arrived","Collected","In transit","At plant","Completed","Cancelled"]).map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {filtered.length} of {pickups.length} records · sourced from Supabase</span><button className="text-button" onClick={() => void refresh()}>Refresh data <RefreshCw size={13}/></button></div></section>
          <footer className="page-footer"><span>FarMeter Operations Platform</span><span><span className="live-dot"/> Connected to your Supabase project</span></footer>
        </div>
      </main>
      {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal-card" onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">NEW RECORD</p><h2>Create pickup</h2><p className="muted">This will create a real record in <code>fm_pickups</code>.</p></div><button className="icon-btn" onClick={() => setShowCreate(false)}><X size={19}/></button></div><form className="create-form" onSubmit={submitPickup}><label>Waste type<select value={form.wasteType} onChange={(e) => setForm({...form, wasteType:e.target.value})}><option>Food waste</option><option>Crop residue</option><option>Paper</option><option>Plastic</option><option>Organic waste</option><option>Other</option></select></label><label>Pickup address<input required value={form.address} onChange={(e) => setForm({...form,address:e.target.value})} placeholder="Enter collection address"/></label><label>Estimated weight (kg)<input required min="0.1" step="0.1" type="number" value={form.estimatedWeight} onChange={(e) => setForm({...form,estimatedWeight:e.target.value})}/></label><label>Notes <span className="optional-label">Optional</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} placeholder="Collection instructions…"/></label><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" disabled={savingId === "create"}>{savingId === "create" ? <LoaderCircle className="spin" size={16}/> : <Plus size={16}/>} Create pickup</button></div></form></div></div>}
    </div>
  );
}

function MetricCard({ label, value, sub, icon, tone, trend }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string; trend: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div><div className="metric-bottom"><span className="metric-trend"><span className="trend-dot"/> {trend}</span></div></div>;
}
function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/ /g, "_");
  const tone = ["completed","collected"].includes(s) ? "complete" : ["pending","available"].includes(s) ? "pending" : ["cancelled"].includes(s) ? "cancelled" : "progress";
  return <span className={`status-pill status-${tone}`}><i/>{titleCase(status)}</span>;
}
function titleCase(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()); }

export default App;