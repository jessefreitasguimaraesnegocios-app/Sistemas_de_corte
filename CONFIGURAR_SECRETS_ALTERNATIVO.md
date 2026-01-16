# Configurar Secrets - Método Alternativo (404 na página de Settings)

## ⚠️ Problema: Página de Settings retorna 404

Se a URL `supabase.com/dashboard/project/.../functions/getMpOauthUrl/settings` retorna 404, use os métodos alternativos abaixo.

## ✅ Método 1: Via Supabase CLI (Recomendado)

### 1. Instalar Supabase CLI (se ainda não tiver)
```bash
npm install -g supabase
```

### 2. Fazer login
```bash
npx supabase login
```

### 3. Configurar secrets via CLI
```bash
# Configurar MP_CLIENT_ID
npx supabase secrets set MP_CLIENT_ID="seu-client-id-aqui" --project-ref hgkvhgjtjsycbpeglrrs

# Configurar MP_CLIENT_SECRET (para mp-oauth-callback)
npx supabase secrets set MP_CLIENT_SECRET="seu-client-secret-aqui" --project-ref hgkvhgjtjsycbpeglrrs

# Configurar MP_REDIRECT_URI (opcional)
npx supabase secrets set MP_REDIRECT_URI="https://sua-url.vercel.app/oauth/callback" --project-ref hgkvhgjtjsycbpeglrrs
```

### 4. Verificar secrets configurados
```bash
npx supabase secrets list --project-ref hgkvhgjtjsycbpeglrrs
```

## ✅ Método 2: Via Dashboard - Página Principal de Edge Functions

### 1. Acesse a página principal de Edge Functions
**URL:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions

### 2. Clique em "Secrets" no menu lateral
Ou acesse diretamente:
**URL:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/secrets

### 3. Adicione os secrets globalmente
Os secrets são compartilhados entre todas as Edge Functions do projeto.

**Secrets a adicionar:**
- `MP_CLIENT_ID` - Client ID do Mercado Pago
- `MP_CLIENT_SECRET` - Client Secret do Mercado Pago (para mp-oauth-callback)
- `MP_REDIRECT_URI` - URL de callback (opcional)

## ✅ Método 3: Via API do Supabase

Se os métodos acima não funcionarem, você pode usar a API diretamente:

### 1. Obter Access Token do Supabase
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Crie um novo token
3. Copie o token

### 2. Configurar secret via API
```bash
curl -X POST "https://api.supabase.com/v1/projects/hgkvhgjtjsycbpeglrrs/secrets" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MP_CLIENT_ID",
    "value": "seu-client-id-aqui"
  }'
```

## ✅ Método 4: Verificar se a Função Existe

### 1. Listar todas as funções
**URL:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions

### 2. Verificar se `getMpOauthUrl` aparece na lista
Se não aparecer, a função pode não ter sido deployada corretamente.

### 3. Redeployar a função
```bash
npx supabase functions deploy getMpOauthUrl --project-ref hgkvhgjtjsycbpeglrrs
```

## 🔍 Verificar se os Secrets Estão Configurados

### Via CLI:
```bash
npx supabase secrets list --project-ref hgkvhgjtjsycbpeglrrs
```

### Via Logs da Função:
1. Teste a função (aba "Test" no dashboard)
2. Veja os logs
3. Procure por: `hasMPClientId: true` ou `hasMPClientId: false`

## 📋 Checklist

- [ ] Secrets configurados (via CLI ou Dashboard)
- [ ] `MP_CLIENT_ID` está presente
- [ ] Função `getMpOauthUrl` existe e está deployada
- [ ] Teste manual retorna `{ url: "..." }`
- [ ] Logs mostram `hasMPClientId: true`

## 🔗 Links Úteis

- **Edge Functions:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
- **Secrets (Global):** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/secrets
- **Account Tokens:** https://supabase.com/dashboard/account/tokens
- **Documentação CLI:** https://supabase.com/docs/reference/cli

## 💡 Dica

Se a página de settings específica da função retorna 404, os secrets podem ser configurados **globalmente** para todas as Edge Functions do projeto. Isso é até melhor, pois permite reutilizar os mesmos secrets em múltiplas funções.
