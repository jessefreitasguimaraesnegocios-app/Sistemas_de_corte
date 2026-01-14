-- Script para garantir que o campo mp_access_token está configurado corretamente
-- Execute este script se o access token não estiver sendo encontrado

-- 1. Garantir que a coluna existe
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS mp_access_token TEXT;

-- 2. Adicionar comentário
COMMENT ON COLUMN businesses.mp_access_token IS 'Access Token do Mercado Pago específico deste negócio';

-- 3. Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_businesses_mp_access_token 
ON businesses(mp_access_token) 
WHERE mp_access_token IS NOT NULL;

-- 4. Verificar se há businesses sem token (apenas para informação)
-- SELECT id, name, status, mp_access_token IS NULL as sem_token 
-- FROM businesses 
-- WHERE status = 'ACTIVE';

-- 5. Garantir que as políticas RLS permitem leitura do campo
-- (A Edge Function usa SERVICE_ROLE_KEY que bypassa RLS, mas vamos garantir)

-- Verificar se a política permite SELECT do campo mp_access_token
-- A política atual "Anyone can view active businesses" já permite isso

-- 6. Log para debug (remover em produção)
DO $$
BEGIN
  RAISE NOTICE 'Campo mp_access_token verificado e configurado';
  RAISE NOTICE 'Total de businesses: %', (SELECT COUNT(*) FROM businesses);
  RAISE NOTICE 'Businesses ativos: %', (SELECT COUNT(*) FROM businesses WHERE status = 'ACTIVE');
  RAISE NOTICE 'Businesses com token: %', (SELECT COUNT(*) FROM businesses WHERE mp_access_token IS NOT NULL AND mp_access_token != '');
END $$;
