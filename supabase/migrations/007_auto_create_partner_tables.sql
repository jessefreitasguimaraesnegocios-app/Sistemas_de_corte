-- Migração para criar automaticamente tabelas e funções específicas de cada parceiro
-- Quando um novo business é criado, esta migração cria automaticamente:
-- 1. Tabela de produtos da loja
-- 2. Tabela de serviços oferecidos
-- 3. Tabela de colaboradores/funcionários
-- 4. Tabela de agendamentos
-- 5. Funções específicas para gerenciar esses dados

-- ============================================
-- FUNÇÃO PRINCIPAL: Setup automático do parceiro
-- ============================================

CREATE OR REPLACE FUNCTION setup_partner_tables(business_id_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_prefix TEXT;
  products_table TEXT;
  services_table TEXT;
  collaborators_table TEXT;
  appointments_table TEXT;
BEGIN
  -- Prefixo para as tabelas (sanitizado)
  table_prefix := 'partner_' || LOWER(REGEXP_REPLACE(business_id_param, '[^a-zA-Z0-9]', '_', 'g'));
  
  products_table := table_prefix || '_products';
  services_table := table_prefix || '_services';
  collaborators_table := table_prefix || '_collaborators';
  appointments_table := table_prefix || '_appointments';

  -- ============================================
  -- 1. TABELA DE PRODUTOS
  -- ============================================
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      category TEXT DEFAULT 'Geral',
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_business_products FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )$sql$, products_table);

  -- Índices para produtos
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_business_id ON %I(business_id)', products_table, products_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_category ON %I(category)', products_table, products_table);

  -- ============================================
  -- 2. TABELA DE SERVIÇOS
  -- ============================================
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      duration INTEGER NOT NULL,
      description TEXT,
      category TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_business_services FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )$sql$, services_table);

  -- Índices para serviços
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_business_id ON %I(business_id)', services_table, services_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_category ON %I(category)', services_table, services_table);

  -- ============================================
  -- 3. TABELA DE COLABORADORES
  -- ============================================
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      rating DECIMAL(3, 1) DEFAULT 5.0,
      email TEXT,
      phone TEXT,
      specialties TEXT[],
      status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_business_collaborators FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )$sql$, collaborators_table);

  -- Índices para colaboradores
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_business_id ON %I(business_id)', collaborators_table, collaborators_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_status ON %I(status)', collaborators_table, collaborators_table);

  -- ============================================
  -- 4. TABELA DE AGENDAMENTOS
  -- ============================================
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      collaborator_id UUID,
      service_id UUID,
      date DATE NOT NULL,
      time TIME NOT NULL,
      status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
      notes TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_business_appointments FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )$sql$, appointments_table);

  -- Índices para agendamentos
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_business_id ON %I(business_id)', appointments_table, appointments_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_date ON %I(date)', appointments_table, appointments_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_collaborator_id ON %I(collaborator_id)', appointments_table, appointments_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_status ON %I(status)', appointments_table, appointments_table);

  -- ============================================
  -- 5. TRIGGERS PARA UPDATED_AT
  -- ============================================
  
  -- Trigger para produtos
  EXECUTE format($sql$
    DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
    CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()$sql$, products_table, products_table, products_table, products_table);

  -- Trigger para serviços
  EXECUTE format($sql$
    DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
    CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()$sql$, services_table, services_table, services_table, services_table);

  -- Trigger para colaboradores
  EXECUTE format($sql$
    DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
    CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()$sql$, collaborators_table, collaborators_table, collaborators_table, collaborators_table);

  -- Trigger para agendamentos
  EXECUTE format($sql$
    DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
    CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()$sql$, appointments_table, appointments_table, appointments_table, appointments_table);

  -- ============================================
  -- 6. ROW LEVEL SECURITY (RLS)
  -- ============================================
  
  -- Habilitar RLS em todas as tabelas
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', products_table);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', services_table);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', collaborators_table);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', appointments_table);

  -- Políticas RLS para produtos
  EXECUTE format($sql$
    DROP POLICY IF EXISTS "Owner can manage products" ON %I;
    CREATE POLICY "Owner can manage products" ON %I
      FOR ALL
      USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )
      WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )$sql$, products_table, products_table);

  -- Políticas RLS para serviços
  EXECUTE format($sql$
    DROP POLICY IF EXISTS "Owner can manage services" ON %I;
    CREATE POLICY "Owner can manage services" ON %I
      FOR ALL
      USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )
      WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )$sql$, services_table, services_table);

  -- Políticas RLS para colaboradores
  EXECUTE format($sql$
    DROP POLICY IF EXISTS "Owner can manage collaborators" ON %I;
    CREATE POLICY "Owner can manage collaborators" ON %I
      FOR ALL
      USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )
      WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )$sql$, collaborators_table, collaborators_table);

  -- Políticas RLS para agendamentos
  EXECUTE format($sql$
    DROP POLICY IF EXISTS "Owner can manage appointments" ON %I;
    CREATE POLICY "Owner can manage appointments" ON %I
      FOR ALL
      USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )
      WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()::text)
      )$sql$, appointments_table, appointments_table);

  -- Política para clientes visualizarem agendamentos próprios
  EXECUTE format($sql$
    DROP POLICY IF EXISTS "Customers can view own appointments" ON %I;
    CREATE POLICY "Customers can view own appointments" ON %I
      FOR SELECT
      USING (customer_id = auth.uid()::text)$sql$, appointments_table, appointments_table);

  -- ============================================
  -- 7. FUNÇÕES ESPECÍFICAS DO PARCEIRO
  -- ============================================

  -- Função para obter resumo de produtos
  EXECUTE format($prod_func$
    CREATE OR REPLACE FUNCTION get_%I_products_summary()
    RETURNS TABLE (
      total_products BIGINT,
      total_value DECIMAL(10, 2),
      low_stock_count BIGINT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $prod_body$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::BIGINT,
        COALESCE(SUM(price * stock), 0),
        COUNT(CASE WHEN stock < 10 THEN 1 END)::BIGINT
      FROM %I
      WHERE business_id = %L;
    END;
    $prod_body$
  $prod_func$, table_prefix || '_products_summary', products_table, business_id_param);

  -- Função para obter resumo de serviços
  EXECUTE format($serv_func$
    CREATE OR REPLACE FUNCTION get_%I_services_summary()
    RETURNS TABLE (
      total_services BIGINT,
      avg_price DECIMAL(10, 2),
      avg_duration DECIMAL(10, 2)
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $serv_body$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::BIGINT,
        COALESCE(AVG(price), 0),
        COALESCE(AVG(duration), 0)
      FROM %I
      WHERE business_id = %L;
    END;
    $serv_body$
  $serv_func$, table_prefix || '_services_summary', services_table, business_id_param);

  -- Função para obter resumo de colaboradores
  EXECUTE format($collab_func$
    CREATE OR REPLACE FUNCTION get_%I_collaborators_summary()
    RETURNS TABLE (
      total_collaborators BIGINT,
      active_count BIGINT,
      avg_rating DECIMAL(3, 1)
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $collab_body$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::BIGINT,
        COALESCE(AVG(rating), 0)
      FROM %I
      WHERE business_id = %L;
    END;
    $collab_body$
  $collab_func$, table_prefix || '_collaborators_summary', collaborators_table, business_id_param);

  -- Função para obter resumo de agendamentos
  EXECUTE format($appt_func$
    CREATE OR REPLACE FUNCTION get_%I_appointments_summary(
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
    )
    RETURNS TABLE (
      total_appointments BIGINT,
      scheduled_count BIGINT,
      completed_count BIGINT,
      cancelled_count BIGINT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $appt_body$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::BIGINT
      FROM %I
      WHERE business_id = %L
        AND date >= start_date
        AND date <= end_date;
    END;
    $appt_body$
  $appt_func$, table_prefix || '_appointments_summary', appointments_table, business_id_param);

  -- Permissões para as funções
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_%I_products_summary() TO authenticated', table_prefix || '_products_summary');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_%I_services_summary() TO authenticated', table_prefix || '_services_summary');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_%I_collaborators_summary() TO authenticated', table_prefix || '_collaborators_summary');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_%I_appointments_summary(DATE, DATE) TO authenticated', table_prefix || '_appointments_summary');

  RAISE NOTICE 'Tabelas e funções criadas para o parceiro: %', business_id_param;
END;
$$;

-- ============================================
-- TRIGGER: Executa setup automático ao criar business
-- ============================================

CREATE OR REPLACE FUNCTION trigger_setup_partner_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Executa o setup apenas para novos businesses
  IF TG_OP = 'INSERT' THEN
    PERFORM setup_partner_tables(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS on_business_create_setup_partner ON businesses;

-- Cria o trigger
CREATE TRIGGER on_business_create_setup_partner
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_setup_partner_tables();

-- ============================================
-- FUNÇÃO AUXILIAR: Setup manual para businesses existentes
-- ============================================

COMMENT ON FUNCTION setup_partner_tables IS 'Cria automaticamente tabelas e funções específicas para um parceiro';
COMMENT ON FUNCTION trigger_setup_partner_tables IS 'Trigger que executa setup_partner_tables quando um novo business é criado';

-- Permissões
GRANT EXECUTE ON FUNCTION setup_partner_tables TO service_role;
GRANT EXECUTE ON FUNCTION trigger_setup_partner_tables TO service_role;

-- ============================================
-- MENSAGEM DE CONFIRMAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migração 007 concluída: Sistema de criação automática de tabelas por parceiro configurado!';
  RAISE NOTICE 'A partir de agora, cada novo business criado terá automaticamente:';
  RAISE NOTICE '  - Tabela de produtos';
  RAISE NOTICE '  - Tabela de serviços';
  RAISE NOTICE '  - Tabela de colaboradores';
  RAISE NOTICE '  - Tabela de agendamentos';
  RAISE NOTICE '  - Funções de resumo específicas';
END $$;
