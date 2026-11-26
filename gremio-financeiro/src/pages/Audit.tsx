// ===== AUDIT PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Search, Filter, Download, Eye, AlertCircle, Clock, User as UserIcon, Trash2, Edit, Plus, RotateCcw } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal, DatePicker } from '../components/ui';
import { PageHeader } from '../components/layout';
import { db } from '../db';
import { formatBRL, formatDateBR } from '../db';
import type { AuditLog, User } from '../types';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'TRANSFER';

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  RESTORE: 'Restauração',
  TRANSFER: 'Transferência',
};

const ACTION_ICONS: Record<AuditAction, React.ComponentType<{ className?: string }>> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  RESTORE: RotateCcw,
  TRANSFER: AlertCircle,
};

const ACTION_COLORS: Record<AuditAction, 'success' | 'info' | 'danger' | 'warning' | 'gray'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  RESTORE: 'warning',
  TRANSFER: 'gray',
};

const ENTITY_LABELS: Record<string, string> = {
  ENTRY: 'Entrada',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferência',
  MEMBER: 'Integrante',
  MEMBER_PAYMENT: 'Pagamento de Integrante',
  ACCOUNT: 'Conta',
  CATEGORY: 'Categoria',
  USER: 'Usuário',
};

function getActionBadge(action: AuditAction) {
  const Icon = ACTION_ICONS[action] || AlertCircle;
  return (
    <Badge variant={ACTION_COLORS[action] || 'gray'}>
      <Icon className="w-3 h-3 mr-1" />
      {ACTION_LABELS[action] || action}
    </Badge>
  );
}

function getEntityBadge(entityType: string) {
  return <Badge variant="gray">{ENTITY_LABELS[entityType] || entityType}</Badge>;
}

export function Audit() {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch audit logs directly from Dexie (no hook for simplicity)
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    loadLogs();
    loadUsers();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let query = db.auditLogs.orderBy('createdAt').reverse();
      
      if (dateRange.start) {
        query = query.filter(l => l.createdAt >= `${dateRange.start}T00:00:00.000Z`);
      }
      if (dateRange.end) {
        query = query.filter(l => l.createdAt <= `${dateRange.end}T23:59:59.999Z`);
      }
      if (selectedAction) {
        query = query.filter(l => l.action === selectedAction);
      }
      if (selectedEntity) {
        query = query.filter(l => l.entityType === selectedEntity);
      }
      if (search) {
        const s = search.toLowerCase();
        query = query.filter(l => 
          l.entityId.toLowerCase().includes(s) ||
          l.userId.toLowerCase().includes(s) ||
          (l.reason?.toLowerCase().includes(s))
        );
      }
      
      const result = await query.limit(500).toArray();
      setLogs(result);
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    const userList = await db.users.toArray();
    setUsers(userList);
  };

  const exportCsv = () => {
    const rows = [
      ['Data/Hora', 'Ação', 'Entidade', 'ID', 'Usuário', 'Motivo'],
      ...logs.map(log => [
        log.createdAt,
        ACTION_LABELS[log.action as AuditAction] || log.action,
        ENTITY_LABELS[log.entityType] || log.entityType,
        log.entityId,
        getUserName(log.userId),
        log.reason || '',
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    loadLogs();
  }, [selectedAction, selectedEntity, dateRange.start, dateRange.end, search]);

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || userId;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Histórico imutável de todas as alterações financeiras"
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Input
              placeholder="Buscar ID, usuário, motivo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select
              label="Ação"
              options={[{ value: '', label: 'Todas' }, 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'TRANSFER'].map(a => ({ value: a, label: a ? ACTION_LABELS[a as AuditAction] : 'Todas' }))}
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as AuditAction)}
            />
            <Select
              label="Entidade"
              options={[
                { value: '', label: 'Todas' },
                { value: 'ENTRY', label: 'Entrada' },
                { value: 'EXPENSE', label: 'Despesa' },
                { value: 'TRANSFER', label: 'Transferência' },
                { value: 'MEMBER', label: 'Integrante' },
                { value: 'MEMBER_PAYMENT', label: 'Pagamento Integrante' },
                { value: 'ACCOUNT', label: 'Conta' },
                { value: 'CATEGORY', label: 'Categoria' },
                { value: 'USER', label: 'Usuário' },
              ]}
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
            />
            <div className="flex items-end gap-2">
              <DatePicker
                label="Data Inicial"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <DatePicker
                label="Data Final"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-text-muted">Carregando...</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-16">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                        Nenhum registro de auditoria encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-text-secondary whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{getEntityBadge(log.entityType)}</TableCell>
                        <TableCell className="font-mono text-text-secondary text-sm">{log.entityId.slice(0, 8)}...</TableCell>
                        <TableCell className="text-text-secondary">{getUserName(log.userId)}</TableCell>
                        <TableCell className="text-text-muted max-w-xs truncate">{log.reason || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)} aria-label="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onOpenChange={() => setSelectedLog(null)}
        title="Detalhes da Auditoria"
        size="lg"
      >
        <AuditDetailView log={selectedLog!} users={users} onClose={() => setSelectedLog(null)} />
      </Modal>
    </div>
  );
}

interface AuditDetailViewProps {
  log: AuditLog;
  users: User[];
  onClose: () => void;
}

function AuditDetailView({ log, users, onClose }: AuditDetailViewProps) {
  const user = users.find(u => u.id === log.userId);

  const formatJson = (data: Record<string, unknown> | undefined) => {
    if (!data) return '—';
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-text-secondary">ID do Log</p>
          <p className="font-mono text-sm text-text-primary">{log.id}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">Data/Hora</p>
          <p className="text-text-primary">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">Ação</p>
          <p className="text-text-primary">{getActionBadge(log.action)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">Entidade</p>
          <p className="text-text-primary">{getEntityBadge(log.entityType)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">ID da Entidade</p>
          <p className="font-mono text-sm text-text-primary">{log.entityId}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">Usuário</p>
          <p className="text-text-primary">{user?.name || log.userId}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">IP</p>
          <p className="font-mono text-sm text-text-primary">{log.ipAddress}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">User Agent</p>
          <p className="font-mono text-xs text-text-muted truncate max-w-xs">{log.userAgent}</p>
        </div>
      </div>

      {log.reason && (
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Motivo</p>
          <p className="text-text-secondary">{log.reason}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Dados Anteriores</p>
          <pre className="bg-primary border border-border rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-64">{formatJson(log.oldData)}</pre>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Dados Novos</p>
          <pre className="bg-primary border border-border rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-64">{formatJson(log.newData)}</pre>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="primary" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
