# 🚀 Setup Completo - Sistemas de Corte

Guia objetivo para configurar o projeto do zero.

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase (gratuita)
- Conta Mercado Pago
- Google Cloud (opcional, para Gemini AI)

---

## 1️⃣ Variáveis de Ambiente

Crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
VITE_GEMINI_API_KEY=sua-chave-gemini (opcional)
```

**Onde encontrar:**
- Supabase Dashboard → Settings → API
- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_ANON_KEY`: anon/public key

---

## 2️⃣ Secrets das Edge Functions

Acesse: `https://supabase.com/dashboard/project/SEU_PROJECT_ID/functions/createPayment/settings`

### Secrets Obrigatórios:

| Secret | Onde encontrar | Função |
|--------|---------------|--------|
| `SUPABASE_URL` | Dashboard → Settings → API → Project URL | Todas |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → service_role key | createPayment, webhook, oauth-callback |
| `MP_CLIENT_ID` | Mercado Pago → Developers → Suas integrações → App ID | getMpOauthUrl, oauth-callback |
| `MP_CLIENT_SECRET` | Mercado Pago → Developers → Suas integrações → Secret key | oauth-callback |

### Secrets Opcionais:

| Secret | Descrição |
|--------|-----------|
| `MP_WEBHOOK_URL` | URL do webhook (ex: `https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook`) |
| `MP_REDIRECT_URI` | Pode vir do body da requisição (recomendado) |

**⚠️ IMPORTANTE:**
- `MP_ACCESS_TOKEN_VENDEDOR` → Vem do banco (`business.mp_access_token`) via OAuth
- `MP_SPONSOR_ID_LOJA` → Vem do banco (`business.mp_user_id`) via OAuth
- **NÃO** adicione esses como secrets globais!

---

## 3️⃣ Deploy das Edge Functions

```bash
# Deploy todas as funções
npx supabase functions deploy

# Ou deploy individual
npx supabase functions deploy createPayment
npx supabase functions deploy getMpOauthUrl
npx supabase functions deploy mp-oauth-callback
npx supabase functions deploy mercadopago-webhook
```

---

## 4️⃣ Configurar Mercado Pago OAuth

1. **Criar App no Mercado Pago:**
   - Acesse: https://www.mercadopago.com.br/developers/panel
   - Crie uma aplicação
   - Copie `Client ID` e `Client Secret`

2. **Configurar Redirect URI:**
   - No app do Mercado Pago, adicione: `https://seu-dominio.com/oauth/callback`
   - Ou use a URL da Vercel em produção

3. **Conectar Estabelecimento:**
   - No app, vá em Configurações → Integração Mercado Pago
   - Clique em "Conectar Mercado Pago"
   - Autorize a aplicação
   - O sistema salva automaticamente `mp_access_token` e `mp_user_id`

---

## 5️⃣ Executar Migrations

```bash
# Via PowerShell
.\execute-migrations.ps1

# Ou manualmente
npx supabase db push
```

---

## ✅ Verificação Final

1. ✅ Variáveis de ambiente configuradas
2. ✅ Secrets configurados no Supabase Dashboard
3. ✅ Edge Functions deployadas
4. ✅ Estabelecimento conectado ao Mercado Pago via OAuth
5. ✅ Migrations executadas

**Próximo passo:** Teste um pagamento PIX!

---

**Problemas?** Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
