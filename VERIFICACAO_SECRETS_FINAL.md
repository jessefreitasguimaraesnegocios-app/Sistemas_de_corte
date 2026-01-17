# ✅ Verificação Final dos Secrets

## 📊 Secrets Configurados (8)

1. ✅ **GEMINI_API_KEY** - Não relacionado ao Mercado Pago
2. ✅ **SUPABASE_URL** - Obrigatório
3. ✅ **SUPABASE_ANON_KEY** - Obrigatório
4. ✅ **SUPABASE_SERVICE_ROLE_KEY** - Obrigatório
5. ✅ **SUPABASE_DB_URL** - Não usado nas Edge Functions
6. ✅ **MP_WEBHOOK_URL** - Opcional
7. ✅ **MP_REDIRECT_URI** - Opcional (pode vir do body)
8. ✅ **MP_WEBHOOK_SECRET** - Obrigatório para `mercadopago-webhook`

---

## ❌ Secrets FALTANDO (2 Obrigatórios)

### 1. **MP_CLIENT_ID** ❌
- **Status:** NÃO CONFIGURADO
- **Obrigatório para:** `getMpOauthUrl`, `mp-oauth-callback`
- **O que é:** Client ID do app do Mercado Pago
- **Onde encontrar:** 
  - Mercado Pago Dashboard → Credenciais → Client ID
  - É o ID do seu app no Mercado Pago
- **Valor esperado:** String (ex: `2851977731635151`)

### 2. **MP_CLIENT_SECRET** ❌
- **Status:** NÃO CONFIGURADO
- **Obrigatório para:** `mp-oauth-callback`
- **O que é:** Client Secret do app do Mercado Pago
- **Onde encontrar:**
  - Mercado Pago Dashboard → Credenciais → Client Secret
  - É o secret do seu app no Mercado Pago
- **Valor esperado:** String (secret)

---

## 🚨 AÇÃO NECESSÁRIA

### Adicionar estes 2 secrets:

1. **MP_CLIENT_ID**
   - Nome: `MP_CLIENT_ID`
   - Valor: (seu Client ID do Mercado Pago)
   - **CRÍTICO:** Sem isso, OAuth não funciona!

2. **MP_CLIENT_SECRET**
   - Nome: `MP_CLIENT_SECRET`
   - Valor: (seu Client Secret do Mercado Pago)
   - **CRÍTICO:** Sem isso, callback OAuth não funciona!

---

## ✅ Como Adicionar

1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
2. Clique em **"Secrets"** (no menu lateral)
3. Clique em **"Add another"**
4. Adicione:
   - Nome: `MP_CLIENT_ID`
   - Valor: (seu Client ID do Mercado Pago)
5. Clique em **"Add another"** novamente
6. Adicione:
   - Nome: `MP_CLIENT_SECRET`
   - Valor: (seu Client Secret do Mercado Pago)
7. Clique em **"Save"**

---

## 📍 Onde Encontrar no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione seu app
3. Vá em **"Credenciais"**
4. Copie:
   - **Client ID** → `MP_CLIENT_ID`
   - **Client Secret** → `MP_CLIENT_SECRET`

---

## 🎯 Resumo

**Secrets configurados:** 8 ✅
**Secrets faltando:** 2 ❌

**Status geral:** ⚠️ Faltam 2 secrets obrigatórios para OAuth

**Impacto:**
- ❌ `getMpOauthUrl` não funciona sem `MP_CLIENT_ID`
- ❌ `mp-oauth-callback` não funciona sem `MP_CLIENT_ID` e `MP_CLIENT_SECRET`
- ✅ `createPayment` funciona (usa dados do banco)
- ✅ `mercadopago-webhook` funciona (tem `MP_WEBHOOK_SECRET`)

---

## ✅ Após Adicionar

Depois de adicionar `MP_CLIENT_ID` e `MP_CLIENT_SECRET`:

1. ✅ OAuth funcionará completamente
2. ✅ Businesses poderão conectar ao Mercado Pago
3. ✅ Pagamentos PIX/Cartão funcionarão após conexão
