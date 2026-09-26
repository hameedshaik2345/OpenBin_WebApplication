import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const nav = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/scan", label: "Scan RVM QR" },
  { to: "/dashboard/history", label: "History" },
];

export default function UserDashboard() {
  const { token, profile } = useAuth();
  const { pathname } = useLocation();
  const isHistory = pathname.endsWith("/history");
  const [account, setAccount] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const [acc, txs] = await Promise.all([
      api.myAccount(token),
      api.transactions(token),
    ]);
    setAccount(acc.account);
    setLedger(acc.ledger || []);
    setTransactions(txs.transactions || []);
  }

  useEffect(() => {
    if (token) load().catch((e) => setErr(e.message));
  }, [token]);

  async function doWithdraw(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.withdraw(token, {
        amount: Number(amount),
        method,
        destination_reference: "masked",
      });
      setMsg("Withdrawal completed");
      setAmount("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function doDonate(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.donate(token, { amount: Number(amount) });
      setMsg("Donation sent to CHARITY-001");
      setAmount("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <AppShell title="User dashboard" nav={nav}>
      {err && <p className="error">{err}</p>}
      {msg && <p className="success">{msg}</p>}

      {!isHistory && (
        <>
          <section className="grid-2">
            <div className="panel">
              <h2>Profile</h2>
              <p>
                <strong>{profile?.full_name}</strong>
              </p>
              <p className="muted">{profile?.email}</p>
              <p className="muted">Role: {profile?.role}</p>
            </div>
            <div className="panel highlight">
              <h2>Balance</h2>
              <p className="stat">
                ₹{Number(account?.balance || 0).toFixed(2)}
              </p>
              <p className="muted">{account?.account_code}</p>
              <Link className="btn" to="/dashboard/scan">
                Scan RVM QR
              </Link>
            </div>
          </section>

          <section className="panel">
            <h2>Withdraw / Donate</h2>
            <form className="row-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount (INR)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
                <option value="MANUAL">Manual</option>
              </select>
              <button className="btn" type="button" onClick={doWithdraw}>
                Withdraw
              </button>
              <button className="btn secondary" type="button" onClick={doDonate}>
                Donate to Charity
              </button>
            </form>
          </section>
        </>
      )}

      {isHistory && (
        <>
          <section className="panel">
            <h2>Deposited / claimed items</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>RVM</th>
                    <th>Material</th>
                    <th>Weight (g)</th>
                    <th>Reward</th>
                    <th>Claim</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.transaction_id}>
                      <td>{new Date(t.created_at).toLocaleString()}</td>
                      <td>{t.rvm_code}</td>
                      <td>{t.material_code}</td>
                      <td>{t.estimated_weight_g}</td>
                      <td>₹{Number(t.reward_value).toFixed(2)}</td>
                      <td>{t.claim_status}</td>
                    </tr>
                  ))}
                  {!transactions.length && (
                    <tr>
                      <td colSpan={6} className="muted">
                        No claimed deposits yet — scan a QR from the RVM simulator.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Ledger</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Dir</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.account_transaction_id}>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td>{l.source_type}</td>
                      <td>{l.direction}</td>
                      <td>₹{Number(l.amount).toFixed(2)}</td>
                      <td>{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
