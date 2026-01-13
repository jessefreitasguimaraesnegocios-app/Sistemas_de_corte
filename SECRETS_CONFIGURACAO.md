# 🔐 Configuração de Secrets no Supabase

## Secrets Obrigatórios para Edge Functions

Configure estes secrets em: **Supabase Dashboard → Edge Functions → Settings → Secrets**

### 1. `MP_SPONSOR_ID_LOJA` ⭐ OBRIGATÓRIO
- **Descrição**: User ID da conta da plataforma que recebe a comissão (10%)
- **Valor**: `2622924811`
- **Como obter**: 
  - Acesse o painel do Mercado Pago da conta da plataforma
  - Vá em "Meu perfil" → "Dados da conta"
  - Copie o "User ID"

### 2. `MP_WEBHOOK_URL` (Opcional)
- **Descrição**: URL do webhook para notificações de pagamento
- **Valor**: `https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/webhook-payment`
- **Uso**: Notificações automáticas quando o status do pagamento mudar

## ❌ NÃO Configure Mais

### `MP_ACCESS_TOKEN_VENDEDOR` (Removido)
- **Antes**: Era um secret fixo
- **Agora**: Cada negócio (salão/bar) tem seu próprio token armazenado no banco de dados
- **Onde configurar**: Na tabela `businesses`, campo `mp_access_token`

## Como Configurar Token por Negócio

Quando você adicionar um novo salão/bar:

1. **Obter o Access Token do Mercado Pago do negócio:**
   - O dono do salão/bar precisa criar uma conta no Mercado Pago
   - Acessar: https://www.mercadopago.com.br/developers/panel
   - Copiar o Access Token (produção ou teste)

2. **Salvar no banco de dados:**
   ```sql
   UPDATE businesses 
   SET mp_access_token = 'APP_USR-...' 
   WHERE id = 'id-do-negocio';
   ```

   Ou via código:
   ```typescript
   const { data, error } = await supabase
     .from('businesses')
     .update({ mp_access_token: 'APP_USR-...' })
     .eq('id', 'id-do-negocio');
   ```

## Configurar via Dashboard

1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions
2. Clique em **Settings** ou **Secrets**
3. Adicione:
   - **Nome**: `MP_SPONSOR_ID_LOJA`
   - **Valor**: `2622924811`
   - Clique em **Add secret**
4. (Opcional) Adicione:
   - **Nome**: `MP_WEBHOOK_URL`
   - **Valor**: `https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/webhook-payment`
   - Clique em **Add secret**

## Configurar via CLI

```bash
# Configurar Sponsor ID (obrigatório)
npx supabase secrets set MP_SPONSOR_ID_LOJA="2622924811"

# Configurar Webhook URL (opcional)
npx supabase secrets set MP_WEBHOOK_URL="https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/webhook-payment"
```

## Verificação

Após configurar, a Edge Function `createPayment`:
- ✅ Buscará o token do negócio no banco de dados
- ✅ Usará o `MP_SPONSOR_ID_LOJA` para split de pagamento
- ✅ Processará pagamentos com a comissão configurada no negócio

## Fluxo de Pagamento

1. Cliente faz pagamento → Frontend chama Edge Function com `business_id`
2. Edge Function busca `mp_access_token` do negócio na tabela `businesses`
3. Edge Function processa pagamento no Mercado Pago usando:
   - Token do negócio (vendedor)
   - Sponsor ID da plataforma (recebe comissão)
4. Split automático: 90% para o negócio, 10% para a plataforma

## Importante

- ⚠️ **NÃO** compartilhe os tokens publicamente
- ⚠️ Cada negócio deve ter seu próprio Access Token
- ⚠️ Use credenciais de teste durante desenvolvimento
- ⚠️ Para produção, use credenciais de produção do Mercado Pago
