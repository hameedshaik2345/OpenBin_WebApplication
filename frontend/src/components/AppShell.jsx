import { Link, NavLink } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";

export default function AppShell({ title, nav, children }) {
  const { profile, logout } = useAuth();

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
        <header className="main-header">
          <h1>{title}</h1>
        </header>
        <div className="main-body">{children}</div>
      </main>
    </div>
  );
}
