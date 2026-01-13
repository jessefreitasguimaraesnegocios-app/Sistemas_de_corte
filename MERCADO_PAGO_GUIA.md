# 💳 Guia Completo - Mercado Pago para BelezaHub

Este guia detalha **tudo sobre as contas do Mercado Pago** necessárias para o sistema de pagamentos com split (divisão de receita).

---

## 📋 Visão Geral: Tipos de Conta Necessárias

Para o sistema funcionar com **split de pagamento** (comissão automática de 10%), você precisa de **2 contas diferentes**:

1. **Conta Vendedor (Loja)** - Recebe o pagamento principal do cliente
2. **Conta Sponsor (Plataforma)** - Recebe a comissão de 10% automaticamente

**IMPORTANTE:** As duas contas devem ser **diferentes** (emails diferentes) para o split funcionar.

---

## 🏪 Tipo 1: Conta Vendedor (Loja/Estabelecimento)

### Qual Tipo de Conta Usar?

**Para Desenvolvimento/Teste:**
- ✅ **Conta PF (CPF)** - Mais simples e rápida de criar
- ✅ Pode usar conta pessoal para testes
- ✅ Não precisa de documentos empresariais

**Para Produção:**
- ✅ **Conta PJ (CNPJ)** - Recomendado para estabelecimentos comerciais
- ✅ Mais profissional
- ✅ Permite emissão de notas fiscais
- ✅ Melhor para receber valores maiores

### Como Criar Conta Vendedor PF (CPF)

