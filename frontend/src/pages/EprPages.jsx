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
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.eprReports(token), api.collections(token)]).then(([r, b]) => {
      setReports(r.reports);
      setBatches(b.batches);
    });
  }, [token]);

  return (
    <AppShell title="EPR / collection visibility" nav={nav}>
      <div className="panel">
        <h2>Collection batches</h2>
        <ul>
          {batches.map((b) => (
            <li key={b.collection_batch_id}>
              {b.batch_code} · {b.material_code} · {b.recorded_weight_kg} kg · {b.status}
            </li>
          ))}
          {!batches.length && <li className="muted">No batches yet</li>}
        </ul>
      </div>
      <div className="panel">
        <h2>EPR reports</h2>
        <ul>
          {reports.map((r) => (
            <li key={r.report_id}>
              {r.company_name} · {r.period_start} → {r.period_end} · {r.status}
            </li>
          ))}
          {!reports.length && <li className="muted">No reports yet</li>}
        </ul>
      </div>
    </AppShell>
  );
}
