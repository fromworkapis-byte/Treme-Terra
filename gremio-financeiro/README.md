# 🏦 Sistema de Gestão Financeira - Grêmio da Companhia

> **1ª Companhia de Fuzileiros - Treme Terra**

Sistema completo de gestão financeira para controle do grêmio militar, com dashboard moderno, controle de entradas/despesas, contas, efetivo, relatórios e auditoria.

---

## ✨ Funcionalidades

### 📊 Dashboard
- **KPIs em tempo real**: Saldo total, entradas/despesas do mês, resultado, caixa físico, conta bancária, PIX
- **4 Gráficos interativos**:
  - Evolução do saldo (12 meses) - Área
  - Entradas vs Despesas - Barras agrupadas
  - Despesas por categoria - Donut
  - Histórico anual - Linhas
- **Movimentações recentes** (últimas 10)

### 💰 Entradas (Receitas)
- CRUD completo com validação
- Campos: Data, Descrição, Categoria, Valor, Forma, Conta destino, Responsável, Observações
- Categorias: Mensalidades, Contribuições, Doações, Eventos, Festas, Vendas, Outros
- Filtros: Período, categoria, conta, busca textual
- Paginação e ordenação

### 💸 Despesas
- CRUD completo
- Campos: Data, Descrição, Categoria, Valor, Forma, Conta origem, Responsável, Fornecedor, Nº Comprovante, Observações
- Categorias: Alimentação, Eventos, Festas, Materiais, Manutenção, Equipamentos, Serviços, Transporte, Outros
- Filtros avançados

### 🏦 Contas e Caixa
- **Tipos**: Caixa Físico, Conta Bancária, PIX, Outras
- Saldos calculados automaticamente
- Transferências entre contas (não contabilizam como receita/despesa)
- Extrato por conta

### 👥 Efetivo (Integrantes)
- Cadastro com **Post/Grad**, **Nome**, **Ordem** (antiguidade - oculto na UI)
- Status: Ativo/Inativo
- Controle de contribuições mensais
- Dashboard: Quem pagou, pendentes, total arrecadado
- Ordens determinam antiguidade (menor = mais antigo)

### 📄 Relatórios
- **Relatório Geral**: Filtros por período, categoria, conta, tipo, responsável
- **Prestação de Contas**: Modelo formal para assembleia
- **Contribuições**: Status de pagamentos do efetivo
- Exportação: PDF e Excel (em implementação)

### 📋 Auditoria
- Log imutável de todas as alterações (CREATE, UPDATE, DELETE, TRANSFER)
- Dados anteriores e novos armazenados
- Filtros por período, ação, entidade, usuário
- Motivo obrigatório para exclusões

### ⚙️ Configurações
- Gerenciamento de contas, categorias, usuários (admin)
- Backup/Restore completo (JSON)
- Alteração de senha
- Tema dark obrigatório

---

## 🎨 Design System

- **Tema**: Dark Mode obrigatório
- **Cores**:
  - Fundo: `#0a0f1a` (azul-marinho profundo)
  - Cards: `#111827` / `#1e293b`
  - Entradas: `#10b981` (verde)
  - Despesas: `#ef4444` (vermelho)
  - Transferências: `#f59e0b` (amarelo)
  - Info: `#3b82f6` (azul)
- **Tipografia**: Inter (400/500/600/700)
- **Componentes**: shadcn/ui + Radix UI (acessíveis)
- **Ícones**: Lucide React
- **Responsivo**: Desktop, Tablet, Mobile

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui + Radix UI |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **State/Data** | TanStack Query (React Query) |
| **Database** | Dexie.js (IndexedDB) - Local no navegador |
| **Auth** | JWT simulado + localStorage |
| **PDF** | @react-pdf/renderer |
| **Excel** | exceljs |
| **Dates** | date-fns |
| **Icons** | Lucide React |

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou pnpm

### Passos

```bash
# 1. Entrar no diretório
cd gremio-financeiro

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Acessar no navegador
# http://localhost:5173
```

### Build para Produção

```bash
# Gerar build otimizado
npm run build

# Preview do build
npm run preview
```

### Deploy no GitHub Pages

```bash
# 1. Configurar base no vite.config.ts (se necessário)
# 2. Build
npm run build

# 3. Deploy da pasta dist/
# Usar GitHub Actions ou fazer manualmente
```

---

## 🔐 Credenciais Iniciais

| Campo | Valor |
|-------|-------|
| **Email** | `admin@gremio.local` |
| **Senha** | `Gremio@2026!Admin` |
| **Função** | ADMIN |

