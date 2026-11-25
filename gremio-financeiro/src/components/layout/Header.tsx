// ===== HEADER COMPONENT =====
import * as React from 'react';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { Search, Bell, User, LogOut, Key, ChevronDown } from 'lucide-react';
import { Button, Input, Avatar, AvatarFallback, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { MobileMenuButton } from './Sidebar';

export function Header() {
  const { user, logout, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implementar busca global
    console.log('Buscar:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-secondary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-4 flex-1">
        <MobileMenuButton onClick={() => {}} />
        
        <form onSubmit={handleSearch} className="relative w-full max-w-md hidden md:block flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Buscar movimentações, integrantes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-primary border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent text-sm"
            aria-label="Busca global"
          />
        </form>
      </div>

      {/* Right: Notifications + User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative p-2 rounded-lg hover:bg-tertiary text-text-secondary transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-2 text-center text-text-muted text-sm">
              Nenhuma notificação no momento
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-tertiary transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm font-medium bg-info/10 text-info">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-text-primary">{user?.name || 'Usuário'}</span>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasPermission(['ADMIN']) && (
              <DropdownMenuItem onClick={() => console.log('Configurações')}>
                <Key className="w-4 h-4 mr-2" />
                Trocar Senha
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-danger focus:text-danger">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}