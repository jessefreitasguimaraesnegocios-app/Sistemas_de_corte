# Como Testar e Verificar Logs da getMpOauthUrl

## 🔍 Problema: Logs não mostram invocações

Os logs no Supabase Dashboard mostram apenas eventos de "shutdown" e "booted", mas não mostram as chamadas reais da função.

## ✅ Passos para Testar

### 1. Verificar se o Secret está Configurado

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/settings

**Vá em "Secrets" e verifique:**
- ✅ `MP_CLIENT_ID` está configurado
- ✅ Valor está correto (Client ID do Mercado Pago)

### 2. Testar a Função Manualmente

**No Supabase Dashboard:**
1. Vá em: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl
2. Clique na aba **"Test"**
3. Configure o teste:
   ```json
   {
     "business_id": "seu-business-id-aqui",
     "redirect_uri": "http://localhost:3001/oauth/callback"
   }
   ```
4. Clique em **"Run"**
5. Verifique a resposta

### 3. Verificar Logs em Tempo Real

**Acesse:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/logs

**Filtros úteis:**
- **Severity:** All
- **Time range:** Last hour
- **Search:** `getMpOauthUrl chamada` ou `MP_CLIENT_ID`

### 4. Testar do Frontend

1. Abra o app em: `http://localhost:3001` (ou sua URL de produção)
2. Faça login como BUSINESS_OWNER
3. Vá em Configurações → Integração Mercado Pago
4. Clique em "Conectar ao Mercado Pago"
5. **Abra o Console do Navegador (F12)**
6. Veja os logs:
   - `🔐 Chamando getMpOauthUrl com token:`
   - `✅ Redirecionando para URL OAuth:`
   - Ou erros se houver

### 5. Verificar Logs no Supabase Após Teste

Após clicar no botão, volte aos logs:
- **URL:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/logs
- **Procure por:**
  - `getMpOauthUrl chamada:`
  - `✅ Usuário autenticado:`
  - `✅ URL OAuth gerada com sucesso`
  - Ou erros específicos

## 🐛 Troubleshooting

### Logs não aparecem
- **Causa:** Função não está sendo chamada
- **Solução:** Verifique o console do navegador para erros

### Erro 401
- **Causa:** Token não está sendo enviado ou está expirado
- **Solução:** A função agora aceita chamadas sem auth, mas verifique se o Supabase client está enviando o token

### Erro: "MP_CLIENT_ID não configurado"
- **Causa:** Secret não foi configurado ou nome está errado
- **Solução:** 
  1. Verifique se o secret está salvo
  2. Verifique se o nome é exatamente `MP_CLIENT_ID` (case-sensitive)
  3. Redeploy a função: `npx supabase functions deploy getMpOauthUrl`

### Função retorna mas não redireciona
- **Causa:** Frontend não está processando a resposta corretamente
- **Solução:** Verifique o console do navegador - deve mostrar `✅ Redirecionando para URL OAuth:`

## 📋 Checklist de Verificação

- [ ] Secret `MP_CLIENT_ID` configurado no Supabase
- [ ] Função foi redeployada após configurar secret
- [ ] Teste manual no Dashboard funciona
- [ ] Logs mostram `getMpOauthUrl chamada:` quando testado
- [ ] Frontend chama a função (ver console do navegador)
- [ ] Função retorna `{ url: "https://auth.mercadopago.com/..." }`
- [ ] Frontend redireciona para a URL retornada

## 🔗 Links Úteis

- **Dashboard da Função:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl
- **Logs:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/logs
- **Test:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl (aba Test)
- **Secrets:** https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/getMpOauthUrl/settings

## 💡 Dica

Se os logs não aparecem, tente:
1. **Limpar filtros** nos logs
2. **Expandir o time range** para "Last 24 hours"
3. **Procurar por termos específicos** como "getMpOauthUrl chamada" ou "MP_CLIENT_ID"
4. **Verificar o console do navegador** primeiro - pode mostrar o erro antes mesmo de chegar na função
