import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";
import { api } from "../api";

export default function AppShell({ title, nav, children }) {
  const { token, profile, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [openNotifs, setOpenNotifs] = useState(false);

  async function loadNotifications() {
    if (!token) return;
    try {
      const data = await api.notifications(token);
      setNotifications(data.notifications || []);
    } catch (_) {}
  }

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkAll() {
    await api.markAllNotificationsRead(token);
    await loadNotifications();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to={roleHome(profile?.role)} className="sidebar-brand">
          OpenBin
        </Link>
        <p className="sidebar-role">{profile?.role || "…"}</p>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p className="muted small">{profile?.full_name}</p>
          <p className="muted small">{profile?.email}</p>
          <button type="button" className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-pane">
        <header className="main-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>{title}</h1>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setOpenNotifs(!openNotifs)}
              style={{ position: "relative", fontSize: "1.1rem", padding: "0.4rem 0.8rem" }}
            >
              🔔 Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--accent-red, #ef4444)",
                    color: "#fff",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {openNotifs && (
              <div
                className="panel"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "120%",
                  width: "320px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong style={{ fontSize: "0.95rem" }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <button type="button" className="linkish small" onClick={handleMarkAll}>
                      Mark all read
                    </button>
                  )}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {notifications.map((n) => (
                    <li
                      key={n.notification_id}
                      style={{
                        padding: "0.5rem 0",
                        borderBottom: "1px dashed var(--border)",
                        opacity: n.is_read ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{n.title}</div>
                      <div className="small muted">{n.message}</div>
                      <div className="small muted" style={{ fontSize: "0.7rem", marginTop: "2px" }}>
                        {new Date(n.created_at).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                  {!notifications.length && (
                    <li className="muted small text-center" style={{ padding: "1rem 0" }}>
                      No notifications yet
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </header>
        <div className="main-body">{children}</div>
      </main>
    </div>
  );
}
