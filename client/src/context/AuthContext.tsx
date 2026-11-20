import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activePatientId: number | null;
  setActivePatientId: (id: number | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePatientId, setActivePatientId] = useState<number | null>(() => {
    const saved = localStorage.getItem('medicare_active_patient');
    return saved ? parseInt(saved, 10) : null;
  });

  const handleSetActivePatientId = (id: number | null) => {
    setActivePatientId(id);
    if (id) {
      localStorage.setItem('medicare_active_patient', id.toString());
    } else {
      localStorage.removeItem('medicare_active_patient');
    }
  };

  const refreshUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.request<{ user: User }>('/auth/me');
      setUser(res.user);

      // If caregiver and no active patient, pick first one
      if (res.user.role === 'caregiver' && res.user.linkedPatients?.length) {
        if (!activePatientId || !res.user.linkedPatients.some((p) => p.id === activePatientId)) {
          handleSetActivePatientId(res.user.linkedPatients[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleAuthLogout = () => {
      setUser(null);
      handleSetActivePatientId(null);
    };

    window.addEventListener('auth_logout', handleAuthLogout);
    return () => window.removeEventListener('auth_logout', handleAuthLogout);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    api.setToken(res.token);
    setUser(res.user);

    // Initial patient selection if caregiver
    if (res.user.role === 'caregiver') {
      if (res.user.linkedPatients?.length) {
        handleSetActivePatientId(res.user.linkedPatients[0].id);
      } else {
        try {
          const pRes = await api.request<{ patients: any[] }>('/auth/patients');
          if (pRes.patients?.length) {
            handleSetActivePatientId(pRes.patients[0].id);
            setUser({ ...res.user, linkedPatients: pRes.patients });
          }
        } catch {}
      }
    }

    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await api.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    handleSetActivePatientId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activePatientId,
        setActivePatientId: handleSetActivePatientId,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

