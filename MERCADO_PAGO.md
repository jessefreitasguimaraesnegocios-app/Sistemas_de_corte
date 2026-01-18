# 💳 Mercado Pago - Guia Completo

Integração completa com Mercado Pago para pagamentos PIX e Cartão com split automático.

---

## 📋 Visão Geral

O sistema usa **OAuth do Mercado Pago** para cada estabelecimento conectar sua própria conta. Isso permite:
- ✅ Cada business tem seu próprio `mp_access_token`
- ✅ Cada business tem seu próprio `mp_user_id` (sponsor_id)
- ✅ Split de pagamento automático (10% para plataforma)
- ✅ Webhooks para atualização de status

---

## 🔐 OAuth Flow

### 1. Gerar URL de Autorização

**Endpoint:** `getMpOauthUrl`

**Request:**
```json
{
  "business_id": "uuid-do-business",
  "redirect_uri": "https://seu-dominio.com/oauth/callback"
}
```

**Response:**
```json
{
  "auth_url": "https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=..."
}
```

### 2. Usuário Autoriza

- Redireciona para URL retornada
- Usuário faz login no Mercado Pago
- Autoriza a aplicação
- Mercado Pago redireciona para `redirect_uri` com `code`

### 3. Callback Processa

**Endpoint:** `mp-oauth-callback`

- Recebe `code` do query string
- Troca `code` por `access_token` e `refresh_token`
- Obtém `user_id` (sponsor_id) do perfil
- Salva no banco: `business.mp_access_token` e `business.mp_user_id`

---

## 💰 Split de Pagamento

### Como Funciona

1. Cliente paga R$ 100,00
2. Mercado Pago divide automaticamente:
   - R$ 90,00 → Conta do estabelecimento (vendedor)
   - R$ 10,00 → Conta da plataforma (sponsor)

### Configuração

O split é configurado automaticamente via `sponsor.id` no payload:

```typescript
{
  integration_data: {
    sponsor: {
      id: String(business.mp_user_id)  // Obtido via OAuth
    }
  },
  marketplace_fee: "10.00"  // 10% de comissão
}
```

**⚠️ IMPORTANTE:**
- `sponsor.id` deve ser o `mp_user_id` do business (obtido via OAuth)
- **NÃO** use um secret global - isso quebraria o marketplace
- Cada business precisa ter seu próprio OAuth completado

---

## 📤 Criar Pagamento

### PIX

**Request:**
```json
{
  "valor": 10.50,
  "metodo_pagamento": "pix",
  "email_cliente": "cliente@email.com",
  "business_id": "uuid-do-business"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": 123456789,
  "status": "pending",
  "qr_code": "00020126...",
  "qr_code_base64": "data:image/png;base64,...",
  "txid": "E12345678920240101120000"
}
```

### Cartão de Crédito

**Request:**
```json
{
  "valor": 10.50,
  "metodo_pagamento": "credit_card",
  "email_cliente": "cliente@email.com",
  "business_id": "uuid-do-business",
  "token_cartao": "token-gerado-pelo-sdk"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": 123456789,
  "status": "approved",
  "status_detail": "accredited"
}
```

---

## 🔔 Webhooks

### Configurar no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em **Webhooks**
3. Adicione URL: `https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook`
4. Selecione eventos: `payment`, `merchant_order`

### Eventos Recebidos

**Payment:**
```json
{
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

**Merchant Order:**
```json
{
  "type": "merchant_order",
  "data": {
    "id": "123456789"
  }
}
```

### Processamento

A função `mercadopago-webhook`:
1. Valida assinatura (se `MP_WEBHOOK_SECRET` configurado)
2. Busca payment/order no Mercado Pago
3. Atualiza status no banco (`transactions.status`)
4. Envia notificação (se configurado)

---

## 🧪 Testes

### Credenciais de Teste

**Access Token de Teste:**
- Começa com `TEST-...`
- Disponível no painel do Mercado Pago → Credenciais de teste

**Cartões de Teste:**

| Cartão | Resultado | CVV | Validade |
|--------|-----------|-----|----------|
| `5031 4332 1540 6351` | Aprovado | 123 | 11/25 |
| `5031 7557 3453 0604` | Recusado | 123 | 11/25 |

### Testar PIX

1. Crie pagamento PIX com valor de teste (ex: R$ 0,10)
2. Use QR Code gerado no app do Mercado Pago
3. Escaneie e pague
4. Verifique webhook atualizando status

---

## ⚠️ Problemas Comuns

### Business sem `mp_access_token`

**Sintoma:** Erro "Estabelecimento não possui Access Token"

**Solução:** Conecte o estabelecimento via OAuth (Configurações → Integração Mercado Pago)

### Business sem `mp_user_id`

**Sintoma:** Erro "Estabelecimento não possui User ID"

**Solução:** OAuth não foi completado, refaça a conexão

### Token Expirado

**Sintoma:** Erro 401 do Mercado Pago

**Solução:** Refaça o OAuth para obter novo `access_token` e `refresh_token`

---

## 📚 Referências

- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [Orders API](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/orders/introduction)
- [OAuth](https://www.mercadopago.com.br/developers/pt/docs/security/oauth)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

---

**Mais ajuda:** Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
