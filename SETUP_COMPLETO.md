# 🚀 Guia Completo de Setup - BelezaHub

Este guia contém o passo a passo **objetivo** para configurar o projeto desde o início, incluindo todas as credenciais necessárias, especialmente a parte de **pagamentos e tokens do Mercado Pago**.

---

## 📋 Pré-requisitos

- Node.js instalado (versão 18 ou superior)
- Conta no Supabase (gratuita)
- Conta no Mercado Pago (para pagamentos)
- Conta no Google Cloud (opcional, para Gemini AI)

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Supabase - Configuração do Banco de Dados
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui

# Google Gemini AI (Opcional - para geração de descrições)
VITE_GEMINI_API_KEY=sua-chave-gemini-aqui
```

### 🔍 Como obter as credenciais do Supabase:

1. Acesse [https://supabase.com](https://supabase.com) e faça login
2. Crie um novo projeto (ou use um existente)
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 🔍 Como obter a chave do Gemini (Opcional):

1. Acesse [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Clique em **Create API Key**
3. Copie a chave gerada → `VITE_GEMINI_API_KEY`

---

## 💳 Passo 2: Configurar Mercado Pago (PAGAMENTOS)

### 2.1 Criar Conta no Mercado Pago

1. Acesse [https://www.mercadopago.com.br](https://www.mercadopago.com.br)
2. Crie uma conta (pode ser conta de teste para desenvolvimento)
3. Complete o cadastro com seus dados

### 2.2 Obter Access Token (Token de Vendedor)

**IMPORTANTE:** Você precisa de **2 contas diferentes**:
- **Conta Vendedor (Loja)**: Recebe o pagamento principal
- **Conta Sponsor (Plataforma)**: Recebe a comissão de 10%

#### Para Conta Vendedor (Loja):

1. Acesse [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
2. Faça login com a conta **VENDEDOR**
3. Vá em **Suas integrações** → Selecione ou crie uma aplicação
4. Na seção **Credenciais de produção** (ou **Credenciais de teste** para desenvolvimento):
   - Copie o **Access Token** (começa com `APP_USR-...` ou `TEST-...`)
   - Este será o `MP_ACCESS_TOKEN_VENDEDOR`

#### Para Conta Sponsor (Plataforma - recebe comissão):

1. Faça login com a **conta da plataforma** (outra conta)
2. Vá em **Suas integrações** → Crie uma aplicação
3. Copie o **Access Token** desta conta
4. Anote o **User ID** desta conta (encontrado em **Meu perfil** → **Dados da conta**)
   - Este será o `MP_SPONSOR_ID_LOJA`

### 2.3 Configurar Split de Pagamento

1. Na conta **VENDEDOR**, vá em **Configurações** → **Split de pagamento**
2. Ative o split de pagamento
3. Configure o **Sponsor ID** (ID da conta plataforma)
4. Defina a comissão (10% no código, mas pode ser configurável)

### 2.4 Credenciais de Teste (Sandbox)

Para testar sem usar dinheiro real:

1. Acesse [https://www.mercadopago.com.br/developers/panel/credentials](https://www.mercadopago.com.br/developers/panel/credentials)
2. Use as **Credenciais de teste**
3. Use cartões de teste:
   - **Aprovado**: `5031 4332 1540 6351` (CVV: 123, Validade: 11/25)
   - **Recusado**: `5031 4332 1540 6351` (CVV: 123, Validade: 11/25)

---

## 🗄️ Passo 3: Configurar Supabase Edge Functions (Secrets)

As credenciais do Mercado Pago devem ser configuradas como **secrets** nas Edge Functions do Supabase.

### 3.1 Via Dashboard (Recomendado - Remoto):

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Edge Functions** → **Settings** (ou **Secrets**)
3. Adicione os seguintes secrets:

```
MP_ACCESS_TOKEN_VENDEDOR=seu-access-token-vendedor-aqui
MP_SPONSOR_ID_LOJA=user-id-da-conta-sponsor-aqui
MP_WEBHOOK_URL=https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook (opcional)
```

### 3.2 Via CLI (Alternativa):

```bash
# Instalar Supabase CLI globalmente
npm install -g supabase

# Login no Supabase
supabase login

# Link do projeto (pegue o project-ref no dashboard)
supabase link --project-ref seu-project-ref

# Configurar secrets
supabase secrets set MP_ACCESS_TOKEN_VENDEDOR=seu-token-aqui
supabase secrets set MP_SPONSOR_ID_LOJA=seu-sponsor-id-aqui
```

---

## 📦 Passo 4: Instalar Dependências

```bash
npm install
```

---

## 🗃️ Passo 5: Executar Migrações SQL no Supabase

### Opção 1: Via Dashboard (Recomendado - Remoto)

1. Acesse [Supabase Dashboard](https://app.supabase.com) → Seu projeto
2. Vá em **SQL Editor** (ícone de banco de dados no menu lateral)
3. Clique em **New query**
4. Abra o arquivo `supabase/migrations/000_initial_setup.sql`
5. Copie **TODO o conteúdo** do arquivo
6. Cole no SQL Editor
7. Clique em **Run** (ou pressione `Ctrl+Enter`)

**✅ Pronto!** Isso criará todas as tabelas, funções, views e políticas de segurança de uma vez.

### Opção 2: Via CLI (Alternativa)

```bash
# Se ainda não fez login e link
supabase login
supabase link --project-ref seu-project-ref

