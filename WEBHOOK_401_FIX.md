# 🔧 Correção: Webhook Mercado Pago retornando 401 - Unauthorized

## ❌ Problema

O webhook do Mercado Pago está retornando **401 - Unauthorized** ao testar no painel do Mercado Pago.

**Causa:** A Edge Function do Supabase está exigindo autenticação JWT, mas o Mercado Pago **NÃO envia credenciais de autenticação**.

## ✅ Solução

### 1. Verificar configuração no `config.toml`

O arquivo `supabase/config.toml` já deve ter:

```toml
[functions.mercadopago-webhook]
verify_jwt = false
```

### 2. Fazer deploy com flag `--no-verify-jwt`

**IMPORTANTE:** Sempre use a flag `--no-verify-jwt` ao fazer deploy:

```powershell
npx supabase functions deploy mercadopago-webhook --no-verify-jwt --use-api
```

### 3. Usar o script de deploy atualizado

Execute o script que já inclui todas as funções:

```powershell
.\deploy-functions.ps1
```

O script agora inclui:
- ✅ `mercadopago-webhook` (com `--no-verify-jwt`)
- ✅ `mp-oauth-callback` (com `--no-verify-jwt`)
- ✅ `getMpOauthUrl` (com `--no-verify-jwt`)
- ✅ `createPayment` (com `--no-verify-jwt`)
- ✅ `checkPaymentStatus` (com `--no-verify-jwt`)

### 4. Verificar no Supabase Dashboard

Após o deploy, verifique no Supabase Dashboard:

1. Vá em **Edge Functions** → **mercadopago-webhook**
2. Verifique se a função está configurada como **pública** (sem JWT)
3. A URL deve ser: `https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook`

### 5. Testar no painel do Mercado Pago

1. Acesse o painel do Mercado Pago
2. Vá em **Webhooks** → **Simular notificação**
3. Envie um teste
4. **Resultado esperado:** `200 - OK`

## 🔍 Verificação

### Teste manual via cURL

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id":"123456"},
    "date_created": "2021-11-01T02:02:02Z",
    "id": "123456",
    "live_mode": false,
    "type": "payment",
    "user_id": 2622924811
  }'
```

**Resultado esperado:** `200 OK` (não `401 Unauthorized`)

## ⚠️ Importante

- ❌ **NÃO** adicione validação de JWT no código da função
- ❌ **NÃO** use `supabase.auth.getUser()` no webhook
- ✅ A função **DEVE** ser pública (sem autenticação)
- ✅ A segurança vem da **validação de assinatura** do webhook (x-signature)

## 📝 Notas

- O webhook do Mercado Pago envia apenas os dados do evento
- Não há credenciais de autenticação no header
- A validação de segurança é feita via assinatura HMAC (x-signature)
- Sempre retorne `200 OK` mesmo em caso de erro (para evitar reenvios)

## 🆘 Ainda com problemas?

1. Verifique os logs no Supabase Dashboard
2. Confirme que o deploy foi feito com `--no-verify-jwt`
3. Verifique se o `config.toml` tem `verify_jwt = false`
4. Teste manualmente com cURL
5. Verifique se a URL no painel do Mercado Pago está correta
