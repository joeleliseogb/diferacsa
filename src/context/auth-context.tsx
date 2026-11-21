'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/user-service';
import { authenticateUser, authenticateWithPin } from '@/lib/servicios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithPassword: (emailOrName: string, password: string) => Promise<boolean>;
  loginWithPin: (userId: string, pin: string) => Promise<boolean>;
  loginAsDemoUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'simplygest:auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Cargar usuario guardado al iniciar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      const wasLoggedOut = localStorage.getItem('simplygest:logged_out');
      if (stored) {
        setUser(JSON.parse(stored));
      } else if (!wasLoggedOut) {
        // Primera vez que entra al sistema, auto-loguear como Joel Eliseo (Admin)
        const defaultAdmin: User = {
          id: '1',
          name: 'Joel Eliseo',
          email: 'admin@simplygest.com',
          role: 'Admin',
        };
        setUser(defaultAdmin);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultAdmin));
      } else {
        setUser(null);
      }
    } catch {
      // Ignorar errores de localStorage
    } finally {
      setLoading(false);
    }
  }, []);

  // Iniciar sesión con Correo / Usuario y Contraseña
  const loginWithPassword = async (emailOrName: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const authenticated = await authenticateUser(emailOrName, password);
      if (authenticated) {
        setUser(authenticated);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticated));
        localStorage.removeItem('simplygest:logged_out');
        router.push('/dashboard');
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión rápida con PIN (cajeros / vendedores)
  const loginWithPin = async (userId: string, pin: string): Promise<boolean> => {
    setLoading(true);
    try {
      const authenticated = await authenticateWithPin(userId, pin);
      if (authenticated) {
        setUser(authenticated);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticated));
        localStorage.removeItem('simplygest:logged_out');
        router.push('/dashboard');
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Acceso directo con usuario demo
  const loginAsDemoUser = (demoUser: User) => {
    setUser(demoUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demoUser));
    localStorage.removeItem('simplygest:logged_out');
    router.push('/dashboard');
  };

  // Cerrar sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.setItem('simplygest:logged_out', 'true');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPassword, loginWithPin, loginAsDemoUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
