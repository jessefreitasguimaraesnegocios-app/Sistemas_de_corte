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

### 1. **MP_WEBHOOK_SECRET** ❌
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

## ⚠️ IMPORTANTE - CORREÇÃO ARQUITETURAL

### ❌ NÃO adicionar `MP_SPONSOR_ID_LOJA` como secret!

**Por quê?**
- Secrets são globais (mesmo valor para todos)
- Cada business tem seu próprio `mp_user_id` (obtido via OAuth)
- Se usar secret global, todos os pagamentos teriam o mesmo sponsor_id
- Isso quebra o marketplace quando há múltiplos businesses

**✅ Solução correta:**
- O código agora busca `mp_user_id` do banco (`business.mp_user_id`)
- Cada business conecta via OAuth e recebe seu próprio `mp_user_id`
- O `mp_user_id` é salvo automaticamente no banco após OAuth

---

## 🚨 AÇÃO NECESSÁRIA

### Adicionar apenas 1 secret:

1. **MP_WEBHOOK_SECRET**
   - Nome: `MP_WEBHOOK_SECRET`
   - Valor: (secret do webhook do Mercado Pago)
   - **CRÍTICO:** Sem isso, `mercadopago-webhook` não valida webhooks!

---

## ✅ Como Adicionar

1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
2. Clique em **"Secrets"** (no menu lateral)
3. Clique em **"Add another"**
4. Adicione:
   - Nome: `MP_WEBHOOK_SECRET`
   - Valor: (seu secret do webhook do Mercado Pago)
5. Clique em **"Save"**

**⚠️ NÃO adicione `MP_SPONSOR_ID_LOJA` - ele vem do banco de dados!**

---

## 🎯 Resumo

**Secrets configurados:** 7 ✅
**Secrets faltando:** 1 ❌

**Status geral:** ✅ Quase completo - falta apenas 1 secret obrigatório

**Impacto:**
- ✅ `createPayment` funciona (usa `mp_user_id` do banco)
- ❌ `mercadopago-webhook` não valida webhooks sem `MP_WEBHOOK_SECRET`
- ✅ `getMpOauthUrl` funciona
- ✅ `mp-oauth-callback` funciona

**✅ Correção aplicada:**
- `createPayment` agora busca `mp_user_id` do banco (não precisa de secret)
- Cada business tem seu próprio `mp_user_id` (obtido via OAuth)
- Arquitetura correta para marketplace
