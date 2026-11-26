// ===== HEADER COMPONENT =====
import * as React from 'react';
import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { Button, Input, Avatar, AvatarFallback, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator } from '../ui';
import { CURRENT_USER } from '../../lib/currentUser';
import { MobileMenuButton } from './Sidebar';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implementar busca global
    console.log('Buscar:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-secondary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-4 flex-1">
        <MobileMenuButton onClick={onMenuClick} />

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

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm font-medium bg-info/10 text-info">
              {CURRENT_USER.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-text-primary">{CURRENT_USER.name}</p>
            <p className="text-xs text-text-muted capitalize">{CURRENT_USER.role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
