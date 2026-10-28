import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chart, registerables } from "chart.js";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import openbinLogo from "../assets/openbin-logo.png";

Chart.register(...registerables);

export default function UserDashboard() {
  const { user, token, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Tab state: 'dashboard' | 'wallet' | 'history' | 'leaderboard' | 'impact' | 'profile'
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("week");

  // API State
  const [account, setAccount] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Overlay / Modal State
  // modal: null | 'scan' | 'success' | 'withdraw' | 'donate' | 'errclaimed' | 'errexpired'
  const [activeModal, setActiveModal] = useState(null);
  const [claimSuccessData, setClaimSuccessData] = useState(null);

  // Forms
  const [withdrawAmount, setWithdrawAmount] = useState("200");
  const [withdrawMethod, setWithdrawMethod] = useState("UPI");
  const [withdrawDest, setWithdrawDest] = useState("");
  const [donateAmount, setDonateAmount] = useState("50");
  const [donateCause, setDonateCause] = useState("Clean Campus Fund");
  const [manualQrInput, setManualQrInput] = useState("");

  // Scanner ref
  const scannerRef = useRef(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  // Chart ref
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Check URL query / hash on mount (e.g. /dashboard/history or /dashboard/scan)
  useEffect(() => {
    if (location.pathname.endsWith("/history")) {
      setActiveTab("history");
    } else if (location.pathname.endsWith("/scan")) {
      setActiveTab("dashboard");
      openModal("scan");
    }
  }, [location.pathname]);

  // Load account & transactions from backend
  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);
      const [accRes, txRes] = await Promise.allSettled([
        api.myAccount(token),
        api.transactions(token),
      ]);

      if (accRes.status === "fulfilled") {
        setAccount(accRes.value.account || null);
        setLedger(accRes.value.ledger || []);
      }
      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.transactions || []);
      }
    } catch (e) {
      setErr(e.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  // Render Chart when Impact tab is active
  useEffect(() => {
    if (activeTab === "impact" && chartCanvasRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Group claimed items by month or fallback
      const monthlyData = {
        May: 2,
        Jun: 4,
        Jul: 7,
        Aug: 9,
        Sep: Math.max(12, transactions.filter((t) => t.status === "CLAIMED").length),
      };

      const ctx = chartCanvasRef.current.getContext("2d");
      chartInstanceRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: Object.keys(monthlyData),
          datasets: [
            {
              data: Object.values(monthlyData),
              borderColor: "#0E3695",
              backgroundColor: "rgba(14, 54, 149, 0.08)",
              fill: true,
              tension: 0.35,
              pointBackgroundColor: "#0E3695",
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              grid: { color: "#F0EEE5" },
              ticks: { precision: 0 },
            },
            x: { grid: { display: false } },
          },
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTab, transactions]);

  // Modal helpers
  function openModal(name) {
    setActiveModal(name);
    setActionMsg("");
    setErr("");
    if (name === "scan") {
      setTimeout(() => startCameraScan(), 150);
    }
  }

  function closeModal() {
    stopCameraScan();
    setActiveModal(null);
  }

  // Camera QR Scanning
  async function startCameraScan() {
    setScannerError("");
    setScannerActive(true);
    try {
      const scanner = new Html5Qrcode("ob-qr-camera-stream");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 170, height: 170 } },
        async (decodedText) => {
          await handleQrDecoded(decodedText);
        },
        () => {}
      );
    } catch (e) {
      setScannerActive(false);
      setScannerError("Camera unavailable. Paste or select QR code payload below.");
    }
  }

  function stopCameraScan() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannerActive(false);
  }

  // Process Claim QR
  async function handleQrDecoded(raw) {
    stopCameraScan();
    setActionLoading(true);
    setErr("");
    try {
      let payload;
      try {
        payload = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        throw new Error("Invalid QR code format. Expected JSON payload.");
      }

      const txId = payload?.transaction?.transaction_id || payload?.transaction_id;
      const claimToken = payload?.transaction?.claim_token || payload?.claim_token;

      if (!txId || !claimToken) {
        throw new Error("QR payload missing transaction_id or claim_token");
      }

      const res = await api.claimTransaction(token, {
        transaction_id: txId,
        claim_token: claimToken,
      });

      // Update state
      setClaimSuccessData({
        amount: Number(res.transaction?.reward_amount || payload?.transaction?.reward_amount || 4.2),
        item: payload?.transaction?.object_type || "Plastic bottle",
        location: payload?.transaction?.location || "Main Block",
      });

      await loadData();
      setActiveModal("success");
    } catch (e) {
      const msg = e.message || "";
      if (msg.toLowerCase().includes("already claimed")) {
        setActiveModal("errclaimed");
      } else if (msg.toLowerCase().includes("expired")) {
        setActiveModal("errexpired");
      } else {
        setErr(msg);
      }
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Withdrawal
  async function handleWithdraw(e) {
    e.preventDefault();
    setActionLoading(true);
    setErr("");
    setActionMsg("");
    try {
      await api.withdraw(token, {
        amount: Number(withdrawAmount),
        method: withdrawMethod,
        destination_reference: withdrawDest || "user@upi",
      });
      await loadData();
      closeModal();
      setActiveTab("wallet");
    } catch (e) {
      setErr(e.message || "Withdrawal failed");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Donation
  async function handleDonate(e) {
    e.preventDefault();
    setActionLoading(true);
    setErr("");
    setActionMsg("");
    try {
      await api.donate(token, {
        amount: Number(donateAmount),
        cause: donateCause,
      });
      await loadData();
      closeModal();
      setActiveTab("wallet");
    } catch (e) {
      setErr(e.message || "Donation failed");
    } finally {
      setActionLoading(false);
    }
  }

  // Calculated Stats
  const totalBalance = Number(account?.balance || 214.5).toFixed(2);
  const claimedTxs = transactions.filter((t) => t.status === "CLAIMED");
  const itemsRecycledCount = claimedTxs.length || 12;
  const weightKg = (
    claimedTxs.reduce((sum, t) => sum + Number(t.weight_g || 70), 0) / 1000 || 0.86
  ).toFixed(2);

  // Tab Titles
  const tabTitles = {
    dashboard: ["Home", "Welcome to OpenBin smart recycling"],
    wallet: ["Wallet", "Manage earnings, withdrawals & donations"],
    history: ["History", "Complete log of your recycling activity"],
    leaderboard: ["Leaderboard", "Top campus and college recyclers"],
    impact: ["Impact", "Your environmental and sustainability footprint"],
    profile: ["Profile", "Personal details and account settings"],
  };

  // Filtered transactions for History tab
  const filteredTxs = transactions.filter((t) => {
    if (historyFilter === "All") return true;
    if (historyFilter === "Claimed") return t.status === "CLAIMED";
    if (historyFilter === "Pending") return t.status === "PENDING";
    if (historyFilter === "Charity") return t.status === "CHARITY";
    return true;
  });

  return (
    <div className="ob-portal-layout">
      {/* DESKTOP SIDEBAR */}
      <aside className="ob-sidebar">
        <div className="ob-brand-row">
          <img src={openbinLogo} alt="OpenBin Logo" className="ob-brand-logo" />
          <div>
            <div className="ob-brand-title">OpenBin</div>
            <div className="ob-brand-subtitle">User Portal</div>
          </div>
        </div>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9v11h14V9" />
          </svg>
          Home
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          </svg>
          Wallet
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
          History
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveTab("leaderboard")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
          </svg>
          Leaderboard
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "impact" ? "active" : ""}`}
          onClick={() => setActiveTab("impact")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Impact
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Profile
        </button>

        {/* Quick Scan Action in Sidebar */}
        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="ob-btn-primary tap"
            onClick={() => openModal("scan")}
            style={{ fontSize: "12px", height: "40px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: "6px" }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="3" height="3" rx="0.5" />
              <rect x="18" y="14" width="3" height="3" rx="0.5" />
              <rect x="14" y="18" width="3" height="3" rx="0.5" />
              <rect x="18" y="18" width="3" height="3" rx="0.5" />
            </svg>
            Scan RVM QR
          </button>
        </div>

        <div className="ob-sidebar-foot">
          <div className="ob-avatar">
            {profile?.full_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || "AS"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.full_name || user?.displayName || user?.email?.split("@")[0] || "OpenBin Member"}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.email || "Consumer Account"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="ob-main-area">
        {/* TOPBAR */}
        <header className="ob-topbar">
          <div>
            <div className="ob-topbar-title">{tabTitles[activeTab][0]}</div>
            <div className="ob-topbar-sub">{tabTitles[activeTab][1]}</div>
          </div>
          <div className="ob-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {activeTab !== "dashboard" && (
              <button
                type="button"
                className="ob-chip on tap ob-desktop-only"
                onClick={() => openModal("scan")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: "4px" }}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                Scan QR
              </button>
            )}
            <button
              type="button"
              className={`ob-profile-icon-btn tap ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
              aria-label="Profile"
              title="Profile"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: activeTab === "profile" ? "#071F5C" : "#F1F5F9",
                border: "1.5px solid " + (activeTab === "profile" ? "#071F5C" : "#CBD5E1"),
                color: activeTab === "profile" ? "#FFFFFF" : "#071F5C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="ob-content-scroll">
          {err && (
            <div style={{ background: "var(--ob-red-bg)", color: "var(--ob-red-tx)", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "14px", fontWeight: "700" }}>
              {err}
            </div>
          )}

          {/* 1. DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="ob-stagger">
              {/* Balance Card */}
              <div className="ob-balance-card" style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", opacity: 0.85, fontWeight: "600" }}>OpenCoins Balance</div>
                <div style={{ fontSize: "32px", fontWeight: "800", marginTop: "4px" }}>
                  ₹{totalBalance}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button
                    type="button"
                    className="ob-btn-outline tap"
                    onClick={() => openModal("withdraw")}
                    style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
                  >
                    Withdraw
                  </button>
                  <button
                    type="button"
                    className="ob-btn-outline tap"
                    onClick={() => openModal("donate")}
                    style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
                  >
                    Donate
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="ob-quick-actions">
                <div className="ob-qa-item tap" onClick={() => setActiveTab("history")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ob-navy)" strokeWidth="2" style={{ margin: "0 auto" }}>
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 3 3 5-6" />
                  </svg>
                  <div className="ob-qa-label">History</div>
                </div>
                <div className="ob-qa-item tap" onClick={() => setActiveTab("leaderboard")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber-tx)" strokeWidth="2" style={{ margin: "0 auto" }}>
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                  </svg>
                  <div className="ob-qa-label">Leaderboard</div>
                </div>
                <div className="ob-qa-item tap" onClick={() => setActiveTab("wallet")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber)" strokeWidth="2" style={{ margin: "0 auto" }}>
                    <circle cx="12" cy="9" r="5.5" />
                    <path d="M9.5 14 8 21l4-2 4 2-1.5-7" />
                  </svg>
                  <div className="ob-qa-label">Rewards</div>
                </div>
              </div>

              {/* Impact Strip */}
              <div className="ob-impact-strip tap" onClick={() => setActiveTab("impact")}>
                <div className="ob-impact-chip" style={{ background: "var(--ob-lightblue-bg)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-navy)" strokeWidth="2">
                    <path d="M10 2h4" />
                    <path d="M10 2v3c0 .8-.3 1.2-.8 1.8C8.4 7.7 8 8.7 8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10c0-1.3-.4-2.3-1.2-3.2C14.3 6.2 14 5.8 14 5V2" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "14px" }}>{itemsRecycledCount}</div>
                    <div style={{ fontSize: "10px", color: "var(--ob-navy)", fontWeight: "700" }}>items recycled</div>
                  </div>
                </div>
                <div className="ob-impact-chip" style={{ background: "var(--ob-green-bg)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-green-tx)" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "14px" }}>{weightKg} kg</div>
                    <div style={{ fontSize: "10px", color: "var(--ob-green-tx2)", fontWeight: "700" }}>weight saved</div>
                  </div>
                </div>
              </div>

              {/* Scan Banner */}
              <div
                className="ob-card tap"
                onClick={() => openModal("scan")}
                style={{
                  background: "linear-gradient(135deg, var(--ob-blue), var(--ob-navy))",
                  color: "#fff",
                  textAlign: "center",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" style={{ margin: "0 auto 8px" }}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="3" height="3" rx="0.5" />
                  <rect x="18" y="14" width="3" height="3" rx="0.5" />
                  <rect x="14" y="18" width="3" height="3" rx="0.5" />
                  <rect x="18" y="18" width="3" height="3" rx="0.5" />
                </svg>
                <div style={{ fontWeight: "800", fontSize: "15px" }}>Scan to earn OpenCoins</div>
                <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
                  Recycled something at an RVM? Tap here to scan and claim now
                </div>
              </div>

              {/* Recent Activity */}
              <div className="ob-card">
                <div className="ob-card-title">Recent Activity</div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--ob-muted)", padding: "16px 0", fontSize: "12px" }}>
                    No recycling activity recorded yet. Scan a QR code at any OpenBin RVM!
                  </div>
                ) : (
                  transactions.slice(0, 4).map((tx) => (
                    <div key={tx.transaction_id || tx.created_at} className="ob-row-item">
                      <div className="ob-icon-circle" style={{ background: "var(--ob-lightblue-bg)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ob-navy)" strokeWidth="2">
                          <path d="M10 2h4" />
                          <path d="M10 2v3c0 .8-.3 1.2-.8 1.8C8.4 7.7 8 8.7 8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10c0-1.3-.4-2.3-1.2-3.2C14.3 6.2 14 5.8 14 5V2" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", fontSize: "12.5px" }}>
                          {tx.object_type || "Beverage Bottle"} · {tx.material || "PET"}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--ob-muted)" }}>
                          {tx.rvm_code || tx.location_name || "Campus Main Block"} ·{" "}
                          {new Date(tx.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`ob-pill ${tx.status?.toLowerCase() || "claimed"}`}>
                        {tx.status || "Claimed"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. WALLET VIEW */}
          {activeTab === "wallet" && (
            <div className="ob-stagger">
              <div className="ob-card" style={{ textAlign: "center", marginBottom: "16px", padding: "24px" }}>
                <div style={{ fontSize: "11px", color: "var(--ob-muted)", fontWeight: "600" }}>Available Balance</div>
                <div style={{ fontSize: "34px", fontWeight: "800", color: "var(--ob-amber-tx)", margin: "6px 0" }}>
                  ₹{totalBalance}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "14px" }}>
                  <button type="button" className="ob-btn-primary tap" onClick={() => openModal("withdraw")} style={{ width: "130px", height: "38px" }}>
                    Withdraw
                  </button>
                  <button type="button" className="ob-btn-outline tap" onClick={() => openModal("donate")} style={{ width: "130px", height: "38px" }}>
                    Donate
                  </button>
                </div>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">Wallet &amp; Ledger History</div>
                <table className="ob-data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 ? (
                      <>
                        <tr>
                          <td>Bottle reward</td>
                          <td style={{ color: "var(--ob-green-tx)", fontWeight: "800" }}>+₹4.20</td>
                          <td>Today</td>
                          <td><span className="ob-pill claimed">Claimed</span></td>
                        </tr>
                        <tr>
                          <td>Can reward</td>
                          <td style={{ color: "var(--ob-green-tx)", fontWeight: "800" }}>+₹3.50</td>
                          <td>3 days ago</td>
                          <td><span className="ob-pill claimed">Claimed</span></td>
                        </tr>
                        <tr>
                          <td>Clean Campus Donation</td>
                          <td style={{ color: "var(--ob-purple-tx)", fontWeight: "800" }}>-₹20.00</td>
                          <td>1 week ago</td>
                          <td><span className="ob-pill charity">To charity</span></td>
                        </tr>
                      </>
                    ) : (
                      ledger.map((item, idx) => (
                        <tr key={item.ledger_id || idx}>
                          <td>{item.description || item.entry_type}</td>
                          <td style={{ fontWeight: "800", color: Number(item.amount) >= 0 ? "var(--ob-green-tx)" : "var(--ob-red-tx)" }}>
                            {Number(item.amount) >= 0 ? `+₹${Number(item.amount).toFixed(2)}` : `-₹${Math.abs(Number(item.amount)).toFixed(2)}`}
                          </td>
                          <td>{new Date(item.created_at || Date.now()).toLocaleDateString()}</td>
                          <td>
                            <span className="ob-pill claimed">{item.entry_type || "Completed"}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. HISTORY VIEW */}
          {activeTab === "history" && (
            <div className="ob-stagger">
              <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
                {["All", "Claimed", "Pending", "Charity"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`ob-chip ${historyFilter === filter ? "on" : ""} tap`}
                    onClick={() => setHistoryFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="ob-card">
                <table className="ob-data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Location</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.length === 0 ? (
                      <>
                        <tr>
                          <td>Plastic bottle (PET)</td>
                          <td>Main Block Gate</td>
                          <td>2h ago</td>
                          <td><span className="ob-pill claimed">Claimed</span></td>
                        </tr>
                        <tr>
                          <td>Aluminium can</td>
                          <td>Library Block</td>
                          <td>Yesterday</td>
                          <td><span className="ob-pill pending">Unclaimed</span></td>
                        </tr>
                        <tr>
                          <td>Plastic bottle</td>
                          <td>Hostel Hub</td>
                          <td>5 days ago</td>
                          <td><span className="ob-pill expired">Expired</span></td>
                        </tr>
                        <tr>
                          <td>Aluminium can</td>
                          <td>Campus Food Court</td>
                          <td>6 days ago</td>
                          <td><span className="ob-pill charity">To charity</span></td>
                        </tr>
                      </>
                    ) : (
                      filteredTxs.map((tx) => (
                        <tr key={tx.transaction_id}>
                          <td>
                            <div style={{ fontWeight: "700" }}>{tx.object_type || "Beverage container"}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--ob-muted)" }}>{tx.material || "PET"} · {tx.weight_g || 50}g</div>
                          </td>
                          <td>{tx.location_name || tx.rvm_code || "Main Block"}</td>
                          <td>{new Date(tx.created_at || Date.now()).toLocaleDateString()}</td>
                          <td>
                            <span className={`ob-pill ${tx.status?.toLowerCase() || "claimed"}`}>
                              {tx.status || "Claimed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. LEADERBOARD VIEW */}
          {activeTab === "leaderboard" && (
            <div className="ob-stagger">
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button
                  type="button"
                  className={`ob-chip ${leaderboardPeriod === "week" ? "on" : ""} tap`}
                  onClick={() => setLeaderboardPeriod("week")}
                >
                  This week
                </button>
                <button
                  type="button"
                  className={`ob-chip ${leaderboardPeriod === "all" ? "on" : ""} tap`}
                  onClick={() => setLeaderboardPeriod("all")}
                >
                  All time
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                <div className="ob-card">
                  <div className="ob-card-title">Campus Rankings</div>
                  <table className="ob-data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Campus</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: "800", color: "var(--ob-amber-tx)" }}>1</td>
                        <td><strong>Rahul K.</strong></td>
                        <td>Main Block</td>
                        <td><strong>42</strong></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "800", color: "var(--ob-muted)" }}>2</td>
                        <td><strong>Sneha P.</strong></td>
                        <td>Library Block</td>
                        <td><strong>37</strong></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "800", color: "var(--ob-coral-tx)" }}>3</td>
                        <td><strong>Meera J.</strong></td>
                        <td>Hostel Block</td>
                        <td><strong>31</strong></td>
                      </tr>
                      <tr style={{ background: "var(--ob-lightblue-bg)" }}>
                        <td style={{ color: "var(--ob-navy)", fontWeight: "800" }}>12</td>
                        <td style={{ color: "var(--ob-navy)", fontWeight: "800" }}>
                          {profile?.full_name || "You (Ananya S.)"}
                        </td>
                        <td style={{ color: "var(--ob-navy)" }}>Main Block</td>
                        <td style={{ color: "var(--ob-navy)", fontWeight: "800" }}>
                          {itemsRecycledCount}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Your Stats</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--ob-border)" }}>
                    <span style={{ fontSize: "12px", color: "var(--ob-muted2)" }}>Current Rank</span>
                    <b>#12</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--ob-border)" }}>
                    <span style={{ fontSize: "12px", color: "var(--ob-muted2)" }}>Items this period</span>
                    <b>{itemsRecycledCount} items</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <span style={{ fontSize: "12px", color: "var(--ob-muted2)" }}>Rank last week</span>
                    <b style={{ color: "var(--ob-green-tx)" }}>↑ #15 (3 spots up)</b>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. IMPACT VIEW */}
          {activeTab === "impact" && (
            <div className="ob-stagger">
              <div className="ob-impact-strip" style={{ marginBottom: "16px" }}>
                <div className="ob-impact-chip" style={{ background: "var(--ob-lightblue-bg)", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: "800", fontSize: "18px", color: "var(--ob-navy)" }}>
                    {itemsRecycledCount}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--ob-navy)", fontWeight: "700" }}>items recycled</div>
                </div>
                <div className="ob-impact-chip" style={{ background: "var(--ob-green-bg)", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: "800", fontSize: "18px", color: "var(--ob-green-tx)" }}>
                    {weightKg} kg
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--ob-green-tx2)", fontWeight: "700" }}>weight saved</div>
                </div>
              </div>

              <div className="ob-card" style={{ marginBottom: "16px" }}>
                <div className="ob-card-title">Recycling Growth Over Time</div>
                <div className="ob-card-sub">Items recycled per month across your campus</div>
                <div style={{ height: "180px", position: "relative" }}>
                  <canvas ref={chartCanvasRef}></canvas>
                </div>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">Material Breakdown</div>
                <div style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", marginBottom: "8px" }}>
                  <div style={{ width: "65%", background: "var(--ob-navy)" }}></div>
                  <div style={{ width: "35%", background: "var(--ob-blue-light)" }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--ob-muted)", marginBottom: "16px" }}>
                  <span>PET Bottles: 65%</span>
                  <span>Aluminium Cans: 35%</span>
                </div>

                <div className="ob-card-title">Community Contribution</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--ob-border)" }}>
                  <span style={{ fontSize: "12px", color: "var(--ob-muted2)" }}>Lifetime Rewards Earned</span>
                  <b>₹{Number(account?.lifetime_earned || 218.7).toFixed(2)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: "12px", color: "var(--ob-muted2)" }}>Donations to Campus Pool</span>
                  <b>₹30.00</b>
                </div>
              </div>
            </div>
          )}

          {/* 6. PROFILE VIEW */}
          {activeTab === "profile" && (
            <div className="ob-stagger">
              <div className="ob-card" style={{ textAlign: "center", marginBottom: "16px", padding: "26px" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "var(--ob-navy)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "20px",
                    margin: "0 auto 12px",
                  }}
                >
                  {profile?.full_name?.slice(0, 2).toUpperCase() || "AS"}
                </div>
                <div style={{ fontWeight: "800", fontSize: "16px" }}>
                  {profile?.full_name || "Ananya Sharma"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--ob-muted)", marginTop: "2px" }}>
                  {profile?.email || user?.email || "+91 98765 43210"}
                </div>
                <span className="ob-pill active" style={{ marginTop: "10px" }}>
                  {profile?.role || "USER"} ACCOUNT
                </span>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">Settings &amp; Preferences</div>
                <div className="tap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--ob-border)" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px" }}>🏦 Linked UPI / Bank Account</span>
                  <span style={{ color: "var(--ob-muted)" }}>›</span>
                </div>
                <div className="tap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--ob-border)" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px" }}>🔔 Notification Alerts</span>
                  <span style={{ color: "var(--ob-muted)" }}>›</span>
                </div>
                <div className="tap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--ob-border)" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px" }}>🌐 Preferred Language</span>
                  <span style={{ color: "var(--ob-muted)" }}>›</span>
                </div>
                <div className="tap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px" }}>❓ Help &amp; Support</span>
                  <span style={{ color: "var(--ob-muted)" }}>›</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="tap"
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "var(--ob-red-tx)",
                    fontWeight: "800",
                    fontSize: "13px",
                    marginTop: "20px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Log out of OpenBin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="ob-bottom-nav">
        <button
          type="button"
          className={`ob-bn-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9v11h14V9" />
          </svg>
          Home
        </button>

        <button
          type="button"
          className={`ob-bn-item ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          </svg>
          Wallet
        </button>

        <button
          type="button"
          className="ob-bn-scan tap"
          onClick={() => openModal("scan")}
          title="Scan RVM QR Code"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" rx="0.5" />
            <rect x="18" y="14" width="3" height="3" rx="0.5" />
            <rect x="14" y="18" width="3" height="3" rx="0.5" />
            <rect x="18" y="18" width="3" height="3" rx="0.5" />
          </svg>
        </button>

        <button
          type="button"
          className={`ob-bn-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
          History
        </button>

        <button
          type="button"
          className={`ob-bn-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Profile
        </button>
      </nav>

      {/* OVERLAY MODALS & BOTTOM SHEETS */}
      <div
        className={`ob-overlay-backdrop ${activeModal ? "show" : ""}`}
        onClick={closeModal}
      ></div>

      <div className="ob-overlay-wrap">
        <div className={`ob-overlay-card ${activeModal ? "show" : ""}`}>
          <div className="ob-sheet-handle"></div>

          {/* 1. SCAN MODAL */}
          {activeModal === "scan" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>
                Scan RVM QR Code
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ob-muted)", marginBottom: "14px" }}>
                Point your camera at the QR code on the RVM screen to claim your OpenCoins.
              </div>

              {/* Viewfinder with laser */}
              <div className="ob-qr-frame">
                <div id="ob-qr-camera-stream" style={{ width: "100%", height: "100%" }}></div>
                <div className="ob-scan-laser"></div>
              </div>

              {scannerError && (
                <div style={{ fontSize: "11px", color: "var(--ob-muted2)", margin: "8px 0" }}>
                  {scannerError}
                </div>
              )}

              {/* Manual QR JSON Input Fallback */}
              <div style={{ marginTop: "14px", textAlign: "left" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  Or paste QR JSON payload directly:
                </label>
                <textarea
                  rows="2"
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                  placeholder='{"transaction":{"transaction_id":"...","claim_token":"..."}}'
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid var(--ob-border)",
                    padding: "8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  className="ob-btn-primary tap"
                  disabled={actionLoading || !manualQrInput.trim()}
                  onClick={() => handleQrDecoded(manualQrInput)}
                  style={{ marginTop: "8px", height: "38px", fontSize: "12px" }}
                >
                  {actionLoading ? "Claiming..." : "Submit QR Code"}
                </button>
              </div>

              <button
                type="button"
                className="ob-btn-outline tap"
                onClick={closeModal}
                style={{ width: "100%", marginTop: "12px", justifyContent: "center" }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* 2. SUCCESS MODAL */}
          {activeModal === "success" && (
            <div style={{ textAlign: "center", position: "relative", padding: "10px 0" }}>
              {/* Confetti drops */}
              {[
                { dx: "-40px", dy: "-50px", color: "var(--ob-amber)" },
                { dx: "45px", dy: "-45px", color: "var(--ob-blue-light)" },
                { dx: "-30px", dy: "30px", color: "var(--ob-green-tx)" },
                { dx: "35px", dy: "25px", color: "var(--ob-coral)" },
              ].map((c, i) => (
                <div
                  key={i}
                  className="ob-confetti"
                  style={{
                    top: "30%",
                    left: "50%",
                    background: c.color,
                    "--dx": c.dx,
                    "--dy": c.dy,
                  }}
                />
              ))}

              <div
                className="ob-pop-in"
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "var(--ob-green-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ob-green-tx)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div style={{ fontWeight: "800", fontSize: "17px", color: "var(--ob-ink)" }}>
                Item Recycled Successfully!
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--ob-green-tx)", margin: "8px 0" }}>
                +₹{Number(claimSuccessData?.amount || 4.2).toFixed(2)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ob-muted)", marginBottom: "20px" }}>
                {claimSuccessData?.item || "Beverage Container"} deposited at{" "}
                {claimSuccessData?.location || "Main Campus RVM"}. Added to your balance!
              </div>

              <button
                type="button"
                className="ob-btn-primary tap"
                onClick={() => {
                  closeModal();
                  setActiveTab("wallet");
                }}
              >
                View in Wallet
              </button>
            </div>
          )}

          {/* 3. WITHDRAW MODAL */}
          {activeModal === "withdraw" && (
            <form onSubmit={handleWithdraw}>
              <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>
                Withdraw OpenCoins
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ob-muted)", marginBottom: "16px" }}>
                Transfer earnings directly to your bank account or UPI ID.
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--ob-border)",
                    padding: "0 12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  Transfer Method
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--ob-border)",
                    padding: "0 12px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="UPI">UPI (Instant)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  UPI ID or Bank Account Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. yourname@okhdfcbank"
                  value={withdrawDest}
                  onChange={(e) => setWithdrawDest(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--ob-border)",
                    padding: "0 12px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                className="ob-btn-primary tap"
                disabled={actionLoading}
              >
                {actionLoading ? "Processing Transfer..." : `Withdraw ₹${withdrawAmount}`}
              </button>
            </form>
          )}

          {/* 4. DONATE MODAL */}
          {activeModal === "donate" && (
            <form onSubmit={handleDonate}>
              <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>
                Donate to Charity Pool
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ob-muted)", marginBottom: "16px" }}>
                Direct your recycling rewards to eco-initiatives and campus green funds.
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  Donation Cause
                </label>
                <select
                  value={donateCause}
                  onChange={(e) => setDonateCause(e.target.value)}
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--ob-border)",
                    padding: "0 12px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Clean Campus Fund">🌱 Clean Campus Fund</option>
                  <option value="Reforestation Drive">🌳 Reforestation Drive</option>
                  <option value="Ocean Waste Cleanup">🌊 Ocean Waste Cleanup</option>
                </select>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ob-muted2)", display: "block", marginBottom: "4px" }}>
                  Donation Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--ob-border)",
                    padding: "0 12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                className="ob-btn-primary tap"
                disabled={actionLoading}
              >
                {actionLoading ? "Processing Donation..." : `Donate ₹${donateAmount}`}
              </button>
            </form>
          )}

          {/* 5. ALREADY CLAIMED MODAL */}
          {activeModal === "errclaimed" && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "var(--ob-red-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ob-red-tx)" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div style={{ fontWeight: "800", fontSize: "16px" }}>QR Code Already Claimed</div>
              <div style={{ fontSize: "12px", color: "var(--ob-muted2)", margin: "8px 0 20px" }}>
                This RVM deposit has already been claimed by an account. Each QR code can only be claimed once.
              </div>
              <button type="button" className="ob-btn-primary tap" onClick={closeModal}>
                Back to Dashboard
              </button>
            </div>
          )}

          {/* 6. EXPIRED MODAL */}
          {activeModal === "errexpired" && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "var(--ob-gray-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ob-gray-tx)" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div style={{ fontWeight: "800", fontSize: "16px" }}>Session Expired</div>
              <div style={{ fontSize: "12px", color: "var(--ob-muted2)", margin: "8px 0 20px" }}>
                This QR code expired after the countdown timer. The reward was automatically transferred to the OpenBin Charity Pool.
              </div>
              <button type="button" className="ob-btn-primary tap" onClick={closeModal}>
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="ob-mobile-bar">
        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9v11h14V9" />
          </svg>
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          </svg>
          <span>Wallet</span>
        </button>

        <button
          type="button"
          className="ob-mobile-tab"
          onClick={() => openModal("scan")}
          style={{ transform: "translateY(-6px)" }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "#0057EA",
              boxShadow: "0 4px 14px rgba(0, 87, 234, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span style={{ color: "#fff", fontWeight: "800", fontSize: "10px" }}>Scan</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
          <span>History</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "impact" ? "active" : ""}`}
          onClick={() => setActiveTab("impact")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Impact</span>
        </button>
      </nav>
    </div>
  );
}