# Aplicar migrações
supabase db push
```

### Opção 3: Executar Migrações Individuais (Se preferir)

Se quiser executar as migrações uma por uma, execute na ordem:

1. `001_create_transactions_table.sql`
2. `002_create_businesses_table.sql`
3. `003_setup_webhook_function.sql`
4. `004_create_transactions_view.sql`
5. `005_create_summary_functions.sql`

**Ou simplesmente use o `000_initial_setup.sql` que faz tudo de uma vez!**

---

## 🚀 Passo 6: Deploy da Edge Function (createPayment)

### Via CLI (Recomendado):

```bash
# Se ainda não fez login e link
supabase login
supabase link --project-ref seu-project-ref

# Deploy da função
supabase functions deploy createPayment
```

### Verificar se o deploy funcionou:

1. No Supabase Dashboard → **Edge Functions**
2. Você deve ver a função `createPayment` listada
3. Clique nela para ver os logs e detalhes

---

## 🎯 Passo 7: Rodar o Projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173` (ou outra porta que o Vite indicar).

---

## ✅ Checklist de Verificação

Antes de testar, verifique se:

- [ ] Arquivo `.env` criado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Secrets configurados no Supabase: `MP_ACCESS_TOKEN_VENDEDOR` e `MP_SPONSOR_ID_LOJA`
- [ ] Migrações SQL executadas (tabelas criadas)
- [ ] Edge Function `createPayment` deployada
- [ ] Dependências instaladas (`npm install`)
- [ ] Projeto rodando (`npm run dev`)

---

## 🧪 Testando o Sistema de Pagamentos

### Teste PIX:

1. Faça login no app
2. Adicione produtos ao carrinho
3. Clique em **Finalizar Compra**
4. Selecione **PIX**
5. Clique em **Gerar QR Code PIX**
6. O QR Code deve aparecer (ou use o código PIX copiável)

### Teste Cartão de Crédito:

1. No checkout, selecione **Cartão de Crédito**
2. Use um cartão de teste do Mercado Pago:
   - Número: `5031 4332 1540 6351`
   - CVV: `123`
   - Validade: `11/25`
   - Nome: Qualquer nome
3. Clique em **Pagar**
4. O pagamento deve ser processado (em modo teste)

### Verificar Transações no Banco:

1. No Supabase Dashboard → **Table Editor**
2. Abra a tabela `transactions`
3. Você deve ver as transações criadas após os pagamentos

---

## 🔐 Resumo das Credenciais Necessárias

### 1. Supabase:
- `VITE_SUPABASE_URL`: URL do projeto (Dashboard → Settings → API)
- `VITE_SUPABASE_ANON_KEY`: Chave pública anônima (Dashboard → Settings → API)

### 2. Mercado Pago (Secrets no Supabase):
- `MP_ACCESS_TOKEN_VENDEDOR`: Access Token da conta vendedor/loja
- `MP_SPONSOR_ID_LOJA`: User ID da conta sponsor (plataforma)
- `MP_WEBHOOK_URL`: (Opcional) URL para receber notificações

### 3. Google Gemini (Opcional):
- `VITE_GEMINI_API_KEY`: Chave da API do Gemini (para IA)

---

## 🐛 Troubleshooting

### Erro: "Configuração do Mercado Pago incompleta"
- Verifique se os secrets estão configurados no Supabase Dashboard
- Certifique-se de que os nomes estão corretos: `MP_ACCESS_TOKEN_VENDEDOR` e `MP_SPONSOR_ID_LOJA`

### Erro: "Parâmetros obrigatórios ausentes"
- Verifique se está passando `valor`, `metodo_pagamento` e `email_cliente` na requisição

### Erro ao salvar transação no banco
- Verifique se as migrações SQL foram executadas
- Verifique as políticas RLS (Row Level Security) no Supabase
- Verifique os logs do Supabase em **Logs** → **Postgres Logs**

### Erro: "Edge Function not found"
- Certifique-se de que fez o deploy: `supabase functions deploy createPayment`
- Verifique se está linkado ao projeto correto: `supabase link --project-ref seu-ref`

### PIX não gera QR Code
- Verifique se o Access Token está correto
- Verifique se a conta Mercado Pago está ativa
- Use credenciais de **produção** para PIX real (teste pode ter limitações)

### Cartão não processa
- Em desenvolvimento, use cartões de teste do Mercado Pago
- Verifique se o token do cartão está sendo gerado corretamente
- **IMPORTANTE**: Em produção, você DEVE usar o SDK oficial do Mercado Pago para tokenização segura

---

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)
- [Mercado Pago SDK React](https://github.com/mercadopago/sdk-react) - Para tokenização segura em produção
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎉 Pronto!

Seu sistema está configurado e pronto para uso. Lembre-se:

- **Desenvolvimento**: Use credenciais de teste do Mercado Pago
- **Produção**: Use credenciais de produção e implemente o SDK oficial do Mercado Pago para cartões
- **Segurança**: Nunca exponha tokens ou secrets no código frontend

Boa sorte com seu projeto! 🚀
