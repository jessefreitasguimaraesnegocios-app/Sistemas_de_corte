# 📚 Documentação Completa - BelezaHub Sistema de Gestão

## 🎯 Visão Geral do Sistema

**BelezaHub** é uma plataforma SaaS multi-tenant completa para gestão de estabelecimentos de beleza e estética (barbearias e salões). O sistema permite que múltiplos estabelecimentos gerenciem seus negócios de forma independente, enquanto a plataforma central administra tudo e recebe comissões automáticas através de split de pagamento.

### Conceito Principal

- **Multi-Tenant**: Cada estabelecimento tem seus próprios dados isolados
- **Split de Pagamento**: Comissão automática de 10% (configurável) para a plataforma
- **3 Tipos de Usuários**: Clientes, Proprietários e Administradores
- **Integração Mercado Pago**: Pagamentos PIX e Cartão de Crédito com OAuth
- **Gestão Completa**: Agendamentos, produtos, serviços, colaboradores, vendas

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth (Email/Password + Google OAuth)
- **Pagamentos**: Mercado Pago (PIX + Cartão de Crédito)
- **UI**: Tailwind CSS + Lucide Icons
- **Gráficos**: Recharts
- **Deploy**: Vercel (Frontend) + Supabase (Backend)

### Estrutura de Dados

```
Supabase Database
├── auth.users (Supabase Auth)
├── user_profiles (perfis de usuários)
├── businesses (estabelecimentos)
├── products (produtos)
├── services (serviços)
├── collaborators (colaboradores)
├── transactions (transações de pagamento)
└── notifications (notificações)
```

---

## 👥 Sistema de 3 Tipos de Login

### 1. 🔵 CUSTOMER (Cliente)

**O que é**: Usuários finais que compram produtos e agendam serviços nos estabelecimentos.

**Funcionalidades**:
- ✅ Navegar estabelecimentos disponíveis
- ✅ Ver produtos e serviços de cada estabelecimento
- ✅ Adicionar produtos ao carrinho
- ✅ Finalizar compras com PIX ou Cartão de Crédito
- ✅ Receber notificações sobre pedidos
- ✅ Ver histórico de compras

**Como fazer login**:
- Botão "Sou Cliente" na página inicial
- Login com Google OAuth
- Não precisa criar conta manualmente (Google OAuth cria automaticamente)

**Permissões**:
- Pode ver businesses ativos
- Pode ver produtos e serviços públicos
- Pode criar transações de pagamento
- **NÃO pode** gerenciar estabelecimentos

---

### 2. 🟣 BUSINESS_OWNER (Proprietário de Estabelecimento)

**O que é**: Proprietários de barbearias ou salões que gerenciam seu negócio através da plataforma.

**Funcionalidades**:
- ✅ **Dashboard**: Visão geral do negócio (vendas, agendamentos, receita)
- ✅ **Agendamentos**: Gerenciar agendamentos de clientes
- ✅ **Loja**: Gerenciar produtos (adicionar, editar, remover, controle de estoque)
- ✅ **Serviços**: Gerenciar serviços oferecidos (preços, duração, categorias)
- ✅ **Equipe**: Gerenciar colaboradores (adicionar, editar, remover funcionários)
- ✅ **Configurações**:
  - Editar informações do estabelecimento
  - Conectar com Mercado Pago via OAuth
  - Ver status de conexão (Conectado/Não Conectado)
  - Alterar senha
  - Upload de foto de perfil

**Como fazer login**:
- Botão "Sou Estabelecimento" na página inicial
- Modal de login/cadastro
- Opções:
  - **Login**: Email + Senha
  - **Cadastro**: Nome + Email + Senha (mínimo 6 caracteres)
  - **Google OAuth**: Login rápido com Google

**Permissões**:
- Pode gerenciar SEU estabelecimento (apenas o que ele é owner)
- Pode criar/editar/deletar produtos, serviços, colaboradores
- Pode ver transações do seu estabelecimento
- **NÃO pode** ver outros estabelecimentos
- **NÃO pode** acessar área administrativa