1. **Acesse o site:**
   - Vá em [https://www.mercadopago.com.br](https://www.mercadopago.com.br)

2. **Criar conta:**
   - Clique em **Criar conta** ou **Cadastre-se**
   - Escolha **Pessoa Física**
   - Preencha:
     - Email
     - Senha
     - Nome completo
     - CPF
     - Data de nascimento
     - Telefone

3. **Confirmar email:**
   - Verifique sua caixa de entrada
   - Clique no link de confirmação

4. **Completar cadastro:**
   - Adicione endereço completo
   - Confirme telefone (SMS)
   - Adicione dados bancários (opcional inicialmente)

5. **Acessar painel de desenvolvedores:**
   - Vá em [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
   - Faça login com a conta criada

6. **Criar aplicação:**
   - Clique em **Criar aplicação** ou **Suas integrações**
   - Dê um nome (ex: "BelezaHub - Loja")
   - Escolha o tipo: **Marketplace** ou **Integração customizada**

7. **Obter credenciais:**
   - Na aplicação criada, vá em **Credenciais**
   - Para **teste**, use as **Credenciais de teste**
   - Para **produção**, use as **Credenciais de produção**
   - Copie o **Access Token** (começa com `APP_USR-...` ou `TEST-...`)
   - **Este será o `MP_ACCESS_TOKEN_VENDEDOR`**

### Como Criar Conta Vendedor PJ (CNPJ)

1. **Acesse o site:**
   - Vá em [https://www.mercadopago.com.br](https://www.mercadopago.com.br)

2. **Criar conta:**
   - Clique em **Criar conta**
   - Escolha **Pessoa Jurídica**
   - Preencha:
     - Email corporativo
     - Senha
     - Razão social
     - CNPJ
     - Nome do responsável
     - CPF do responsável
     - Telefone

3. **Confirmar email:**
   - Verifique email e confirme

4. **Enviar documentos:**
   - **CNPJ** (comprovante de inscrição)
   - **Contrato social** ou **Estatuto**
   - **Comprovante de endereço** da empresa
   - **RG e CPF** do responsável
   - **Comprovante de conta bancária** (extrato ou comprovante)

5. **Aguardar aprovação:**
   - Processo pode levar de 1 a 5 dias úteis
   - Você receberá email quando aprovado

6. **Acessar painel de desenvolvedores:**
   - Vá em [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
   - Faça login

7. **Criar aplicação:**
   - Clique em **Criar aplicação**
   - Nome: "BelezaHub - Loja PJ"
   - Tipo: **Marketplace**

8. **Obter credenciais:**
   - Vá em **Credenciais**
   - Copie o **Access Token de produção**
   - **Este será o `MP_ACCESS_TOKEN_VENDEDOR`**

---

## 🏢 Tipo 2: Conta Sponsor (Plataforma/BelezaHub)

### Qual Tipo de Conta Usar?

**Recomendação:**
- ✅ **Conta PJ (CNPJ)** - Ideal para plataforma
- ✅ Permite receber comissões de múltiplos vendedores
- ✅ Mais profissional e escalável
- ✅ Melhor para compliance fiscal

**Alternativa para Teste:**
- ✅ **Conta PF (CPF)** - Pode usar para desenvolvimento
- ⚠️ Em produção, use PJ

### Como Criar Conta Sponsor PJ (Recomendado)

1. **Criar conta PJ:**
   - Siga os mesmos passos da **Conta Vendedor PJ**
   - Use um **email diferente** (ex: `admin@belezahub.com`)
   - Use o **CNPJ da sua empresa plataforma**

2. **Aguardar aprovação:**
   - Complete todos os documentos
   - Aguarde aprovação (1-5 dias)

3. **Obter User ID:**
   - Faça login no Mercado Pago
   - Vá em **Meu perfil** ou **Dados da conta**
   - Procure por **User ID** ou **ID do usuário**
   - É um número (ex: `123456789`)
   - **Este será o `MP_SPONSOR_ID_LOJA`**

4. **Criar aplicação (opcional):**
   - Vá em [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
   - Crie uma aplicação para a plataforma
   - Isso ajuda na organização, mas não é obrigatório para o split

### Como Criar Conta Sponsor PF (Para Teste)

1. **Criar conta PF:**
   - Siga os passos da **Conta Vendedor PF**
   - Use **email diferente** (ex: `sponsor@teste.com`)

2. **Obter User ID:**
   - Faça login
   - Vá em **Meu perfil** → **Dados da conta**
   - Copie o **User ID**
   - **Este será o `MP_SPONSOR_ID_LOJA`**

---

## 🔗 Configurar Split de Pagamento

O split permite que a plataforma receba automaticamente uma comissão de cada pagamento.

### Passo a Passo:

1. **Na conta VENDEDOR (Loja):**
   - Faça login com a conta vendedor
   - Vá em **Configurações** → **Split de pagamento**
   - Ou acesse: [https://www.mercadopago.com.br/account/settings](https://www.mercadopago.com.br/account/settings)

2. **Ativar split:**
   - Clique em **Ativar split de pagamento**
   - Aceite os termos

3. **Configurar Sponsor:**
   - Insira o **User ID da conta Sponsor** (plataforma)
   - Defina a **comissão** (10% no código, mas pode ser configurável)
   - Salve as configurações

4. **Aguardar aprovação:**
   - O Mercado Pago pode revisar a configuração
   - Geralmente é aprovado em algumas horas

### Como Funciona o Split:

Quando um cliente paga R$ 100,00:
- **Conta Vendedor (Loja)** recebe: R$ 90,00 (90%)
- **Conta Sponsor (Plataforma)** recebe: R$ 10,00 (10%) automaticamente

**Não é necessário transferir manualmente!** O Mercado Pago divide automaticamente.

---

## 🔑 Onde Encontrar as Credenciais

### Access Token (Vendedor)

1. Acesse: [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
2. Faça login com a **conta vendedor**
3. Clique em **Suas integrações**
4. Selecione a aplicação criada
5. Vá em **Credenciais**
6. Para **teste**: Copie **Access Token de teste** (começa com `TEST-...`)
7. Para **produção**: Copie **Access Token de produção** (começa com `APP_USR-...`)
8. **Este é o `MP_ACCESS_TOKEN_VENDEDOR`**

### Sponsor ID (Plataforma)

1. Faça login com a **conta sponsor** (plataforma)
2. Vá em **Meu perfil** ou **Dados da conta**
3. Procure por **User ID** ou **ID do usuário**
4. É um número (ex: `123456789`)
5. **Este é o `MP_SPONSOR_ID_LOJA`**

**Alternativa:**
- No painel de desenvolvedores, o User ID também aparece no topo da página
- Ou em: [https://www.mercadopago.com.br/developers/panel/credentials](https://www.mercadopago.com.br/developers/panel/credentials)

---

## 🧪 Credenciais de Teste (Sandbox)

Para testar sem usar dinheiro real:

### Como Obter Credenciais de Teste:

1. **Conta Vendedor:**
   - No painel de desenvolvedores
   - Vá em **Credenciais**
   - Use as **Credenciais de teste**
   - Access Token começa com `TEST-...`

2. **Conta Sponsor:**
   - Use o User ID da conta sponsor (mesmo em teste)

### Cartões de Teste:

Use estes cartões para testar pagamentos:

**Cartão Aprovado:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Validade: `11/25`
- Nome: Qualquer nome

**Cartão Recusado:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Validade: `11/25`
- Nome: Qualquer nome

**Mais cartões de teste:**
- Acesse: [https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)

---

## 📊 Resumo: Qual Conta Usar?

### Cenário 1: Desenvolvimento/Teste

| Conta | Tipo | Email | Documento |
|-------|------|-------|-----------|
| Vendedor | PF (CPF) | `loja@teste.com` | CPF pessoal |
| Sponsor | PF (CPF) | `sponsor@teste.com` | CPF pessoal (diferente) |

**Vantagens:**
- ✅ Criação rápida (minutos)
- ✅ Não precisa de documentos empresariais
- ✅ Ideal para testes

### Cenário 2: Produção (Recomendado)

| Conta | Tipo | Email | Documento |
|-------|------|-------|-----------|
| Vendedor | PJ (CNPJ) | `contato@barbearia.com` | CNPJ do estabelecimento |
| Sponsor | PJ (CNPJ) | `admin@belezahub.com` | CNPJ da plataforma |

**Vantagens:**
- ✅ Mais profissional
- ✅ Permite valores maiores
- ✅ Emissão de notas fiscais
- ✅ Melhor para compliance

### Cenário 3: Híbrido (Desenvolvimento)

| Conta | Tipo | Email | Documento |
|-------|------|-------|-----------|
| Vendedor | PF (CPF) | `loja@teste.com` | CPF pessoal |
| Sponsor | PJ (CNPJ) | `admin@belezahub.com` | CNPJ da plataforma |

**Vantagens:**
- ✅ Testa com conta real da plataforma
- ✅ Vendedor pode ser teste

---

## ⚙️ Configuração no Supabase

Após obter as credenciais, configure no Supabase:

### Via Dashboard:

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Edge Functions** → **Settings** → **Secrets**
3. Adicione:

```
MP_ACCESS_TOKEN_VENDEDOR=APP_USR-1234567890-abcdefghijklmnopqrstuvwxyz-123456789
MP_SPONSOR_ID_LOJA=123456789
```

### Via CLI:

```bash
supabase secrets set MP_ACCESS_TOKEN_VENDEDOR=seu-token-aqui
supabase secrets set MP_SPONSOR_ID_LOJA=seu-user-id-aqui
```

---

## ✅ Checklist de Configuração

Antes de usar em produção, verifique:

- [ ] Conta vendedor criada e aprovada
- [ ] Conta sponsor criada e aprovada
- [ ] Access Token do vendedor copiado
- [ ] User ID do sponsor copiado
- [ ] Split de pagamento configurado na conta vendedor
- [ ] Credenciais configuradas no Supabase (secrets)
- [ ] Testado com cartões de teste
- [ ] Documentos enviados e aprovados (se PJ)

---

## 🐛 Problemas Comuns

### "Split não está funcionando"

**Soluções:**
- Verifique se as contas são diferentes (emails diferentes)
- Confirme que o split está ativado na conta vendedor
- Verifique se o Sponsor ID está correto
- Aguarde algumas horas após configurar (pode precisar de aprovação)

### "Conta não foi aprovada"

**Soluções:**
- Verifique se todos os documentos foram enviados
- Confirme que os documentos estão legíveis
- Entre em contato com suporte do Mercado Pago
- Para PJ, pode levar até 5 dias úteis

### "Access Token inválido"

**Soluções:**
- Verifique se copiou o token completo
- Confirme se está usando o token correto (teste vs produção)
- Gere um novo token se necessário
- Verifique se a aplicação está ativa

### "User ID não encontrado"

**Soluções:**
- Vá em **Meu perfil** → **Dados da conta**
- Procure por "ID do usuário" ou "User ID"
- Pode estar em formato numérico ou alfanumérico
- Se não encontrar, entre em contato com suporte

---

## 📞 Suporte Mercado Pago

- **Documentação:** [https://www.mercadopago.com.br/developers/pt/docs](https://www.mercadopago.com.br/developers/pt/docs)
- **Suporte:** [https://www.mercadopago.com.br/developers/pt/support](https://www.mercadopago.com.br/developers/pt/support)
- **Fórum:** [https://www.mercadopago.com.br/developers/pt/support/community](https://www.mercadopago.com.br/developers/pt/support/community)

---

## 🎯 Resumo Rápido

1. **Crie 2 contas diferentes:**
   - Vendedor (loja) - PF ou PJ
   - Sponsor (plataforma) - Recomendado PJ

2. **Obtenha credenciais:**
   - Access Token do vendedor (painel de desenvolvedores)
   - User ID do sponsor (meu perfil)

3. **Configure split:**
   - Na conta vendedor, ative split
   - Adicione User ID do sponsor
   - Defina comissão (10%)

4. **Configure no Supabase:**
   - Adicione secrets: `MP_ACCESS_TOKEN_VENDEDOR` e `MP_SPONSOR_ID_LOJA`

5. **Teste:**
   - Use credenciais de teste
   - Use cartões de teste
   - Verifique se o split funciona

**Pronto!** Seu sistema de pagamentos está configurado! 🚀
