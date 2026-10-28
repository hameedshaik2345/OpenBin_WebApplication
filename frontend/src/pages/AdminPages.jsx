import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const nav = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/rvms", label: "RVMs" },
  { to: "/admin/catalog", label: "Catalog" },
  { to: "/admin/pricing", label: "Pricing" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/admin/accounts", label: "Accounts" },
  { to: "/admin/collection", label: "Collection / EPR" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/rvm-simulator", label: "RVM Simulator" },
];

export function AdminHome() {
  const { token } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function load() {
      const [users, rvms, txs, accounts, charity] = await Promise.all([
        api.users(token),
        api.rvms(token),
        api.transactions(token),
        api.accounts(token),
        api.charity(token),
      ]);
      setStats({
        users: users?.users?.length ?? 0,
        rvms: rvms?.rvms?.length ?? 0,
        txs: txs?.transactions?.length ?? 0,
        accounts: accounts?.accounts?.length ?? 0,
        charity: charity?.account?.balance ?? 0,
      });
    }
    if (token) load().catch(console.error);
  }, [token]);

  return (
    <AppShell title="Admin dashboard" nav={nav}>
      {/* KPI Cards Row */}
      <div className="ob-kpi-row" style={{ marginBottom: "24px" }}>
        {/* Users Card */}
        <div className="ob-kpi-card">
          <div className="ob-kpi-icon" style={{ background: "var(--ob-lightblue-bg, #E6F0FD)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E3695" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="ob-kpi-val">{stats.users ?? "—"}</div>
          <div className="ob-kpi-label">Registered Accounts</div>
          <div className="ob-kpi-delta up">Active Users & Brands</div>
        </div>

        {/* RVMs Card */}
        <div className="ob-kpi-card">
          <div className="ob-kpi-icon" style={{ background: "var(--ob-green-bg, #E1F5EE)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B4E3D" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div className="ob-kpi-val">{stats.rvms ?? "—"}</div>
          <div className="ob-kpi-label">Smart RVM Fleet</div>
          <div className="ob-kpi-delta up">Connected & Online</div>
        </div>

        {/* Transactions Card */}
        <div className="ob-kpi-card">
          <div className="ob-kpi-icon" style={{ background: "#EEEDFE" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#26215C" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="ob-kpi-val">{stats.txs ?? "—"}</div>
          <div className="ob-kpi-label">Recorded Transactions</div>
          <div className="ob-kpi-delta up">Recycling Deposits</div>
        </div>

        {/* Charity Card */}
        <div className="ob-kpi-card">
          <div className="ob-kpi-icon" style={{ background: "#FEF3C7" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="ob-kpi-val">₹{Number(stats.charity || 0).toFixed(2)}</div>
          <div className="ob-kpi-label">Charity Pool Balance</div>
          <div className="ob-kpi-delta up">Community Sustainability</div>
        </div>
      </div>

      {/* Simulator Hero Banner */}
      <div
        className="panel"
        style={{
          background: "linear-gradient(135deg, #071F5C 0%, #0E3695 100%)",
          color: "#FFFFFF",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          border: "none",
          boxShadow: "0 8px 24px rgba(7, 31, 92, 0.25)",
          marginBottom: "24px",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.15)",
              color: "#A7E4CD",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "8px",
            }}
          >
            Hardware & Cloud Integration
          </span>
          <h2 style={{ color: "#FFFFFF", margin: "0 0 6px", fontSize: "1.35rem" }}>
            Interactive RVM Deposit Simulator
          </h2>
          <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.75)", fontSize: "13.5px", maxWidth: "600px" }}>
            Test live telemetry, simulate physical can and bottle deposits, generate dynamic session QR codes, and trace consumer claim settlements in real time.
          </p>
        </div>
        <Link
          to="/rvm-simulator"
          className="btn"
          style={{
            background: "#FFFFFF",
            color: "#071F5C",
            fontWeight: "800",
            padding: "12px 22px",
            fontSize: "13.5px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
          }}
        >
          Launch Simulator ⚡
        </Link>
      </div>

      {/* Operations Quick Shortcuts */}
      <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#071F5C", margin: "28px 0 16px" }}>
        Quick Administrative Modules
      </h3>
      <div className="grid-3">
        <Link to="/admin/users" className="panel" style={{ textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#E6F0FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E3695" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#071F5C" }}>Users & Brand Accounts</h4>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "12.5px" }}>
            Issue brand partner EPR accounts, view consumer signups, and manage role authorizations.
          </p>
        </Link>

        <Link to="/admin/rvms" className="panel" style={{ textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B4E3D" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
              </svg>
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#071F5C" }}>Smart RVM Hardware</h4>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "12.5px" }}>
            Provision simulated or physical RVM units, assign campus locations, and monitor storage fullness.
          </p>
        </Link>

        <Link to="/admin/pricing" className="panel" style={{ textDecoration: "none", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#071F5C" }}>Scrap & Material Pricing</h4>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "12.5px" }}>
            Update per-kilogram reimbursement rates for PET, Aluminium, and other recyclable streams.
          </p>
        </Link>
      </div>
    </AppShell>
  );
}

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  // Create account form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [brandPassword, setBrandPassword] = useState("");
  const [brandRole, setBrandRole] = useState("EPR");
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await api.users(token, q);
    setUsers(data.users || []);
  }

  useEffect(() => {
    if (token) load().catch((e) => setErr(e.message));
  }, [token]);

  async function handleCreateAccount(e) {
    e.preventDefault();
    setErr("");
    setNotice("");
    setCreating(true);
    try {
      await api.createUser(token, {
        fullName: brandName.trim(),
        email: brandEmail.trim(),
        password: brandPassword,
        role: brandRole,
      });
      setNotice(`✓ Successfully created ${brandRole} account for "${brandName}" (${brandEmail})`);
      setBrandName("");
      setBrandEmail("");
      setBrandPassword("");
      setShowCreateForm(false);
      await load();
    } catch (e) {
      setErr(e.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter === "ALL") return true;
    return u.role === roleFilter;
  });

  return (
    <AppShell title="Users & Access Control" nav={nav}>
      {err && <p className="error">{err}</p>}
      {notice && (
        <div style={{ background: "var(--ob-green-bg, #E1F5EE)", color: "var(--ob-green-tx, #0B4E3D)", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginBottom: "16px" }}>
          {notice}
        </div>
      )}

      {/* Create Account Panel */}
      <div className="panel" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", margin: "0 0 4px" }}>
              Create Brand Partner or Admin Account
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "#64748B" }}>
              Public registration is restricted to consumer accounts. Brand and Enterprise accounts must be issued here.
            </p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ fontWeight: "700" }}
          >
            {showCreateForm ? "Close Form" : "+ Create Brand / Staff Account"}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateAccount} style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5E7EB", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
                Brand / Full Name
              </label>
              <input
                placeholder="e.g. CoolFizz Beverages"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
                style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. partner@coolfizz.com"
                value={brandEmail}
                onChange={(e) => setBrandEmail(e.target.value)}
                required
                style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
                Password
              </label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={brandPassword}
                onChange={(e) => setBrandPassword(e.target.value)}
                required
                minLength={6}
                style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
                Account Role
              </label>
              <select
                value={brandRole}
                onChange={(e) => setBrandRole(e.target.value)}
                style={{ fontWeight: "700", background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}
              >
                <option value="EPR">EPR (Brand Partner)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
                <option value="USER">USER (Consumer)</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="btn"
                disabled={creating}
                style={{ width: "100%", padding: "10px 16px", fontWeight: "800" }}
              >
                {creating ? "Creating..." : "Issue Account"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, flex: "1 1 320px", maxWidth: "440px" }}
        >
          <div style={{ position: "relative", width: "100%" }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748B"
              strokeWidth="2.2"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search users by name or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 14px 9px 36px",
                background: "#FFFFFF",
                border: "1.5px solid #CBD5E1",
                borderRadius: "10px",
                color: "#0F172A",
                fontSize: "13px",
                fontWeight: "500",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
            />
          </div>
          <button className="btn" type="submit" style={{ padding: "9px 18px", borderRadius: "10px", fontWeight: "700", whiteSpace: "nowrap" }}>
            Search
          </button>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["ALL", "EPR", "USER", "ADMIN"].map((r) => (
            <button
              key={r}
              type="button"
              className={`btn ${roleFilter === r ? "" : "ghost"}`}
              style={{ fontSize: "12px", padding: "6px 12px", fontWeight: "700" }}
              onClick={() => setRoleFilter(r)}
            >
              {r === "ALL" ? "All Users" : r === "EPR" ? "Brand Partners (EPR)" : r === "USER" ? "Consumers (USER)" : "Admins (ADMIN)"}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.user_id}>
                <td>
                  <strong>{u.full_name}</strong>
                  {u.email === "openbinsolutions@gmail.com" && (
                    <span style={{ marginLeft: "6px", background: "#FAEEDA", color: "#633806", padding: "2px 6px", borderRadius: "6px", fontSize: "10.5px", fontWeight: "800" }}>
                      Primary Admin
                    </span>
                  )}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={async (e) => {
                      await api.updateUserRole(token, u.user_id, e.target.value);
                      await load();
                    }}
                    style={{ fontWeight: "700" }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="EPR">EPR</option>
                  </select>
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      background: u.status === "ACTIVE" ? "#E1F5EE" : u.status === "SUSPENDED" ? "#FEF3C7" : "#FEE2E2",
                      color: u.status === "ACTIVE" ? "#0B4E3D" : u.status === "SUSPENDED" ? "#92400E" : "#991B1B",
                    }}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="row-form">
                  <button className="btn ghost" type="button" onClick={async () => { await api.updateUserStatus(token, u.user_id, "BLOCKED"); await load(); }}>Block</button>
                  <button className="btn ghost" type="button" onClick={async () => { await api.updateUserStatus(token, u.user_id, "SUSPENDED"); await load(); }}>Suspend</button>
                  <button className="btn" type="button" onClick={async () => { await api.updateUserStatus(token, u.user_id, "ACTIVE"); await load(); }}>Activate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function AdminRvms() {
  const { token } = useAuth();
  const [rvms, setRvms] = useState([]);
  const [form, setForm] = useState({
    rvm_code: "",
    serial_number: "",
    location_name: "",
    total_capacity: 100,
    capacity_unit: "KG",
  });

  async function load() {
    setRvms((await api.rvms(token)).rvms);
  }

  useEffect(() => {
    if (token) load().catch(console.error);
  }, [token]);

  async function create(e) {
    e.preventDefault();
    await api.createRvm(token, {
      ...form,
      serial_number: form.serial_number || `SIM-${form.rvm_code}`,
      is_simulated: true,
    });
    setForm({ rvm_code: "", serial_number: "", location_name: "", total_capacity: 100, capacity_unit: "KG" });
    await load();
  }

  return (
    <AppShell title="RVMs" nav={nav}>
      <form className="panel" onSubmit={create} style={{ marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", margin: "0 0 4px" }}>
          Provision Smart RVM Unit
        </h2>
        <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5", color: "#64748B", margin: "0 0 16px" }}>
          Add a new smart reverse vending machine to your network fleet with simulated telemetry support.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              RVM Code
            </label>
            <input placeholder="e.g. RVM-002" value={form.rvm_code} onChange={(e) => setForm({ ...form, rvm_code: e.target.value })} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              Serial Number
            </label>
            <input placeholder="Auto-generated if blank" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              Location Name
            </label>
            <input placeholder="e.g. Central Library Campus" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              Total Capacity (KG)
            </label>
            <input type="number" placeholder="100" value={form.total_capacity} onChange={(e) => setForm({ ...form, total_capacity: Number(e.target.value) })} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
          </div>
          <div>
            <button className="btn" type="submit" style={{ width: "100%", padding: "10px 16px" }}>
              + Deploy Machine
            </button>
          </div>
        </div>
      </form>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Serial</th><th>Location</th><th>Status</th><th>Capacity</th><th>Type</th>
            </tr>
          </thead>
          <tbody>
            {rvms.map((r) => {
              const pct = Number(r.capacity_percent || 0);
              return (
                <tr key={r.rvm_id}>
                  <td><strong>{r.rvm_code}</strong></td>
                  <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{r.serial_number}</td>
                  <td>{r.location_name || "—"}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        background: r.status === "ONLINE" || r.status === "ACTIVE" ? "#E1F5EE" : "#FEF3C7",
                        color: r.status === "ONLINE" || r.status === "ACTIVE" ? "#0B4E3D" : "#92400E",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "70px", height: "6px", background: "#E5E7EB", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#10B981", borderRadius: "3px" }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "600" }}>
                        {Number(r.current_capacity || 0).toFixed(1)} / {Number(r.total_capacity)} {r.capacity_unit} ({pct}%)
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        background: r.is_simulated ? "#FEF3C7" : "#E6F0FD",
                        color: r.is_simulated ? "#92400E" : "#0E3695",
                      }}
                    >
                      {r.is_simulated ? "SIMULATOR" : "HARDWARE"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function AdminPricing() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [prices, setPrices] = useState([]);
  const [materialId, setMaterialId] = useState("");
  const [price, setPrice] = useState("");

  async function load() {
    const [m, p] = await Promise.all([api.materials(token), api.prices(token)]);
    setMaterials(m.materials);
    setPrices(p.prices);
    if (!materialId && m.materials[0]) setMaterialId(m.materials[0].material_id);
  }

  useEffect(() => {
    if (token) load().catch(console.error);
  }, [token]);

  async function save(e) {
    e.preventDefault();
    await api.setPrice(token, {
      material_id: materialId,
      price_per_kg: Number(price),
    });
    setPrice("");
    await load();
  }

  return (
    <AppShell title="Material pricing" nav={nav}>
      <form className="panel" onSubmit={save} style={{ marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", margin: "0 0 4px" }}>
          Update Scrap Rate
        </h2>
        <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5", color: "#64748B", margin: "0 0 16px" }}>
          Set effective reimbursement rates for recyclables. Historical transactions are frozen and won't be modified.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              Select Material
            </label>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}>
              {materials.map((m) => (
                <option key={m.material_id} value={m.material_id}>
                  {m.material_code} — {m.material_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "4px" }}>
              Price per KG (₹ INR)
            </label>
            <input type="number" step="0.01" placeholder="e.g. 15.00" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
          </div>
          <div>
            <button className="btn" type="submit" style={{ width: "100%", padding: "10px 16px" }}>
              Set Current Price Rate
            </button>
          </div>
        </div>
      </form>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr><th>Material Code</th><th>Rate (₹ / kg)</th><th>Effective From</th><th>Effective Until</th><th>Status</th></tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.price_id}>
                <td><strong>{p.material_code}</strong></td>
                <td><span style={{ fontSize: "14px", fontWeight: "800", color: "#0B4E3D" }}>₹{Number(p.price_per_kg).toFixed(2)}</span></td>
                <td>{new Date(p.effective_from).toLocaleString()}</td>
                <td>{p.effective_to ? new Date(p.effective_to).toLocaleString() : "Ongoing"}</td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      background: !p.effective_to ? "#E1F5EE" : "#F3F4F6",
                      color: !p.effective_to ? "#0B4E3D" : "#6B7280",
                    }}
                  >
                    {!p.effective_to ? "CURRENT" : "HISTORICAL"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function AdminTransactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
    if (token) api.transactions(token).then((d) => setTransactions(d.transactions)).catch(console.error);
  }, [token]);
  return (
    <AppShell title="Transactions" nav={nav}>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th><th>RVM Code</th><th>Material</th><th>Estimated Weight</th><th>Reward</th>
              <th>Status</th><th>Claim State</th><th>Consumer Email</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.transaction_id}>
                <td style={{ fontSize: "12px", color: "#4B5563" }}>{new Date(t.created_at).toLocaleString()}</td>
                <td><strong>{t.rvm_code}</strong></td>
                <td><span style={{ background: "#EEEDFE", color: "#26215C", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>{t.material_code}</span></td>
                <td>{t.estimated_weight_g}g</td>
                <td><strong style={{ color: "#0B4E3D" }}>₹{Number(t.reward_value).toFixed(2)}</strong></td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: "#E1F5EE", color: "#0B4E3D" }}>
                    {t.transaction_status}
                  </span>
                </td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: t.claim_status === "CLAIMED" ? "#E1F5EE" : "#FEF3C7", color: t.claim_status === "CLAIMED" ? "#0B4E3D" : "#92400E" }}>
                    {t.claim_status}
                  </span>
                </td>
                <td style={{ fontSize: "12px" }}>{t.user_email || "Unclaimed (Anonymous)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function AdminAccounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [charity, setCharity] = useState(null);
  useEffect(() => {
    if (!token) return;
    Promise.all([api.accounts(token), api.charity(token)]).then(([a, c]) => {
      setAccounts(a.accounts);
      setCharity(c);
    });
  }, [token]);
  return (
    <AppShell title="Accounts & charity" nav={nav}>
      <div
        className="panel"
        style={{
          background: "linear-gradient(135deg, #E1F5EE 0%, #D0F0E4 100%)",
          border: "1px solid #A7E4CD",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#0B4E3D", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Community Impact Fund
          </span>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "18px", fontWeight: "700", letterSpacing: "-0.01em", margin: "4px 0 0", color: "#0B4E3D" }}>Dedicated Charity Pool ({charity?.account?.account_code || "CHARITY-001"})</h2>
          <p style={{ margin: "4px 0 0", color: "#064E3B", fontSize: "13px" }}>
            Pooled donations contributed by consumers during deposit voucher claims.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#064E3B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            Total Pool Balance
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0B4E3D", fontFamily: "'Manrope', -apple-system, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            ₹{Number(charity?.account?.balance || 0).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr><th>Account Code</th><th>Account Type</th><th>Account Owner</th><th>Current Balance</th><th>Status</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.account_id}>
                <td><strong>{a.account_code}</strong></td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: a.account_type === "CHARITY" ? "#FEF3C7" : a.account_type === "USER" ? "#E1F5EE" : "#EEEDFE", color: a.account_type === "CHARITY" ? "#92400E" : a.account_type === "USER" ? "#0B4E3D" : "#26215C" }}>
                    {a.account_type}
                  </span>
                </td>
                <td>{a.email || "System Escrow"}</td>
                <td style={{ fontWeight: "700", color: "#071F5C", fontFamily: "'Manrope', sans-serif" }}>₹{Number(a.balance).toFixed(2)}</td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: "#E1F5EE", color: "#0B4E3D" }}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function AdminCatalog() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [productName, setProductName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [materialId, setMaterialId] = useState("");

  async function load() {
    const [c, b, p, m] = await Promise.all([
      api.companies(token),
      api.brands(token),
      api.products(token),
      api.materials(token),
    ]);
    setCompanies(c?.companies || []);
    setBrands(b?.brands || []);
    setProducts(p?.products || []);
    setMaterials(m?.materials || []);
    if (!companyId && c?.companies?.[0]) setCompanyId(c.companies[0].company_id);
    if (!brandId && b?.brands?.[0]) setBrandId(b.brands[0].brand_id);
    if (!materialId && m?.materials?.[0]) setMaterialId(m.materials[0].material_id);
  }

  useEffect(() => {
    if (token) load().catch(console.error);
  }, [token]);

  return (
    <AppShell title="Catalog" nav={nav}>
      <div className="grid-3">
        {/* Company Card */}
        <form className="panel" onSubmit={async (e) => { e.preventDefault(); await api.createCompany(token, { company_name: companyName }); setCompanyName(""); await load(); }}>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "16px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", marginBottom: "4px" }}>Manufacturer Company</h2>
          <p className="muted" style={{ fontSize: "12px", marginBottom: "14px" }}>Register parent FMCG manufacturing entity.</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input placeholder="e.g. PepsiCo India Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
            <button className="btn" type="submit">+ Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {companies.map((c) => (
              <span key={c.company_id} style={{ padding: "4px 10px", borderRadius: "8px", background: "#F3F4F6", fontSize: "12px", fontWeight: "700", color: "#374151" }}>
                {c.company_name}
              </span>
            ))}
          </div>
        </form>

        {/* Brand Card */}
        <form className="panel" onSubmit={async (e) => { e.preventDefault(); await api.createBrand(token, { company_id: companyId, brand_name: brandName }); setBrandName(""); await load(); }}>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "16px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", marginBottom: "4px" }}>Partner Brand</h2>
          <p className="muted" style={{ fontSize: "12px", marginBottom: "14px" }}>Link brand subsidiary to parent manufacturer.</p>
          <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}>
              {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="e.g. Aquafina" value={brandName} onChange={(e) => setBrandName(e.target.value)} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
              <button className="btn" type="submit">+ Add</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {brands.map((b) => (
              <span key={b.brand_id} style={{ padding: "4px 10px", borderRadius: "8px", background: "#EEEDFE", fontSize: "12px", fontWeight: "700", color: "#26215C" }}>
                {b.brand_name}
              </span>
            ))}
          </div>
        </form>

        {/* Product Card */}
        <form className="panel" onSubmit={async (e) => { e.preventDefault(); await api.createProduct(token, { brand_id: brandId, material_id: materialId, product_name: productName }); setProductName(""); await load(); }}>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "16px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", marginBottom: "4px" }}>Product SKU</h2>
          <p className="muted" style={{ fontSize: "12px", marginBottom: "14px" }}>Define barcode & recyclable material mapping.</p>
          <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}>
              {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
            </select>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}>
              {materials.map((m) => <option key={m.material_id} value={m.material_id}>{m.material_code}</option>)}
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="e.g. 500ml PET Bottle" value={productName} onChange={(e) => setProductName(e.target.value)} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
              <button className="btn" type="submit">+ Add</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {products.map((p) => (
              <span key={p.product_id} style={{ padding: "4px 10px", borderRadius: "8px", background: "#E1F5EE", fontSize: "12px", fontWeight: "700", color: "#0B4E3D" }}>
                {p.product_name}
              </span>
            ))}
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export function AdminCollection() {
  const { token } = useAuth();
  const [batches, setBatches] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [reports, setReports] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [batchForm, setBatchForm] = useState({ batch_code: "", material_id: "", recorded_weight_kg: "" });
  const [recyclerName, setRecyclerName] = useState("");

  async function load() {
    const [b, r, er, m, c] = await Promise.all([
      api.collections(token),
      api.recyclers(token),
      api.eprReports(token),
      api.materials(token),
      api.companies(token),
    ]);
    setBatches(b.batches);
    setRecyclers(r.recyclers);
    setReports(er.reports);
    setMaterials(m.materials);
    setCompanies(c.companies);
    if (!batchForm.material_id && m.materials[0]) {
      setBatchForm((f) => ({ ...f, material_id: m.materials[0].material_id }));
    }
  }

  useEffect(() => {
    if (token) load().catch(console.error);
  }, [token]);

  return (
    <AppShell title="Collection / EPR" nav={nav}>
      <div className="grid-2">
        <form className="panel" onSubmit={async (e) => {
          e.preventDefault();
          await api.createCollection(token, {
            ...batchForm,
            recorded_weight_kg: Number(batchForm.recorded_weight_kg),
          });
          await load();
        }}>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", marginBottom: "4px" }}>
            Log Collection Batch
          </h2>
          <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5", color: "#64748B", marginBottom: "16px" }}>
            Record picked-up recyclable material volume from RVMs.
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            <input placeholder="Batch code (e.g. BATCH-2026-04)" value={batchForm.batch_code} onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
            <select value={batchForm.material_id} onChange={(e) => setBatchForm({ ...batchForm, material_id: e.target.value })} style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }}>
              {materials.map((m) => <option key={m.material_id} value={m.material_id}>{m.material_code} — {m.material_name}</option>)}
            </select>
            <input type="number" step="0.001" placeholder="Recorded Weight in KG" value={batchForm.recorded_weight_kg} onChange={(e) => setBatchForm({ ...batchForm, recorded_weight_kg: e.target.value })} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
            <button className="btn" type="submit">+ Create Batch Record</button>
          </div>
        </form>

        <form className="panel" onSubmit={async (e) => {
          e.preventDefault();
          await api.createRecycler(token, { recycler_name: recyclerName });
          setRecyclerName("");
          await load();
        }}>
          <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", marginBottom: "4px" }}>
            Authorized Recycler
          </h2>
          <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5", color: "#64748B", marginBottom: "16px" }}>
            Onboard certified waste management recycling facilities.
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            <input placeholder="Recycler organization name" value={recyclerName} onChange={(e) => setRecyclerName(e.target.value)} required style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: "10px", color: "#0F172A" }} />
            <button className="btn" type="submit">+ Add Recycler Partner</button>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#4B5563", marginBottom: "8px" }}>Active Recycling Partners:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {recyclers.map((r) => (
                <span key={r.recycler_id} style={{ padding: "4px 10px", borderRadius: "8px", background: "#E1F5EE", fontSize: "12px", fontWeight: "700", color: "#0B4E3D" }}>
                  {r.recycler_name}
                </span>
              ))}
            </div>
          </div>
        </form>
      </div>

      <div className="table-wrap panel">
        <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", margin: "0 0 14px" }}>
          Collection Batches
        </h2>
        <table>
          <thead><tr><th>Batch Code</th><th>Material</th><th>Weight (KG)</th><th>Status</th></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.collection_batch_id}>
                <td><strong>{b.batch_code}</strong></td>
                <td><span style={{ padding: "2px 6px", borderRadius: "4px", background: "#EEEDFE", color: "#26215C", fontSize: "11px", fontWeight: "700" }}>{b.material_code}</span></td>
                <td><strong>{b.recorded_weight_kg} kg</strong></td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: "#E1F5EE", color: "#0B4E3D" }}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em", color: "#071F5C", margin: 0 }}>
              EPR Compliance Reports
            </h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
              Generate formal environmental reports for brand audit compliance.
            </p>
          </div>
          <button className="btn" type="button" onClick={async () => {
            if (!companies[0]) return alert("Create a company first");
            await api.createEprReport(token, {
              company_id: companies[0].company_id,
              period_start: "2026-01-01",
              period_end: "2026-03-31",
              total_transactions: batches.length,
              total_recorded_weight_kg: batches.reduce((s, b) => s + Number(b.recorded_weight_kg), 0),
              total_verified_weight_kg: 0,
            });
            await load();
          }}>
            Generate Draft Report
          </button>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {reports.map((r) => (
            <div
              key={r.report_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontSize: "13px",
              }}
            >
              <div>
                <strong>{r.company_name}</strong>
                <span className="muted" style={{ marginLeft: "10px", fontSize: "12px" }}>
                  {r.period_start} → {r.period_end}
                </span>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: "#E1F5EE", color: "#0B4E3D" }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export function AdminAudit() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    if (token) api.audit(token).then((d) => setLogs(d.logs)).catch(console.error);
  }, [token]);
  return (
    <AppShell title="Audit logs" nav={nav}>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr><th>Timestamp</th><th>Actor Type</th><th>Action Performed</th><th>Entity Affected</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.audit_id}>
                <td style={{ fontSize: "12.5px", color: "#4B5563" }}>{new Date(l.created_at).toLocaleString()}</td>
                <td>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: l.actor_type === "ADMIN" ? "#FAEEDA" : "#EEEDFE", color: l.actor_type === "ADMIN" ? "#633806" : "#26215C" }}>
                    {l.actor_type}
                  </span>
                </td>
                <td><strong>{l.action}</strong></td>
                <td><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{l.entity_type}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
