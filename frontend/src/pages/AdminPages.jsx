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
        users: users.users.length,
        rvms: rvms.rvms.length,
        txs: txs.transactions.length,
        accounts: accounts.accounts.length,
        charity: charity.account.balance,
      });
    }
    if (token) load().catch(console.error);
  }, [token]);

  return (
    <AppShell title="Admin dashboard" nav={nav}>
      <div className="grid-4">
        <div className="panel"><h3>Users</h3><p className="stat">{stats.users ?? "—"}</p></div>
        <div className="panel"><h3>RVMs</h3><p className="stat">{stats.rvms ?? "—"}</p></div>
        <div className="panel"><h3>Transactions</h3><p className="stat">{stats.txs ?? "—"}</p></div>
        <div className="panel highlight"><h3>Charity</h3><p className="stat">₹{Number(stats.charity || 0).toFixed(2)}</p></div>
      </div>
      <p className="muted">
        Open the <Link to="/rvm-simulator">RVM Simulator</Link> to run a full deposit → QR → claim flow.
      </p>
    </AppShell>
  );
}

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const data = await api.users(token, q);
    setUsers(data.users);
  }

  useEffect(() => {
    if (token) load().catch((e) => setErr(e.message));
  }, [token]);

  return (
    <AppShell title="Users" nav={nav}>
      {err && <p className="error">{err}</p>}
      <form
        className="row-form"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input placeholder="Search name/email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" type="submit">Search</button>
      </form>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={async (e) => {
                      await api.updateUserRole(token, u.user_id, e.target.value);
                      await load();
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="EPR">EPR</option>
                  </select>
                </td>
                <td>{u.status}</td>
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
      <form className="panel stack-form" onSubmit={create}>
        <h2>Create simulated RVM</h2>
        <input placeholder="RVM code (RVM-002)" value={form.rvm_code} onChange={(e) => setForm({ ...form, rvm_code: e.target.value })} required />
        <input placeholder="Serial (SIM-RVM-002)" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
        <input placeholder="Location" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
        <input type="number" placeholder="Total capacity" value={form.total_capacity} onChange={(e) => setForm({ ...form, total_capacity: Number(e.target.value) })} />
        <button className="btn" type="submit">Create</button>
      </form>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Serial</th><th>Location</th><th>Status</th><th>Capacity</th><th>Sim</th>
            </tr>
          </thead>
          <tbody>
            {rvms.map((r) => (
              <tr key={r.rvm_id}>
                <td>{r.rvm_code}</td>
                <td>{r.serial_number}</td>
                <td>{r.location_name}</td>
                <td>{r.status}</td>
                <td>
                  {Number(r.current_capacity).toFixed(2)} / {Number(r.total_capacity)} {r.capacity_unit}
                  {" "}({Number(r.capacity_percent || 0)}%)
                </td>
                <td>{r.is_simulated ? "YES" : "NO"}</td>
              </tr>
            ))}
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
      <form className="panel row-form" onSubmit={save}>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {materials.map((m) => (
            <option key={m.material_id} value={m.material_id}>
              {m.material_code} — {m.material_name}
            </option>
          ))}
        </select>
        <input type="number" step="0.01" placeholder="Price / KG (INR)" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <button className="btn" type="submit">Set current price</button>
      </form>
      <p className="muted">Historical transaction rewards are frozen at creation time and are not recalculated.</p>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr><th>Material</th><th>₹ / kg</th><th>From</th><th>To</th></tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.price_id}>
                <td>{p.material_code}</td>
                <td>{Number(p.price_per_kg).toFixed(2)}</td>
                <td>{new Date(p.effective_from).toLocaleString()}</td>
                <td>{p.effective_to ? new Date(p.effective_to).toLocaleString() : "current"}</td>
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
              <th>Created</th><th>RVM</th><th>Material</th><th>Weight</th><th>Reward</th>
              <th>Status</th><th>Claim</th><th>User</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.transaction_id}>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.rvm_code}</td>
                <td>{t.material_code}</td>
                <td>{t.estimated_weight_g}g</td>
                <td>₹{Number(t.reward_value).toFixed(2)}</td>
                <td>{t.transaction_status}</td>
                <td>{t.claim_status}</td>
                <td>{t.user_email || "—"}</td>
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
      <div className="panel highlight">
        <h2>CHARITY-001</h2>
        <p className="stat">₹{Number(charity?.account?.balance || 0).toFixed(2)}</p>
      </div>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr><th>Code</th><th>Type</th><th>Owner</th><th>Balance</th><th>Status</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.account_id}>
                <td>{a.account_code}</td>
                <td>{a.account_type}</td>
                <td>{a.email || "—"}</td>
                <td>₹{Number(a.balance).toFixed(2)}</td>
                <td>{a.status}</td>
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
    setCompanies(c.companies);
    setBrands(b.brands);
    setProducts(p.products);
    setMaterials(m.materials);
    if (!companyId && c.companies[0]) setCompanyId(c.companies[0].company_id);
    if (!brandId && b.brands[0]) setBrandId(b.brands[0].brand_id);
    if (!materialId && m.materials[0]) setMaterialId(m.materials[0].material_id);
  }

  useEffect(() => {
    if (token) load().catch(console.error);
  }, [token]);

  return (
    <AppShell title="Catalog" nav={nav}>
      <div className="grid-2">
        <form className="panel stack-form" onSubmit={async (e) => { e.preventDefault(); await api.createCompany(token, { company_name: companyName }); setCompanyName(""); await load(); }}>
          <h2>Company</h2>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <button className="btn" type="submit">Add</button>
          <ul>{companies.map((c) => <li key={c.company_id}>{c.company_name}</li>)}</ul>
        </form>
        <form className="panel stack-form" onSubmit={async (e) => { e.preventDefault(); await api.createBrand(token, { company_id: companyId, brand_name: brandName }); setBrandName(""); await load(); }}>
          <h2>Brand</h2>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
          </select>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
          <button className="btn" type="submit">Add</button>
          <ul>{brands.map((b) => <li key={b.brand_id}>{b.brand_name}</li>)}</ul>
        </form>
        <form className="panel stack-form" onSubmit={async (e) => { e.preventDefault(); await api.createProduct(token, { brand_id: brandId, material_id: materialId, product_name: productName }); setProductName(""); await load(); }}>
          <h2>Product</h2>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
          </select>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            {materials.map((m) => <option key={m.material_id} value={m.material_id}>{m.material_code}</option>)}
          </select>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} required />
          <button className="btn" type="submit">Add</button>
          <ul>{products.map((p) => <li key={p.product_id}>{p.product_name}</li>)}</ul>
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
        <form className="panel stack-form" onSubmit={async (e) => {
          e.preventDefault();
          await api.createCollection(token, {
            ...batchForm,
            recorded_weight_kg: Number(batchForm.recorded_weight_kg),
          });
          await load();
        }}>
          <h2>Collection batch</h2>
          <input placeholder="Batch code" value={batchForm.batch_code} onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })} required />
          <select value={batchForm.material_id} onChange={(e) => setBatchForm({ ...batchForm, material_id: e.target.value })}>
            {materials.map((m) => <option key={m.material_id} value={m.material_id}>{m.material_code}</option>)}
          </select>
          <input type="number" step="0.001" placeholder="Weight kg" value={batchForm.recorded_weight_kg} onChange={(e) => setBatchForm({ ...batchForm, recorded_weight_kg: e.target.value })} required />
          <button className="btn" type="submit">Create batch</button>
        </form>
        <form className="panel stack-form" onSubmit={async (e) => {
          e.preventDefault();
          await api.createRecycler(token, { recycler_name: recyclerName });
          setRecyclerName("");
          await load();
        }}>
          <h2>Recycler</h2>
          <input value={recyclerName} onChange={(e) => setRecyclerName(e.target.value)} required />
          <button className="btn" type="submit">Add recycler</button>
        </form>
      </div>
      <div className="table-wrap panel">
        <h2>Batches</h2>
        <table>
          <thead><tr><th>Code</th><th>Material</th><th>Weight</th><th>Status</th></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.collection_batch_id}>
                <td>{b.batch_code}</td><td>{b.material_code}</td>
                <td>{b.recorded_weight_kg}</td><td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap panel">
        <h2>Recyclers</h2>
        <ul>{recyclers.map((r) => <li key={r.recycler_id}>{r.recycler_name}</li>)}</ul>
      </div>
      <div className="panel">
        <h2>EPR reports</h2>
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
        }}>Generate draft report</button>
        <ul>{reports.map((r) => <li key={r.report_id}>{r.company_name} · {r.period_start}→{r.period_end} · {r.status}</li>)}</ul>
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
            <tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.audit_id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.actor_type}</td>
                <td>{l.action}</td>
                <td>{l.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
