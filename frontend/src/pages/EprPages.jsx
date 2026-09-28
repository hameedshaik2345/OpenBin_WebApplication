import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { socket } from "../socket";

const nav = [
  { to: "/epr", label: "Overview", end: true },
  { to: "/epr/rvms", label: "RVMs" },
  { to: "/epr/media", label: "RVM Media" },
  { to: "/epr/reports", label: "EPR Reports" },
  { to: "/rvm-simulator", label: "RVM Simulator" },
];

export function EprHome() {
  const { token } = useAuth();
  const [rvms, setRvms] = useState([]);
  const [live, setLive] = useState({});

  useEffect(() => {
    if (!token) return;
    api.rvms(token).then((d) => setRvms(d.rvms)).catch(console.error);
  }, [token]);

  useEffect(() => {
    function onLiveState(state) {
      setLive(state?.rvm_status || {});
    }
    socket.on("liveState", onLiveState);
    return () => {
      socket.off("liveState", onLiveState);
    };
  }, []);

  return (
    <AppShell title="EPR dashboard" nav={nav}>
      <p className="muted">
        Restricted access: RVM monitoring, live state, and media — not full admin controls.
      </p>
      <div className="grid-2">
        {rvms.map((r) => {
          const status = live[r.rvm_code];
          return (
            <div className="panel" key={r.rvm_id}>
              <h3>{r.rvm_code}</h3>
              <p>{r.location_name}</p>
              <p>
                Capacity: {Number(r.current_capacity).toFixed(2)} / {Number(r.total_capacity)}{" "}
                {r.capacity_unit}
              </p>
              <p className="muted">
                Live: {status?.current_state || "—"} · {status?.status || "unknown"}
              </p>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

export function EprRvms() {
  const { token } = useAuth();
  const [rvms, setRvms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (token) api.rvms(token).then((d) => setRvms(d.rvms)).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    api.rvm(token, selected).then(setDetail).catch(console.error);
  }, [token, selected]);

  return (
    <AppShell title="RVM monitoring" nav={nav}>
      <div className="grid-2">
        <div className="panel">
          <h2>RVMs</h2>
          <ul className="link-list">
            {rvms.map((r) => (
              <li key={r.rvm_id}>
                <button type="button" className="linkish" onClick={() => setSelected(r.rvm_id)}>
                  {r.rvm_code} — {r.location_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Details</h2>
          {!detail && <p className="muted">Select an RVM</p>}
          {detail && (
            <>
              <p><strong>{detail.rvm.rvm_code}</strong></p>
              <p>Serial: {detail.rvm.serial_number}</p>
              <p>Location: {detail.rvm.location_name}</p>
              <p>
                Capacity: {Number(detail.rvm.current_capacity).toFixed(2)} /{" "}
                {Number(detail.rvm.total_capacity)} {detail.rvm.capacity_unit}
              </p>
              <p>Status: {detail.rvm.status}</p>
              <p>Last seen: {detail.rvm.last_seen_at ? new Date(detail.rvm.last_seen_at).toLocaleString() : "—"}</p>
              <h3>Recent activity</h3>
              <ul>
                {(detail.transactions || []).slice(0, 8).map((t) => (
                  <li key={t.transaction_id}>
                    {t.material_code} · {t.estimated_weight_g}g · {t.claim_status}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export function EprMedia() {
  const { token } = useAuth();
  const [rvms, setRvms] = useState([]);
  const [rvmId, setRvmId] = useState("");
  const [mediaType, setMediaType] = useState("IMAGE");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    api.rvms(token).then((d) => {
      setRvms(d.rvms);
      if (d.rvms[0]) setRvmId(d.rvms[0].rvm_id);
    });
  }, [token]);

  async function upload(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (!file) {
      setErr("Choose a file");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("media_type", mediaType);
      fd.append("title", title);
      await api.uploadRvmMedia(token, rvmId, fd);
      setMsg("Media uploaded and pushed to RVM display via Storage + Realtime Database");
      setFile(null);
      setTitle("");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <AppShell title="RVM media" nav={nav}>
      <form className="panel stack-form" onSubmit={upload}>
        <p className="muted">
          Upload image/video → Firebase Storage → Realtime Database `rvm_display` → Simulator screen.
        </p>
        <select value={rvmId} onChange={(e) => setRvmId(e.target.value)}>
          {rvms.map((r) => (
            <option key={r.rvm_id} value={r.rvm_id}>
              {r.rvm_code}
            </option>
          ))}
        </select>
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
          <option value="IMAGE">IMAGE</option>
          <option value="VIDEO">VIDEO</option>
        </select>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="btn" type="submit">Upload & send to RVM</button>
        {msg && <p className="success">{msg}</p>}
        {err && <p className="error">{err}</p>}
      </form>
    </AppShell>
  );
}

export function EprReports() {
  const { token, profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    company_id: "",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    status: "DRAFT",
  });

  async function load() {
    try {
      const [r, c] = await Promise.all([
        api.eprReports(token),
        api.companies(token).catch(() => ({ companies: [] })),
      ]);
      setReports(r.reports || []);
      setCompanies(c.companies || []);
      if (!form.company_id && c.companies?.length) {
        setForm((prev) => ({ ...prev, company_id: c.companies[0].company_id }));
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  async function handleGenerate(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const result = await api.createEprReport(token, form);
      setMsg(`EPR Compliance Report generated successfully (${result.report.total_recorded_weight_kg} kg recorded across ${result.report.total_transactions} deposits)`);
      await load();
      viewDetails(result.report.report_id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetails(reportId) {
    try {
      const data = await api.eprReport(token, reportId);
      setSelectedReport(data.report);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <AppShell title="EPR Compliance & Reporting" nav={nav}>
      <form className="panel stack-form" onSubmit={handleGenerate}>
        <h2>Generate EPR Compliance Report</h2>
        <p className="muted">
          Generates an official Extended Producer Responsibility compliance report. Automatically aggregates all RVM deposit transactions and verified recycler receipts for the selected period.
        </p>

        <div className="grid-2">
          <label>
            Company
            <select
              value={form.company_id}
              onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              required
            >
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name} ({c.registration_number || "CIN"})
                </option>
              ))}
            </select>
          </label>

          <label>
            Report Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="VERIFIED">VERIFIED</option>
            </select>
          </label>

          <label>
            Period Start
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              required
            />
          </label>

          <label>
            Period End
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              required
            />
          </label>
        </div>

        <button className="btn" type="submit" disabled={loading || !form.company_id}>
          {loading ? "Calculating & Generating…" : "⚡ Generate Compliance Report"}
        </button>

        {msg && <p className="success">{msg}</p>}
        {err && <p className="error">{err}</p>}
      </form>

      <div className="panel table-wrap">
        <h2>Generated Reports</h2>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Period</th>
              <th>Transactions</th>
              <th>Recorded (kg)</th>
              <th>Verified (kg)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.report_id}>
                <td><strong>{r.company_name}</strong></td>
                <td>{r.period_start} → {r.period_end}</td>
                <td>{r.total_transactions}</td>
                <td>{Number(r.total_recorded_weight_kg).toFixed(3)} kg</td>
                <td>{Number(r.total_verified_weight_kg).toFixed(3)} kg</td>
                <td>
                  <span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span>
                </td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => viewDetails(r.report_id)}
                  >
                    Breakdown
                  </button>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() =>
                      api.exportEprReportCsv(
                        token,
                        r.report_id,
                        `EPR_${r.company_name.replace(/\s+/g, "_")}_${r.period_start}.csv`
                      )
                    }
                  >
                    📥 CSV
                  </button>
                </td>
              </tr>
            ))}
            {!reports.length && (
              <tr>
                <td colSpan="7" className="muted text-center">
                  No EPR reports found. Generate one above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <div className="panel modal-like" style={{ marginTop: "1.5rem", border: "1px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Compliance Report Breakdown: {selectedReport.company_name}</h2>
            <button className="btn ghost" type="button" onClick={() => setSelectedReport(null)}>✕ Close</button>
          </div>
          <p className="muted">
            Period: {selectedReport.period_start} to {selectedReport.period_end} · Generated by {selectedReport.generated_by_name}
          </p>

          <h3>Material Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Material</th>
                <th>Transactions</th>
                <th>Total Weight (kg)</th>
                <th>Total Rewards Disbursed</th>
              </tr>
            </thead>
            <tbody>
              {selectedReport.breakdown?.map((b) => (
                <tr key={b.material_code}>
                  <td><strong>{b.material_code}</strong></td>
                  <td>{b.material_name}</td>
                  <td>{b.count}</td>
                  <td>{Number(b.weight_kg).toFixed(3)} kg</td>
                  <td>₹{Number(b.total_reward).toFixed(2)}</td>
                </tr>
              ))}
              {!selectedReport.breakdown?.length && (
                <tr>
                  <td colSpan="5" className="muted">
                    No transactions recorded for this company during this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem" }}>
            <button
              className="btn"
              type="button"
              onClick={() =>
                api.exportEprReportCsv(
                  token,
                  selectedReport.report_id,
                  `EPR_${selectedReport.company_name.replace(/\s+/g, "_")}_${selectedReport.period_start}.csv`
                )
              }
            >
              📥 Download Full CSV Report
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