> ⚠️ **OBRIGATÓRIO**: Trocar a senha no primeiro acesso!
> O sistema força a troca de senha na primeira entrada.

---

## 📁 Estrutura do Projeto

```
gremio-financeiro/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ui/           # Componentes base (shadcn/ui)
│   │   ├── layout/       # Sidebar, Header, MainLayout
│   │   ├── charts/       # AreaChart, BarChart, DonutChart, LineChart
│   │   └── forms/        # EntryForm, ExpenseForm, TransferForm, MemberForm, AccountForm, CategoryForm
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── db/
│   │   └── index.ts      # Dexie.js + Seed + Helpers
│   ├── hooks/
│   │   └── useFinancialData.ts  # TanStack Query hooks
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Entries.tsx
│   │   ├── Expenses.tsx
│   │   ├── Movements.tsx
│   │   ├── Accounts.tsx
│   │   ├── Members.tsx
│   │   ├── Reports.tsx
│   │   ├── Audit.tsx
│   │   ├── Settings.tsx
│   │   ├── LoginPage.tsx
│   │   ├── FirstAccessPage.tsx
│   │   └── ProtectedRoute.tsx
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── utils/
│   │   └── cn.ts         # clsx + tailwind-merge
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 💾 Banco de Dados (IndexedDB)

O sistema usa **Dexie.js** sobre **IndexedDB** - banco de dados nativo do navegador.

### Tabelas Principais
- `users` - Usuários do sistema
- `members` - Integrantes do efetivo
- `accounts` - Contas financeiras
- `categories` - Categorias (entrada/despesa)
- `entries` - Entradas/Receitas
- `expenses` - Despesas
- `transfers` - Transferências entre contas
- `memberPayments` - Pagamentos de contribuições
- `attachments` - Anexos (base64)
- `auditLogs` - Log de auditoria
- `settings` - Configurações

### Persistência
- Dados salvos **localmente no navegador**
- Funciona **offline**
- Sem necessidade de servidor backend
- Backup/Restore via JSON

---

## 🔄 Backup e Restore

### Exportar Backup
1. Ir em **Configurações → Backup**
2. Clicar em **"Gerar e Baixar Backup"**
3. Arquivo JSON salvo com timestamp

### Restaurar Backup
1. Ir em **Configurações → Backup**
2. Selecionar arquivo JSON de backup
3. Clicar em **"Restaurar Backup Selecionado"**
4. Sistema recarrega automaticamente

> ⚠️ **Atenção**: Restauração **substitui todos os dados atuais**. Faça backup antes.

---

## 📱 PWA (Progressive Web App)

O sistema pode ser **instalado no celular**:
1. Abrir no Chrome/Edge mobile
2. Menu → "Instalar app" ou "Adicionar à tela inicial"
3. Funciona como app nativo

---

## 🎖️ Contexto Militar

### Postos/Graduações Suportados
**Praças**: SD, CB, 3SG, 2SG, 1SG, ST  
**Oficiais**: ASP, 2TEN, 1TEN, CAP, MAJ, TC, CEL, GEN

### Ordem de Antiguidade
- Campo `ordem` (número inteiro)
- **Menor número = mais antigo**
- **Não aparece na UI** - apenas para ordenação interna
- Usado em listagens e relatórios

### Unidade
- **Nome**: 1ª Companhia de Fuzileiros - Treme Terra
- **Abreviação**: 1ª CFz - Treme Terra

---

## 🔧 Scripts Disponíveis

```bash
npm run dev       # Servidor de desenvolvimento
npm run build     # Build de produção
npm run preview   # Preview do build
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

---

## 🐛 Solução de Problemas

### "Erro ao carregar dados"
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Verificar console (F12) para erros
- Tentar em aba anônima

### "Senha incorreta no primeiro acesso"
- Verificar se está digitando exatamente: `Gremio@2026!Admin`
- Maiúsculas/minúsculas e caracteres especiais importam

### "Gráficos não aparecem"
- Verificar se há dados no período selecionado
- Trocar mês no seletor do dashboard

### Build falha no GitHub Pages
- Verificar `base` no `vite.config.ts`
- Para GitHub Pages: `base: '/nome-do-repo/'`

---

## 📄 Licença

Sistema desenvolvido para uso interno do **Grêmio da 1ª Companhia de Fuzileiros - Treme Terra**.

---

## 🤝 Suporte

Para dúvidas ou sugestões, contatar o desenvolvedor ou abrir issue no repositório.

---

**Desenvolvido com ❤️ para o Grêmio da Companhia**  
*Sistema moderno, seguro e transparente para gestão financeira militar*