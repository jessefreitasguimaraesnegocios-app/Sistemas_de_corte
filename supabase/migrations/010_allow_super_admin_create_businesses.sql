-- Migração para permitir que SUPER_ADMIN crie businesses
-- Esta política permite que usuários com role SUPER_ADMIN criem businesses para outros usuários
-- Usa a função is_super_admin() criada na migração 009 para verificar o role (evita problemas de RLS)

-- Política: SUPER_ADMIN pode criar businesses
DROP POLICY IF EXISTS "Super admins can create businesses" ON businesses;
CREATE POLICY "Super admins can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (is_super_admin());

-- Política: SUPER_ADMIN pode ver todos os businesses
DROP POLICY IF EXISTS "Super admins can view all businesses" ON businesses;
CREATE POLICY "Super admins can view all businesses"
  ON businesses FOR SELECT
  USING (
    is_super_admin()
    OR status = 'ACTIVE'
    OR auth.uid()::text = owner_id
  );

-- Política: SUPER_ADMIN pode atualizar businesses
DROP POLICY IF EXISTS "Super admins can update businesses" ON businesses;
CREATE POLICY "Super admins can update businesses"
  ON businesses FOR UPDATE
  USING (
    is_super_admin()
    OR auth.uid()::text = owner_id
  )
  WITH CHECK (
    is_super_admin()
    OR auth.uid()::text = owner_id
  );

-- Permissões
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Comentários
COMMENT ON FUNCTION is_super_admin() IS 'Verifica se o usuário atual é SUPER_ADMIN';
COMMENT ON POLICY "Super admins can create businesses" ON businesses IS 'Permite que SUPER_ADMIN crie businesses para outros usuários';
