import { supabase } from '../lib/supabase';
import { PaymentRequest, PixPaymentResponse, CreditCardPaymentResponse } from '../types';

/**
 * Verifica o status de um pagamento PIX
 * @param paymentId ID do pagamento retornado pelo Mercado Pago
 * @param businessId ID do business (opcional, para consulta direta na API do MP)
 * @returns Status do pagamento
 */
export async function verificarStatusPagamento(
  paymentId: string | number,
  businessId?: string
): Promise<{ status: string; approved: boolean }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/checkPaymentStatus`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ payment_id: paymentId, business_id: businessId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro ao verificar status:', response.status, errorData);
      return { status: 'error', approved: false };
    }

    const data = await response.json();
    
    return {
      status: data.status || 'pending',
      approved: data.approved === true || data.status === 'approved',
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

    // 🔥 FUNÇÃO PÚBLICA - NÃO REQUER AUTENTICAÇÃO DE USUÁRIO
    // ✅ Checkout pode ser feito por cliente anônimo (PIX público, link, mesa, PWA)
    // 🔐 Segurança real vem do webhook assinado e OAuth do Mercado Pago
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/createPayment`;
    
    console.log('📤 Chamando createPayment Edge Function (PIX) - função pública...', {
      url: functionUrl,
      businessId,
      valor,
    });
    
    const requestBody = {
      valor,
      metodo_pagamento: 'pix',
      email_cliente: email,
      business_id: businessId,
      referencia_externa: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    let responseData: any = null;
    let responseError: any = null;
    
    try {
      // 🔍 DEBUG CRÍTICO - Logar exatamente o que está sendo enviado
      console.log('🔍 DEBUG - Headers sendo enviados:', {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'MISSING',
        'apikey-length': supabaseAnonKey?.length,
        'apikey-starts-with': supabaseAnonKey?.substring(0, 10),
      });
      console.log('🔍 DEBUG - URL completa:', functionUrl);
      console.log('🔍 DEBUG - Body sendo enviado:', requestBody);
      
      // ✅ FAZER FETCH DIRETO - SEM HEADER DE AUTENTICAÇÃO (função é pública)
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(requestBody),
      });
      
      // Processar resposta
      const responseText = await response.text();
      let responseJson: any;
      
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Erro ao parsear resposta JSON:', responseText);
        throw new Error(`Erro ao processar resposta do servidor: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        responseError = {
          message: responseJson.error || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          context: { body: responseJson }
        };
        
        responseData = {
          error: responseJson.error || 'Erro ao criar pagamento',
          details: responseJson.details,
          hint: responseJson.hint,
          code: response.status,
          message: responseJson.error || response.statusText
        };
        
        console.error('❌ Erro ao chamar createPayment:', {
          status: response.status,
          statusText: response.statusText,
          error: responseJson,
        });
      } else {
        responseData = responseJson;
      }
    } catch (fetchError: any) {
      console.error('❌ Erro ao chamar Edge Function:', fetchError);
      responseError = fetchError;
      responseData = { 
        error: fetchError.message || 'Erro ao conectar com o servidor',
        details: fetchError.toString()
      };
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
  businessId?: string,
  paymentMethodId?: string | null // ✅ Bandeira do cartão (visa, master, etc)
): Promise<CreditCardPaymentResponse> {
  try {
    if (!tokenCartao) {
      throw new Error('Token do cartão é obrigatório');
    }

    // 🔥 FUNÇÃO PÚBLICA - NÃO REQUER AUTENTICAÇÃO DE USUÁRIO
    // ✅ Checkout pode ser feito por cliente anônimo (checkout transparente)
    // 🔐 Segurança real vem do webhook assinado e OAuth do Mercado Pago
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/createPayment`;
    
    console.log('📤 Chamando createPayment Edge Function (Cartão) - função pública...', {
      url: functionUrl,
      businessId,
      valor,
    });
    
    const requestBody = {
      valor,
      metodo_pagamento: 'credit_card',
      email_cliente: email,
      token_cartao: tokenCartao,
      payment_method_id: paymentMethodId || null, // ✅ Bandeira do cartão
      business_id: businessId,
      referencia_externa: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    let responseData: any = null;
    let responseError: any = null;
    
    try {
      // ✅ FAZER FETCH DIRETO - SEM HEADER DE AUTENTICAÇÃO (função é pública)
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(requestBody),
      });
      
      // Processar resposta
      const responseText = await response.text();
      let responseJson: any;
      
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Erro ao parsear resposta JSON:', responseText);
        throw new Error(`Erro ao processar resposta do servidor: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        responseError = {
          message: responseJson.error || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          context: { body: responseJson }
        };
        
        responseData = {
          error: responseJson.error || 'Erro ao criar pagamento',
          details: responseJson.details,
          hint: responseJson.hint,
          code: response.status,
          message: responseJson.error || response.statusText
        };
        
        console.error('❌ Erro ao chamar createPayment:', {
          status: response.status,
          statusText: response.statusText,
          error: responseJson,
        });
      } else {
        responseData = responseJson;
      }
    } catch (fetchError: any) {
      console.error('❌ Erro ao fazer fetch para Edge Function:', fetchError);
      responseError = fetchError;
      responseData = { 
        error: fetchError.message || 'Erro ao conectar com o servidor',
        details: fetchError.toString()
      };
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
