# Configuração do Supabase

## Estrutura do Banco de Dados

### Arquivos SQL Prontos

Todos os arquivos SQL estão prontos na pasta `supabase/migrations/`:

1. **`000_initial_setup.sql`** - Script completo para criar tudo de uma vez (RECOMENDADO)
2. **`001_create_transactions_table.sql`** - Cria a tabela de transações
3. **`002_create_businesses_table.sql`** - Cria a tabela de negócios
4. **`003_setup_webhook_function.sql`** - Função para processar webhooks
5. **`004_create_transactions_view.sql`** - View para consultas facilitadas
6. **`005_create_summary_functions.sql`** - Funções de resumo financeiro

### Opção Rápida: Setup Completo

Execute apenas o arquivo `000_initial_setup.sql` no Supabase SQL Editor para criar tudo de uma vez.

### Opção Detalhada: Migrações Individuais

Execute os arquivos na ordem numerada (001, 002, 003, 004, 005) se preferir aplicar migrações separadas.

Veja o arquivo `supabase/migrations/README.md` para instruções detalhadas.

## Edge Functions - Variáveis de Ambiente

Configure as seguintes variáveis no Supabase Dashboard:

1. Acesse: **Project Settings → Edge Functions → Secrets**
2. Adicione:

   - `MP_ACCESS_TOKEN_VENDEDOR`: Access Token do Mercado Pago (conta vendedor)
   - `MP_SPONSOR_ID_LOJA`: Sponsor ID do Mercado Pago para split de pagamento
   - `MP_WEBHOOK_URL`: (Opcional) URL do webhook para notificações de pagamento

### Como obter as credenciais do Mercado Pago:

1. **Access Token**:
   - Acesse: https://www.mercadopago.com.br/developers/panel
   - Vá em "Suas integrações"
   - Copie o "Access Token" (use o token de produção para produção)

2. **Sponsor ID**:
   - Necessário para split de pagamento
   - Configure no painel do Mercado Pago em "Split de pagamento"
   - O Sponsor ID é o ID da conta que receberá a comissão (plataforma)

## Deploy da Edge Function

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref seu-project-ref

# Deploy
supabase functions deploy createPayment
```

## Testando a Integração

Após configurar tudo:

1. Inicie o app: `npm run dev`
2. Adicione produtos ao carrinho
3. Clique em "Finalizar Compra"
4. Teste pagamento PIX ou Cartão
5. Verifique a tabela `transactions` no Supabase

## Troubleshooting

### Erro: "Configuração do Mercado Pago incompleta"
- Verifique se as variáveis de ambiente estão configuradas no Supabase Dashboard

### Erro: "Parâmetros obrigatórios ausentes"
- Verifique se está passando `valor`, `metodo_pagamento` e `email_cliente`

### Erro ao salvar transação
- Verifique se a tabela `transactions` existe
- Verifique as políticas RLS
- Verifique os logs do Supabase
