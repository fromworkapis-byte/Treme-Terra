// ===== SIDEBAR COMPONENT =====
import * as React from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Users,
  FileText,
  Shield,
  Settings,
  Building,
  ChevronLeft,
  X,
  Menu,
} from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { MILITARY_RANKS } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entries', label: 'Entradas', icon: ArrowDownLeft },
  { id: 'expenses', label: 'Despesas', icon: ArrowUpRight },
  { id: 'movements', label: 'Movimentações', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Contas e Caixa', icon: Wallet },
  { id: 'members', label: 'Efetivo', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'audit', label: 'Auditoria', icon: Shield, roles: ['ADMIN', 'TREASURER'] },
  { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const filteredNavItems = NAV_ITEMS.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  const handleNavigate = (id: string) => {
    setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-secondary border-r border-border',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Menu lateral"
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between h-16 px-4 border-b border-border', collapsed && 'justify-center')}>
          <div className={cn('flex items-center gap-3 overflow-hidden', collapsed && 'justify-center')}>
            <div className="p-2 rounded-xl bg-success/10 flex-shrink-0">
              <Building className="w-6 h-6 text-success" />
            </div>
            {!collapsed && (
              <>
                <span className="font-bold text-text-primary text-lg truncate">1ª CFz</span>
                <span className="text-xs text-text-muted truncate block">Treme Terra</span>
              </>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="text-text-secondary hover:text-text-primary"
              aria-label="Colapsar menu"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegação principal">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              onClick={() => handleNavigate(item.id)}
              className={({ isActive }) => cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-2 focus:ring-offset-primary',
                isActive
                  ? 'bg-success/10 text-success'
                  : 'text-text-secondary hover:bg-tertiary hover:text-text-primary',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', collapsed && 'mx-auto')} aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Collapse Button */}
        <div className={cn('p-3 border-t border-border', collapsed && 'items-center')}>
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="text-text-secondary hover:text-text-primary mx-auto"
              aria-label="Expandir menu"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-text-muted truncate capitalize">{user?.role?.toLowerCase() || 'visualizador'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                className="w-full mt-2 text-text-secondary hover:text-text-primary"
                aria-label="Colapsar menu"
              >
                <ChevronLeft className="w-5 h-5 mx-auto" />
              </Button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// Mobile menu button (used in Header)
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-tertiary text-text-secondary"
      aria-label="Abrir menu"
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}