# HassHalt — Controle de Gastos Familiar

> **Hass** (sobrenome) + **Haushalt** (orçamento doméstico em alemão)

App React para controle de gastos do casal, usando o mesmo Supabase do HAsset.

---

## Setup rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Preencha `.env` com as **mesmas credenciais do HAsset**:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Criar tabelas no Supabase
No painel do Supabase → **SQL Editor** → cole e execute o conteúdo de `supabase-setup.sql`.

### 4. Rodar o projeto
```bash
npm run dev
```
Acessa em: **http://localhost:5174**

> HAsset roda na porta 5173 — sem conflito.

---

## Stack
- React 18 + Vite
- React Router v6
- Supabase (Auth + Database)
- Chart.js + react-chartjs-2
- CSS customizado (tema teal)

## Fase 1 — O que está implementado
- ✅ Autenticação (Supabase Auth, mesmo login do HAsset)
- ✅ Setup automático de família na primeira entrada
- ✅ Dashboard com resumo mensal e breakdown por categoria
- ✅ Lançamentos: adicionar, editar, excluir, filtrar
- ✅ 13 categorias padrão com ícones e cores
- ✅ Sidebar collapsible + TopBar responsivo
- ✅ Logo SVG HassHalt

## Fases futuras
- 📈 Orçamentos mensais por categoria
- 🔁 Despesas recorrentes
- 💳 Cartões de crédito
- 📄 Relatórios detalhados
- 👥 Visão do casal (multi-usuário)
