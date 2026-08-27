import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

type AuthState = {
  user: User | null;
  accessRequired: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessRequired, setAccessRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user: next, access_required } = await api.me();
      setUser(next);
      setAccessRequired(Boolean(access_required));
    } catch {
      setUser(null);
      setAccessRequired(false);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessRequired, loading, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
