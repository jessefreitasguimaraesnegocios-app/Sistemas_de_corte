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

    let responseData: any;
    let responseError: any;
    
    try {
      const result = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'pix',
          email_cliente: email,
          business_id: businessId,
          referencia_externa: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        } as PaymentRequest,
      });
      
      responseData = result.data;
      responseError = result.error;
    } catch (invokeError: any) {
      // Capturar erro de invocação (pode ocorrer quando status não é 2xx)
      console.error('Erro ao invocar Edge Function:', invokeError);
      responseError = invokeError;
      
      // Tentar extrair dados do erro se disponível
      if (invokeError.data) {
        responseData = invokeError.data;
      }
    }

    // Se há erro, tentar extrair mensagem detalhada
    if (responseError) {
      console.error('Erro na Edge Function:', responseError);
      console.error('Data recebida (pode conter detalhes do erro):', responseData);
      
      let errorMessage = 'Erro ao criar pagamento PIX';
      
      // Prioridade 1: Mensagem do data (resposta JSON da Edge Function)
      if (responseData && responseData.error) {
        errorMessage = responseData.error;
        if (responseData.details) {
          const detailsStr = typeof responseData.details === 'string' 
            ? responseData.details 
            : JSON.stringify(responseData.details);
          errorMessage += ` - ${detailsStr}`;
        }
        if (responseData.hint) {
          errorMessage += ` - ${responseData.hint}`;
        }
      }
      // Prioridade 2: Mensagem do objeto error
      else if (responseError.message) {
        errorMessage = responseError.message;
      }
      // Prioridade 3: Contexto do erro
      else if (responseError.context && responseError.context.msg) {
        errorMessage = responseError.context.msg;
      }
      // Prioridade 4: String direta
      else if (typeof responseError === 'string') {
        errorMessage = responseError;
      }
      
      throw new Error(errorMessage);
    }

    // Verificar se a resposta contém erro (mesmo com status 200)
    if (responseData && responseData.error) {
      console.error('Erro na resposta da Edge Function:', responseData);
      const errorDetails = responseData.details 
        ? (typeof responseData.details === 'string' ? responseData.details : JSON.stringify(responseData.details))
        : '';
      const errorHint = responseData.hint ? ` Dica: ${responseData.hint}` : '';
      throw new Error(`${responseData.error}${errorDetails ? ` - ${errorDetails}` : ''}${errorHint}`);
    }

    if (!responseData || !responseData.success) {
      console.error('Resposta sem sucesso da Edge Function:', responseData);
      throw new Error(responseData?.error || 'Falha ao processar pagamento PIX');
    }

    return responseData as PixPaymentResponse;
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

    let responseData: any;
    let responseError: any;
    
    try {
      const result = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'credit_card',
          email_cliente: email,
          token_cartao: tokenCartao,
          business_id: businessId,
          referencia_externa: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        } as PaymentRequest,
      });
      
      responseData = result.data;
      responseError = result.error;
    } catch (invokeError: any) {
      // Capturar erro de invocação (pode ocorrer quando status não é 2xx)
      console.error('Erro ao invocar Edge Function:', invokeError);
      responseError = invokeError;
      
      // Tentar extrair dados do erro se disponível
      if (invokeError.data) {
        responseData = invokeError.data;
      }
    }

    // Se há erro, tentar extrair mensagem detalhada
    if (responseError) {
      console.error('Erro na Edge Function:', responseError);
      console.error('Data recebida (pode conter detalhes do erro):', responseData);
      
      let errorMessage = 'Erro ao criar pagamento com cartão';
      
      // Prioridade 1: Mensagem do data (resposta JSON da Edge Function)
      if (responseData && responseData.error) {
        errorMessage = responseData.error;
        if (responseData.details) {
          const detailsStr = typeof responseData.details === 'string' 
            ? responseData.details 
            : JSON.stringify(responseData.details);
          errorMessage += ` - ${detailsStr}`;
        }
        if (responseData.hint) {
          errorMessage += ` - ${responseData.hint}`;
        }
      }
      // Prioridade 2: Mensagem do objeto error
      else if (responseError.message) {
        errorMessage = responseError.message;
      }
      // Prioridade 3: Contexto do erro
      else if (responseError.context && responseError.context.msg) {
        errorMessage = responseError.context.msg;
      }
      // Prioridade 4: String direta
      else if (typeof responseError === 'string') {
        errorMessage = responseError;
      }
      
      throw new Error(errorMessage);
    }

    if (!responseData || !responseData.success) {
      console.error('Resposta sem sucesso da Edge Function:', responseData);
      throw new Error(responseData?.error || 'Falha ao processar pagamento com cartão');
    }

    return responseData as CreditCardPaymentResponse;
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