**Integração Mercado Pago**:
- Deve conectar conta Mercado Pago via OAuth
- Após conectar, pode processar pagamentos
- Tokens salvos automaticamente no banco (`mp_access_token`, `mp_public_key`, etc.)

---

### 3. 🟡 SUPER_ADMIN (Administrador Central)

**O que é**: Administradores da plataforma que gerenciam todos os estabelecimentos e a plataforma como um todo.

**Funcionalidades**:
- ✅ **Dashboard Hub**: Visão geral da plataforma (estatísticas, gráficos)
- ✅ **Parceiros Ativos**: Listar e gerenciar todos os estabelecimentos
  - Criar novos estabelecimentos
  - Editar informações (nome, tipo, descrição, imagem, etc.)
  - Ativar/Desativar estabelecimentos
  - Ver detalhes de cada parceiro
  - Configurar taxa de split por estabelecimento
- ✅ **Usuários**: Gerenciar todos os usuários do sistema
  - Ver lista de usuários por role
  - Ver último login
  - Ativar/Desativar usuários
- ✅ **Split Financeiro**: 
  - Ver todas as transações
  - Ver comissões recebidas
  - Gráficos de receita
  - Resumo financeiro da plataforma
- ✅ **Configurações Hub**: Configurações gerais da plataforma

**Como fazer login**:
- Botão "Login Admin Central" na página inicial
- Modal de login admin
- Opções:
  - **Email + Senha** (conta admin)
  - **Google OAuth** (conta Google com role SUPER_ADMIN)

**Permissões**:
- Pode ver e gerenciar **TODOS** os estabelecimentos
- Pode criar/editar/deletar businesses
- Pode ver todas as transações
- Pode gerenciar usuários
- **Acesso total** ao sistema

---

## 💳 Sistema de Split de Pagamento

### Como Funciona

O split de pagamento divide automaticamente o valor recebido entre o estabelecimento e a plataforma.

**Exemplo**: Cliente paga R$ 100,00
- **Estabelecimento recebe**: R$ 90,00 (90%)
- **Plataforma recebe**: R$ 10,00 (10%) automaticamente

### Configuração Necessária

#### 1. Contas Mercado Pago

Você precisa de **2 contas diferentes** no Mercado Pago:

**Conta 1 - Vendedor (Estabelecimento)**:
- Cada estabelecimento tem sua própria conta
- Recebe o pagamento principal
- Pode ser PF (CPF) ou PJ (CNPJ)
- **Access Token** desta conta é salvo no banco (`mp_access_token`)

**Conta 2 - Sponsor (Plataforma)**:
- Conta da plataforma (BelezaHub)
- Recebe a comissão automaticamente
- Recomendado: PJ (CNPJ)
- **User ID** desta conta é o `MP_SPONSOR_ID_LOJA`

#### 2. Configuração no Mercado Pago

1. **Na conta Vendedor**:
   - Ativar split de pagamento
   - Adicionar User ID da conta Sponsor
   - Configurar comissão (10% padrão)

2. **Na conta Sponsor**:
   - Obter User ID (número do usuário)
   - Configurar como secret no Supabase

#### 3. Configuração no Supabase

**Secrets da Edge Function `createPayment`**:
```
MP_SPONSOR_ID_LOJA=123456789  (User ID da conta Sponsor)
MP_WEBHOOK_URL=https://...    (URL do webhook, opcional)
```

**No banco de dados**:
- Cada `business` tem seu próprio `mp_access_token`
- Cada `business` pode ter `revenue_split` configurável (padrão: 10%)

### Implementação Técnica

**Edge Function `createPayment`**:
```typescript
// Calcula comissão
const COMISSAO_PERCENTUAL = business.revenue_split || 10;
const marketplace_fee = valor * (COMISSAO_PERCENTUAL / 100);

// Payload para Mercado Pago Orders API
const orderData = {
  total_amount: valor,
  marketplace_fee: marketplace_fee,  // Comissão da plataforma
  integration_data: {
    sponsor: {
      id: String(SPONSOR_ID_LOJA)  // User ID da conta Sponsor
    }
  },
  transactions: {
    payments: [{
      amount: valor,
      payment_method: { id: "pix" }  // ou "credit_card"
    }]
  }
};
```

