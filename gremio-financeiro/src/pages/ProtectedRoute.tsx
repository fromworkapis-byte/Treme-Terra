// ===== PROTECTED ROUTE =====
import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-info border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RoleGuard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}