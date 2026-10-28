import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import openbinLogo from "../assets/openbin-logo.png";

function getNavIcon(path) {
  switch (path) {
    case "/admin":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "/admin/users":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "/admin/rvms":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
    case "/admin/catalog":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case "/admin/pricing":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "/admin/transactions":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case "/admin/accounts":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <circle cx="16" cy="14" r="2" />
        </svg>
      );
    case "/admin/orders":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "/admin/analytics":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "/admin/collection":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 2h4" />
          <path d="M10 2v3c0 .8-.3 1.2-.8 1.8C8.4 7.7 8 8.7 8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10c0-1.3-.4-2.3-1.2-3.2C14.3 6.2 14 5.8 14 5V2" />
        </svg>
      );
    case "/admin/audit":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "/rvm-simulator":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

const sectionSubtitles = {
  "Admin dashboard": "High-level metrics, active devices, and charity ledger overview",
  "Users & Access Control": "Account issuance, role authorization, and user status management",
  "RVMs": "Fleet deployment, hardware telemetry, and capacity monitoring",
  "Material pricing": "Per-kilogram reward rates and historical pricing schedules",
  "Transactions": "Real-time deposit ledger, rewards issued, and claim states",
  "Accounts & charity": "System accounts, user balances, and charity pool funds",
  "Catalog": "Manufacturer companies, partner brands, and recyclable product SKUs",
  "Collection / EPR": "Logistics collection batches, certified recyclers, and EPR reports",
  "Audit logs": "Immutable security log of administrative actions and role transitions",
};

export default function AppShell({ title, nav, children }) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const sub = sectionSubtitles[title] || "Central Management Console & Operations";

  return (
    <div className="ob-portal-layout">
      {/* DESKTOP SIDEBAR */}
      <aside className="ob-sidebar">
        {/* Brand Header */}
        <div className="ob-brand-row">
          <img src={openbinLogo} alt="OpenBin Logo" className="ob-brand-logo" />
          <div>
            <div className="ob-brand-title">OpenBin</div>
            <div className="ob-brand-subtitle">Admin Console</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, overflowY: "auto", paddingRight: "2px" }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `ob-nav-item ${isActive ? "active" : ""}`}
            >
              {getNavIcon(item.to)}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="ob-sidebar-foot">
          <div
            className="ob-avatar"
            style={{
              background: "linear-gradient(135deg, #EF9F27 0%, #D97706 100%)",
              color: "#FFFFFF",
              fontWeight: "800",
            }}
          >
            {profile?.full_name?.slice(0, 2).toUpperCase() || "OA"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.full_name || "Administrator"}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.email || "openbinsolutions@gmail.com"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
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
              transition: "background 0.15s ease",
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

      {/* MOBILE DRAWER */}
      {mobileDrawerOpen && (
        <>
          <div
            className="ob-drawer-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="ob-drawer">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img src={openbinLogo} alt="OpenBin Logo" style={{ height: "26px", width: "auto" }} />
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#FFFFFF" }}>OpenBin</div>
                  <div style={{ fontSize: "10px", color: "#93ACDF", fontWeight: "800", textTransform: "uppercase" }}>Admin Console</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#FFFFFF", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, overflowY: "auto", paddingRight: "2px" }}>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) => `ob-nav-item ${isActive ? "active" : ""}`}
                >
                  {getNavIcon(item.to)}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="ob-sidebar-foot" style={{ marginTop: "16px", paddingTop: "14px" }}>
              <div
                className="ob-avatar"
                style={{
                  background: "linear-gradient(135deg, #EF9F27 0%, #D97706 100%)",
                  color: "#FFFFFF",
                  fontWeight: "800",
                }}
              >
                {profile?.full_name?.slice(0, 2).toUpperCase() || "OA"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile?.full_name || "Administrator"}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile?.email || "openbinsolutions@gmail.com"}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
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
        </>
      )}

      {/* MAIN WORKSPACE */}
      <div className="ob-main-area">
        {/* TOPBAR */}
        <header className="ob-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* Mobile Menu Button */}
            <button
              type="button"
              className="ob-mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Toggle navigation drawer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="ob-topbar-title">{title}</div>
              <div className="ob-topbar-sub">{sub}</div>
            </div>
          </div>
          <div className="ob-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span className="ob-admin-status-badge">
              <span className="ob-status-dot" />
              <span className="ob-status-text">Admin Active</span>
            </span>
            <Link to="/rvm-simulator" className="ob-chip tap">
              RVM Sim ⚡
            </Link>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <div className="ob-content-scroll">
          {children}
        </div>
      </div>

      {/* MOBILE BAR */}
      <nav className="ob-mobile-bar">
        {nav.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `ob-mobile-tab ${isActive ? "active" : ""}`}
          >
            {getNavIcon(item.to)}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="ob-mobile-tab"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="More admin menu items"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
