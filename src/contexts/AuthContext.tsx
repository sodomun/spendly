"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const STORAGE_KEY = "spendly_google_access_token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  signInWithGoogle: (showPicker?: boolean) => Promise<void>;
  signOutUser: () => Promise<void>;
  disconnectCalendar: () => void;
  clearCalendarToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/calendar.events");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // 起動時にlocalStorageからトークンを復元
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setGoogleAccessToken(stored);
  }, []);

  // ログアウト時はトークンを削除
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        localStorage.removeItem(STORAGE_KEY);
        setGoogleAccessToken(null);
      }
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle(showPicker = false) {
    if (showPicker) {
      provider.setCustomParameters({ prompt: "select_account" });
    } else if (user?.email) {
      provider.setCustomParameters({ login_hint: user.email });
    }
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) localStorage.setItem(STORAGE_KEY, token);
    setGoogleAccessToken(token);
  }

  async function signOutUser() {
    await signOut(auth);
    localStorage.removeItem(STORAGE_KEY);
    setGoogleAccessToken(null);
  }

  // Google Calendar連携を切断（Spendlyのログインは維持）
  function disconnectCalendar() {
    localStorage.removeItem(STORAGE_KEY);
    setGoogleAccessToken(null);
  }

  // トークン期限切れ時に呼ぶ（401エラー時など）
  function clearCalendarToken() {
    localStorage.removeItem(STORAGE_KEY);
    setGoogleAccessToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, googleAccessToken, signInWithGoogle, signOutUser, disconnectCalendar, clearCalendarToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
