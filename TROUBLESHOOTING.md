# 🔧 Troubleshooting - Problemas Comuns

Soluções rápidas para problemas frequentes.

---

## ❌ Erro 401 Unauthorized (sem logs no Dashboard)

**Sintoma:** Edge Function retorna 401, mas não aparece nenhum log no Dashboard.

**Causa:** `verify_jwt` mal configurado no `supabase/config.toml`

**Solução:**
```toml
# supabase/config.toml
[functions.createPayment]
verify_jwt = false  # ← Deve ser false para checkout público
```

Depois:
```bash
npx supabase functions deploy createPayment
```

**Regra de Ouro:** 401 sem logs = `verify_jwt` mal configurado.

---

## ❌ Erro 400 Bad Request ao criar pagamento

**Sintoma:** Erro "Erro ao processar pagamento no Mercado Pago"

**Possíveis causas:**

1. **Business sem `mp_access_token`:**
   - Solução: Conecte o estabelecimento ao Mercado Pago via OAuth

2. **Business sem `mp_user_id`:**
   - Solução: OAuth não foi completado, refaça a conexão

3. **Access Token inválido/expirado:**
   - Solução: Refaça o OAuth para obter novo token

4. **Payload inválido para Mercado Pago:**
   - Verifique logs no Dashboard: `functions/createPayment/logs`
   - Procure por "📦 OrderData sendo enviado ao MP"

---

## ❌ Função não executa (sem logs)

**Sintoma:** Nenhum log aparece no Dashboard, erro 401 ou 400.

**Verificações:**

1. ✅ `verify_jwt = false` no `config.toml`
2. ✅ Deploy executado após mudança
3. ✅ `apikey` header sendo enviado no frontend
4. ✅ URL correta: `${SUPABASE_URL}/functions/v1/createPayment`

**Debug:**
```javascript
// No console do navegador, verifique:
console.log('URL:', functionUrl);
console.log('apikey:', supabaseAnonKey ? 'presente' : 'MISSING');
```

---

## ❌ Secrets não encontrados

**Sintoma:** Erro "Configuração do servidor incompleta"

**Solução:**
1. Acesse: `https://supabase.com/dashboard/project/SEU_ID/functions/FUNCAO/settings`
2. Vá em "Secrets"
3. Adicione os secrets obrigatórios (veja [SETUP.md](./SETUP.md))
4. Redeploy: `npx supabase functions deploy FUNCAO`

---

## ❌ OAuth não salva tokens

**Sintoma:** Após autorizar, `mp_access_token` e `mp_user_id` não aparecem no banco.

**Verificações:**

1. ✅ `SUPABASE_SERVICE_ROLE_KEY` configurado no secret
2. ✅ `mp-oauth-callback` deployada
3. ✅ Redirect URI correto no app do Mercado Pago
4. ✅ Verifique logs: `functions/mp-oauth-callback/logs`

**Debug:**
- Verifique se o callback está sendo chamado
- Veja logs para erros de salvamento no banco

---

## ❌ Webhook não recebe notificações

**Sintoma:** Pagamentos aprovados mas status não atualiza.

**Verificações:**

1. ✅ `MP_WEBHOOK_SECRET` configurado (se usar validação)
2. ✅ URL do webhook configurada no Mercado Pago
3. ✅ Função `mercadopago-webhook` deployada
4. ✅ Verifique logs: `functions/mercadopago-webhook/logs`

**Teste manual:**
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123"}}'
```

---

## ❌ Checkout exige login (não deveria)

**Sintoma:** Erro ao tentar pagar sem estar logado.

**Causa:** Código ainda valida JWT manualmente.

**Solução:**
- Remova validação de `authHeader` e `getUser()` da Edge Function
- Checkout deve ser público (cliente pode ser anônimo)
- Segurança vem do webhook assinado e OAuth, não do JWT do cliente

---

## 📊 Verificar Logs

**Dashboard Supabase:**
- Acesse: `https://supabase.com/dashboard/project/SEU_ID/functions/FUNCAO/logs`
- Filtre por "Last hour" ou "Last 24 hours"
- Procure por logs que começam com "🔥", "❌", "✅"

**Console do Navegador:**
- F12 → Console
- Procure por erros em vermelho
- Logs começando com "🔍 DEBUG" mostram detalhes

---

## 🆘 Ainda com problemas?

1. Verifique os logs no Dashboard
2. Verifique o console do navegador
3. Confirme que todos os secrets estão configurados
4. Confirme que todas as funções foram deployadas
5. Teste com um pagamento de teste (R$ 0,10)

---

**Mais ajuda:** Consulte [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) para regras de ouro.
