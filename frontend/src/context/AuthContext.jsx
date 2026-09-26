import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../firebase";
import { syncUser, fetchMe } from "../api";

const AuthContext = createContext(null);

async function afterAuth(user, displayName) {
  const token = await user.getIdToken();
  const synced = await syncUser(token, displayName);
  return { token, profile: synced.user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          await syncUser(idToken);
          const me = await fetchMe(idToken);
          setProfile(me.user);
        } catch (err) {
          console.warn("Could not sync user with backend:", err.message);
          setProfile(null);
        }
      } else {
        setToken(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function refreshProfile() {
    if (!token) return null;
    const me = await fetchMe(token);
    setProfile(me.user);
    return me.user;
  }

  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const { token: t, profile: p } = await afterAuth(cred.user, displayName);
    setToken(t);
    setProfile(p);
    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const { token: t, profile: p } = await afterAuth(cred.user);
    setToken(t);
    setProfile(p);
    return cred.user;
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const { token: t, profile: p } = await afterAuth(cred.user);
    setToken(t);
    setProfile(p);
    return cred.user;
  }

  async function loginWithFacebook() {
    const cred = await signInWithPopup(auth, facebookProvider);
    const { token: t, profile: p } = await afterAuth(cred.user);
    setToken(t);
    setProfile(p);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        profile,
        loading,
        register,
        login,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function roleHome(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "EPR") return "/epr";
  return "/dashboard";
}
