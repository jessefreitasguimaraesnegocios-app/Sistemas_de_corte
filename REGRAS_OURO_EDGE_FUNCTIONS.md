# 🔥 REGRAS DE OURO - Supabase Edge Functions

## ⚠️ REGRA DE OURO #1: 401 Sem Log = verify_jwt Mal Configurado

**90% dos devs do Supabase caem nisso.**

### Sintoma
- Edge Function retorna `401 Unauthorized`
- **SEM logs no console** (função nem é executada)
- Erro acontece antes do código rodar

### Causa
`verify_jwt` está configurado incorretamente no `supabase/config.toml`

### Solução

#### 1️⃣ Para função PÚBLICA (checkout, webhook, etc):
```toml
[functions.createPayment]
verify_jwt = false
```

#### 2️⃣ Para função PRIVADA (requer usuário logado):
```toml
[functions.minhaFuncao]
verify_jwt = true
```

### ✅ Checklist de Verificação

- [ ] `supabase/config.toml` tem `[functions.nomeFuncao]`
- [ ] `verify_jwt = false` para funções públicas
- [ ] `verify_jwt = true` para funções privadas
- [ ] Deploy executado após mudança: `supabase functions deploy nomeFuncao`
- [ ] **NÃO** validar JWT manualmente no código se `verify_jwt = false`

---

## 🔥 REGRA DE OURO #2: Checkout NUNCA Valida Usuário

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

### 🔐 Segurança Real
- ✅ OAuth Mercado Pago (access_token do vendedor)
- ✅ Webhook assinado (MP_WEBHOOK_SECRET)
- ✅ Validação de valores no backend
- ✅ Idempotency key

---

## 🔥 REGRA DE OURO #3: Service Role Key para Banco

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

### Por quê?
- Edge Functions rodam no servidor
- Precisam de permissões administrativas
- SERVICE_ROLE_KEY bypassa RLS (Row Level Security)

---

## 🔥 REGRA DE OURO #4: CORS Headers Obrigatórios

### ✅ SEMPRE incluir
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Handle preflight
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}
```

---

## 🔥 REGRA DE OURO #5: Logs São Essenciais

### ✅ SEMPRE logar
```typescript
console.log("🔥 Função chamada");
console.log("📦 Body recebido:", body);
console.log("✅ Sucesso:", result);
console.error("❌ Erro:", error);
```

### Por quê?
- Edge Functions não têm debugger
- Logs são a única forma de debugar
- Ver logs: Dashboard Supabase → Edge Functions → Logs

---

## 📋 Checklist Completo de Edge Function

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

## 🚨 Erros Comuns e Soluções

### Erro: 401 Unauthorized (sem logs)
**Causa**: `verify_jwt` mal configurado  
**Solução**: Verificar `supabase/config.toml` e fazer deploy

### Erro: 500 Internal Server Error
**Causa**: Erro no código ou secret faltando  
**Solução**: Verificar logs no Dashboard Supabase

### Erro: CORS bloqueado
**Causa**: Headers CORS não configurados  
**Solução**: Adicionar `corsHeaders` e tratar OPTIONS

### Erro: RLS bloqueando query
**Causa**: Usando ANON_KEY em vez de SERVICE_ROLE_KEY  
**Solução**: Trocar para SERVICE_ROLE_KEY

---

## 📚 Referências

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [JWT Verification](https://supabase.com/docs/guides/functions/auth)
- [CORS Configuration](https://supabase.com/docs/guides/functions/cors)

---

**Última atualização**: 2025-01-27  
**Contexto**: Correção de erro 401 em `createPayment` - checkout público
