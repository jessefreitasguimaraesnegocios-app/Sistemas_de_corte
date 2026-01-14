# Migrações do Banco de Dados

Este diretório contém todas as migrações SQL necessárias para configurar o banco de dados do BelezaHub.

## Ordem de Execução

Execute as migrações na seguinte ordem:

1. **001_create_transactions_table.sql** - Cria a tabela principal de transações
2. **002_create_businesses_table.sql** - Cria a tabela de negócios (se não existir)
3. **003_setup_webhook_function.sql** - Cria função para processar webhooks do Mercado Pago
4. **004_create_transactions_view.sql** - Cria view para facilitar consultas
5. **005_create_summary_functions.sql** - Cria funções de resumo financeiro
6. **006_add_mp_access_token_to_businesses.sql** - Adiciona campo para Access Token do Mercado Pago
7. **007_auto_create_partner_tables.sql** - Sistema automático de criação de tabelas por parceiro ⭐ NOVO
8. **008_setup_existing_businesses.sql** - Setup manual para businesses existentes (opcional)
9. **009_create_user_profiles.sql** - Tabela de perfis de usuários ⭐ NOVO

## Como Aplicar as Migrações

### Opção 1: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de cada arquivo SQL na ordem
4. Execute cada script

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref seu-project-ref

# Aplicar todas as migrações
supabase db push

# Ou aplicar migrações específicas
supabase migration up
```

### Opção 3: Via psql (PostgreSQL direto)

```bash
# Conectar ao banco
psql -h db.seu-projeto.supabase.co -U postgres -d postgres

# Executar cada arquivo
\i supabase/migrations/001_create_transactions_table.sql
\i supabase/migrations/002_create_businesses_table.sql
\i supabase/migrations/003_setup_webhook_function.sql
\i supabase/migrations/004_create_transactions_view.sql
\i supabase/migrations/005_create_summary_functions.sql
\i supabase/migrations/006_add_mp_access_token_to_businesses.sql
\i supabase/migrations/007_auto_create_partner_tables.sql
\i supabase/migrations/008_setup_existing_businesses.sql
\i supabase/migrations/009_create_user_profiles.sql
```

## Estrutura das Tabelas

### transactions
Armazena todas as transações de pagamento com split automático.

**Campos principais:**
- `id`: UUID único
- `business_id`: ID do negócio
- `amount`: Valor total
- `admin_fee`: Taxa da plataforma (10%)
- `partner_net`: Valor líquido para o parceiro
- `status`: PAID, PENDING ou REFUNDED
- `payment_method`: pix ou credit_card

### businesses
Armazena informações dos negócios parceiros.

### user_profiles
Armazena perfis de usuários que complementam auth.users.

**Campos principais:**
- `id`: UUID (mesmo do auth.users)
- `email`: Email do usuário
- `full_name`: Nome completo
- `role`: CUSTOMER, BUSINESS_OWNER ou SUPER_ADMIN
- `business_id`: ID do negócio associado (para BUSINESS_OWNER)
- `is_active`: Status ativo/inativo
- `last_login`: Último login
- `metadata`: Dados adicionais em JSON

## Funções Úteis

### get_business_summary(business_id, start_date, end_date)
Retorna resumo financeiro de um negócio específico.

**Exemplo:**
```sql
SELECT * FROM get_business_summary('business-123', NOW() - INTERVAL '7 days', NOW());
```

### get_platform_summary(start_date, end_date)
Retorna resumo financeiro geral da plataforma (apenas para admins).

**Exemplo:**
```sql
SELECT * FROM get_platform_summary(NOW() - INTERVAL '30 days', NOW());
```

### process_mercado_pago_webhook(payment_id, status, status_detail)
Processa webhooks do Mercado Pago para atualizar status de transações.

**Exemplo:**
```sql
SELECT process_mercado_pago_webhook('123456789', 'approved', 'accredited');
```

### get_user_profile(user_id)
Retorna perfil completo de um usuário com informações do negócio.

**Exemplo:**
```sql
SELECT * FROM get_user_profile('user-uuid-aqui');
```

### get_users_by_role(role)
Lista todos os usuários de um determinado role.

**Exemplo:**
```sql
SELECT * FROM get_users_by_role('BUSINESS_OWNER');
```

## Views

### transactions_with_business
View que combina transações com informações do negócio.

**Exemplo:**
```sql
SELECT * FROM transactions_with_business 
WHERE business_id = 'business-123' 
ORDER BY date DESC;
```

## Sistema de Tabelas por Parceiro (Migração 007)

A partir da migração 007, cada novo business criado automaticamente recebe:

### Tabelas Criadas Automaticamente:
- **partner_{business_id}_products** - Produtos da loja
- **partner_{business_id}_services** - Serviços oferecidos
- **partner_{business_id}_collaborators** - Colaboradores/funcionários
- **partner_{business_id}_appointments** - Agendamentos

### Funções Criadas Automaticamente:
- **get_partner_{business_id}_products_summary()** - Resumo de produtos
- **get_partner_{business_id}_services_summary()** - Resumo de serviços
- **get_partner_{business_id}_collaborators_summary()** - Resumo de colaboradores
- **get_partner_{business_id}_appointments_summary(start_date, end_date)** - Resumo de agendamentos

### Como Funciona:
1. Quando um novo business é inserido na tabela `businesses`, um trigger é acionado
2. O trigger executa a função `setup_partner_tables(business_id)`
3. A função cria todas as tabelas, índices, triggers e políticas RLS específicas
4. Funções de resumo são criadas para facilitar consultas

### Setup Manual para Businesses Existentes:
Se você já tem businesses cadastrados antes da migração 007, execute:

```sql
-- Executar setup para todos os businesses existentes
\i supabase/migrations/008_setup_existing_businesses.sql

-- Ou executar para um business específico
SELECT setup_partner_tables('business-id-aqui');
```

## Segurança (RLS)

Todas as tabelas têm Row Level Security (RLS) habilitado:

- **transactions**: Usuários podem ver transações de seus próprios negócios
- **businesses**: Qualquer um pode ver businesses ativos, donos podem gerenciar os seus
- **Tabelas do parceiro**: Apenas o dono do business pode gerenciar seus dados

## Troubleshooting

### Erro: "relation already exists"
- A tabela já existe. Você pode usar `CREATE TABLE IF NOT EXISTS` ou dropar a tabela primeiro.

### Erro: "permission denied"
- Verifique se está usando a role correta (service_role para Edge Functions).

### Erro: "policy already exists"
- A política já existe. Remova a política antiga antes de criar uma nova, ou use `CREATE POLICY IF NOT EXISTS` (PostgreSQL 9.5+).

## Verificação

Após aplicar as migrações, verifique:

```sql
-- Verificar se a tabela existe
SELECT * FROM information_schema.tables WHERE table_name = 'transactions';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- Verificar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%mercado%' OR routine_name LIKE '%summary%';
```
 