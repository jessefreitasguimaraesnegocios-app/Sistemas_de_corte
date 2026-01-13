-- Função para obter resumo financeiro de um business
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
    COALESCE(SUM(t.amount), 0) AS total_revenue,
    COALESCE(SUM(t.admin_fee), 0) AS total_admin_fee,
    COALESCE(SUM(t.partner_net), 0) AS total_partner_net,
    COUNT(t.id) AS transaction_count,
    COUNT(CASE WHEN t.payment_method = 'pix' THEN 1 END) AS pix_count,
    COUNT(CASE WHEN t.payment_method = 'credit_card' THEN 1 END) AS card_count
  FROM transactions t
  WHERE t.business_id = business_id_param
    AND t.status = 'PAID'
    AND t.date >= start_date
    AND t.date <= end_date;
END;
$$;

-- Função para obter resumo geral da plataforma (apenas para SUPER_ADMIN)
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
    COALESCE(SUM(t.amount), 0) AS total_revenue,
    COALESCE(SUM(t.admin_fee), 0) AS total_admin_fees,
    COALESCE(SUM(t.partner_net), 0) AS total_partner_payout,
    COUNT(t.id) AS transaction_count,
    COUNT(DISTINCT t.business_id) AS active_businesses,
    COALESCE(SUM(CASE WHEN t.payment_method = 'pix' THEN t.amount ELSE 0 END), 0) AS pix_revenue,
    COALESCE(SUM(CASE WHEN t.payment_method = 'credit_card' THEN t.amount ELSE 0 END), 0) AS card_revenue
  FROM transactions t
  WHERE t.status = 'PAID'
    AND t.date >= start_date
    AND t.date <= end_date;
END;
$$;

-- Comentários
COMMENT ON FUNCTION get_business_summary IS 'Retorna resumo financeiro de um negócio específico';
COMMENT ON FUNCTION get_platform_summary IS 'Retorna resumo financeiro geral da plataforma';

-- Permissões
GRANT EXECUTE ON FUNCTION get_business_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_summary TO service_role;
