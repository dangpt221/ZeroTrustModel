import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';

interface SecurityInfo {
  riskScore: number;
  riskFactors: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, mfaCode?: string) => Promise<{ success: boolean; warning?: string; security?: SecurityInfo }>;
  logout: () => void;
  needsMFA: boolean;
  setNeedsMFA: (val: boolean) => void;
  tempUser: User | null;
  isLoading: boolean;
  securityInfo: SecurityInfo | null;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);

  const checkSession = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('nexus_user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('nexus_user');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name !== 'AbortError') console.error('Session check failed', error);
      setUser(null);
      localStorage.removeItem('nexus_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Keep user "online" by pinging /auth/me every 2 min (updates lastActiveAt on server)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSession, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const login = async (email: string, password?: string, mfaCode?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaCode })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.needsMFA) {
          setNeedsMFA(true);
          setTempUser({ email, role: 'STAFF' } as User);
          if (data.riskScore !== undefined) {
            setSecurityInfo({ riskScore: data.riskScore, riskFactors: data.riskFactors || [] });
          }
          return {
            success: false,
            warning: data.message,
            security: data.riskScore ? { riskScore: data.riskScore, riskFactors: data.riskFactors || [] } : undefined
          };
        }

        setUser(data.user);
        setNeedsMFA(false);
        setTempUser(null);
        localStorage.setItem('nexus_user', JSON.stringify(data.user));

        if (data.riskScore !== undefined) {
          setSecurityInfo({ riskScore: data.riskScore, riskFactors: data.riskFactors || [] });
        }

        return { success: true, security: data.riskScore ? { riskScore: data.riskScore, riskFactors: data.riskFactors || [] } : undefined };
      }

      const warning = data.warning || null;
      console.error('Login failed:', data.message);
      return { success: false, warning };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setNeedsMFA(false);
    setTempUser(null);
    setSecurityInfo(null);
    localStorage.removeItem('nexus_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      needsMFA,
      setNeedsMFA,
      tempUser,
      isLoading,
      securityInfo,
      checkSession // Exporting for manual/interval refresh
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
