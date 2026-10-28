import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";
import SocialButtons from "../components/SocialButtons";
import { fetchMe } from "../api";
import { auth } from "../firebase";
import openbinLogo from "../assets/openbin-logo.png";

export default function Login() {
  const { login, user, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already authenticated with profile loaded, automatically redirect based on role
  useEffect(() => {
    if (user && profile) {
      navigate(roleHome(profile.role), { replace: true });
    }
  }, [user, profile, navigate]);

  async function handlePostLoginRedirect() {
    let role = "USER";
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken(true);
        const me = await fetchMe(idToken);
        role = me.user?.role || "USER";
      } catch (err) {
        console.warn("Could not fetch user profile after login:", err);
      }
    }
    navigate(roleHome(role), { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(email.trim(), password);
      await handlePostLoginRedirect();
    } catch (err) {
      setError(err.message || "Sign in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ob-auth-screen">
      {/* Drifting gradient blobs */}
      <div
        className="ob-auth-blob"
        style={{
          width: 280,
          height: 280,
          background: "#5DCAA5",
          top: -60,
          left: -60,
          animation: "obBlobDrift 7s ease-in-out infinite",
        }}
      />
      <div
        className="ob-auth-blob"
        style={{
          width: 240,
          height: 240,
          background: "#EF9F27",
          bottom: -50,
          right: -50,
          animation: "obBlobDrift 8s ease-in-out infinite 1s",
        }}
      />

      {/* Auth Card */}
      <div className="ob-auth-card">
        {/* Brand Logo Header */}
        <div className="ob-auth-logo-row">
          <img src={openbinLogo} alt="OpenBin Logo" />
        </div>

        <div>
          <h1 className="ob-auth-title">Welcome to OpenBin</h1>
          <p className="ob-auth-sub">
            Sign in to access your authorized workspace
          </p>

          {/* Social Logins */}
          <SocialButtons
            onDone={handlePostLoginRedirect}
            onError={setError}
          />

          <div className="ob-auth-divider">
            <span>or email & password</span>
          </div>

          {error && (
            <div className="ob-auth-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="ob-auth-field">
              <label className="ob-auth-label">Email address</label>
              <input
                type="email"
                className="ob-auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="ob-auth-field">
              <label className="ob-auth-label">Password</label>
              <input
                type="password"
                className="ob-auth-input"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="ob-auth-btn-primary"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="ob-auth-foot">
            Need an account? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

