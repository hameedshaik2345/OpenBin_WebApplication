import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function SocialButtons({ onDone, onError }) {
  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const [busy, setBusy] = useState("");

  async function run(provider, action) {
    setBusy(provider);
    onError?.("");
    try {
      await action();
      onDone?.();
    } catch (err) {
      onError?.(err.message || `${provider} sign-in failed`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="social-row">
      <button
        type="button"
        className="btn social"
        disabled={!!busy}
        onClick={() => run("google", loginWithGoogle)}
      >
        {busy === "google" ? "Connecting…" : "Continue with Google"}
      </button>
      <button
        type="button"
        className="btn social"
        disabled={!!busy}
        onClick={() => run("facebook", loginWithFacebook)}
      >
        {busy === "facebook" ? "Connecting…" : "Continue with Facebook"}
      </button>
    </div>
  );
}
