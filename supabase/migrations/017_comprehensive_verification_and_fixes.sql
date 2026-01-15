-- Migração 017: Verificação Completa e Correções
-- Esta migração verifica e corrige todos os problemas encontrados no sistema

-- ============================================
-- 1. VERIFICAR E CORRIGIR TABELA BUSINESSES
-- ============================================

-- Garantir que o campo image existe e pode ser atualizado
DO $$
BEGIN
  -- Verificar se a coluna image existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'image'
  ) THEN
    ALTER TABLE businesses ADD COLUMN image TEXT;
    RAISE NOTICE 'Coluna image adicionada à tabela businesses';
  END IF;
  
  -- Verificar se mp_access_token existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'mp_access_token'
  ) THEN
    ALTER TABLE businesses ADD COLUMN mp_access_token TEXT;
    RAISE NOTICE 'Coluna mp_access_token adicionada à tabela businesses';
  END IF;
  
  -- Verificar se mp_public_key existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'mp_public_key'
  ) THEN
    ALTER TABLE businesses ADD COLUMN mp_public_key TEXT;
    RAISE NOTICE 'Coluna mp_public_key adicionada à tabela businesses';
  END IF;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Verificar e corrigir políticas RLS para businesses
-- Política: Qualquer um pode ver businesses ativos
DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (
    status = 'ACTIVE' 
    OR auth.uid()::text = owner_id
    OR is_super_admin()
  );

-- Política: Donos podem gerenciar seus próprios businesses (incluindo image)
DROP POLICY IF EXISTS "Owners can manage their businesses" ON businesses;
CREATE POLICY "Owners can manage their businesses"
  ON businesses FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- Política: SUPER_ADMIN pode ver todos os businesses
DROP POLICY IF EXISTS "Super admins can view all businesses" ON businesses;
CREATE POLICY "Super admins can view all businesses"
  ON businesses FOR SELECT
  USING (is_super_admin());

-- Política: SUPER_ADMIN pode criar businesses
DROP POLICY IF EXISTS "Super admins can create businesses" ON businesses;
CREATE POLICY "Super admins can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (is_super_admin());

-- Política: SUPER_ADMIN pode atualizar businesses (incluindo image)
DROP POLICY IF EXISTS "Super admins can update businesses" ON businesses;
CREATE POLICY "Super admins can update businesses"
  ON businesses FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- 2. VERIFICAR TABELA TRANSACTIONS
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verificar se todas as políticas existem
DO $$
BEGIN
  -- Política: Usuários podem ver transações do seu business
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Users can view their own business transactions'
  ) THEN
    CREATE POLICY "Users can view their own business transactions"
      ON transactions FOR SELECT
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()::text
        )
      );
    RAISE NOTICE 'Política de SELECT para transactions criada';
  END IF;
  
  -- Política: Service role pode inserir transações
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Service role can insert transactions'
  ) THEN
    CREATE POLICY "Service role can insert transactions"
      ON transactions FOR INSERT
      WITH CHECK (true); -- Service role bypassa RLS
    RAISE NOTICE 'Política de INSERT para transactions criada';
  END IF;
  
  -- Política: Service role pode atualizar transações
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Service role can update transactions'
  ) THEN
    CREATE POLICY "Service role can update transactions"
      ON transactions FOR UPDATE
      USING (true)
      WITH CHECK (true); -- Service role bypassa RLS
    RAISE NOTICE 'Política de UPDATE para transactions criada';
  END IF;
  
  -- Política: SUPER_ADMIN pode ver todas as transações
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Super admins can view all transactions'
  ) THEN
    CREATE POLICY "Super admins can view all transactions"
      ON transactions FOR SELECT
      USING (is_super_admin());
    RAISE NOTICE 'Política de SELECT para SUPER_ADMIN em transactions criada';
  END IF;
END $$;

-- ============================================
-- 3. VERIFICAR TABELA USER_PROFILES
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Verificar se a função is_super_admin existe e criar se não existir
-- Não podemos criar função dentro de DO $$, então criamos diretamente
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'SUPER_ADMIN'
  );
END;
$$;

-- Garantir permissões na função
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;

-- ============================================
-- 4. VERIFICAR TABELAS DE PRODUTOS, SERVIÇOS E COLABORADORES
-- ============================================

-- Verificar se as tabelas existem e têm RLS habilitado
DO $$
BEGIN
  -- Verificar tabela products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado para products';
  END IF;
  
  -- Verificar tabela services
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    ALTER TABLE services ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado para services';
  END IF;
  
  -- Verificar tabela collaborators
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaborators') THEN
    ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado para collaborators';
  END IF;
END $$;

-- ============================================
-- 5. VERIFICAR FUNÇÕES SQL
-- ============================================

-- Verificar se get_business_summary existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_business_summary') THEN
    RAISE WARNING 'Função get_business_summary não encontrada. Execute a migração 005_create_summary_functions.sql';
  END IF;
END $$;

-- Verificar se get_platform_summary existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_platform_summary') THEN
    RAISE WARNING 'Função get_platform_summary não encontrada. Execute a migração 005_create_summary_functions.sql';
  END IF;
END $$;

-- Verificar se process_mercado_pago_webhook existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_mercado_pago_webhook') THEN
    RAISE WARNING 'Função process_mercado_pago_webhook não encontrada. Execute a migração 003_setup_webhook_function.sql';
  END IF;
END $$;

-- ============================================
-- 6. GARANTIR PERMISSÕES CORRETAS
-- ============================================

-- Garantir que authenticated pode executar funções necessárias
GRANT EXECUTE ON FUNCTION get_business_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_summary TO authenticated;
GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook TO service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- ============================================
-- 7. COMENTÁRIOS E LOGS
-- ============================================

COMMENT ON COLUMN businesses.image IS 'URL da imagem/foto de perfil do estabelecimento. Pode ser base64 ou URL externa.';
COMMENT ON COLUMN businesses.mp_access_token IS 'Access Token do Mercado Pago para processar pagamentos';
COMMENT ON COLUMN businesses.mp_public_key IS 'Public Key do Mercado Pago para uso no SDK do frontend';

-- Log final
DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Contar tabelas principais
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('businesses', 'transactions', 'user_profiles', 'products', 'services', 'collaborators');
  
  -- Contar políticas RLS
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verificação Completa Concluída';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabelas principais encontradas: %', table_count;
  RAISE NOTICE 'Políticas RLS configuradas: %', policy_count;
  RAISE NOTICE '========================================';
END $$;
