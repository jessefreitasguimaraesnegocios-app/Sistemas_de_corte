-- Script de setup inicial completo
-- Execute este arquivo se quiser criar tudo de uma vez
-- OU execute os arquivos individuais na ordem numerada

-- ============================================
-- 1. TABELA TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  admin_fee DECIMAL(10, 2) NOT NULL,
  partner_net DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'REFUNDED')),
  gateway TEXT NOT NULL CHECK (gateway IN ('MERCADO_PAGO', 'STRIPE')),
  payment_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card')),
  customer_email TEXT,
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_reference ON transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- 2. TABELA BUSINESSES (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BARBERSHOP', 'SALON')),
  description TEXT,
  address TEXT,
  image TEXT,
  rating DECIMAL(3, 1) DEFAULT 0,
  owner_id TEXT NOT NULL,
  monthly_fee DECIMAL(10, 2) DEFAULT 0,
  revenue_split DECIMAL(5, 2) DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
  gateway_id TEXT,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- ============================================
-- 3. FUNÇÕES
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para webhook do Mercado Pago
CREATE OR REPLACE FUNCTION process_mercado_pago_webhook(
  payment_id_param TEXT,
  status_param TEXT,
  status_detail_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transactions
  SET 
    status = CASE 
      WHEN status_param = 'approved' THEN 'PAID'
      WHEN status_param = 'pending' THEN 'PENDING'
      WHEN status_param = 'rejected' OR status_param = 'cancelled' THEN 'PENDING'
      WHEN status_param = 'refunded' THEN 'REFUNDED'
      ELSE status
    END,
    updated_at = NOW()
  WHERE transactions.payment_id = payment_id_param;
END;
$$;

-- Função de resumo por business
CREATE OR REPLACE FUNCTION get_business_summary(
  business_id_param TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_revenue DECIMAL(10, 2),
  total_admin_fee DECIMAL(10, 2),
  total_partner_net DECIMAL(10, 2),
  transaction_count BIGINT,
  pix_count BIGINT,
  card_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(t.admin_fee), 0),
    COALESCE(SUM(t.partner_net), 0),
    COUNT(t.id),
    COUNT(CASE WHEN t.payment_method = 'pix' THEN 1 END),
    COUNT(CASE WHEN t.payment_method = 'credit_card' THEN 1 END)
  FROM transactions t
  WHERE t.business_id = business_id_param
    AND t.status = 'PAID'
    AND t.date >= start_date
    AND t.date <= end_date;
END;
$$;

-- Função de resumo da plataforma
CREATE OR REPLACE FUNCTION get_platform_summary(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_revenue DECIMAL(10, 2),
  total_admin_fees DECIMAL(10, 2),
  total_partner_payout DECIMAL(10, 2),
  transaction_count BIGINT,
  active_businesses BIGINT,
  pix_revenue DECIMAL(10, 2),
  card_revenue DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(t.admin_fee), 0),
    COALESCE(SUM(t.partner_net), 0),
    COUNT(t.id),
    COUNT(DISTINCT t.business_id),
    COALESCE(SUM(CASE WHEN t.payment_method = 'pix' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.payment_method = 'credit_card' THEN t.amount ELSE 0 END), 0)
  FROM transactions t
  WHERE t.status = 'PAID'
    AND t.date >= start_date
    AND t.date <= end_date;
END;
$$;

-- ============================================
-- 4. VIEWS
-- ============================================

CREATE OR REPLACE VIEW transactions_with_business AS
SELECT 
  t.id,
  t.business_id,
  b.name AS business_name,
  b.type AS business_type,
  t.amount,
  t.admin_fee,
  t.partner_net,
  t.date,
  t.status,
  t.gateway,
  t.payment_id,
  t.payment_method,
  t.customer_email,
  t.external_reference,
  t.created_at,
  t.updated_at,
  ROUND((t.admin_fee / NULLIF(t.amount, 0)) * 100, 2) AS fee_percentage
FROM transactions t
LEFT JOIN businesses b ON t.business_id = b.id;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own business transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON transactions;
DROP POLICY IF EXISTS "Super admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;
DROP POLICY IF EXISTS "Owners can manage their businesses" ON businesses;

-- Políticas para transactions
CREATE POLICY "Users can view their own business transactions"
  ON transactions FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT owner_id FROM businesses WHERE id = transactions.business_id
    )
    OR auth.role() = 'service_role'
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "Service role can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update transactions"
  ON transactions FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );

-- Políticas para businesses
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (status = 'ACTIVE' OR auth.uid()::text = owner_id);

CREATE POLICY "Owners can manage their businesses"
  ON businesses FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- ============================================
-- 6. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook TO service_role;
GRANT EXECUTE ON FUNCTION get_business_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_summary TO service_role;

-- ============================================
-- FIM DO SETUP
-- ============================================

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Setup inicial concluído com sucesso!';
  RAISE NOTICE 'Tabelas criadas: transactions, businesses';
  RAISE NOTICE 'Funções criadas: process_mercado_pago_webhook, get_business_summary, get_platform_summary';
  RAISE NOTICE 'View criada: transactions_with_business';
  RAISE NOTICE 'RLS habilitado e políticas configuradas';
END $$;
