// ===== SETTINGS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Save, Download, Upload, UserPlus, Key, Trash2, RefreshCw, Shield, Database, Building, Bell, Palette, Globe } from 'lucide-react';
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, CardDescription, Switch, Label, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Badge } from '../components/ui';
import { db, exportBackup, importBackup, formatBRL } from '../db';
import { useAuth } from '../context/AuthContext';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../hooks/useFinancialData';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useFinancialData';
import { useUsers } from '../hooks/useFinancialData'; // We'll need to add this hook
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useFinancialData';
import { AccountForm } from '../components/forms';
import { CategoryForm } from '../components/forms';
import { MemberForm } from '../components/forms';
import type { Account, Category, User, Member, Setting } from '../types';
import { MILITARY_RANKS } from '../types';

// We need to add useUsers hook - let's create a simple version here
function useUsers() {
  return { data: [], isLoading: false }; // Placeholder
}

export function Settings() {
  const { user, changePassword, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'accounts' | 'categories' | 'users' | 'members' | 'backup' | 'security'>('general');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Account | Category | Member | null>(null);
  const [formType, setFormType] = useState<'account' | 'category' | 'member'>('account');
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [backupData, setBackupData] = useState<string>('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: members } = useMembers();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const isAdmin = hasPermission(['ADMIN']);

  const handleOpenCreate = (type: 'account' | 'category' | 'member') => {
    setFormType(type);
    setEditingItem(null);
    setShowForm(true);
  };

  const handleOpenEdit = (item: Account | Category | Member, type: 'account' | 'category' | 'member') => {
    setFormType(type);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleOpenDelete = (item: { type: string; id: string; name: string }) => {
    setDeletingItem(item);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleCloseDelete = () => {
    setDeletingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    
    try {
      switch (deletingItem.type) {
        case 'account':
          await deleteAccount.mutateAsync(deletingItem.id);
          break;
        case 'category':
          await deleteCategory.mutateAsync(deletingItem.id);
          break;
        case 'member':
          await deleteMember.mutateAsync(deletingItem.id);
          break;
      }
      handleCloseDelete();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleFormSuccess = () => {
    handleCloseForm();
  };

  const handleExportBackup = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gremio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importBackup(data);
      alert('Backup restaurado com sucesso! A página será recarregada.');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      alert('Erro ao restaurar backup. Verifique o arquivo.');
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleConfirmRestore = () => {
    if (restoreFile) {
      handleImportBackup(restoreFile);
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setShowChangePassword(false);
      alert('Senha alterada com sucesso!');
    } else {
      alert(result.error || 'Erro ao alterar senha');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Configurações</h1>
          <p className="text-text-secondary mt-1">Configure categorias, usuários, backup e preferências</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
          <TabsTrigger value="general"><Globe className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
          <TabsTrigger value="accounts"><Building className="w-4 h-4 mr-2" /> Contas</TabsTrigger>
          <TabsTrigger value="categories"><Palette className="w-4 h-4 mr-2" /> Categorias</TabsTrigger>
          {isAdmin && <TabsTrigger value="users"><UserPlus className="w-4 h-4 mr-2" /> Usuários</TabsTrigger>}
          <TabsTrigger value="members"><Shield className="w-4 h-4 mr-2" /> Efetivo</TabsTrigger>
          <TabsTrigger value="backup"><Database className="w-4 h-4 mr-2" /> Backup</TabsTrigger>
          <TabsTrigger value="security"><Key className="w-4 h-4 mr-2" /> Segurança</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Informações básicas da unidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome da Unidade" defaultValue="1ª Companhia de Fuzileiros - Treme Terra" />
                <Input label="Nome Abreviado" defaultValue="1ª CFz - Treme Terra" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Moeda"
                  options={[{ value: 'BRL', label: 'Real (BRL)' }]}
                  defaultValue="BRL"
                />
                <Select
                  label="Formato de Data"
                  options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/AAAA' }]}
                  defaultValue="DD/MM/YYYY"
                />
                <Select
                  label="Idioma"
                  options={[{ value: 'pt-BR', label: 'Português (Brasil)' }]}
                  defaultValue="pt-BR"
                />
              </div>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Modo Escuro</p>
                  <p className="text-sm text-text-muted">Sempre ativado neste sistema</p>
                </div>
                <Switch checked disabled />
              </div>
              <Button variant="primary"><Save className="w-4 h-4 mr-2" /> Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Contas Financeiras</h2>
              <p className="text-text-secondary">Gerencie caixas, bancos e chaves PIX</p>
            </div>
            <Button variant="primary" onClick={() => handleOpenCreate('account')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>

          <Card>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.map(account => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell><Badge variant="info">{account.type === 'CASH' ? 'Caixa' : account.type === 'BANK' ? 'Banco' : account.type === 'PIX' ? 'PIX' : 'Outras'}</Badge></TableCell>
                        <TableCell className="font-mono font-medium">{formatBRL(account.balance)}</TableCell>
                        <TableCell>{account.isActive ? <Badge variant="success">Ativa</Badge> : <Badge variant="gray">Inativa</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account, 'account')} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete({ type: 'account', id: account.id, name: account.name })} aria-label="Excluir" className="text-danger hover:text-danger"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Categorias</h2>
              <p className="text-text-secondary">Gerencie categorias de entradas e despesas</p>
            </div>
            <Button variant="primary" onClick={() => handleOpenCreate('category')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <Card>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.type === 'INCOME' ? <Badge variant="success">Entrada</Badge> : <Badge variant="danger">Despesa</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: category.color || '#64748b' }} />
                            <span className="text-sm text-text-muted">{category.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>{category.isActive ? <Badge variant="success">Ativa</Badge> : <Badge variant="gray">Inativa</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(category, 'category')} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete({ type: 'category', id: category.id, name: category.name })} aria-label="Excluir" className="text-danger hover:text-danger"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users (Admin only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <CardDescription>Apenas administradores podem gerenciar usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-text-muted">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Funcionalidade em desenvolvimento</p>
                  <p className="text-sm mt-1">Gerenciamento de usuários será implementado na próxima versão</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Members */}
        <TabsContent value="members">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Efetivo</h2>
              <p className="text-text-secondary">Gerencie integrantes e suas contribuições</p>
            </div>
            <Button variant="primary" onClick={() => handleOpenCreate('member')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Integrante
            </Button>
          </div>

          <Card>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post/Grad</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members?.map(member => (
                      <TableRow key={member.id}>
                        <TableCell><Badge variant="info">{member.rank}</Badge></TableCell>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-text-secondary font-mono">#{member.ordem}</TableCell>
                        <TableCell>{member.status === 'ACTIVE' ? <Badge variant="success">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member, 'member')} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete({ type: 'member', id: member.id, name: `${member.rank} ${member.name}` })} aria-label="Excluir" className="text-danger hover:text-danger"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle><Download className="w-5 h-5 mr-2" /> Exportar Backup</CardTitle>
                <CardDescription>Baixe uma cópia completa de todos os dados do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-tertiary/50 rounded-lg">
                  <p className="text-text-secondary mb-2">O backup inclui:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-text-muted">
                    <li>Todos os usuários e permissões</li>
                    <li>Integrantes do efetivo</li>
                    <li>Contas financeiras e saldos</li>
                    <li>Categorias de entradas e despesas</li>
                    <li>Todas as entradas, despesas e transferências</li>
                    <li>Pagamentos de contribuições</li>
                    <li>Logs de auditoria completos</li>
                    <li>Configurações do sistema</li>
                  </ul>
                </div>
                <Button variant="primary" onClick={handleExportBackup} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Gerar e Baixar Backup
                </Button>
                <p className="text-xs text-text-muted text-center">
                  Arquivo JSON com todos os dados • {new Date().toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><Upload className="w-5 h-5 mr-2" /> Restaurar Backup</CardTitle>
                <CardDescription>Importe um arquivo de backup gerado anteriormente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                  <p className="text-danger font-medium mb-2"><AlertCircle className="w-4 h-4 mr-2 inline" /> Atenção</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-text-muted">
                    <li>Esta ação <strong>substituirá todos os dados atuais</strong></li>
                    <li>Faça um backup antes de restaurar</li>
                    <li>O sistema será recarregado após a restauração</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFileChange}
                    className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-info"
                  />
                  <Button variant="danger" onClick={handleConfirmRestore} disabled={!restoreFile} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Restaurar Backup Selecionado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle><Key className="w-5 h-5 mr-2" /> Alterar Senha</CardTitle>
                <CardDescription>Altere sua senha de acesso ao sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setShowChangePassword(true)} className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Alterar Minha Senha
                </Button>
                <p className="text-sm text-text-muted text-center mt-2">
                  Usuário atual: <strong>{user?.email}</strong> ({user?.role})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><Shield className="w-5 h-5 mr-2" /> Permissões</CardTitle>
                <CardDescription>Seu nível de acesso atual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-tertiary/50 rounded-lg">
                  <p className="font-medium text-text-primary">{user?.role}</p>
                  <p className="text-sm text-text-muted mt-1">
                    {user?.role === 'ADMIN' && 'Acesso total ao sistema: gerenciar usuários, configurações, backup e auditoria'}
                    {user?.role === 'TREASURER' && 'Acesso financeiro: lançar entradas/despesas, gerenciar contas, gerar relatórios'}
                    {user?.role === 'VIEWER' && 'Acesso somente leitura: visualizar dashboard, relatórios e consultas'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-tertiary/50">
                    <p className="text-2xl font-bold text-success">{user?.role === 'ADMIN' ? '✓' : '✗'}</p>
                    <p className="text-xs text-text-muted">Admin</p>
                  </div>
                  <div className="p-3 rounded-lg bg-tertiary/50">
                    <p className="text-2xl font-bold text-info">{['ADMIN', 'TREASURER'].includes(user?.role || '') ? '✓' : '✗'}</p>
                    <p className="text-xs text-text-muted">Financeiro</p>
                  </div>
                  <div className="p-3 rounded-lg bg-tertiary/50">
                    <p className="text-2xl font-bold text-text-primary">✓</p>
                    <p className="text-xs text-text-muted">Visualizar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Forms Modal */}
      <Modal
        open={showForm}
        onOpenChange={setShowForm}
        title={editingItem ? `Editar ${formType === 'account' ? 'Conta' : formType === 'category' ? 'Categoria' : 'Integrante'}` : `Nova ${formType === 'account' ? 'Conta' : formType === 'category' ? 'Categoria' : 'Integrante'}`}
        size="lg"
      >
        {formType === 'account' && (
          <AccountForm
            initialData={editingItem as Account | undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        )}
        {formType === 'category' && (
          <CategoryForm
            initialData={editingItem as Category | undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        )}
        {formType === 'member' && (
          <MemberForm
            initialData={editingItem as Member | undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deletingItem}
        onOpenChange={handleCloseDelete}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir <strong>{deletingItem?.name}</strong>?
          </p>
          <p className="text-sm text-text-muted">
            Esta ação será registrada na auditoria.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        title="Alterar Senha"
        size="sm"
      >
        <ChangePasswordForm onSubmit={handleChangePassword} onClose={() => setShowChangePassword(false)} />
      </Modal>
    </div>
  );
}

function ChangePasswordForm({ onSubmit, onClose }: { onSubmit: (current: string, newPass: string) => void; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    setSubmitting(true);
    await onSubmit(currentPassword, newPassword);
    setSubmitting(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Senha Atual</Label>
        <input
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="input mt-1.5"
          required
        />
      </div>
      <div>
        <Label>Nova Senha</Label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="input mt-1.5"
          required
          minLength={8}
        />
      </div>
      <div>
        <Label>Confirmar Nova Senha</Label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="input mt-1.5"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Alterando...' : 'Alterar Senha'}
        </Button>
      </div>
    </form>
  );
}