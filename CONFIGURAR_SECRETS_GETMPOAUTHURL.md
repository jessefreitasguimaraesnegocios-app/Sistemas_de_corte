# Configurar Secrets para getMpOauthUrl

## ⚠️ IMPORTANTE: Edge Functions NÃO acessam variáveis VITE_*

Edge Functions do Supabase rodam no servidor Deno e **NÃO** têm acesso a:
- Variáveis `.env` do frontend
- Variáveis `VITE_*` 
- `import.meta.env`

## ✅ Solução: Usar Supabase Secrets

### 1. Acessar Dashboard do Supabase

URL: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl

### 2. Configurar Secrets

Vá em **Settings** → **Secrets** e adicione:

#### Secret Obrigatório:
- **Nome:** `MP_CLIENT_ID`
- **Valor:** Seu Client ID do Mercado Pago
- **Onde encontrar:** https://www.mercadopago.com.br/developers/panel/app → Selecione seu app → Copie o Client ID

#### Secret Opcional (fallback):
- **Nome:** `MP_REDIRECT_URI`
- **Valor:** URL de callback (ex: `https://sua-url.vercel.app/oauth/callback`)
- **Nota:** Este secret é opcional - o sistema usa automaticamente a URL do frontend

### 3. Verificar se os Secrets estão configurados

Após adicionar os secrets, verifique nos logs da função:
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/logs
2. Tente conectar ao Mercado Pago
3. Procure por: `hasMPClientId: true` nos logs

### 4. Redeployar a Função (se necessário)

```bash
npx supabase functions deploy getMpOauthUrl
```

## 🔍 Verificação

A Edge Function usa:
```typescript
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID") || "";
```

**NÃO usa:**
- ❌ `import.meta.env.VITE_MP_CLIENT_ID`
- ❌ `process.env.VITE_MP_CLIENT_ID`
- ❌ Variáveis do `.env` do frontend

## ✅ Checklist

- [ ] Secret `MP_CLIENT_ID` configurado no Supabase Dashboard
- [ ] Valor do secret é o Client ID correto do Mercado Pago
- [ ] Função foi redeployada após configurar secrets
- [ ] Logs mostram `hasMPClientId: true`
- [ ] Frontend recebe `{ url: "https://auth.mercadopago.com/..." }`

## 🐛 Troubleshooting

### Erro: "MP_CLIENT_ID não configurado"
- Verifique se o secret foi salvo corretamente
- Verifique se o nome está exatamente como `MP_CLIENT_ID` (case-sensitive)
- Redeploy a função após adicionar o secret

### Erro 401: "Authorization header ausente"
- A função agora aceita chamadas sem autenticação
- Se ainda der erro, verifique se o Supabase client está enviando o token automaticamente

### Erro: "redirect_uri não fornecido"
- O frontend passa `redirect_uri` automaticamente
- Se der erro, verifique se o frontend está enviando `redirect_uri` no body