**Mercado Pago divide automaticamente**:
- O estabelecimento recebe: `valor - marketplace_fee`
- A plataforma recebe: `marketplace_fee`

---

## 🔐 Sistema de Autenticação

### Métodos de Login

1. **Email + Senha**:
   - Cadastro manual
   - Login tradicional
   - Recuperação de senha (via Supabase)

2. **Google OAuth**:
   - Login rápido com Google
   - Cria conta automaticamente se não existir
   - Requer configuração no Supabase Dashboard

### Fluxo de Autenticação

```
1. Usuário clica em botão de login
   ↓
2. Escolhe método (Email/Password ou Google)
   ↓
3. Supabase Auth processa autenticação
   ↓
4. onAuthStateChange detecta login
   ↓
5. Sistema identifica role (CUSTOMER/BUSINESS_OWNER/SUPER_ADMIN)
   ↓
6. Carrega dados específicos do role:
   - CUSTOMER: Notificações
   - BUSINESS_OWNER: Business do usuário
   - SUPER_ADMIN: Lista de businesses
   ↓
7. Renderiza interface apropriada
```

### Validações de Segurança

- ✅ **Row Level Security (RLS)**: Cada usuário só vê seus próprios dados
- ✅ **Validação de Role**: Verificação de permissões em cada ação
- ✅ **JWT Tokens**: Tokens seguros para autenticação
- ✅ **Session Management**: Refresh automático de tokens
- ✅ **Edge Functions**: Validação de autenticação em todas as funções

---

## 📦 Funcionalidades por Módulo

### Módulo de Produtos (Loja)

**Para BUSINESS_OWNER**:
- Adicionar produtos (nome, preço, estoque, imagem, categoria)
- Editar produtos existentes
- Remover produtos
- Controle de estoque automático
- Ativar/Desativar produtos

**Para CUSTOMER**:
- Ver produtos disponíveis
- Adicionar ao carrinho
- Ver detalhes (preço, estoque, descrição)

### Módulo de Serviços

**Para BUSINESS_OWNER**:
- Adicionar serviços (nome, preço, duração, categoria)
- Editar serviços
- Remover serviços
- Ativar/Desativar serviços

**Para CUSTOMER**:
- Ver serviços disponíveis
- Ver preços e duração

### Módulo de Colaboradores (Equipe)

**Para BUSINESS_OWNER**:
- Adicionar colaboradores (nome, função, foto, especialidades)
- Editar informações
- Remover colaboradores
- Ver avaliações

### Módulo de Agendamentos

**Para BUSINESS_OWNER**:
- Ver agendamentos
- Gerenciar status (agendado, concluído, cancelado)
- Ver histórico

**Para CUSTOMER**:
- Fazer agendamentos (futuro)

### Módulo de Transações

**Para BUSINESS_OWNER**:
- Ver transações do seu estabelecimento
- Ver valores líquidos (após comissão)
- Ver status dos pagamentos

**Para SUPER_ADMIN**:
- Ver todas as transações
- Ver comissões recebidas
- Gráficos de receita
- Resumo financeiro

---

## 🛠️ Configuração Completa do Sistema

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase criada
- Conta Mercado Pago (2 contas: Vendedor + Sponsor)
- Git para versionamento

### 2. Configuração do Supabase

#### 2.1. Criar Projeto Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Chave pública
   - **Service Role Key**: Chave privada (não compartilhar)

#### 2.2. Executar Migrações

Execute as migrações na ordem:

