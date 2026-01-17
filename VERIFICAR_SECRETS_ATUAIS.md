# ✅ Verificação dos Secrets Configurados

## 📊 Status Atual dos Secrets

### ✅ Secrets Configurados (Corretos):

1. **SUPABASE_URL** ✅
   - Status: Configurado
   - Necessário para: `mp-oauth-callback`, `createPayment`, `mercadopago-webhook`

2. **SUPABASE_ANON_KEY** ✅
   - Status: Configurado
   - Necessário para: `createPayment`

3. **SUPABASE_SERVICE_ROLE_KEY** ✅
   - Status: Configurado
   - Necessário para: `mp-oauth-callback`, `createPayment`, `mercadopago-webhook`

4. **MP_CLIENT_ID** ✅
   - Status: Configurado
   - Necessário para: `getMpOauthUrl`, `mp-oauth-callback`

5. **MP_CLIENT_SECRET** ✅
   - Status: Configurado
   - Necessário para: `mp-oauth-callback`

6. **MP_REDIRECT_URI** ✅ (Opcional)
   - Status: Configurado (mas pode vir do body)
   - Usado por: `getMpOauthUrl`, `mp-oauth-callback`

7. **MP_WEBHOOK_URL** ✅ (Opcional)
   - Status: Configurado
   - Usado por: `createPayment` (opcional)

---

## ❌ Secrets FALTANDO (Obrigatórios):

### 1. **MP_SPONSOR_ID_LOJA** ❌
   - **Status:** NÃO CONFIGURADO
   - **Obrigatório para:** `createPayment`
   - **O que é:** ID do Sponsor (loja) no Mercado Pago
   - **Onde encontrar:** 
     - No painel do Mercado Pago → Credenciais
     - É o User ID da conta que recebe o split
   - **Valor esperado:** Número (ex: `2622924811`)

### 2. **MP_WEBHOOK_SECRET** ❌
   - **Status:** NÃO CONFIGURADO
   - **Obrigatório para:** `mercadopago-webhook`
   - **O que é:** Secret para validar webhooks do Mercado Pago
   - **Onde encontrar:**
     - No painel do Mercado Pago → Webhooks
     - Ou configure no Mercado Pago quando criar o webhook
   - **Valor esperado:** String (secret)

---

## 📝 Secrets Opcionais (Não Críticos):

- **SUPABASE_DB_URL** - Não usado nas Edge Functions
- **GEMINI_API_KEY** - Não relacionado ao Mercado Pago

---

## 🚨 AÇÃO NECESSÁRIA

### Adicionar estes 2 secrets:

1. **MP_SPONSOR_ID_LOJA**
   - Nome: `MP_SPONSOR_ID_LOJA`
   - Valor: `2622924811` (ou seu ID do Sponsor)
   - **CRÍTICO:** Sem isso, `createPayment` não funciona!

2. **MP_WEBHOOK_SECRET**
   - Nome: `MP_WEBHOOK_SECRET`
   - Valor: (secret do webhook do Mercado Pago)
   - **CRÍTICO:** Sem isso, `mercadopago-webhook` não valida webhooks!

---

## ✅ Como Adicionar

1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
2. Clique em **"Secrets"** (no menu lateral)
3. Clique em **"Add another"**
4. Adicione:
   - Nome: `MP_SPONSOR_ID_LOJA`
   - Valor: `2622924811` (ou seu ID)
5. Clique em **"Add another"** novamente
6. Adicione:
   - Nome: `MP_WEBHOOK_SECRET`
   - Valor: (seu secret do webhook)
7. Clique em **"Save"**

---

## 🎯 Resumo

**Secrets configurados:** 7 ✅
**Secrets faltando:** 2 ❌

**Status geral:** ⚠️ Quase completo - faltam 2 secrets obrigatórios

**Impacto:**
- ❌ `createPayment` não funciona sem `MP_SPONSOR_ID_LOJA`
- ❌ `mercadopago-webhook` não valida webhooks sem `MP_WEBHOOK_SECRET`
- ✅ `getMpOauthUrl` funciona
- ✅ `mp-oauth-callback` funciona
