# 💾 Guia de Backup e Restauração

## 📖 Visão Geral

O sistema utiliza **IndexedDB (Dexie.js)** como banco de dados local no navegador. O backup é feito exportando **todos os dados para um arquivo JSON**, que pode ser baixado, guardado e restaurado posteriormente.

---

## 📦 O que está no Backup

O arquivo JSON contém **todas as tabelas**:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários, senhas (hash), roles |
| `members` | Efetivo: post/grad, nome, ordem, status |
| `accounts` | Contas: caixa, banco, PIX, saldos |
| `categories` | Categorias de entrada/despesa |
| `entries` | Todas as entradas/receitas |
| `expenses` | Todas as despesas |
| `transfers` | Transferências entre contas |
| `memberPayments` | Pagamentos de contribuições |
| `attachments` | Anexos (base64) |
| `auditLogs` | Log completo de auditoria |
| `settings` | Configurações do sistema |

---

## 📤 Como Fazer Backup (Exportar)

### Pela Interface (Recomendado)

1. Acesse **Configurações** (ícone de engrenagem no menu lateral)
2. Clique na aba **Backup**
3. Clique no botão **"Gerar e Baixar Backup"**
4. O arquivo será baixado automaticamente:
   ```
   gremio-backup-2026-11-25.json
   ```

### Via Console do Navegador (Avançado)

```javascript
// Abrir console (F12) e executar:
async function exportBackup() {
  const db = new Dexie('GremioFinanceiroDB');
  db.version(1).stores({
    users: 'id',
    members: 'id',
    accounts: 'id',
    categories: 'id',
    entries: 'id',
    expenses: 'id',
    transfers: 'id',
    memberPayments: 'id',
    attachments: 'id',
    auditLogs: 'id',
    settings: 'key',
  });
  
  const data = {
    version: 1,
    timestamp: new Date().toISOString(),
    users: await db.users.toArray(),
    members: await db.members.toArray(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    expenses: await db.expenses.toArray(),
    transfers: await db.transfers.toArray(),
    memberPayments: await db.memberPayments.toArray(),
    attachments: await db.attachments.toArray(),
    auditLogs: await db.auditLogs.toArray(),
    settings: await db.settings.toArray(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gremio-backup-manual-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

exportBackup();
```

---

## 📥 Como Restaurar Backup (Importar)

### Pela Interface

1. Acesse **Configurações → Backup**
2. Na seção **"Restaurar Backup"**:
   - Clique em **"Selecionar arquivo"** ou arraste o `.json`
   - O nome do arquivo aparecerá
3. Clique em **"Restaurar Backup Selecionado"**
4. Confirmação: **"Esta ação substituirá todos os dados atuais. Continuar?"**
5. Clique em **OK**
6. O sistema **recarrega automaticamente** com os dados restaurados

### Via Console (Emergência)

```javascript
async function importBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // Validar estrutura
  if (!data.version || !data.timestamp) {
    throw new Error('Arquivo de backup inválido');
  }
  
  const db = new Dexie('GremioFinanceiroDB');
  db.version(1).stores({
    users: 'id',
    members: 'id',
    accounts: 'id',
    categories: 'id',
    entries: 'id',
    expenses: 'id',
    transfers: 'id',
    memberPayments: 'id',
    attachments: 'id',
    auditLogs: 'id',
    settings: 'key',
  });
  
  await db.transaction('rw', db.tables, async () => {
    // Limpar (exceto admin user se quiser preservar)
    await Promise.all([
      db.members.clear(),
      db.accounts.clear(),
      db.categories.clear(),
      db.entries.clear(),
      db.expenses.clear(),
      db.transfers.clear(),
      db.memberPayments.clear(),
      db.attachments.clear(),
      db.auditLogs.clear(),
      db.settings.clear(),
    ]);
    
    // Restaurar
    await Promise.all([
      db.members.bulkAdd(data.members || []),
      db.accounts.bulkAdd(data.accounts || []),
      db.categories.bulkAdd(data.categories || []),
      db.entries.bulkAdd(data.entries || []),
      db.expenses.bulkAdd(data.expenses || []),
      db.transfers.bulkAdd(data.transfers || []),
      db.memberPayments.bulkAdd(data.memberPayments || []),
      db.attachments.bulkAdd(data.attachments || []),
      db.auditLogs.bulkAdd(data.auditLogs || []),
      db.settings.bulkAdd(data.settings || []),
    ]);
  });
  
  console.log('✅ Backup restaurado! Recarregue a página.');
  location.reload();
}

// Uso:
// 1. Criar input file no console ou página
// 2. importBackup(arquivoSelecionado)
```

---

## 🔄 Rotina Recomendada de Backup

### Diário (Automático via Lembrete)
- **Quando**: Final do expediente
- **Onde**: Pasta local + nuvem (OneDrive/Google Drive)
- **Retenção**: 30 dias

### Semanal
- **Quando**: Sexta-feira
- **Onde**: Mídia externa (pendrive/HD) + nuvem
- **Retenção**: 12 semanas

### Mensal
- **Quando**: Dia 1 de cada mês
- **Onde**: Arquivo permanente (DVD/HD externo)
- **Retenção**: Anos (arquivo histórico)

### Antes de Operações Críticas
- **Sempre** antes de:
  - Atualização do sistema
  - Migração de dados
  - Fechamento mensal/anual
  - Troca de responsável

---

## 📁 Organização dos Arquivos de Backup

```
Backups_Gremio/
├── 2026/
│   ├── 11_Novembro/
│   │   ├── gremio-backup-2026-11-01.json
│   │   ├── gremio-backup-2026-11-08.json
│   │   ├── gremio-backup-2026-11-15.json
│   │   ├── gremio-backup-2026-11-22.json
│   │   └── gremio-backup-2026-11-29.json
│   └── 12_Dezembro/
└── 2027/
```

