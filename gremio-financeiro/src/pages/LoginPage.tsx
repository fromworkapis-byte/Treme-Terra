// ===== LOGIN PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Label } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    setIsLoading(false);
    
    if (result.success) {
      if (result.firstAccess) {
        navigate('/first-access');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-xl bg-success/10 w-fit">
            <Building className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl">1ª CFz - Treme Terra</CardTitle>
          <CardDescription>Sistema de Gestão Financeira do Grêmio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gremio.local"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-tertiary/50 rounded-lg text-xs text-text-muted space-y-1">
            <p className="font-medium">Credenciais padrão:</p>
            <p><strong>Email:</strong> admin@gremio.local</p>
            <p><strong>Senha:</strong> Gremio@2026!Admin</p>
            <p className="mt-2 text-warning"><strong>⚠</strong> Troque a senha no primeiro acesso!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}