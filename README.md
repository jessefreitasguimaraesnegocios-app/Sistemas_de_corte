# 🚀 Sistemas de Corte - Sistema de Gestão Multi-Tenant

Sistema SaaS completo para gestão de estabelecimentos de beleza com integração Mercado Pago.

## ⚡ Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Deploy das Edge Functions
npx supabase functions deploy

# 4. Rodar localmente
npm run dev
```

## 📚 Documentação

- **[SETUP.md](./SETUP.md)** - Guia completo de configuração
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problemas comuns e soluções
- **[EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)** - Documentação das Edge Functions
- **[MERCADO_PAGO.md](./MERCADO_PAGO.md)** - Integração Mercado Pago

## 🏗️ Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Pagamentos**: Mercado Pago (PIX + Cartão)
- **Auth**: Supabase Auth + Google OAuth
- **Deploy**: Vercel (Frontend) + Supabase (Backend)

## 💳 Features

- ✅ Pagamentos PIX e Cartão com split automático (10%)
- ✅ Multi-tenant (isolamento por business)
- ✅ OAuth Mercado Pago por estabelecimento
- ✅ Webhooks assinados para notificações
- ✅ Gestão completa (produtos, serviços, colaboradores)

## 🔐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
VITE_GEMINI_API_KEY=sua-chave-gemini (opcional)
```

## 📖 Próximos Passos

1. Leia [SETUP.md](./SETUP.md) para configuração completa
2. Configure os secrets no Supabase Dashboard
3. Conecte estabelecimentos ao Mercado Pago via OAuth
4. Teste pagamentos PIX e Cartão

---

**Problemas?** Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