```bash
# No Supabase Dashboard → SQL Editor
# Execute cada arquivo em ordem:
1. 000_initial_setup.sql
2. 001_create_transactions_table.sql
3. 002_create_businesses_table.sql
4. 009_create_user_profiles.sql
5. 010_allow_super_admin_create_businesses.sql
6. 011_create_services_table.sql
7. 012_create_products_table.sql
8. 013_create_collaborators_table.sql
9. 014_fix_mp_access_token.sql
10. 015_fix_super_admin_update_mp_token.sql
11. 016_add_mp_public_key_to_businesses.sql
12. 017_comprehensive_verification_and_fixes.sql
13. 018_allow_super_admin_delete_businesses.sql
14. 019_create_notifications_table.sql
15. 020_add_mp_oauth_fields.sql
```

**Ou use o script PowerShell**:
```powershell
.\execute-migrations.ps1
```

#### 2.3. Configurar Google OAuth (Opcional)

1. No Supabase Dashboard → Authentication → Providers
2. Ative "Google"
3. Configure:
   - Client ID (do Google Cloud Console)
   - Client Secret
4. Adicione Redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`

#### 2.4. Configurar Edge Functions Secrets

No Supabase Dashboard → Edge Functions → Settings → Secrets:

**Para `createPayment`**:
```
MP_SPONSOR_ID_LOJA=123456789
MP_WEBHOOK_URL=https://xxxxx.supabase.co/functions/v1/mercadopago-webhook
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Para `getMpOauthUrl`**:
```
MP_CLIENT_ID=2851977731635151
MP_REDIRECT_URI=https://sistemas-de-corte.vercel.app/oauth/callback
```

**Para `mp-oauth-callback`**:
```
MP_CLIENT_ID=2851977731635151
MP_CLIENT_SECRET=seu_client_secret
MP_REDIRECT_URI=https://sistemas-de-corte.vercel.app/oauth/callback
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Para `mercadopago-webhook`**:
```
MP_WEBHOOK_SECRET=seu_webhook_secret
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 3. Configuração do Mercado Pago

#### 3.1. Criar Conta Vendedor

