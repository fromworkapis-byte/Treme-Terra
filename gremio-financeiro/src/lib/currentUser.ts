// ===== IDENTIDADE LOCAL DO SISTEMA =====
// O app não tem login: todas as operações são atribuídas ao administrador local.
export const CURRENT_USER = {
  id: 'admin-001',
  email: 'admin@gremio.local',
  name: 'Administrador do Sistema',
  role: 'ADMIN' as const,
};
