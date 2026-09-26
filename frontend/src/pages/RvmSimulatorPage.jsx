import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { socket } from "../socket";

const STAGES = [
  "IDLE",
  "ITEM_DETECTED",
  "ANALYZING",
  "VALIDATING",
  "ACCEPTED",
  "CALCULATING_REWARD",
  "GENERATING_QR",
  "WAITING_FOR_SCAN",
];

const adminNav = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/rvms", label: "RVMs" },
  { to: "/admin/pricing", label: "Pricing" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/rvm-simulator", label: "RVM Simulator" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function RvmSimulatorPage() {
  const { token, profile } = useAuth();
  const [rvms, setRvms] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [stage, setStage] = useState("IDLE");
  const [progress, setProgress] = useState(0);
  const [qrPayload, setQrPayload] = useState(null);
  const [live, setLive] = useState(null);
  const [display, setDisplay] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    object_type: "Bottle",
    material: "PET",
    brand: "",
    product: "",
    weight_g: "500",
    length: "8",
    width: "8",
    height: "22",
  });

  const selected = useMemo(
    () => rvms.find((r) => r.rvm_id === selectedId) || null,
    [rvms, selectedId]
  );

  async function load() {
    const [r, m] = await Promise.all([api.rvms(token), api.materials(token)]);
    setRvms(r.rvms || []);
    setMaterials(m.materials || []);
    if (!selectedId && r.rvms?.length) setSelectedId(r.rvms[0].rvm_id);
  }

  useEffect(() => {
    if (token) load().catch((e) => setErr(e.message));
  }, [token]);

  useEffect(() => {
    if (!selected) return undefined;
    function onLiveState(state) {
      setLive({
        status: state?.rvm_status?.[selected.rvm_code] || {},
        processing: state?.processing_status?.[selected.rvm_code] || {}
      });
      setDisplay(state?.rvm_display?.[selected.rvm_code] || null);
    }
    socket.on("liveState", onLiveState);
    return () => {
      socket.off("liveState", onLiveState);
    };
  }, [selected]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function pushStage(rvm, state, progressValue, transactionId = null) {
    setStage(state);
    setProgress(progressValue);
    await api.setProcessing(
      rvm.rvm_id,
      { state, progress: progressValue, transaction_id: transactionId },
      { serial: rvm.serial_number }
    );
  }

  async function runDeposit(e) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setErr("");
    setQrPayload(null);

    try {
      const rvm = selected;
      await pushStage(rvm, "ITEM_DETECTED", 0.15);
      await sleep(500);
      await pushStage(rvm, "ANALYZING", 0.35);
      await sleep(600);
      await pushStage(rvm, "VALIDATING", 0.55);
      await sleep(500);
      await pushStage(rvm, "ACCEPTED", 0.7);
      await sleep(400);
      await pushStage(rvm, "CALCULATING_REWARD", 0.85);
      await sleep(400);

      const deviceEventId = `SIM-${rvm.rvm_code}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const result = await api.createDeviceTransaction(
        {
          rvm_id: rvm.rvm_id,
          device_event_id: deviceEventId,
          object_type: form.object_type,
          material: form.material,
          brand: form.brand || undefined,
          product: form.product || undefined,
          weight_g: Number(form.weight_g),
          dimensions: {
            length: Number(form.length) || 0,
            width: Number(form.width) || 0,
            height: Number(form.height) || 0,
          },
          ml_confidence: 0.94,
          accept: true,
        },
        { serial: rvm.serial_number }
      );

      await pushStage(
        rvm,
        "GENERATING_QR",
        0.95,
        result.transaction.transaction_id
      );
      await sleep(400);

      setQrPayload(result.qrPayload);
      setStage("WAITING_FOR_SCAN");
      setProgress(1);
      await load();
    } catch (e) {
      setErr(e.message);
      setStage("IDLE");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  const capacityPct = selected
    ? Math.min(
        100,
        (Number(selected.current_capacity) / Number(selected.total_capacity)) *
          100
      )
    : 0;

  const nav = profile?.role === "ADMIN" ? adminNav : [
    { to: "/epr", label: "EPR Home", end: true },
    { to: "/rvm-simulator", label: "RVM Simulator" },
  ];

  return (
    <AppShell title="RVM Simulator" nav={nav}>
      <div className="sim-banner">SIMULATED RVM — not physical hardware</div>

      <div className="sim-layout">
        <section className="sim-screen">
          <div className="sim-bezel">
            <div className="sim-topbar">
              <span>OpenBin RVM</span>
              <span className="sim-badge">SIM</span>
            </div>

            {display?.url && (
              <div className="sim-media">
                {display.media_type === "VIDEO" ? (
                  <video src={display.url} controls autoPlay muted loop />
                ) : (
                  <img src={display.url} alt={display.title || "RVM content"} />
                )}
              </div>
            )}

            <div className="sim-state">{stage.replaceAll("_", " ")}</div>
            <div className="sim-progress">
              <div style={{ width: `${progress * 100}%` }} />
            </div>

            {selected && (
              <div className="sim-meta">
                <div>
                  <span>Code</span>
                  <strong>{selected.rvm_code}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{selected.location_name || "—"}</strong>
                </div>
                <div>
                  <span>Capacity</span>
                  <strong>
                    {Number(selected.current_capacity).toFixed(2)} /{" "}
                    {Number(selected.total_capacity)} {selected.capacity_unit}
                  </strong>
                </div>
                <div>
                  <span>Fill</span>
                  <strong>{capacityPct.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>Serial</span>
                  <strong>{selected.serial_number}</strong>
                </div>
                <div>
                  <span>Live</span>
                  <strong>
                    {live?.status?.current_state || stage} ·{" "}
                    {live?.status?.status || "ONLINE"}
                  </strong>
                </div>
              </div>
            )}

            <div className="capacity-bar">
              <div style={{ width: `${capacityPct}%` }} />
            </div>

            {qrPayload && (
              <div className="sim-qr">
                <p>Scan to claim reward</p>
                <QRCodeSVG
                  value={JSON.stringify(qrPayload)}
                  size={180}
                  bgColor="#0c1412"
                  fgColor="#e8f0ec"
                />
                <p className="muted small">
                  ₹{Number(qrPayload.transaction.reward_value).toFixed(2)} ·
                  expires {new Date(qrPayload.transaction.expires_at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="panel sim-controls">
          <h2>Deposit simulation</h2>
          <label>
            RVM
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setQrPayload(null);
                setStage("IDLE");
              }}
            >
              {rvms.map((r) => (
                <option key={r.rvm_id} value={r.rvm_id}>
                  {r.rvm_code} — {r.location_name || r.serial_number}
                </option>
              ))}
            </select>
          </label>

          <form className="stack-form" onSubmit={runDeposit}>
            <label>
              Object type
              <input
                value={form.object_type}
                onChange={(e) => updateField("object_type", e.target.value)}
              />
            </label>
            <label>
              Material
              <select
                value={form.material}
                onChange={(e) => updateField("material", e.target.value)}
              >
                {materials.map((m) => (
                  <option key={m.material_id} value={m.material_code}>
                    {m.material_code} — {m.material_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand (optional)
              <input
                value={form.brand}
                onChange={(e) => updateField("brand", e.target.value)}
              />
            </label>
            <label>
              Product (optional)
              <input
                value={form.product}
                onChange={(e) => updateField("product", e.target.value)}
              />
            </label>
            <label>
              Weight (g)
              <input
                type="number"
                min="1"
                value={form.weight_g}
                onChange={(e) => updateField("weight_g", e.target.value)}
                required
              />
            </label>
            <div className="grid-3">
              <label>
                L (cm)
                <input
                  type="number"
                  value={form.length}
                  onChange={(e) => updateField("length", e.target.value)}
                />
              </label>
              <label>
                W (cm)
                <input
                  type="number"
                  value={form.width}
                  onChange={(e) => updateField("width", e.target.value)}
                />
              </label>
              <label>
                H (cm)
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => updateField("height", e.target.value)}
                />
              </label>
            </div>
            <button className="btn" type="submit" disabled={busy || !selected}>
              {busy ? "Processing…" : "Deposit object"}
            </button>
          </form>

          {err && <p className="error">{err}</p>}

          {qrPayload && (
            <details>
              <summary>QR JSON payload</summary>
              <pre className="code-block">
                {JSON.stringify(qrPayload, null, 2)}
              </pre>
            </details>
          )}
        </section>
      </div>
    </AppShell>
  );
}
