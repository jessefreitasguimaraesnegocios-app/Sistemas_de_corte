# 📋 Secrets Necessários - Edge Functions Mercado Pago

## ✅ Resumo por Função

### 1. `getMpOauthUrl`
**Secrets OBRIGATÓRIOS:**
- ✅ `MP_CLIENT_ID` - ID do app do Mercado Pago

**Secrets OPCIONAIS:**
- ⚠️ `MP_REDIRECT_URI` - Pode vir do body da requisição (recomendado)

**NÃO precisa:**
- ❌ `MP_CLIENT_SECRET`
- ❌ `MP_ACCESS_TOKEN_VENDEDOR`
- ❌ `MP_SPONSOR_ID_LOJA`
- ❌ `MP_WEBHOOK_URL`

---

### 2. `mp-oauth-callback`
**Secrets OBRIGATÓRIOS:**
- ✅ `MP_CLIENT_ID` - ID do app do Mercado Pago
- ✅ `MP_CLIENT_SECRET` - Secret do app do Mercado Pago
- ✅ `SUPABASE_URL` - URL do projeto Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role do Supabase

**Secrets OPCIONAIS:**
- ⚠️ `MP_REDIRECT_URI` - Pode vir do body da requisição (recomendado)

**NÃO precisa:**
- ❌ `MP_ACCESS_TOKEN_VENDEDOR`
- ❌ `MP_SPONSOR_ID_LOJA`
- ❌ `MP_WEBHOOK_URL`

---

### 3. `createPayment`
**Secrets OBRIGATÓRIOS:**
- ✅ `SUPABASE_URL` - URL do projeto Supabase
- ✅ `SUPABASE_ANON_KEY` - Chave anon do Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role do Supabase

**Secrets OPCIONAIS:**
- ⚠️ `MP_WEBHOOK_URL` - URL do webhook (opcional)

**NÃO precisa (vem do banco de dados):**
- ❌ `MP_SPONSOR_ID_LOJA` - **NÃO é secret!** Vem do banco (`business.mp_user_id`)
- ❌ `MP_CLIENT_ID`
- ❌ `MP_CLIENT_SECRET`
- ❌ `MP_ACCESS_TOKEN_VENDEDOR` - Vem do banco (`business.mp_access_token`)

---

### 4. `mercadopago-webhook`
**Secrets OBRIGATÓRIOS:**
- ✅ `MP_WEBHOOK_SECRET` - Secret para validar webhooks
- ✅ `SUPABASE_URL` - URL do projeto Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role do Supabase

**NÃO precisa:**
- ❌ `MP_CLIENT_ID`
- ❌ `MP_CLIENT_SECRET`
- ❌ `MP_ACCESS_TOKEN_VENDEDOR`
- ❌ `MP_SPONSOR_ID_LOJA`

---

## 🔑 Secrets Globais (para todas as funções)

Estes secrets podem ser configurados globalmente ou por função:

- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave anon do Supabase (apenas para `createPayment`)
- `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role do Supabase

---

## ⚠️ IMPORTANTE

1. **`MP_ACCESS_TOKEN_VENDEDOR`** NÃO é um secret da Edge Function!
   - Ele é salvo no banco de dados (`businesses.mp_access_token`)
   - Cada business tem seu próprio token
   - O token é obtido via OAuth e salvo automaticamente

2. **`MP_SPONSOR_ID_LOJA`** NÃO é um secret da Edge Function!
   - **ERRADO:** Buscar de `Deno.env.get("MP_SPONSOR_ID_LOJA")`
   - **CORRETO:** Buscar de `business.mp_user_id` (obtido via OAuth)
   - Cada business tem seu próprio `mp_user_id` (User ID do Mercado Pago)
   - Secrets são globais - não podem ser diferentes por business
   - **Arquitetura correta:** Marketplace onde cada bar tem seu próprio sponsor_id

3. **`MP_REDIRECT_URI`** é opcional:
   - Pode ser passado no body da requisição (recomendado)
   - Ou configurado como secret (menos flexível)

4. **`MP_WEBHOOK_URL`** é opcional:
   - Usado apenas para configurar webhooks no Mercado Pago
   - Não é necessário para processar pagamentos

---

## 📝 Checklist de Configuração

### Para `getMpOauthUrl`:
- [ ] `MP_CLIENT_ID` configurado

### Para `mp-oauth-callback`:
- [ ] `MP_CLIENT_ID` configurado
- [ ] `MP_CLIENT_SECRET` configurado
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado

### Para `createPayment`:
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] Business conectado ao Mercado Pago (tem `mp_user_id` e `mp_access_token` no banco)

### Para `mercadopago-webhook`:
- [ ] `MP_WEBHOOK_SECRET` configurado
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado

---

## 🚫 Secrets que NÃO devem ser configurados

Estes secrets não são necessários e não devem ser configurados:

- ❌ `MP_SPONSOR_ID_LOJA` - **NUNCA configurar como secret!** Vem do banco (`business.mp_user_id`)
- ❌ `MP_ACCESS_TOKEN_VENDEDOR` - Vem do banco de dados (`business.mp_access_token`)
- ❌ `MP_PUBLIC_KEY` - Vem do banco de dados (`business.mp_public_key`)
- ❌ `MP_REFRESH_TOKEN` - Vem do banco de dados (`business.mp_refresh_token`)
- ❌ `MP_USER_ID` - Vem do banco de dados (`business.mp_user_id`)
