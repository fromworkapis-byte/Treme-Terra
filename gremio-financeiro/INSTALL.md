# 📋 Guia de Instalação - Sistema Financeiro do Grêmio

## 🖥️ Requisitos do Sistema

| Requisito | Versão Mínima | Recomendada |
|-----------|---------------|-------------|
| **Node.js** | 18.0.0 | 20.x LTS |
| **npm** | 9.0.0 | 10.x |
| **Navegador** | Chrome 100+, Firefox 100+, Edge 100+, Safari 15+ | Atualizado |
| **SO** | Windows 10+, macOS 12+, Linux (Ubuntu 20.04+) | Qualquer moderno |

---

## 📥 Instalação Passo a Passo

### 1. Preparar o Ambiente

#### Windows (PowerShell)
```powershell
# Verificar versões
node --version
npm --version

# Se não tiver Node.js, instalar via winget
winget install OpenJS.NodeJS
```

#### Linux/macOS (Terminal)
```bash
# Verificar versões
node --version
npm --version

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (Homebrew)
brew install node@20
```

### 2. Clonar/Extrair o Projeto

```bash
# Se veio como zip, extrair para pasta desejada
# Exemplo: C:\Users\SeuUsuario\Documents\gremio-financeiro

cd gremio-financeiro
```

### 3. Instalar Dependências

```bash
# Limpar cache se houver problemas
npm cache clean --force

# Instalar
npm install

# Se der erro de peer dependencies
npm install --legacy-peer-deps
```

### 4. Verificar Instalação

```bash
# Verificar se build funciona
npm run build

# Deve criar pasta dist/ sem erros
```

### 5. Iniciar Desenvolvimento

```bash
npm run dev
```

**Saída esperada:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 6. Acessar o Sistema

1. Abra o navegador
2. Acesse: **http://localhost:5173**
3. O sistema abre direto no Dashboard, sem login, como Administrador do Sistema.

---

## 🌐 Deploy em Produção

### Opção 1: GitHub Pages (Gratuito)

```bash
# 1. Configurar base no vite.config.ts
# Se repo for: github.com/usuario/gremio-financeiro
export default defineConfig({
  base: '/gremio-financeiro/',  # ← Nome do repositório
  // ...
})

# 2. Build
npm run build

# 3. Deploy manual ou GitHub Actions
# Pasta dist/ vai para gh-pages branch
```

#### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Opção 2: Vercel/Netlify (Gratuito)

1. Conectar repositório no [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Deploy automático a cada push

### Opção 3: Servidor Próprio (VPS)

```bash
# No servidor
npm run build

# Servir com nginx
# /etc/nginx/sites-available/gremio
server {
    listen 80;
    server_name gremio.seudominio.com;
    root /var/www/gremio/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # HTTPS com Let's Encrypt recomendado
}
```

---

## 🔧 Configurações Pós-Instalação

### 1. Cadastrar Efetivo Inicial
1. Ir em **Efetivo → Novo Integrante**
2. Preencher: Post/Grad, Nome, Ordem (antiguidade), Data ingresso
3. Ordem menor = mais antigo (não aparece na tela)

### 2. Configurar Contas
1. Ir em **Configurações → Contas**
2. Verificar/criar: Caixa Físico, Conta Bancária, PIX
3. Definir saldos iniciais se houver

### 3. Ajustar Categorias (Opcional)
- **Configurações → Categorias**
- Adicionar/remover conforme necessidade da unidade

### 4. Testar Fluxo Completo
1. Lançar uma **Entrada** (ex: Mensalidade)
2. Lançar uma **Despesa** (ex: Alimentação)
3. Fazer uma **Transferência** (Caixa → Banco)
4. Verificar **Dashboard** e **Relatórios**

---

## 🐳 Docker (Opcional)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Build e rodar
docker build -t gremio-financeiro .
docker run -d -p 8080:80 gremio-financeiro
# Acessar: http://localhost:8080
```

---

## ✅ Checklist de Validação

| Item | Status | Observação |
|------|--------|------------|
| Node.js 20+ instalado | ☐ | `node --version` |
| Dependências instaladas | ☐ | `npm install` sem erros |
| Build funciona | ☐ | `npm run build` cria dist/ |
| Dev server roda | ☐ | `npm run dev` abre localhost:5173 |
| Acesso direto sem login | ☐ | Abre no Dashboard |
| Dashboard carrega gráficos | ☐ | 4 gráficos visíveis |
| CRUD Entradas funciona | ☐ | Criar, editar, excluir |
| CRUD Despesas funciona | ☐ | Criar, editar, excluir |
| Contas e transferências | ☐ | Saldos atualizam |
| Efetivo e contribuições | ☐ | Ordem oculta, pagamentos |
| Relatórios geram | ☐ | PDF/Excel (parcial) |
| Auditoria registra | ☐ | Logs imutáveis |
| Backup exporta/importa | ☐ | JSON completo |

---

## 🆘 Problemas Comuns

### `npm install` falha
```bash
# Limpar tudo e reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### `npm run build` falha com erro de TypeScript
```bash
# Verificar erros
npm run typecheck

# Ou pular verificação de tipos no build (não recomendado)
# vite.config.ts: esbuild: { logLevel: 'silent' }
```

### Página em branco no GitHub Pages
- Verificar `base` no `vite.config.ts`
- Deve ser `/nome-do-repo/` com barras

### Dados não salvam
- Verificar se IndexedDB está habilitado no navegador
- Modo privado/incógnito pode bloquear
- Console (F12) → Application → IndexedDB

### Gráficos não renderizam
- Verificar se há dados no período
- Console para erros de Recharts

---

## 📞 Suporte

Se nada funcionar:
1. Verificar console do navegador (F12)
2. Verificar Node.js version: `node --version`
3. Tentar em aba anônima/privada
4. Reinstalar dependências do zero

---

**✅ Instalação concluída com sucesso!**  
O sistema está pronto para uso no Grêmio da 1ª CFz - Treme Terra.