# 🧪 Teste Manual - createPayment Edge Function

## 🎯 Objetivo
Identificar exatamente onde o erro 401 está acontecendo.

## 📋 Passo a Passo (Execute no Console do Navegador)

### Passo 1: Obter Token Válido

Abra o console do navegador (F12) no app e execute:

```javascript
const { data: session } = await supabase.auth.getSession();
console.log('Sessão:', {
  hasSession: !!session?.session,
  hasUser: !!session?.session?.user,
  userId: session?.session?.user?.id,
  tokenPreview: session?.session?.access_token?.substring(0, 50) + '...',
  tokenLength: session?.session?.access_token?.length,
  expiresAt: session?.session?.expires_at,
  now: Math.floor(Date.now() / 1000),
  timeUntilExpiry: session?.session?.expires_at - Math.floor(Date.now() / 1000),
});

// Copie o token completo
const token = session?.session?.access_token;
console.log('\n✅ Token completo (copie):', token);
```

**Resultado esperado:**
- `hasSession: true`
- `hasUser: true`
- `timeUntilExpiry`: número positivo (não expirado)

**Se `hasUser: false` ou `timeUntilExpiry` negativo:**
- Faça logout e login novamente
- Execute este passo novamente

---

### Passo 2: Testar com Fetch Direto

Copie o token do Passo 1 e substitua `SEU_TOKEN_AQUI` abaixo. Execute no console:

```javascript
const token = 'SEU_TOKEN_AQUI'; // Cole o token aqui
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3ZoZ2p0anN5Y2JwZWdscnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQwMzYsImV4cCI6MjA1MDA0MDAzNn0.t1EJKqvhyXULfpImqfVGfj1Z3c6KydH20JqFXvPMZf4';

const response = await fetch('https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/createPayment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': anonKey,
  },
  body: JSON.stringify({
    valor: 0.1,
    metodo_pagamento: 'pix',
    email_cliente: 'teste@exemplo.com',
    business_id: '56c882bc-4045-4c1d-990f-3e78c4cbe1d8',
    referencia_externa: `test_${Date.now()}`,
  }),
});

const result = await response.json();

console.log('\n📥 Resposta da Edge Function:');
console.log('   - Status:', response.status);
console.log('   - OK:', response.ok);
console.log('   - Result:', result);

if (!response.ok) {
  console.error('\n❌ ERRO:', result);
  console.log('\n📝 AÇÃO NECESSÁRIA:');
  
  if (result.error?.includes('Authorization header')) {
    console.log('   → O token não está chegando na Edge Function');
    console.log('   → Verifique se o token foi copiado corretamente');
  } else if (result.error?.includes('Token inválido')) {
    console.log('   → O token chegou mas não é válido');
    console.log('   → Faça logout e login novamente');
  } else if (result.error?.includes('SUPABASE_ANON_KEY')) {
    console.log('   → Secret SUPABASE_ANON_KEY não configurado na Edge Function');
    console.log('   → Configure no Dashboard: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/settings');
  } else if (result.error?.includes('mp_access_token')) {
    console.log('   → Business não tem mp_access_token configurado');
    console.log('   → Conecte o Mercado Pago primeiro (Configurações → Integração MP)');
  }
} else {
  console.log('\n✅ SUCESSO! PIX gerado:');
  console.log('   - QR Code:', result.qr_code ? 'presente' : 'ausente');
  console.log('   - Payment ID:', result.payment_id);
}
```

---

### Passo 3: Verificar Logs no Dashboard

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/logs

**Procure por (última hora):**

1. **`✅ FUNÇÃO createPayment CHAMADA`**
   - Se não aparecer: A função não está sendo executada
   - Se aparecer: Continue para o próximo log

2. **`📋 HEADERS recebidos:`**
   - Veja se `authorization` está presente
   - Veja se `apikey` está presente

3. **`🔐 Validando usuário...`**
   - Veja o resultado do `getUser()`

4. **`👤 USER:`**
   - Se for `null`: O JWT não foi validado corretamente
   - Se tiver `{ id: ..., email: ... }`: O JWT está OK

5. **`❌ AUTH ERROR:`**
   - Se não for `null`: Mostra o erro da validação JWT
   - Mensagem mostra o problema exato

---

## 🔍 Diagnóstico por Sintoma

### Sintoma 1: Logs não aparecem no Dashboard
**Causa:** Função não está sendo executada
**Solução:**
1. Verifique `verify_jwt = false` no `supabase/config.toml`
2. Redeploy: `npx supabase functions deploy createPayment`

### Sintoma 2: Log `❌ Authorization header ausente`
**Causa:** Token não está sendo enviado
**Solução:**
1. Verifique se o Passo 2 acima funciona com fetch direto
2. Se funcionar com fetch mas não com `supabase.functions.invoke`, há um bug no client

### Sintoma 3: Log `❌ Configuração do Supabase incompleta`
**Causa:** `SUPABASE_ANON_KEY` não configurado nos secrets
**Solução:**
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/settings
2. Adicione secret: `SUPABASE_ANON_KEY`
3. Valor: copie do Dashboard → Settings → API → anon/public key
4. Redeploy: `npx supabase functions deploy createPayment`

### Sintoma 4: Log `👤 USER: null`
**Causa:** JWT inválido ou `SUPABASE_ANON_KEY` errada
**Solução:**
1. Verifique se `SUPABASE_ANON_KEY` está correta (compare com Dashboard)
2. Verifique se `SUPABASE_URL` está correta
3. Teste com token fresco (logout/login)

### Sintoma 5: Log `❌ Erro ao buscar business`
**Causa:** Business não existe ou `SUPABASE_SERVICE_ROLE_KEY` incorreta
**Solução:**
1. Verifique se business existe: Dashboard → Table Editor → businesses
2. Verifique `SUPABASE_SERVICE_ROLE_KEY` nos secrets

---

## 📍 CHECKLIST RÁPIDO

- [ ] Abriu console do navegador no app
- [ ] Executou Passo 1 e obteve token válido
- [ ] Executou Passo 2 com fetch direto
- [ ] Verificou logs no Supabase Dashboard
- [ ] Identificou qual sintoma acima corresponde ao seu caso
- [ ] Aplicou a solução correspondente

---

## 🆘 SOLUÇÃO DEFINITIVA

Se nada acima funcionar:

1. **Configure TODOS os secrets manualmente:**
   ```
   SUPABASE_URL=https://hgkvhgjtjsycbpeglrrs.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3ZoZ2p0anN5Y2JwZWdscnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQwMzYsImV4cCI6MjA1MDA0MDAzNn0.t1EJKqvhyXULfpImqfVGfj1Z3c6KydH20JqFXvPMZf4
   SUPABASE_SERVICE_ROLE_KEY=<cole aqui do Dashboard → Settings → API → service_role key>
   MP_SPONSOR_ID_LOJA=2622924811
   ```

2. **Redeploy:**
   ```bash
   npx supabase functions deploy createPayment
   ```

3. **Teste novamente**

---

## 💡 DICA IMPORTANTE

Os logs da Edge Function são ESSENCIAIS para identificar o problema. Execute o Passo 2 acima e depois verifique os logs no Dashboard imediatamente. Os logs mostrarão exatamente onde está falhando.
