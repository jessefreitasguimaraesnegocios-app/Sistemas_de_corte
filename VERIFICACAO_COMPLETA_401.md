# 🔍 Verificação Completa - Erro 401 createPayment

## 🚨 PROBLEMA ATUAL
Erro 401 persistente ao chamar `createPayment` Edge Function.

## ✅ CHECKLIST COMPLETO (FAÇA EM ORDEM)

### 1️⃣ VERIFICAR SECRETS NO SUPABASE DASHBOARD

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/settings

**Vá em "Secrets" e verifique se TODOS estão configurados:**

#### Secrets OBRIGATÓRIOS para createPayment:

1. **`SUPABASE_URL`**
   - ✅ Deve estar: `https://hgkvhgjtjsycbpeglrrs.supabase.co`
   - ❌ Se não estiver: Adicione agora!

2. **`SUPABASE_ANON_KEY`**
   - ✅ Deve começar com: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ❌ Se não estiver: Copie do Dashboard → Settings → API → anon/public key

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - ✅ Deve começar com: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ❌ Se não estiver: Copie do Dashboard → Settings → API → service_role key
   - ⚠️ **CUIDADO:** Esta chave é SECRETA, não compartilhe!

4. **`MP_SPONSOR_ID_LOJA`**
   - ✅ Deve ser um número (ex: `123456789`)
   - ❌ Se não estiver: Obtenha do Mercado Pago (User ID da conta Sponsor)

5. **`MP_WEBHOOK_URL`** (opcional)
   - ✅ Pode estar vazio ou: `https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/mercadopago-webhook`

**📍 ONDE ENCONTRAR AS CHAVES:**
- Supabase Dashboard → Settings → API
- `SUPABASE_URL`: Project URL
- `SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (secret!)

---

### 2️⃣ VERIFICAR LOGS DA EDGE FUNCTION

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/logs

**Procure por (última hora):**

#### ✅ Se você ver:
- `✅ FUNÇÃO createPayment CHAMADA - TESTE MÍNIMO`
- `📋 HEADERS recebidos:`
- `🔍 Debug createPayment:`

**→ A função ESTÁ sendo chamada. O problema é na validação.**

#### ❌ Se você NÃO ver esses logs:

**→ A função NÃO está sendo chamada. O gateway está bloqueando.**

**Possíveis causas:**
1. `verify_jwt = true` no `config.toml` (mas já mudamos para `false`)
2. A função precisa ser redeployada após mudar `config.toml`
3. O `supabase.functions.invoke` não está enviando o token

---

### 3️⃣ VERIFICAR CONFIG.TOML

**Arquivo:** `supabase/config.toml`

**Deve ter:**
```toml
[functions.createPayment]
verify_jwt = false
```

**Se estiver `true`, mude para `false` e faça:**
```bash
npx supabase functions deploy createPayment
```

---

### 4️⃣ TESTE MANUAL NO DASHBOARD

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment

**Clique na aba "Test"**

**Configure o teste:**
```json
{
  "valor": 0.1,
  "metodo_pagamento": "pix",
  "email_cliente": "teste@exemplo.com",
  "business_id": "56c882bc-4045-4c1d-990f-3e78c4cbe1d8"
}
```

**No campo "Authorization Header", adicione:**
```
Bearer SEU_ACCESS_TOKEN_AQUI
```

**Para obter o token:**
1. Abra o console do navegador no app
2. Digite: `(await supabase.auth.getSession()).data.session.access_token`
3. Copie o token que aparecer
4. Cole no campo Authorization Header do teste

**Clique em "Run"**

**Se der erro:**
- Veja a mensagem de erro
- Verifique os logs da função

---

### 5️⃣ VERIFICAR SE O TOKEN ESTÁ SENDO ENVIADO

**No console do navegador, antes de clicar em "Gerar QR Code PIX", digite:**

```javascript
const { data: session } = await supabase.auth.getSession();
console.log('Token:', session?.session?.access_token ? 'Presente' : 'Ausente');
console.log('Token preview:', session?.session?.access_token?.substring(0, 30));
console.log('User:', session?.session?.user ? 'Presente' : 'Ausente');
```

**Resultado esperado:**
- `Token: Presente`
- `Token preview: eyJhbGciOiJFUzI1NiIsImtpZ...`
- `User: Presente`

**Se `User: Ausente`:**
- ❌ Problema: Sessão inválida
- ✅ Solução: Faça logout e login novamente

---

### 6️⃣ VERIFICAR SE A EDGE FUNCTION ESTÁ DEPLOYADA

**Execute:**
```bash
npx supabase functions list
```

**Deve mostrar `createPayment` na lista.**

**Se não aparecer ou estiver desatualizada:**
```bash
npx supabase functions deploy createPayment
```

---

### 7️⃣ VERIFICAR SE O BUSINESS TEM MP_ACCESS_TOKEN

**No Supabase Dashboard → Table Editor → `businesses`**

**Procure o business com ID:** `56c882bc-4045-4c1d-990f-3e78c4cbe1d8`

**Verifique se:**
- ✅ `mp_access_token` não está NULL
- ✅ `mp_access_token` começa com `APP_USR-...` ou `TEST-...`

**Se estiver NULL:**
- ❌ Problema: Business não conectou Mercado Pago
- ✅ Solução: Conecte o Mercado Pago primeiro (Configurações → Integração Mercado Pago)

---

## 🔥 SOLUÇÃO RÁPIDA (TESTE AGORA)

### Passo 1: Verificar Secrets
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/settings
2. Vá em "Secrets"
3. Verifique se TODOS os 5 secrets estão configurados
4. Se algum faltar, adicione agora

### Passo 2: Redeployar a Função
```bash
cd c:\Users\jesse\Desktop\Sistemas_de_corte
npx supabase functions deploy createPayment
```

### Passo 3: Verificar Logs
1. Tente gerar o PIX novamente
2. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/logs
3. Veja os logs mais recentes
4. Procure por:
   - `✅ FUNÇÃO createPayment CHAMADA`
   - `📋 HEADERS recebidos:`
   - `👤 USER:` ou `❌ AUTH ERROR:`

### Passo 4: Se USER: null nos logs
**Problema:** JWT inválido ou `SUPABASE_ANON_KEY` errada

**Solução:**
1. Verifique se `SUPABASE_ANON_KEY` está correta nos secrets
2. Copie novamente do Dashboard → Settings → API → anon/public key
3. Atualize o secret
4. Redeploy: `npx supabase functions deploy createPayment`

---

## 📋 RESUMO - O QUE VERIFICAR AGORA

1. ✅ Secrets configurados? (5 secrets obrigatórios)
2. ✅ `verify_jwt = false` no config.toml?
3. ✅ Função redeployada após mudar config.toml?
4. ✅ Logs mostram que função está sendo chamada?
5. ✅ `SUPABASE_ANON_KEY` está correta?
6. ✅ Business tem `mp_access_token` configurado?

---

## 🆘 SE NADA FUNCIONAR

**Envie:**
1. Screenshot dos Secrets (Dashboard → Functions → createPayment → Settings → Secrets)
2. Screenshot dos Logs (Dashboard → Functions → createPayment → Logs)
3. Resultado do teste manual no Dashboard

**Com essas informações, consigo identificar exatamente o problema.**
