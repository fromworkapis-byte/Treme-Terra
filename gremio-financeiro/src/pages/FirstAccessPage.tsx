// ===== FIRST ACCESS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Label } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export function FirstAccessPage() {
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('A nova senha deve conter pelo menos uma letra maiúscula');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('A nova senha deve conter pelo menos uma letra minúscula');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('A nova senha deve conter pelo menos um número');
      return;
    }
    if (!/[!@#$%^&*]/.test(newPassword)) {
      setError('A nova senha deve conter pelo menos um caractere especial (!@#$%^&*)');
      return;
    }

    setIsLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setError(result.error || 'Erro ao alterar senha');
    }
  };

  const passwordRequirements = [
    { label: 'Pelo menos 8 caracteres', test: newPassword.length >= 8 },
    { label: 'Uma letra maiúscula', test: /[A-Z]/.test(newPassword) },
    { label: 'Uma letra minúscula', test: /[a-z]/.test(newPassword) },
    { label: 'Um número', test: /[0-9]/.test(newPassword) },
    { label: 'Um caractere especial (!@#$%^&*)', test: /[!@#$%^&*]/.test(newPassword) },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-success/10 w-fit">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Senha Alterada!</CardTitle>
            <CardDescription>Redirecionando para o dashboard...</CardDescription>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-info border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-xl bg-warning/10 w-fit">
            <Lock className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Primeiro Acesso</CardTitle>
          <CardDescription>Por segurança, você deve alterar sua senha padrão</CardDescription>
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
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Gremio@2026!Admin"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="mt-1.5"
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Nova senha forte"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-tertiary/50 rounded-lg">
              <p className="font-medium text-text-primary mb-2">Requisitos da senha:</p>
              <ul className="space-y-1 text-sm">
                {passwordRequirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${req.test ? 'text-success' : 'text-text-muted'}`} />
                    <span className={req.test ? 'text-success' : 'text-text-muted'}>{req.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Alterando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            Usuário: <strong>{user?.email}</strong> | Função: <strong>{user?.role}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}