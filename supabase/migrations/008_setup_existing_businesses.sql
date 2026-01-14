-- Script para executar setup manual em businesses existentes
-- Execute este script se você já tem businesses cadastrados antes da migração 007

-- Função auxiliar para listar businesses sem setup
CREATE OR REPLACE FUNCTION list_businesses_without_setup()
RETURNS TABLE (
  business_id TEXT,
  business_name TEXT,
  owner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.owner_id,
    b.created_at
  FROM businesses b
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name LIKE 'partner_' || LOWER(REGEXP_REPLACE(b.id, '[^a-zA-Z0-9]', '_', 'g')) || '%'
  )
  ORDER BY b.created_at;
END;
$$;

-- Script para executar setup em todos os businesses existentes
DO $$
DECLARE
  business_record RECORD;
  setup_count INTEGER := 0;
BEGIN
  -- Itera sobre todos os businesses
  FOR business_record IN 
    SELECT id, name FROM businesses
  LOOP
    BEGIN
      -- Executa o setup para cada business
      PERFORM setup_partner_tables(business_record.id);
      setup_count := setup_count + 1;
      RAISE NOTICE 'Setup concluído para: % (ID: %)', business_record.name, business_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar setup para % (ID: %): %', business_record.name, business_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de businesses processados: %', setup_count;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION list_businesses_without_setup TO authenticated;

COMMENT ON FUNCTION list_businesses_without_setup IS 'Lista businesses que ainda não têm tabelas específicas criadas';