### Naming Convention
```
gremio-backup-YYYY-MM-DD[-suffix].json
```
Exemplos:
- `gremio-backup-2026-11-25.json` (diário)
- `gremio-backup-2026-11-30-mensal.json` (mensal)
- `gremio-backup-2026-11-25-pre-atualizacao.json` (antes de update)

---

## ⚠️ Cuidados Importantes

### ✅ FAÇA
- Testar restauração **pelo menos uma vez por mês**
- Guardar backups em **mídias diferentes** (PC + nuvem + HD externo)
- Verificar integridade do JSON após download
- Manter backup **antes de qualquer mudança grande**

### ❌ NÃO FAÇA
- Sobrescrever o único backup existente
- Restaurar backup de versão diferente do sistema sem testar
- Compartilhar arquivo de backup (contém senhas hasheadas e dados sensíveis)
- Apagar backups antigos sem ter cópias mais recentes testadas

---

## 🔐 Segurança do Backup

### O que o backup CONTÉM (sensível):
- Hashes de senhas (bcrypt)
- Nomes completos do efetivo
- Valores financeiros
- Logs de auditoria completos

### Proteção Recomendada:
1. **Criptografar** o arquivo antes de subir para nuvem:
   ```bash
   # Windows (PowerShell)
   $password = "SenhaForte123!"
   $content = Get-Content "backup.json" -Raw
   $encrypted = ConvertTo-SecureString $content -AsPlainText -Force | ConvertFrom-SecureString -Key (1..16)
   Set-Content "backup.json.enc" $encrypted
   
   # Descriptografar
   $decrypted = $encrypted | ConvertTo-SecureString -Key (1..16) | ConvertFrom-SecureString -AsPlainText
   Set-Content "backup.json" $decrypted
   ```

2. **Ou usar 7-Zip com senha**:
   ```bash
   7z a -p"SenhaForte123!" -mhe=on backup.json.7z backup.json
   ```

3. **Nunca** enviar backup puro por email/WhatsApp

---

## 🧪 Testando a Restauração

### Teste Mensal (Obrigatório)

```markdown
## Checklist de Teste de Restauração - MM/YYYY

- [ ] Backup selecionado: gremio-backup-YYYY-MM-DD.json
- [ ] Ambiente de teste: [ ] Navegador anônimo  [ ] Outro PC  [ ] VM
- [ ] Restauração realizada sem erros
- [ ] Dados verificados:
  - [ ] Usuários (login funciona)
  - [ ] Efetivo (contagem correta)
  - [ ] Contas (saldos corretos)
  - [ ] Entradas/Despesas (totais batem)
  - [ ] Transferências (saldos consistentes)
  - [ ] Contribuições (status correto)
  - [ ] Auditoria (logs preservados)
- [ ] Sistema funcional após reload
- [ ] Assinatura: _______________ Data: __/__/____
```

---

## 🚨 Cenários de Recuperação

### Cenário 1: Perda Total (PC formatado/roubado)
1. Instalar sistema em novo PC (`npm install && npm run dev`)
2. Login com credenciais padrão
3. Configurações → Backup → Restaurar
4. Selecionar backup mais recente
5. Sistema pronto

### Cenário 2: Dados Corrompidos (Erro humano)
1. **Não fazer novo backup** (sobrescreveria corrupção)
2. Restaurar backup anterior à corrupção
3. Verificar dados
4. Reaplicar lançamentos perdidos manualmente

### Cenário 3: Troca de Responsável
1. Responsável antigo faz backup final
2. Entrega arquivo (criptografado) + senha separada
3. Novo responsável restaura em seu PC
4. Altera senha do admin imediatamente

### Cenário 4: Atualização do Sistema
1. Backup pré-atualização (obrigatório)
2. Atualizar código (`git pull && npm install && npm run build`)
3. Testar funcionalidades
4. Se problemas: restaurar backup pré-update

---

## 📊 Verificação de Integridade

### Checklist Visual do Arquivo JSON

```bash
# Tamanho esperado (aproximado)
# Vazio: ~2 KB
# Pequeno (100 lançamentos): ~50 KB
# Médio (1000 lançamentos): ~500 KB
# Grande (5000+ lançamentos): ~2-5 MB

# Estrutura obrigatória
jq '.version, .timestamp, .users | length, .members | length' backup.json
```

### Validação Rápida no Navegador
```javascript
// Cole no console após selecionar arquivo
const file = document.querySelector('input[type=file]').files[0];
const text = await file.text();
const data = JSON.parse(text);

console.log('Versão:', data.version);
console.log('Data:', data.timestamp);
console.log('Usuários:', data.users?.length);
console.log('Integrantes:', data.members?.length);
console.log('Contas:', data.accounts?.length);
console.log('Entradas:', data.entries?.length);
console.log('Despesas:', data.expenses?.length);
console.log('Transferências:', data.transfers?.length);
console.log('Pagamentos:', data.memberPayments?.length);
console.log('Auditoria:', data.auditLogs?.length);
console.log('✅ Backup válido para restauração');
```

---

## 📞 Contato e Suporte

Em caso de dúvidas sobre backup/restauração:

1. Consultar este guia
2. Verificar console do navegador (F12)
3. Testar em ambiente isolado (aba anônima)
4. Contatar suporte técnico

---

## 📝 Histórico de Versões do Backup

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-11 | Estrutura inicial com todas as tabelas |

---

**⚠️ LEMBRE-SE: O melhor backup é aquele que você testou restaurar!**

*Faça backups regulares, guarde em locais seguros, teste a restauração periodicamente.*