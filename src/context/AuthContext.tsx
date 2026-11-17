import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { generateSalt, makeVerifier, checkVerifier } from '../lib/crypto';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  vaultUnlocked: boolean;
  masterPassword: string | null; // held in memory ONLY, never persisted
  salt: string | null;
  hasSetUpVault: boolean;
  idleLocked: boolean; // true when the vault locked itself after inactivity
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupVault: (masterPassword: string) => Promise<void>;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The vault locks itself (and forgets the Master Password) after this long with no activity.
const IDLE_LOCK_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [hasSetUpVault, setHasSetUpVault] = useState(false);
  const [idleLocked, setIdleLocked] = useState(false);
  const lastActivity = useRef(Date.now());

  // Idle auto-lock. Compares timestamps (not a single long timer) so a laptop that slept,
  // or a tab that sat in the background, is still locked as soon as it wakes up.
  useEffect(() => {
    if (!masterPassword) return;
    lastActivity.current = Date.now();

    const markActive = () => {
      lastActivity.current = Date.now();
    };
    const checkIdle = () => {
      if (Date.now() - lastActivity.current >= IDLE_LOCK_MS) {
        setMasterPassword(null);
        setIdleLocked(true);
      }
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    document.addEventListener('visibilitychange', checkIdle);
    const timer = window.setInterval(checkIdle, 15_000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener('visibilitychange', checkIdle);
      window.clearInterval(timer);
    };
  }, [masterPassword]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // In-memory only: clear any unlocked vault state on auth change
      setMasterPassword(null);
      if (u) {
        const metaRef = doc(db, 'users', u.uid);
        const snap = await getDoc(metaRef);
        if (snap.exists() && snap.data().salt) {
          setSalt(snap.data().salt);
          setVerifier(snap.data().verifier);
          setHasSetUpVault(true);
        } else {
          setHasSetUpVault(false);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    setMasterPassword(null);
    setIdleLocked(false);
    await signOut(auth);
  }

  /** First-time setup: generate a salt + verifier tied to this master password. */
  async function setupVault(mp: string) {
    if (!user) throw new Error('Not signed in');
    const newSalt = generateSalt();
    const newVerifier = await makeVerifier(mp, newSalt);
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      salt: newSalt,
      verifier: newVerifier,
      createdAt: new Date().toISOString()
    });
    setSalt(newSalt);
    setVerifier(newVerifier);
    setMasterPassword(mp);
    setHasSetUpVault(true);
  }

  /** Unlock: check the entered password against the stored verifier, no data decrypted yet. */
  async function unlockVault(mp: string): Promise<boolean> {
    if (!salt || !verifier) return false;
    const ok = await checkVerifier(mp, salt, verifier);
    if (ok) {
      setIdleLocked(false);
      setMasterPassword(mp);
    }
    return ok;
  }

  function lockVault() {
    setIdleLocked(false); // manual lock: no "locked for inactivity" notice
    setMasterPassword(null);
  }

  const value: AuthContextValue = {
    user,
    loading,
    vaultUnlocked: !!masterPassword,
    masterPassword,
    salt,
    hasSetUpVault,
    idleLocked,
    login,
    logout,
    setupVault,
    unlockVault,
    lockVault
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}