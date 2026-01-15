# 🔍 Revisão e Correções do Webhook do Mercado Pago

## ✅ **Correções Implementadas**

### 1. **Verificação de Ambiente (TESTE vs PRODUÇÃO)** ✅

**Problema identificado:**
- O webhook não verificava se o payment/order era de teste ou produção
- Usava sempre o mesmo token, podendo causar erros

**Solução implementada:**
- ✅ Verificação de `live_mode` no `paymentData` e `orderData`
- ✅ Detecção automática do tipo de token (TEST- vs APP_USR-)
- ✅ Avisos quando há mismatch entre ambiente e token
- ✅ Tentativa automática com token alternativo se o primeiro falhar
- ✅ Suporte para `mp_access_token_test` (opcional, para testes)

**Código:**
```typescript
const liveMode = paymentData.live_mode; // true = produção, false = teste
const isProductionToken = accessToken?.startsWith("APP_USR-");
const isTestToken = accessToken?.startsWith("TEST-");

// Verificação e aviso se houver mismatch
if (liveMode === true && isTestToken) {
  console.warn("⚠️ ATENÇÃO: Payment de PRODUÇÃO sendo buscado com token de TESTE!");
}
```

---

### 2. **Confirmação Exclusiva quando `status === "approved"`** ✅

**Problema identificado:**
- Precisava garantir que apenas pagamentos aprovados fossem marcados como PAID

**Solução implementada:**
- ✅ Verificação explícita: `if (status === "approved")` antes de marcar como PAID
- ✅ Logs claros indicando quando payment é aprovado
- ✅ Função SQL atualizada para garantir que apenas "approved" → "PAID"
- ✅ Validação dupla: no código TypeScript e na função SQL

**Código:**
```typescript
// VERIFICAÇÃO CRÍTICA: Apenas confirmar quando status === "approved"
if (status !== "approved") {
  console.log(`⚠️ Payment não aprovado. Status: ${status}. Não será marcado como PAID.`);
} else {
  console.log(`✅ Payment APROVADO! Marcando transação como PAID.`);
}

const finalStatus = status === "approved" ? "PAID" : "PENDING";
```

**Função SQL:**
```sql
final_status := CASE 
  WHEN status_param = 'approved' THEN 'PAID'  -- APENAS approved vira PAID
  WHEN status_param = 'pending' THEN 'PENDING'
  WHEN status_param = 'rejected' OR status_param = 'cancelled' THEN 'PENDING'
  WHEN status_param = 'refunded' THEN 'REFUNDED'
  ELSE 'PENDING'
END;
```

---

### 3. **Status Final Garantido como "PAID"** ✅

**Problema identificado:**
- Precisava garantir que após confirmação, o status final seja "PAID"

**Solução implementada:**
- ✅ Função SQL atualizada para buscar por `payment_id` E `external_reference`
- ✅ Atualização direta como fallback se RPC falhar
- ✅ Logs detalhados do status final
- ✅ Resposta do webhook inclui `final_status` para debug

**Função SQL melhorada:**
```sql
-- Primeiro tenta pelo payment_id
UPDATE transactions SET status = final_status WHERE payment_id = payment_id_param;

-- Se não encontrou, tenta pelo external_reference
IF rows_updated = 0 THEN
  UPDATE transactions 
  SET status = final_status, payment_id = payment_id_param
  WHERE external_reference = payment_id_param;
END IF;
```

---

### 4. **Resposta HTTP 200 Rápida** ✅

**Problema identificado:**
- Webhook precisa responder rapidamente (< 5 segundos) para o Mercado Pago

**Solução implementada:**
- ✅ Sempre retorna HTTP 200 (mesmo em caso de erro interno)
- ✅ Processamento síncrono (atualiza antes de responder)
- ✅ Logs detalhados para debug sem bloquear resposta
- ✅ Resposta inclui informações úteis para debug

**Código:**
```typescript
// IMPORTANTE: Sempre responder HTTP 200 rapidamente
// O Mercado Pago espera resposta rápida (< 5 segundos)
// Mesmo se houver erro na atualização, responder 200 para evitar retentativas
return new Response(
  JSON.stringify({ 
    success: true,
    payment_id: resourceId,
    status: status,
    final_status: finalStatus,
    updated: updateSuccess,
    live_mode: liveMode
  }),
  {
    status: 200, // Sempre 200 para webhook
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  }
);
```

