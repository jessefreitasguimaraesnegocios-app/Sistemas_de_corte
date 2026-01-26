# 🔍 Diagnóstico Completo: Split Payment e Webhook Não Funcionando

## ❌ Problemas Reportados

1. **Split não aconteceu** - Dinheiro todo foi para o salão/bar
2. **Webhook não informou pagamento** - QR code ainda na tela
3. **Polling não detecta pagamento** - App mostra "pendente"

## 🔍 Checklist de Diagnóstico

### 1. OAuth Foi Completado?

**Verificar no banco de dados:**
```sql
SELECT id, name, mp_access_token, mp_user_id, mp_live_mode
FROM businesses
WHERE id = 'SEU_BUSINESS_ID';
```

**Deve ter:**
- ✅ `mp_access_token` não NULL
- ✅ `mp_user_id` não NULL
- ✅ `mp_live_mode` = true (produção)

**Se não tiver:**
- ❌ OAuth não foi completado
- ❌ Split não funciona sem OAuth
- **Solução:** Conectar novamente ao Mercado Pago

### 2. Webhook Está Configurado?

**No Painel do Mercado Pago:**
- Vá em **Webhooks**
- Verifique se a URL está: `https://ujglqhgpvcrudieosyxz.supabase.co/functions/v1/mercadopago-webhook`
- Verifique se o evento **"Order (Mercado Pago)"** está habilitado

**No Supabase:**
- Vá em **Edge Functions → mercadopago-webhook → Logs**
- Procure por: `🔥🔥🔥 mercadopago-webhook EXECUTADA`
- Se não aparecer, o webhook não está sendo chamado

### 3. Split Está Configurado Corretamente?

**Verificar no createPayment:**
- `sponsor.id` = `MP_SPONSOR_ID` (User ID da plataforma)
- `marketplace_fee` = calculado corretamente
- `access_token` = do vendedor (business.mp_access_token)

**Verificar nos logs do Supabase:**
```
💰 Split configurado: {
  valorTotal: 100,
  comissaoPercentual: 10,
  marketplaceFee: 10,
  sponsorId: "2622924811",
  businessMpUserId: "200800906",
  tokenType: "PRODUÇÃO (vendedor OAuth)"
}
```

### 4. Polling Está Funcionando?

**Verificar no console do navegador:**
- Procure por: `📊 Resultado da verificação:`
- Se aparecer `approved: false`, o polling não está detectando

**Verificar checkPaymentStatus:**
- Deve consultar API do Mercado Pago diretamente
- Deve buscar pelo `order_id` se for Orders API

## 🛠️ Correções Necessárias

### Problema 1: Webhook Não Está Sendo Chamado

**Causa:** Webhook pode não estar deployado sem JWT ou URL errada

**Solução:**
```powershell
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
```

**Verificar:**
- URL no painel MP: `https://ujglqhgpvcrudieosyxz.supabase.co/functions/v1/mercadopago-webhook`
- Evento "Order (Mercado Pago)" habilitado

### Problema 2: Split Não Funciona

**Causa Possível 1:** OAuth não foi completado
- Verificar se `mp_access_token` e `mp_user_id` existem no banco

**Causa Possível 2:** `sponsor.id` está errado
- Atualmente usa `MP_SPONSOR_ID` (plataforma)
- Pode precisar ser `business.mp_user_id` (vendedor)

**Causa Possível 3:** Token não é do vendedor
- Token deve começar com `APP_USR-` (produção vendedor)
- Não pode ser token da plataforma

### Problema 3: Polling Não Detecta

**Causa:** `checkPaymentStatus` não está consultando Orders API corretamente

**Verificar:**
- Se `payment_id` começa com "PAY", deve buscar pelo `order_id`
- Deve extrair `order_id` do `external_reference`

## 📝 Ações Imediatas

1. **Verificar OAuth:**
   ```sql
   SELECT id, name, mp_access_token IS NOT NULL as has_token, 
          mp_user_id IS NOT NULL as has_user_id
   FROM businesses;
   ```

2. **Verificar Webhook nos Logs:**
   - Supabase Dashboard → Edge Functions → mercadopago-webhook → Logs
   - Procure por logs de hoje

3. **Verificar Última Transação:**
   ```sql
   SELECT id, business_id, amount, admin_fee, partner_net, 
          status, payment_id, external_reference, created_at
   FROM transactions
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Testar Webhook Manualmente:**
   ```bash
   curl -X POST https://ujglqhgpvcrudieosyxz.supabase.co/functions/v1/mercadopago-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "type": "payment",
       "data": {"id": "123456"}
     }'
   ```

## 🎯 Próximos Passos

1. Verificar se OAuth foi completado
2. Verificar se webhook está sendo chamado
3. Verificar logs do createPayment para ver se split foi enviado
4. Verificar se checkPaymentStatus está funcionando
5. Corrigir problemas encontrados
