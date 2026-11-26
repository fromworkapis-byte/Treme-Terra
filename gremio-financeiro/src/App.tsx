// ===== MAIN APP =====
import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard, Entries, Expenses, Movements, Accounts, Members, Reports, Audit, Settings } from './pages';
import { seedDatabase } from './db';
import { runMonthlyBilling } from './lib/billing';
import { LoginPage } from './pages/LoginPage';
import { FirstAccessPage } from './pages/FirstAccessPage';
import { ProtectedRoute, RoleGuard } from './pages/ProtectedRoute';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize database once
let isInitialized = false;

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (!isInitialized) {
    isInitialized = true;
    seedDatabase();
  }

  React.useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const checkBilling = () => {
      runMonthlyBilling().catch(error => console.error('Erro no envio mensal automático:', error));
    };
    checkBilling();
    const timer = window.setInterval(checkBilling, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-info border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/first-access" element={isAuthenticated && user ? <FirstAccessPage /> : <Navigate to="/login" replace />} />
      
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/entries" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Entries /></RoleGuard>} />
        <Route path="/expenses" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Expenses /></RoleGuard>} />
        <Route path="/movements" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Movements /></RoleGuard>} />
        <Route path="/accounts" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Accounts /></RoleGuard>} />
        <Route path="/members" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Members /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Audit /></RoleGuard>} />
        <Route path="/settings" element={<RoleGuard roles={['ADMIN', 'TREASURER']}><Settings /></RoleGuard>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}