-- Adiciona campo para armazenar Access Token do Mercado Pago por negócio
-- Cada salão/bar terá seu próprio token do Mercado Pago

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS mp_access_token TEXT;

-- Comentário na coluna
COMMENT ON COLUMN businesses.mp_access_token IS 'Access Token do Mercado Pago específico deste negócio';

-- Índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_businesses_mp_access_token ON businesses(mp_access_token) WHERE mp_access_token IS NOT NULL;