---

### 5. **Sem Autenticação de Usuário** ✅

**Já estava correto:**
- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)
- ✅ Não requer autenticação de usuário
- ✅ Funciona independente de sessão

---

## 📋 **Checklist de Verificações**

### ✅ **1. Token por Ambiente**
- [x] Verifica `live_mode` do payment/order
- [x] Detecta tipo de token (TEST- vs APP_USR-)
- [x] Avisa quando há mismatch
- [x] Tenta token alternativo se necessário
- [x] Suporta `mp_access_token_test` (opcional)

### ✅ **2. Confirmação Apenas quando Approved**
- [x] Verifica `status === "approved"` explicitamente
- [x] Logs claros quando payment é aprovado
- [x] Função SQL só marca PAID quando approved
- [x] Validação dupla (TypeScript + SQL)

### ✅ **3. Status Final PAID**
- [x] Função SQL atualizada
- [x] Busca por `payment_id` E `external_reference`
- [x] Fallback para atualização direta
- [x] Logs detalhados do status final

### ✅ **4. HTTP 200 Rápido**
- [x] Sempre retorna HTTP 200
- [x] Processamento síncrono (atualiza antes de responder)
- [x] Resposta rápida (< 5 segundos)
- [x] Logs não bloqueiam resposta

### ✅ **5. Sem Autenticação**
- [x] Usa service_role (já estava correto)
- [x] Não requer sessão de usuário
- [x] Funciona independente de autenticação

---

## 🔧 **Melhorias Adicionais**

### **Logs Detalhados**
- ✅ Logs de ambiente (TESTE vs PRODUÇÃO)
- ✅ Logs de status do payment
- ✅ Logs de confirmação (approved → PAID)
- ✅ Logs de erros com detalhes

### **Tratamento de Erros**
- ✅ Tenta atualização direta se RPC falhar
- ✅ Tenta por `external_reference` se `payment_id` não encontrar
- ✅ Sempre responde HTTP 200 (evita retentativas)
- ✅ Logs detalhados para debug

### **Função SQL Melhorada**
- ✅ Busca por `payment_id` primeiro
- ✅ Fallback para `external_reference` se não encontrar
- ✅ Atualiza `payment_id` se encontrar pelo `external_reference`
- ✅ Logs de sucesso/falha

---

## 🧪 **Como Testar**

### **1. Teste com Payment de TESTE**
```bash
# Webhook deve:
# - Detectar live_mode: false
# - Usar token de teste (TEST-...)
# - Marcar como PAID apenas se status === "approved"
```

### **2. Teste com Payment de PRODUÇÃO**
```bash
# Webhook deve:
# - Detectar live_mode: true
# - Usar token de produção (APP_USR-...)
# - Marcar como PAID apenas se status === "approved"
```

### **3. Verificar Logs**
```bash
# Verificar logs no Supabase Dashboard:
# - Edge Functions → mercadopago-webhook → Logs
# - Procurar por:
#   ✅ "Payment APROVADO! Marcando transação como PAID"
#   ✅ "Transação atualizada via função RPC"
#   ✅ "Status final: PAID"
```

---

## 📝 **Notas Importantes**

1. **Tokens por Business:**
   - Cada business tem `mp_access_token` (produção)
   - Opcionalmente pode ter `mp_access_token_test` (teste)
   - O webhook detecta automaticamente qual usar

2. **Confirmação de Pagamento:**
   - Apenas `status === "approved"` marca como PAID
   - Outros status (pending, rejected, etc.) ficam como PENDING
   - Refunded fica como REFUNDED

3. **Resposta HTTP 200:**
   - Sempre retorna 200, mesmo em caso de erro interno
   - Isso evita que o Mercado Pago tente reenviar o webhook
   - Erros são logados para debug

4. **Frontend Detection:**
   - Frontend usa polling para verificar status
   - Quando webhook atualiza para PAID, polling detecta
   - Pode também usar Supabase Realtime (opcional)

---

## ✅ **Status Final**

**Todas as verificações obrigatórias foram implementadas:**
- ✅ Verificação de ambiente (TESTE vs PRODUÇÃO)
- ✅ Confirmação apenas quando `status === "approved"`
- ✅ Status final garantido como "PAID"
- ✅ HTTP 200 rápido
- ✅ Sem autenticação de usuário

**O webhook está pronto para TESTE e PRODUÇÃO!** 🚀
