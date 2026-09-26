import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";
import SocialButtons from "../components/SocialButtons";
import { fetchMe } from "../api";
import { auth } from "../firebase";

async function navigateByRole(navigate) {
  const idToken = await auth.currentUser.getIdToken();
  const me = await fetchMe(idToken);
  navigate(roleHome(me.user.role));
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password, displayName.trim() || undefined);
      await navigateByRole(navigate);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-panel">
        <p className="brand">Openbin</p>
        <h1>Create your account</h1>
        <p className="lede">Start with email or jump in with Google / Facebook.</p>

        <SocialButtons
          onDone={() => navigateByRole(navigate)}
          onError={setError}
        />

        <div className="divider">
          <span>or email</span>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
