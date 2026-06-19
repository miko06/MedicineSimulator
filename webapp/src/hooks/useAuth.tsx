import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../api/client";

interface User {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  firstName?: string;
  lastName?: string;
  course?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, course?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then((data) => setUser({ ...data.user, role: data.user.role as "STUDENT" | "ADMIN" }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    setUser({ ...data.user, role: data.user.role as "STUDENT" | "ADMIN" });
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, course?: string) => {
    const data = await api.auth.register(email, password, firstName, lastName, course);
    setUser({ ...data.user, role: data.user.role as "STUDENT" | "ADMIN" });
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
