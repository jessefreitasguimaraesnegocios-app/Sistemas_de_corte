# 🔧 Correção Crítica: Inconsistência no redirect_uri do OAuth

## ❌ Problema Identificado

Há uma **inconsistência crítica** no fluxo OAuth que pode impedir o split de funcionar:

### Situação Atual (ANTES da correção):

1. **`getMpOauthUrl`** (gera URL de autorização):
   - ❌ Aceitava `redirect_uri` do body (dinâmico do frontend)
   - ❌ Usava: `redirect_uri || MP_REDIRECT_URI`

2. **`mp-oauth-callback`** (troca code por token):
   - ✅ Usava **APENAS** `MP_REDIRECT_URI` do secret (fixo)
   - ✅ **NÃO** aceitava do body (por segurança)

3. **Frontend** (`App.tsx`):
   - ❌ Enviava `redirect_uri` dinâmico: `${window.location.origin}/oauth/callback`

### Por que isso é um problema?

**Regra de Ouro do Mercado Pago:**
> O `redirect_uri` usado na **autorização** DEVE ser **EXATAMENTE** o mesmo usado na **troca do token**.

**Cenário de falha:**
- Frontend em `http://localhost:3000` → enviava `http://localhost:3000/oauth/callback`
- `getMpOauthUrl` usava esse valor na URL de autorização
- Mercado Pago redirecionava para `http://localhost:3000/oauth/callback` com `code`
- `mp-oauth-callback` usava `MP_REDIRECT_URI` = `https://sistemas-de-corte.vercel.app/oauth/callback`
- **ERRO:** Mercado Pago rejeitava porque os `redirect_uri` não batiam!

## ✅ Solução Implementada

### 1. Corrigido `getMpOauthUrl`

**ANTES:**
```typescript
const { business_id, redirect_uri } = await req.json();
const finalRedirectUri = redirect_uri || MP_REDIRECT_URI;
```

**DEPOIS:**
```typescript
const { business_id } = await req.json();
// ✅ SEMPRE usar do secret (consistência e segurança)
const finalRedirectUri = MP_REDIRECT_URI;
```

### 2. Corrigido Frontend (`App.tsx`)

**ANTES:**
```typescript
const redirectUri = `${window.location.origin}/oauth/callback`;
body: JSON.stringify({
  business_id: business.id,
  redirect_uri: redirectUri, // ❌ Removido
}),
```

**DEPOIS:**
```typescript
body: JSON.stringify({
  business_id: business.id,
  // ✅ Não enviar redirect_uri - será usado do secret
}),
```

### 3. Configuração Necessária

**No Supabase Dashboard → Edge Functions → Settings → Secrets:**
```
MP_REDIRECT_URI = https://sistemas-de-corte.vercel.app/oauth/callback
```

**No Painel do Mercado Pago → URLs de redirecionamento:**
```
https://sistemas-de-corte.vercel.app/oauth/callback
```

## 🔍 Verificação

### 1. Verificar Secrets no Supabase

Vá em: **Supabase Dashboard → Edge Functions → Settings → Secrets**

Deve ter:
- ✅ `MP_CLIENT_ID`
- ✅ `MP_CLIENT_SECRET`
- ✅ `MP_REDIRECT_URI` = `https://sistemas-de-corte.vercel.app/oauth/callback`

### 2. Verificar no Painel do Mercado Pago

Vá em: **Suas integrações → Sistemas_Split → URLs de redirecionamento**

Deve ter:
- ✅ `https://sistemas-de-corte.vercel.app/oauth/callback`

### 3. Testar o Fluxo

1. Clique em "Conectar ao Mercado Pago"
2. Verifique no console do navegador:
   - `✅ Usando redirect_uri do secret: https://sistemas-de-corte.vercel.app/oauth/callback`
3. Após autorizar, verifique nos logs do Supabase:
   - `🔄 Trocando code por token com redirect_uri: https://sistemas-de-corte.vercel.app/oauth/callback`
4. Ambos devem ser **idênticos**

## ⚠️ Importante

- **NUNCA** use `redirect_uri` do body no callback (risco de segurança)
- **SEMPRE** use o mesmo `redirect_uri` na autorização e no callback
- **SEMPRE** configure o `MP_REDIRECT_URI` no secret do Supabase
- **SEMPRE** cadastre a mesma URL no painel do Mercado Pago

## 🎯 Por que isso afeta o Split?

Se o OAuth falhar por causa do `redirect_uri`:
- ❌ Tokens não são salvos
- ❌ `mp_access_token` fica `null`
- ❌ `mp_user_id` fica `null`
- ❌ Split não funciona (precisa do `mp_user_id` como `sponsor.id`)

## 📝 Checklist

- [x] `getMpOauthUrl` usa apenas `MP_REDIRECT_URI` do secret
- [x] `mp-oauth-callback` usa apenas `MP_REDIRECT_URI` do secret
- [x] Frontend não envia `redirect_uri` no body
- [ ] Secret `MP_REDIRECT_URI` configurado no Supabase
- [ ] URL cadastrada no painel do Mercado Pago
- [ ] Ambos os `redirect_uri` são idênticos

## 🆘 Ainda com problemas?

1. Verifique os logs do Supabase (Edge Functions)
2. Compare os `redirect_uri` usados (devem ser idênticos)
3. Verifique se a URL está cadastrada no Mercado Pago
4. Teste com um novo OAuth (desconecte e conecte novamente)
