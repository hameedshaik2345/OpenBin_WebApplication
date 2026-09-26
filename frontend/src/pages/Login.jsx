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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      await navigateByRole(navigate);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-panel">
        <p className="brand">Openbin</p>
        <h1>Welcome back</h1>
        <p className="lede">Sign in to open your bins and keep moving.</p>

        <SocialButtons
          onDone={() => navigateByRole(navigate)}
          onError={setError}
        />

        <div className="divider">
          <span>or email</span>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
