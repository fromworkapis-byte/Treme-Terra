// ===== SETTINGS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Save, Download, Upload, Trash2, Shield, Database, Building, Palette, Globe, Plus, Edit, AlertCircle, QrCode } from 'lucide-react';
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, CardDescription, Switch, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, ScrollArea } from '../components/ui';
import { PageHeader } from '../components/layout';
import { db, exportBackup, importBackup, formatBRL } from '../db';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../hooks/useFinancialData';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useFinancialData';

import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useFinancialData';
import { AccountForm } from '../components/forms';
import { CategoryForm } from '../components/forms';
import { MemberForm, BillingSettingsForm } from '../components/forms';
import type { Account, Category, User, Member, Setting } from '../types';
import { militaryRankLabel } from '../types';

export function Settings() {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Account | Category | Member | null>(null);
  const [formType, setFormType] = useState<'account' | 'category' | 'member'>('account');
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [generalSettings, setGeneralSettings] = useState({
    unitName: '1ª Companhia de Fuzileiros - Treme Terra',
    unitShortName: '1ª CFz - Treme Terra',
  });

  React.useEffect(() => {
    Promise.all([db.settings.get('unitName'), db.settings.get('unitShortName')]).then(([name, shortName]) => {
      setGeneralSettings({
        unitName: typeof name?.value === 'string' ? name.value : '1ª Companhia de Fuzileiros - Treme Terra',
        unitShortName: typeof shortName?.value === 'string' ? shortName.value : '1ª CFz - Treme Terra',
      });
    });
  }, []);

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

  const handleSaveGeneral = async () => {
    const now = new Date().toISOString();
    await Promise.all([
      db.settings.put({ key: 'unitName', value: generalSettings.unitName, description: 'Nome da unidade', updatedAt: now }),
      db.settings.put({ key: 'unitShortName', value: generalSettings.unitShortName, description: 'Nome abreviado', updatedAt: now }),
    ]);
    alert('Configurações gerais salvas.');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Configure categorias, backup e preferências"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="general"><Globe className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
          <TabsTrigger value="accounts"><Building className="w-4 h-4 mr-2" /> Contas</TabsTrigger>
          <TabsTrigger value="categories"><Palette className="w-4 h-4 mr-2" /> Categorias</TabsTrigger>
          <TabsTrigger value="billing"><QrCode className="w-4 h-4 mr-2" /> Cobrança</TabsTrigger>
          <TabsTrigger value="members"><Shield className="w-4 h-4 mr-2" /> Efetivo</TabsTrigger>
          <TabsTrigger value="backup"><Database className="w-4 h-4 mr-2" /> Backup</TabsTrigger>
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
                <Input
                  label="Nome da Unidade"
                  value={generalSettings.unitName}
                  onChange={event => setGeneralSettings(current => ({ ...current, unitName: event.target.value }))}
                />
                <Input
                  label="Nome Abreviado"
                  value={generalSettings.unitShortName}
                  onChange={event => setGeneralSettings(current => ({ ...current, unitShortName: event.target.value }))}
                />
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
              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="primary" onClick={handleSaveGeneral}>
                  <Save className="w-4 h-4 mr-2" /> Salvar configurações gerais
                </Button>
              </div>
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

        {/* Billing */}
        <TabsContent value="billing">
          <BillingSettingsForm />
        </TabsContent>

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
                        <TableCell><Badge variant="info">{militaryRankLabel(member.rank)}</Badge></TableCell>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-text-secondary font-mono">#{member.ordem}</TableCell>
                        <TableCell>{member.status === 'ACTIVE' ? <Badge variant="success">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member, 'member')} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete({ type: 'member', id: member.id, name: `${militaryRankLabel(member.rank)} ${member.name}` })} aria-label="Excluir" className="text-danger hover:text-danger"><Trash2 className="w-4 h-4" /></Button>
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
    </div>
  );
}