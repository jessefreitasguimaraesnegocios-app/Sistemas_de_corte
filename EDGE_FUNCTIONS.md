# ⚡ Edge Functions - Documentação

Regras de ouro e documentação das Edge Functions do Supabase.

---

## 🔥 Regra de Ouro #1: 401 Sem Log = verify_jwt Mal Configurado

**90% dos devs do Supabase caem nisso.**

### Sintoma
- Edge Function retorna `401 Unauthorized`
- **SEM logs no Dashboard** (função nem é executada)
- Erro acontece antes do código rodar

### Solução

**Para função PÚBLICA (checkout, webhook):**
```toml
# supabase/config.toml
[functions.createPayment]
verify_jwt = false
```

**Para função PRIVADA (requer usuário logado):**
```toml
[functions.minhaFuncao]
verify_jwt = true
```

**Após mudança:**
```bash
npx supabase functions deploy nomeFuncao
```

---

## 🔥 Regra de Ouro #2: Checkout NUNCA Valida Usuário

### ❌ ERRADO
```typescript
// ❌ NUNCA fazer isso em checkout/pagamento
const authHeader = req.headers.get("authorization");
if (!authHeader) return 401;
const { user } = await supabase.auth.getUser();
if (!user) return 401;
```

### ✅ CORRETO
```typescript
// ✅ Checkout é público - cliente pode ser anônimo
serve(async (req) => {
  // Valida apenas parâmetros (valor, email, business_id)
  // Busca business no banco
  // Cria pagamento no Mercado Pago
  // Retorna QR Code ou status
})
```

**Segurança real:**
- ✅ OAuth Mercado Pago (access_token do vendedor)
- ✅ Webhook assinado (MP_WEBHOOK_SECRET)
- ✅ Validação de valores no backend
- ✅ Idempotency key

---

## 🔥 Regra de Ouro #3: Service Role Key para Banco

### ❌ ERRADO
```typescript
// ❌ Usar ANON_KEY em Edge Function
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### ✅ CORRETO
```typescript
// ✅ Usar SERVICE_ROLE_KEY em Edge Function
const supabaseAdmin = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY
);
```

**Por quê?** Edge Functions rodam no servidor e precisam de permissões administrativas.

---

## 📋 Funções Disponíveis

### 1. `createPayment`
**Descrição:** Cria pagamentos PIX e Cartão via Mercado Pago.

**Config:**
```toml
[functions.createPayment]
verify_jwt = false  # Checkout público
```

**Secrets:**
- `SUPABASE_URL` (obrigatório)
- `SUPABASE_SERVICE_ROLE_KEY` (obrigatório)
- `MP_WEBHOOK_URL` (opcional)

**Body:**
```json
{
  "valor": 10.50,
  "metodo_pagamento": "pix",
  "email_cliente": "cliente@email.com",
  "business_id": "uuid-do-business",
  "token_cartao": "token-do-cartao" // apenas para cartão
}
```

**Resposta:**
```json
{
  "success": true,
  "payment_id": 123456789,
  "status": "pending",
  "qr_code": "00020126...",
  "qr_code_base64": "data:image/png;base64,..."
}
```

---

### 2. `getMpOauthUrl`
**Descrição:** Gera URL de autorização OAuth do Mercado Pago.

**Config:**
```toml
[functions.getMpOauthUrl]
verify_jwt = false
```

**Secrets:**
- `MP_CLIENT_ID` (obrigatório)

**Body:**
```json
{
  "business_id": "uuid-do-business",
  "redirect_uri": "https://seu-dominio.com/oauth/callback"
}
```

---

### 3. `mp-oauth-callback`
**Descrição:** Processa callback do OAuth e salva tokens no banco.

**Config:**
```toml
[functions.mp-oauth-callback]
verify_jwt = false
```

**Secrets:**
- `MP_CLIENT_ID` (obrigatório)
- `MP_CLIENT_SECRET` (obrigatório)
- `SUPABASE_URL` (obrigatório)
- `SUPABASE_SERVICE_ROLE_KEY` (obrigatório)

---

### 4. `mercadopago-webhook`
**Descrição:** Recebe notificações do Mercado Pago e atualiza status.

**Config:**
```toml
[functions.mercadopago-webhook]
verify_jwt = false
```

**Secrets:**
- `SUPABASE_URL` (obrigatório)
- `SUPABASE_SERVICE_ROLE_KEY` (obrigatório)
- `MP_WEBHOOK_SECRET` (opcional, para validação)

---

## ✅ Checklist de Edge Function

### Configuração
- [ ] `verify_jwt` configurado corretamente no `config.toml`
- [ ] Deploy executado após mudanças
- [ ] Secrets configurados no Dashboard

### Código
- [ ] CORS headers incluídos
- [ ] Service Role Key usado (não ANON_KEY)
- [ ] Logs adequados para debug
- [ ] Tratamento de erros completo
- [ ] Validação de parâmetros

### Segurança
- [ ] Função pública não valida JWT manualmente
- [ ] Função privada usa `verify_jwt = true`
- [ ] Secrets nunca expostos no código
- [ ] Validação de inputs do cliente

---

## 🚨 Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 sem logs | `verify_jwt` mal configurado | Verificar `config.toml` e redeploy |
| 500 Internal Server Error | Secret faltando | Adicionar secret no Dashboard |
| CORS bloqueado | Headers CORS não configurados | Adicionar `corsHeaders` |
| RLS bloqueando query | Usando ANON_KEY | Trocar para SERVICE_ROLE_KEY |

---

**Mais ajuda:** Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