1. Acesse [https://www.mercadopago.com.br](https://www.mercadopago.com.br)
2. Crie conta (PF ou PJ)
3. Complete cadastro
4. Acesse [Painel de Desenvolvedores](https://www.mercadopago.com.br/developers/panel)
5. Crie uma aplicação
6. Obtenha **Access Token** (Teste e Produção)

#### 3.2. Criar Conta Sponsor

1. Crie outra conta Mercado Pago (email diferente)
2. Complete cadastro
3. Obtenha **User ID** (em "Meu perfil" → "Dados da conta")
4. Este será o `MP_SPONSOR_ID_LOJA`

#### 3.3. Configurar Split

1. Na **conta Vendedor**:
   - Vá em Configurações → Split de pagamento
   - Ative split
   - Adicione User ID da conta Sponsor
   - Configure comissão (10%)

2. Aguarde aprovação (algumas horas)

### 4. Configuração do Frontend

#### 4.1. Instalar Dependências

```bash
npm install
```

#### 4.2. Configurar Variáveis de Ambiente

Crie arquivo `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

#### 4.3. Executar Localmente

```bash
npm run dev
```

Acesse: `http://localhost:3001`

### 5. Deploy das Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref xxxxx

# Deploy das funções
supabase functions deploy createPayment
supabase functions deploy checkPaymentStatus
supabase functions deploy updateBusinessConfig
supabase functions deploy getMercadoPagoPublicKey
supabase functions deploy mercadopago-webhook
supabase functions deploy getMpOauthUrl
supabase functions deploy mp-oauth-callback --no-verify-jwt
```

**Importante**: `mp-oauth-callback` deve ser deployada com `--no-verify-jwt` porque o Mercado Pago não envia token de autenticação.

### 6. Deploy do Frontend (Vercel)

1. Conecte repositório GitHub à Vercel
2. Configure variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automático

---

## 🔄 Fluxo de Pagamento Completo

### Fluxo PIX

```
1. Cliente adiciona produtos ao carrinho
   ↓
2. Clica em "Finalizar Pagamento"
   ↓
3. Escolhe método PIX
   ↓
4. Frontend valida:
   - Email válido
   - Business ID existe
   - Business tem mp_access_token
   ↓
5. Chama Edge Function createPayment
   ↓
6. Edge Function:
   - Valida autenticação do usuário
   - Busca business no banco
   - Verifica mp_access_token
   - Calcula marketplace_fee (10%)
   - Cria ordem no Mercado Pago com split
   ↓
7. Mercado Pago retorna QR Code PIX
   ↓
8. Frontend exibe QR Code
   ↓
9. Cliente paga via PIX
   ↓
10. Mercado Pago envia webhook
    ↓
11. Edge Function mercadopago-webhook:
    - Valida assinatura
    - Atualiza status da transação
    ↓
12. Sistema atualiza estoque e notifica cliente
```

### Fluxo Cartão de Crédito

```
1-4. Mesmo do PIX
   ↓
5. Frontend usa Mercado Pago SDK:
   - Tokeniza cartão
   - Obtém token seguro
   ↓
6. Chama Edge Function createPayment com token
   ↓
7. Edge Function:
   - Mesma validação do PIX
   - Cria ordem com token do cartão
   ↓
8. Mercado Pago processa pagamento
   ↓
9. Retorna status (approved/pending/rejected)
   ↓
10. Frontend mostra resultado
    ↓
11. Webhook atualiza status final
```

---

## 🔗 Integração OAuth Mercado Pago

### Por que OAuth?

Cada estabelecimento precisa conectar sua própria conta Mercado Pago para receber pagamentos. O OAuth permite que o estabelecimento autorize a plataforma a usar sua conta.

### Fluxo OAuth

```
1. BUSINESS_OWNER acessa Configurações
   ↓
2. Clica em "Conectar ao Mercado Pago"
   ↓
3. Frontend chama Edge Function getMpOauthUrl
   ↓
4. Edge Function gera URL de autorização:
   https://auth.mercadopago.com/authorization?
     client_id=...
     redirect_uri=...
     state=business_id
   ↓
5. Redireciona para Mercado Pago
   ↓
6. Estabelecimento faz login no MP
   ↓
7. Autoriza aplicação
   ↓
8. Mercado Pago redireciona para:
   /oauth/callback?code=...&state=business_id
   ↓
9. Componente OAuthCallback processa:
   - Lê code e state
   - Chama Edge Function mp-oauth-callback
   ↓
10. Edge Function:
    - Troca code por access_token
    - Salva tokens no banco (businesses table)
    ↓
11. Redireciona para página principal
    ↓
12. Status muda para "Conectado"
```

### Tokens Salvos

Após OAuth bem-sucedido, são salvos:
- `mp_access_token`: Token de acesso
- `mp_refresh_token`: Token para renovar
- `mp_public_key`: Chave pública (para SDK frontend)
- `mp_user_id`: ID do usuário no Mercado Pago
- `mp_live_mode`: Se está em produção ou teste
- `mp_token_expires_at`: Data de expiração

---

## 📊 Estrutura do Banco de Dados

### Tabela: `businesses`

Armazena informações dos estabelecimentos.

**Campos principais**:
- `id`: ID único (TEXT)
- `name`: Nome do estabelecimento
- `type`: 'BARBERSHOP' ou 'SALON'
- `owner_id`: ID do usuário proprietário
- `revenue_split`: Porcentagem de comissão (padrão: 10)
- `status`: 'ACTIVE', 'PENDING', 'SUSPENDED'
- `mp_access_token`: Token do Mercado Pago (OAuth)
- `mp_public_key`: Chave pública do Mercado Pago
- `mp_user_id`: User ID no Mercado Pago

**RLS**: Apenas owner pode modificar seu business. SUPER_ADMIN pode ver todos.

### Tabela: `user_profiles`

Complementa `auth.users` com informações adicionais.

**Campos principais**:
- `id`: UUID (mesmo de auth.users)
- `email`: Email do usuário
- `role`: 'CUSTOMER', 'BUSINESS_OWNER', 'SUPER_ADMIN'
- `business_id`: ID do business (para BUSINESS_OWNER)
- `is_active`: Se o usuário está ativo

**RLS**: Usuários veem apenas seu próprio perfil. SUPER_ADMIN vê todos.

### Tabela: `transactions`

Registra todas as transações de pagamento.

**Campos principais**:
- `id`: UUID
- `business_id`: ID do estabelecimento
- `amount`: Valor total
- `admin_fee`: Comissão da plataforma
- `partner_net`: Valor líquido para o estabelecimento
- `status`: 'PAID', 'PENDING', 'REFUNDED'
- `payment_method`: 'pix' ou 'credit_card'
- `payment_id`: ID do pagamento no Mercado Pago

**RLS**: Owners veem apenas suas transações. SUPER_ADMIN vê todas.

### Tabela: `products`

Produtos da loja de cada estabelecimento.

**Campos principais**:
- `id`: UUID
- `business_id`: ID do estabelecimento
- `name`: Nome do produto
- `price`: Preço
- `stock`: Estoque
- `image`: URL da imagem
- `is_active`: Se está ativo

**RLS**: Owners gerenciam apenas seus produtos.

### Tabela: `services`

Serviços oferecidos por cada estabelecimento.

**Campos principais**:
- `id`: UUID
- `business_id`: ID do estabelecimento
- `name`: Nome do serviço
- `price`: Preço
- `duration`: Duração em minutos
- `is_active`: Se está ativo

**RLS**: Owners gerenciam apenas seus serviços.

### Tabela: `collaborators`

Colaboradores/funcionários de cada estabelecimento.

**Campos principais**:
- `id`: UUID
- `business_id`: ID do estabelecimento
- `name`: Nome
- `role`: Função
- `avatar`: URL da foto
- `status`: Status do colaborador

**RLS**: Owners gerenciam apenas seus colaboradores.

---

## 🔒 Segurança e Permissões

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado para garantir isolamento de dados.

**Políticas principais**:

1. **businesses**:
   - Owners podem ver/editar apenas seu business
   - SUPER_ADMIN pode ver/editar todos
   - CUSTOMER pode ver apenas businesses ativos

2. **products, services, collaborators**:
   - Owners podem gerenciar apenas seus dados
   - CUSTOMER pode ver apenas dados ativos

3. **transactions**:
   - Owners veem apenas suas transações
   - SUPER_ADMIN vê todas

4. **user_profiles**:
   - Usuários veem apenas seu próprio perfil
   - SUPER_ADMIN vê todos

### Validação em Edge Functions

Todas as Edge Functions (exceto `mp-oauth-callback`) validam:
- ✅ Token JWT válido
- ✅ Usuário autenticado
- ✅ Permissões adequadas

---

## 🚀 Como Fazer o Sistema Funcionar

### Passo 1: Setup Inicial

1. Clone o repositório
2. Instale dependências: `npm install`
3. Configure `.env.local`
4. Execute migrações no Supabase

### Passo 2: Configurar Mercado Pago

1. Crie 2 contas Mercado Pago
2. Configure split na conta vendedor
3. Obtenha Access Token e Sponsor ID
4. Configure secrets no Supabase

### Passo 3: Deploy Edge Functions

```bash
supabase functions deploy createPayment
supabase functions deploy checkPaymentStatus
supabase functions deploy updateBusinessConfig
supabase functions deploy getMercadoPagoPublicKey
supabase functions deploy mercadopago-webhook
supabase functions deploy getMpOauthUrl
supabase functions deploy mp-oauth-callback --no-verify-jwt
```

### Passo 4: Criar Primeiro SUPER_ADMIN

1. Faça cadastro normal (Email + Senha)
2. No Supabase Dashboard → SQL Editor:
```sql
UPDATE user_profiles 
SET role = 'SUPER_ADMIN' 
WHERE email = 'seu-email@exemplo.com';
```
3. Faça login novamente

### Passo 5: Criar Primeiro Estabelecimento

1. Faça login como SUPER_ADMIN
2. Vá em "Parceiros Ativos"
3. Clique em "Adicionar Parceiro"
4. Preencha:
   - Nome
   - Email (do proprietário)
   - Senha
   - Tipo (BARBERSHOP ou SALON)
5. O sistema cria:
   - Usuário no Supabase Auth
   - Perfil em `user_profiles` com role BUSINESS_OWNER
   - Business em `businesses` com `owner_id` vinculado

### Passo 6: Estabelecimento Conecta Mercado Pago

1. Proprietário faz login
2. Vá em Configurações
3. Clique em "Conectar ao Mercado Pago"
4. Autoriza no Mercado Pago
5. Tokens são salvos automaticamente

### Passo 7: Testar Pagamento

1. Crie um produto no estabelecimento
2. Faça login como CUSTOMER
3. Adicione produto ao carrinho
4. Finalize pagamento
5. Verifique split funcionando

---

## 📝 Checklist de Configuração

### Supabase
- [ ] Projeto criado
- [ ] Migrações executadas
- [ ] RLS habilitado em todas as tabelas
- [ ] Google OAuth configurado (opcional)
- [ ] Edge Functions deployadas
- [ ] Secrets configurados

### Mercado Pago
- [ ] Conta Vendedor criada
- [ ] Conta Sponsor criada
- [ ] Split configurado na conta vendedor
- [ ] Access Token obtido
- [ ] Sponsor ID obtido
- [ ] Redirect URIs configurados

### Frontend
- [ ] `.env.local` configurado
- [ ] Dependências instaladas
- [ ] Aplicação roda localmente
- [ ] Deploy na Vercel (opcional)

### Testes
- [ ] Login CUSTOMER funciona
- [ ] Login BUSINESS_OWNER funciona
- [ ] Login SUPER_ADMIN funciona
- [ ] OAuth Mercado Pago funciona
- [ ] Pagamento PIX funciona
- [ ] Pagamento Cartão funciona
- [ ] Split está funcionando

---

## 🐛 Troubleshooting Comum

### Erro 401 em Edge Functions

**Causa**: Token JWT inválido ou expirado

**Solução**:
- Verificar se usuário está logado
- Verificar se `hasUser: true` na sessão
- Fazer refresh de sessão antes de chamar função

### Estabelecimento não encontrado

**Causa**: Business não existe ou `owner_id` não corresponde

**Solução**:
- Verificar se business foi criado
- Verificar se `owner_id` está correto
- Verificar se usuário está autenticado

### Split não funciona

**Causa**: Configuração incorreta no Mercado Pago

**Solução**:
- Verificar se split está ativado na conta vendedor
- Verificar se Sponsor ID está correto
- Verificar se `integration_data.sponsor.id` está no payload

### OAuth Mercado Pago fica carregando

**Causa**: Timeout ou erro na Edge Function

**Solução**:
- Verificar logs da Edge Function
- Verificar se `mp-oauth-callback` está pública (`--no-verify-jwt`)
- Verificar secrets configurados

---

## 📈 Escalabilidade

O sistema está preparado para:
- ✅ **10+ estabelecimentos** simultâneos
- ✅ **50+ usuários por estabelecimento**
- ✅ **Múltiplos acessos simultâneos**
- ✅ **Isolamento completo de dados** (RLS)
- ✅ **Performance otimizada** (índices no banco)

---

## 🎯 Resumo Executivo

**BelezaHub** é uma plataforma SaaS completa que permite:

1. **Múltiplos estabelecimentos** gerenciarem seus negócios
2. **Clientes** comprarem produtos e agendarem serviços
3. **Plataforma** receber comissão automática via split
4. **Administradores** gerenciarem tudo centralmente

**Tecnologias**: React + Supabase + Mercado Pago

**Segurança**: RLS + JWT + Validações em Edge Functions

**Pagamentos**: PIX + Cartão com split automático

**Pronto para produção** após configuração completa! 🚀
