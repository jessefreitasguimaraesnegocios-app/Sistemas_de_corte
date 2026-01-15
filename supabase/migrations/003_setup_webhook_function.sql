-- Função para processar webhooks do Mercado Pago
-- Esta função pode ser chamada quando o Mercado Pago notificar sobre mudanças no status do pagamento

CREATE OR REPLACE FUNCTION process_mercado_pago_webhook(
  payment_id_param TEXT,
  status_param TEXT,
  status_detail_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
  final_status TEXT;
BEGIN
  -- VERIFICAÇÃO CRÍTICA: Apenas marcar como PAID quando status === "approved"
  final_status := CASE 
    WHEN status_param = 'approved' THEN 'PAID'
    WHEN status_param = 'pending' THEN 'PENDING'
    WHEN status_param = 'rejected' OR status_param = 'cancelled' THEN 'PENDING'
    WHEN status_param = 'refunded' THEN 'REFUNDED'
    ELSE 'PENDING'
  END;
  
  -- Atualiza o status da transação baseado no webhook do Mercado Pago
  -- Primeiro tenta pelo payment_id
  UPDATE transactions
  SET 
    status = final_status,
    updated_at = NOW()
  WHERE transactions.payment_id = payment_id_param;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Se não encontrou pelo payment_id, tentar pelo external_reference
  -- (pode ser que o payment_id salvo seja diferente ou seja um order_id)
  IF rows_updated = 0 THEN
    UPDATE transactions
    SET 
      status = final_status,
      payment_id = payment_id_param, -- Atualizar o payment_id também
      updated_at = NOW()
    WHERE transactions.external_reference = payment_id_param;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
  END IF;
  
  -- Log da atualização
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Transaction % updated to status: % (final: %)', payment_id_param, status_param, final_status;
  ELSE
    RAISE WARNING 'Transaction % not found - no rows updated', payment_id_param;
  END IF;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION process_mercado_pago_webhook IS 'Processa webhooks do Mercado Pago para atualizar status de transações';

-- Permissão para service role executar a função
GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook TO service_role;
