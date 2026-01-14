-- Migração para garantir que SUPER_ADMIN possa atualizar mp_access_token
-- Esta migração corrige o problema onde o token não está sendo salvo devido a políticas RLS

-- Verificar se a função is_super_admin existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    RAISE EXCEPTION 'Função is_super_admin() não encontrada. Execute a migração 009_create_user_profiles.sql primeiro.';
  END IF;
END $$;

-- Remover política antiga de UPDATE se existir (pode estar conflitando)
DROP POLICY IF EXISTS "Super admins can update businesses" ON businesses;

-- Criar política mais permissiva para SUPER_ADMIN atualizar businesses
-- Esta política permite que SUPER_ADMIN atualize QUALQUER campo, incluindo mp_access_token
CREATE POLICY "Super admins can update businesses"
  ON businesses FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Garantir que a política de owners também permite update
-- (já existe, mas vamos garantir que está correta)
DROP POLICY IF EXISTS "Owners can manage their businesses" ON businesses;
CREATE POLICY "Owners can manage their businesses"
  ON businesses FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- Comentário
COMMENT ON POLICY "Super admins can update businesses" ON businesses IS 
  'Permite que SUPER_ADMIN atualize qualquer campo de businesses, incluindo mp_access_token';

-- Log para debug
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS atualizadas para permitir update de mp_access_token por SUPER_ADMIN';
  RAISE NOTICE 'Total de políticas na tabela businesses: %', (
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'businesses' AND schemaname = 'public'
  );
END $$;
