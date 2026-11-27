// ===== MAIN APP =====
import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard, Entries, Expenses, Movements, Accounts, Members, Reports, Audit, Settings } from './pages';
import { migrateMemberPaymentEntries, seedDatabase } from './db';
import { runMonthlyBilling } from './lib/billing';
import { runFixedExpenses } from './lib/fixedExpenses';

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
  if (!isInitialized) {
    isInitialized = true;
    seedDatabase()
      .then(migrateMemberPaymentEntries)
      .catch(error => console.error('Erro ao preparar o banco de dados:', error));
  }

  React.useEffect(() => {
    const runRoutines = () => {
      runMonthlyBilling().catch(error => console.error('Erro no envio mensal automático:', error));
      runFixedExpenses().catch(error => console.error('Erro nas despesas fixas:', error));
    };
    runRoutines();
    const timer = window.setInterval(runRoutines, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/entries" element={<Entries />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/members" element={<Members />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/settings" element={<Settings />} />
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
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
