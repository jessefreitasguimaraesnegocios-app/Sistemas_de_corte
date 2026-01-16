# Configurar Secrets do Mercado Pago no Supabase

## Problema
Se você está recebendo erro `401 (Unauthorized)` ao tentar conectar ao Mercado Pago, provavelmente os **secrets não estão configurados** no Supabase.

## Solução

### 1. Acesse o Dashboard do Supabase
- URL: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs
- Ou acesse: https://supabase.com/dashboard → Selecione seu projeto

### 2. Configure os Secrets para `getMpOauthUrl`
1. Vá em **Edge Functions** no menu lateral
2. Clique em **getMpOauthUrl**
3. Vá na aba **Settings** (ou **Configurações**)
4. Role até a seção **Secrets**
5. Adicione os seguintes secrets:

#### Secret 1: `MP_CLIENT_ID`
- **Nome:** `MP_CLIENT_ID`
- **Valor:** Seu Client ID do app Mercado Pago
- **Onde encontrar:** 
  - Acesse https://www.mercadopago.com.br/developers/panel/app
  - Selecione seu app
  - Copie o **Client ID** (Production ou Test, dependendo do ambiente)

#### Secret 2: `MP_REDIRECT_URI` (Opcional)
- **Nome:** `MP_REDIRECT_URI`
- **Valor:** URL completa do callback OAuth (usado como fallback)
- **Exemplo para produção:** `https://sua-url.vercel.app/oauth/callback`
- **Exemplo para desenvolvimento:** `http://localhost:3001/oauth/callback`
- **Nota:** Este secret é **opcional** - o sistema usa automaticamente a URL do frontend (`window.location.origin/oauth/callback`)
- **Importante:** A URL usada deve estar cadastrada nas **Redirect URIs** do seu app no Mercado Pago

### 3. Configure os Secrets para `mp-oauth-callback`
1. Vá em **Edge Functions** → **mp-oauth-callback**
2. Vá na aba **Settings**
3. Adicione os seguintes secrets:

#### Secret 1: `MP_CLIENT_ID`
- Mesmo valor usado em `getMpOauthUrl`

#### Secret 2: `MP_CLIENT_SECRET`
- **Nome:** `MP_CLIENT_SECRET`
- **Valor:** Seu Client Secret do app Mercado Pago
- **Onde encontrar:**
  - Acesse https://www.mercadopago.com.br/developers/panel/app
  - Selecione seu app
  - Copie o **Client Secret** (Production ou Test)

#### Secret 3: `MP_REDIRECT_URI`
- Mesmo valor usado em `getMpOauthUrl`

### 4. Verificar no Mercado Pago
Certifique-se de que as URLs de callback estão cadastradas no painel do Mercado Pago:
1. Acesse https://www.mercadopago.com.br/developers/panel/app
2. Selecione seu app
3. Vá em **Credenciais**
4. Em **Redirect URIs**, adicione **TODAS** as URLs que você vai usar:
   - **Produção:** `https://sua-url.vercel.app/oauth/callback` (substitua `sua-url` pela sua URL real do Vercel)
   - **Desenvolvimento:** `http://localhost:3001/oauth/callback` (ou a porta que você usa localmente)
   - **Importante:** O sistema detecta automaticamente a URL atual, então adicione todas as variações possíveis

**Como descobrir sua URL do Vercel:**
- Acesse https://vercel.com/dashboard
- Selecione seu projeto
- A URL estará no formato: `https://nome-do-projeto.vercel.app`
- Adicione `/oauth/callback` no final

### 5. Testar
Após configurar os secrets:
1. Recarregue a página do aplicativo
2. Tente conectar ao Mercado Pago novamente
3. Verifique os logs no Supabase Dashboard → Edge Functions → Logs

## Troubleshooting

### Erro 401 persiste
- Verifique se os secrets foram salvos corretamente
- Verifique se os nomes dos secrets estão exatamente como mostrado (case-sensitive)
- Verifique se você está usando o Client ID/Secret do ambiente correto (Test vs Production)

### Erro 500
- Verifique os logs da Edge Function no Supabase Dashboard
- Verifique se `MP_CLIENT_ID` e `MP_REDIRECT_URI` estão configurados

### URL de callback não funciona
- Certifique-se de que a URL está cadastrada no Mercado Pago
- Certifique-se de que a URL está correta (sem barra no final, com protocolo https/http)

## Notas Importantes
- ⚠️ **Nunca** compartilhe seus Client Secret publicamente
- 🔒 Os secrets são armazenados de forma segura no Supabase
- 🔄 Se mudar de ambiente (Test → Production), atualize os secrets
- 📝 Mantenha um registro dos secrets em um gerenciador de senhas seguro
