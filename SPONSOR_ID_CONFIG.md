# 🔧 Configuração do MP_SPONSOR_ID (User ID da Plataforma)

## ❌ Erro Atual

```
order_invalid_sponsor_id
Order sponsor id is invalid.
```

## 🎯 O Que É MP_SPONSOR_ID?

O `MP_SPONSOR_ID` é o **User ID da sua conta do Mercado Pago** (a conta da plataforma/marketplace), **NÃO** do vendedor.

### Como Funciona o Split:

1. **Vendedor (Business):**
   - Usa `access_token` do vendedor (`business.mp_access_token`)
   - Recebe: `valor - marketplace_fee`
   - User ID: `business.mp_user_id` (obtido via OAuth)

2. **Plataforma (Sponsor):**
   - User ID: `MP_SPONSOR_ID` (sua conta do Mercado Pago)
   - Recebe: `marketplace_fee` (comissão)

## 🔍 Como Encontrar Seu User ID (MP_SPONSOR_ID)

### Opção 1: Via API do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em **Suas integrações** → **Credenciais**
3. Use seu **Access Token de Produção** (começa com `APP_USR-`)
4. Faça uma chamada:

```bash
curl -X GET "https://api.mercadopago.com/users/me" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN_PRODUCAO"
```

Resposta:
```json
{
  "id": 2622924811,  // ← Este é o MP_SPONSOR_ID
  "nickname": "seu_nickname",
  ...
}
```

### Opção 2: Via Painel do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/home
2. Vá em **Configurações** → **Dados da conta**
3. O **User ID** geralmente aparece na URL ou nos dados da conta

### Opção 3: Via OAuth (se você já fez OAuth da sua conta)

Se você já conectou sua própria conta via OAuth, o `mp_user_id` salvo no banco é o seu User ID.

## ✅ Como Configurar no Supabase

1. **Acesse o Supabase Dashboard:**
   - https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs

2. **Vá em Edge Functions:**
   - Edge Functions → createPayment → Settings → Secrets

3. **Adicione o Secret:**
   - **Nome:** `MP_SPONSOR_ID`
   - **Valor:** Seu User ID (ex: `2622924811`)
   - **Importante:** Apenas o número, sem aspas, sem espaços

4. **Salve e faça deploy:**
   ```powershell
   npx supabase functions deploy createPayment --no-verify-jwt
   ```

## 🔍 Verificar se Está Configurado

Após o deploy, verifique os logs do Supabase:

1. Vá em: Edge Functions → createPayment → Logs
2. Procure por: `✅ MP_SPONSOR_ID configurado:`
3. Deve mostrar: `✅ MP_SPONSOR_ID configurado: 2622924811` (ou seu User ID)

## ⚠️ Problemas Comuns

### 1. Secret não configurado
**Erro:** `MP_SPONSOR_ID não configurado ou vazio nos secrets`
**Solução:** Configure o secret no Supabase Dashboard

### 2. User ID incorreto
**Erro:** `order_invalid_sponsor_id`
**Solução:** Verifique se o User ID está correto (deve ser da conta da plataforma, não do vendedor)

### 3. User ID com espaços
**Solução:** Use `.trim()` no código (já implementado)

### 4. User ID não vinculado à aplicação
**Solução:** Certifique-se de que a conta do Mercado Pago está vinculada à sua aplicação no painel do desenvolvedor

## 📝 Exemplo de Configuração Correta

```toml
# Supabase Dashboard → Edge Functions → createPayment → Secrets

MP_SPONSOR_ID = 2622924811  # User ID da sua conta do Mercado Pago
MP_CLIENT_ID = 285197773163...
MP_CLIENT_SECRET = ...
MP_WEBHOOK_URL = https://...
```

## 🧪 Teste

Após configurar, faça um teste de pagamento e verifique os logs:

```
✅ MP_SPONSOR_ID configurado: 2622924811
💰 Split configurado: {
  sponsorId: "2622924811",
  ...
}
```

Se ainda der erro `order_invalid_sponsor_id`, verifique:
1. Se o User ID está correto
2. Se a conta está vinculada à aplicação no Mercado Pago
3. Se está usando o mesmo ambiente (produção/teste)
