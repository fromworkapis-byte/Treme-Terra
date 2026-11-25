// ===== AUTH CONTEXT =====
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../db';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; firstAccess?: boolean }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple bcrypt simulation (em produção usar biblioteca real)
// Para simplicidade, vamos usar uma verificação básica
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Em desenvolvimento, aceita senha direta para o admin
  if (hash === 'dev-admin-hash') return password === 'Gremio@2026!Admin';
  // TODO: implementar bcrypt real no build de produção
  return password === hash.replace('$2b$12$', '');
}

async function hashPassword(password: string): Promise<string> {
  // TODO: usar bcrypt real
  return `dev-hash-${password}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão salva no localStorage
    const savedSession = localStorage.getItem('gremio_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          db.users.get(session.userId).then(u => {
            if (u && u.isActive) {
              setUser(u);
            } else {
              localStorage.removeItem('gremio_session');
            }
          });
        } else {
          localStorage.removeItem('gremio_session');
        }
      } catch {
        localStorage.removeItem('gremio_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const foundUser = await db.users.where('email').equals(email).first();
    if (!foundUser) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    if (!foundUser.isActive) {
      return { success: false, error: 'Usuário inativo' };
    }

    const valid = await verifyPassword(password, foundUser.passwordHash);
    if (!valid) {
      return { success: false, error: 'Senha incorreta' };
    }

    // Atualizar último login
    await db.users.update(foundUser.id, { lastLoginAt: new Date().toISOString() });

    const session = {
      userId: foundUser.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
    };
    localStorage.setItem('gremio_session', JSON.stringify(session));

    setUser(foundUser);

    // Verificar se é primeiro acesso
    const settings = await db.settings.get('firstAccess');
    const firstAccess = settings?.value === true || settings?.value === 'true' || settings?.value === 1;

    return { success: true, firstAccess };
  };

  const logout = () => {
    localStorage.removeItem('gremio_session');
    setUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: 'Não autenticado' };

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Nova senha deve ter pelo menos 8 caracteres' };
    }

    const newHash = await hashPassword(newPassword);
    await db.users.update(user.id, { passwordHash: newHash, updatedAt: new Date().toISOString() });

    // Marcar primeiro acesso como false
    await db.settings.put({ key: 'firstAccess', value: false, description: 'Primeiro acesso - trocar senha', updatedAt: new Date().toISOString() } as any);

    setUser({ ...user, passwordHash: newHash });
    return { success: true };
  };

  const hasPermission = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, changePassword, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}