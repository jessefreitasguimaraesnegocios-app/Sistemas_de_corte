import { supabase } from '../lib/supabase';
import { PaymentRequest, PixPaymentResponse, CreditCardPaymentResponse } from '../types';

/**
 * Verifica o status de um pagamento PIX
 * @param paymentId ID do pagamento retornado pelo Mercado Pago
 * @returns Status do pagamento
 */
export async function verificarStatusPagamento(
  paymentId: number
): Promise<{ status: string; approved: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('checkPaymentStatus', {
      body: { payment_id: paymentId },
    });

    if (error) {
      throw new Error(error.message || 'Erro ao verificar status do pagamento');
    }

    return {
      status: data.status || 'pending',
      approved: data.status === 'approved',
    };
  } catch (error: any) {
    console.error('Erro ao verificar status do pagamento:', error);
    return {
      status: 'error',
      approved: false,
    };
  }
}

/**
 * Cria um pagamento PIX via Mercado Pago
 * @param valor Valor do pagamento em reais
 * @param email Email do cliente
 * @param businessId ID do negócio (opcional)
 * @returns Resposta com QR Code PIX
 */
export async function criarPagamentoPix(
  valor: number,
  email: string,
  businessId?: string
): Promise<PixPaymentResponse> {
  try {
    // Validação de parâmetros obrigatórios
    if (!businessId) {
      throw new Error('ID do estabelecimento é obrigatório para processar o pagamento');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    if (!valor || valor <= 0) {
      throw new Error('Valor inválido. O valor deve ser maior que zero.');
    }

    const { data, error } = await supabase.functions.invoke('createPayment', {
      body: {
        valor,
        metodo_pagamento: 'pix',
        email_cliente: email,
        business_id: businessId,
        referencia_externa: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      } as PaymentRequest,
    });

    if (error) {
      console.error('Erro na Edge Function (error object):', error);
      // Tentar extrair mensagem de erro mais detalhada
      const errorMessage = error.message || error.toString() || 'Erro ao criar pagamento PIX';
      throw new Error(errorMessage);
    }

    // Verificar se a resposta contém erro (mesmo com status 200)
    if (data && data.error) {
      console.error('Erro na resposta da Edge Function:', data);
      const errorDetails = data.details ? ` Detalhes: ${JSON.stringify(data.details)}` : '';
      const errorHint = data.hint ? ` Dica: ${data.hint}` : '';
      throw new Error(`${data.error}${errorDetails}${errorHint}`);
    }

    if (!data || !data.success) {
      console.error('Resposta sem sucesso da Edge Function:', data);
      throw new Error(data?.error || 'Falha ao processar pagamento PIX');
    }

    return data as PixPaymentResponse;
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error);
    return {
      success: false,
      txid: '',
      payment_id: 0,
      status: 'error',
      application_fee: 0,
      error: error.message || 'Erro desconhecido ao processar pagamento PIX',
    };
  }
}

/**
 * Cria um pagamento com cartão de crédito via Mercado Pago
 * @param valor Valor do pagamento em reais
 * @param email Email do cliente
 * @param tokenCartao Token do cartão gerado pelo Mercado Pago SDK
 * @param businessId ID do negócio (opcional)
 * @returns Resposta com resultado do pagamento
 */
export async function criarPagamentoCartao(
  valor: number,
  email: string,
  tokenCartao: string,
  businessId?: string
): Promise<CreditCardPaymentResponse> {
  try {
    if (!tokenCartao) {
      throw new Error('Token do cartão é obrigatório');
    }

    const { data, error } = await supabase.functions.invoke('createPayment', {
      body: {
        valor,
        metodo_pagamento: 'credit_card',
        email_cliente: email,
        token_cartao: tokenCartao,
        business_id: businessId,
        referencia_externa: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      } as PaymentRequest,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao criar pagamento com cartão');
    }

    if (!data.success) {
      throw new Error(data.error || 'Falha ao processar pagamento com cartão');
    }

    return data as CreditCardPaymentResponse;
  } catch (error: any) {
    console.error('Erro ao criar pagamento com cartão:', error);
    return {
      success: false,
      payment_id: 0,
      status: 'error',
      status_detail: 'Erro ao processar',
      application_fee: 0,
      transaction_amount: valor,
      error: error.message || 'Erro desconhecido ao processar pagamento com cartão',
    };
  }
}
