import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const nav = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/scan", label: "Scan RVM QR" },
];

export default function ScanClaimPage() {
  const { token } = useAuth();
  const [manual, setManual] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  async function claimFromPayload(raw) {
    setErr("");
    setResult(null);
    let payload;
    try {
      payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      throw new Error("QR payload is not valid JSON");
    }

    const transactionId = payload?.transaction?.transaction_id;
    const claimToken = payload?.transaction?.claim_token;
    if (!transactionId || !claimToken) {
      throw new Error("QR missing transaction_id or claim_token");
    }

    const claimed = await api.claimTransaction(token, {
      transaction_id: transactionId,
      claim_token: claimToken,
    });

    setResult({
      ...payload,
      user: claimed.user,
      account: claimed.account,
      transaction: {
        ...payload.transaction,
        ...claimed.transaction,
      },
    });
  }

  async function onManualSubmit(e) {
    e.preventDefault();
    try {
      await claimFromPayload(manual);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function startScan() {
    setErr("");
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 240 },
        async (decoded) => {
          try {
            await scanner.stop();
            setScanning(false);
            await claimFromPayload(decoded);
          } catch (e) {
            setErr(e.message);
          }
        },
        () => {}
      );
    } catch (e) {
      setScanning(false);
      setErr(
        e.message ||
          "Camera unavailable — paste the QR JSON below (dev fallback)."
      );
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <AppShell title="Scan RVM QR" nav={nav}>
      <section className="panel">
        <p className="muted">
          You are already authenticated. The backend will derive your OpenBin
          user from your Firebase token — never send a client-supplied user_id.
        </p>
        <div className="row-form">
          <button className="btn" type="button" onClick={startScan} disabled={scanning}>
            {scanning ? "Scanning…" : "Open camera scanner"}
          </button>
        </div>
        <div id="qr-reader" className="qr-reader" />
      </section>

      <section className="panel">
        <h2>Dev fallback — paste QR JSON</h2>
        <form onSubmit={onManualSubmit}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              className="btn secondary"
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setManual(text);
                } catch {
                  setErr("Clipboard access denied. Please paste manually into the box.");
                }
              }}
            >
              📋 Paste from Clipboard
            </button>
          </div>
          <textarea
            rows={8}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder='Paste QR JSON from simulator…'
          />
          <button className="btn" type="submit" disabled={!manual.trim()}>
            Claim reward
          </button>
        </form>
      </section>

      {err && <p className="error">{err}</p>}

      {result && (
        <section className="panel success-panel">
          <h2>Claim successful</h2>
          <p>
            Credited ₹{Number(result.transaction.reward_value).toFixed(2)} to{" "}
            {result.user?.name}
          </p>
          <p className="muted">
            New balance: ₹{Number(result.account?.balance || 0).toFixed(2)}
          </p>
          <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </AppShell>
  );
}
