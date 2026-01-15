-- Migração 018: Permitir que SUPER_ADMIN delete businesses
-- Esta migração adiciona a política RLS para permitir que SUPER_ADMIN delete businesses

-- Verificar se a função is_super_admin existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    RAISE EXCEPTION 'Função is_super_admin() não encontrada. Execute a migração 009_create_user_profiles.sql primeiro.';
  END IF;
END $$;

-- Política: SUPER_ADMIN pode deletar businesses
DROP POLICY IF EXISTS "Super admins can delete businesses" ON businesses;
CREATE POLICY "Super admins can delete businesses"
  ON businesses FOR DELETE
  USING (is_super_admin());

-- Comentário
COMMENT ON POLICY "Super admins can delete businesses" ON businesses IS 
  'Permite que SUPER_ADMIN delete businesses do banco de dados';

-- Log para debug
DO $$
BEGIN
  RAISE NOTICE 'Política RLS de DELETE para SUPER_ADMIN criada com sucesso';
  RAISE NOTICE 'Total de políticas na tabela businesses: %', (
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'businesses' AND schemaname = 'public'
  );
END $$;
