-- Criação da tabela businesses (se não existir)
-- Esta tabela é referenciada nas políticas RLS da tabela transactions
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Habilitar RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver businesses ativos
DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (status = 'ACTIVE' OR auth.uid()::text = owner_id);

-- Política: Donos podem gerenciar seus próprios businesses
DROP POLICY IF EXISTS "Owners can manage their businesses" ON businesses;
CREATE POLICY "Owners can manage their businesses"
  ON businesses FOR ALL
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);
