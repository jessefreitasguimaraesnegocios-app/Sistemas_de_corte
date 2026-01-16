# Verificação de URLs OAuth - Checklist Completo

## 🔍 Problema: Erro 401 ao conectar Mercado Pago

Este documento lista TODOS os lugares onde URLs devem estar configuradas corretamente.

---

## 1. ✅ Frontend - URLs no Código

### App.tsx (linha ~391)
```typescript
const redirectUri = `${window.location.origin}/oauth/callback`;
```
**Verificar:**
- ✅ Deve gerar: `http://localhost:3001/oauth/callback` (dev)
- ✅ Deve gerar: `https://sua-url.vercel.app/oauth/callback` (produção)

### OAuthCallback.tsx (linha ~39)
```typescript
const redirectUri = `${window.location.origin}/oauth/callback`;
```
**Verificar:**
- ✅ Mesma URL do App.tsx

---

## 2. ✅ Supabase - Secrets das Edge Functions

### getMpOauthUrl
**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/settings

**Secrets obrigatórios:**
- ✅ `MP_CLIENT_ID` - Client ID do Mercado Pago
- ⚠️ `MP_REDIRECT_URI` - **OPCIONAL** (sistema usa URL dinâmica do frontend)

**Secrets automáticos (Supabase injeta):**
- ✅ `SUPABASE_URL` - Injetado automaticamente
- ✅ `SUPABASE_ANON_KEY` - Injetado automaticamente

### mp-oauth-callback
**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/mp-oauth-callback/settings

**Secrets obrigatórios:**
- ✅ `MP_CLIENT_ID` - Client ID do Mercado Pago
- ✅ `MP_CLIENT_SECRET` - Client Secret do Mercado Pago
- ⚠️ `MP_REDIRECT_URI` - **OPCIONAL** (sistema usa URL dinâmica do frontend)

**Secrets automáticos:**
- ✅ `SUPABASE_URL` - Injetado automaticamente
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Injetado automaticamente

---

## 3. ✅ Mercado Pago - Redirect URIs

**Acesse:** https://www.mercadopago.com.br/developers/panel/app

**Passos:**
1. Selecione seu app
2. Vá em **Credenciais**
3. Em **Redirect URIs**, adicione **TODAS** as URLs:

### URLs que DEVEM estar cadastradas:
- ✅ `http://localhost:3001/oauth/callback` (desenvolvimento)
- ✅ `http://localhost:5173/oauth/callback` (se usar Vite default)
- ✅ `https://sua-url.vercel.app/oauth/callback` (produção - substitua pela sua URL real)

**⚠️ IMPORTANTE:**
- URLs devem ser **EXATAMENTE** iguais (case-sensitive)
- Sem barra no final
- Com protocolo correto (http para dev, https para produção)

---

## 4. ✅ Verificar URL do Projeto Supabase

**URL Base do Supabase:**
```
https://hgkvhgjtjsycbpeglrrs.supabase.co
```

**URL da Edge Function:**
```
https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/getMpOauthUrl
```

**Verificar no código:**
- `lib/supabase.ts` - Deve ter `VITE_SUPABASE_URL` configurado
- Deve apontar para: `https://hgkvhgjtjsycbpeglrrs.supabase.co`

---

## 5. ✅ Verificar Rota /oauth/callback

**Arquivo:** `App.tsx` (linha ~5127)
```typescript
if (location.pathname === '/oauth/callback') {
  return <OAuthCallback />;
}
```

**Verificar:**
- ✅ Rota está registrada
- ✅ Componente OAuthCallback existe e está importado
- ✅ React Router está configurado (`index.tsx`)

---

## 6. 🔧 Como Verificar se Está Funcionando

### Teste 1: Verificar Secrets no Supabase
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
2. Clique em `getMpOauthUrl`
3. Vá em **Settings** → **Secrets**
4. Verifique se `MP_CLIENT_ID` está configurado

### Teste 2: Verificar Logs
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl
2. Vá na aba **Logs**
3. Tente conectar ao Mercado Pago
4. Veja os logs para identificar o problema

### Teste 3: Testar URL Manualmente
No console do navegador:
```javascript
console.log('Redirect URI:', `${window.location.origin}/oauth/callback`);
// Deve mostrar: http://localhost:3001/oauth/callback (ou sua URL de produção)
```

### Teste 4: Verificar Token
No console do navegador:
```javascript
const { data: session } = await supabase.auth.getSession();
console.log('Token:', session?.session?.access_token ? 'Presente' : 'Ausente');
```

---

## 7. 🐛 Troubleshooting do Erro 401

### Erro 401 - Possíveis Causas:

#### Causa 1: MP_CLIENT_ID não configurado
**Sintoma:** Logs mostram `hasMPClientId: false`
**Solução:** Configure o secret `MP_CLIENT_ID` no Supabase Dashboard

#### Causa 2: Token expirado ou inválido
**Sintoma:** Logs mostram `❌ Erro ao validar usuário`
**Solução:** Faça logout e login novamente

#### Causa 3: SUPABASE_URL ou SUPABASE_ANON_KEY não disponíveis
**Sintoma:** Logs mostram `❌ Configuração do Supabase incompleta`
**Solução:** Verifique se a função está deployada corretamente

#### Causa 4: Gateway do Supabase bloqueando
**Sintoma:** Erro 401 antes mesmo de chegar na função
**Solução:** Verifique se a função está pública ou requer autenticação

---

## 8. 📋 Checklist Rápido

- [ ] `MP_CLIENT_ID` configurado em `getMpOauthUrl`
- [ ] `MP_CLIENT_ID` configurado em `mp-oauth-callback`
- [ ] `MP_CLIENT_SECRET` configurado em `mp-oauth-callback`
- [ ] Redirect URIs cadastradas no Mercado Pago (localhost e produção)
- [ ] Rota `/oauth/callback` existe no App.tsx
- [ ] Componente OAuthCallback importado e funcionando
- [ ] React Router configurado no index.tsx
- [ ] VITE_SUPABASE_URL configurado no .env.local
- [ ] Usuário está autenticado (token válido)

---

## 9. 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs
- **Edge Functions:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
- **Mercado Pago Apps:** https://www.mercadopago.com.br/developers/panel/app
- **Logs da Função:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/logs

---

## 10. ⚡ Solução Rápida

Se o erro 401 persistir:

1. **Verifique os logs no Supabase Dashboard** - Eles mostrarão exatamente o problema
2. **Confirme que MP_CLIENT_ID está configurado** - Este é o mais comum
3. **Faça logout e login novamente** - Pode ser token expirado
4. **Verifique se a URL do redirect está cadastrada no Mercado Pago**
