import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";
import SocialButtons from "../components/SocialButtons";
import { fetchMe } from "../api";
import { auth } from "../firebase";
import openbinLogo from "../assets/openbin-logo.png";

async function navigateByRole(navigate) {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      const me = await fetchMe(idToken);
      navigate(roleHome(me.user.role));
      return;
    }
  } catch {
    // fallback
  }
  navigate("/dashboard");
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

      <div className="ob-auth-card">
        {/* Brand Logo Header */}
        <div className="ob-auth-logo-row">
          <img src={openbinLogo} alt="OpenBin Logo" />
        </div>

        <h1 className="ob-auth-title">Create User Account</h1>
        <p className="ob-auth-sub">
          Sign up to track your recycling, scan smart bins, and earn cash rewards.
        </p>

        {/* Social Logins */}
        <SocialButtons
          onDone={() => navigateByRole(navigate)}
          onError={setError}
        />

        <div className="ob-auth-divider">
          <span>or sign up with email</span>
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
            <label className="ob-auth-label">Full Name / Display Name</label>
            <input
              type="text"
              className="ob-auth-input"
              placeholder="e.g. Alex Rivera"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="ob-auth-field">
            <label className="ob-auth-label">Email address</label>
            <input
              type="email"
              className="ob-auth-input"
              placeholder="alex@example.com"
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
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
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </button>
        </form>

        <div className="ob-auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

