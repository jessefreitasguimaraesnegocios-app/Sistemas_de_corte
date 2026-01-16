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

    let responseData: any = null;
    let responseError: any = null;
    
    // Usar fetch direto para garantir que capturamos o body do erro corretamente
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Obter sessão e garantir que o token está válido
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.access_token;
      
      // Verificar se o token está expirado
      if (sessionData?.session?.expires_at) {
        const expiresAt = sessionData.session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        console.log('⏰ Verificando expiração do token:', {
          expiresAt,
          now,
          timeUntilExpiry,
          isExpired: expiresAt <= now,
          expiresInSeconds: timeUntilExpiry
        });
        
        // Se expira em menos de 60 segundos ou já expirou, fazer refresh
        if (timeUntilExpiry < 60) {
          console.log('⚠️ Token expirando em breve ou expirado, fazendo refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData?.session?.access_token) {
            console.error('❌ Erro ao refreshar sessão:', refreshError);
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
          }
          
          accessToken = refreshData.session.access_token;
          console.log('✅ Sessão renovada com sucesso');
        }
      }
      
      // Se não há sessão ou token, tentar refresh
      if (sessionError || !accessToken) {
        console.log('⚠️ Sessão inválida ou expirada, tentando refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session?.access_token) {
          console.error('❌ Erro ao refreshar sessão:', refreshError);
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        accessToken = refreshData.session.access_token;
        console.log('✅ Sessão renovada com sucesso');
      }
      
      if (!accessToken) {
        throw new Error('Não foi possível obter token de autenticação. Por favor, faça login novamente.');
      }
      
      console.log('🔐 Chamando createPayment (PIX) com token:', {
        hasToken: !!accessToken,
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + '...',
        expiresAt: sessionData?.session?.expires_at,
        businessId
      });
      
      // Usar supabase.functions.invoke em vez de fetch direto
      // Isso garante que o Supabase gerencie a autenticação corretamente
      const { data, error } = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'pix',
          email_cliente: email,
          business_id: businessId,
          referencia_externa: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      // Converter resposta do invoke para formato compatível com código existente
      let responseData = data;
      let responseError = error;
      let response: Response | null = null;
      
      if (error) {
        // Se houver erro, criar um objeto Response simulado para manter compatibilidade
        response = {
          ok: false,
          status: error.status || 401,
          statusText: error.message || 'Unauthorized',
          headers: new Headers(),
          json: async () => ({ code: error.status || 401, message: error.message || 'Invalid JWT' }),
          text: async () => error.message || 'Invalid JWT',
        } as any;
        responseError = error;
      } else {
        response = {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => data,
          text: async () => JSON.stringify(data),
        } as any;
      }
      
      // Continuar com o código existente usando response simulado
      if (!response) {
        throw new Error('Erro ao criar resposta');
      }
      
      // Tentar parsear a resposta como JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        if (text) {
          try {
            responseData = JSON.parse(text);
          } catch (e) {
            responseData = { error: text };
          }
        }
      }
      
      if (!response.ok) {
        responseError = new Error(responseData?.error || `HTTP ${response.status}: ${response.statusText}`);
        console.error('❌ Erro HTTP da Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          body: responseData
        });
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

    let responseData: any = null;
    let responseError: any = null;
    
    // Usar fetch direto para garantir que capturamos o body do erro corretamente
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Obter sessão e garantir que o token está válido
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.access_token;
      
      // Verificar se o token está expirado
      if (sessionData?.session?.expires_at) {
        const expiresAt = sessionData.session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        console.log('⏰ Verificando expiração do token:', {
          expiresAt,
          now,
          timeUntilExpiry,
          isExpired: expiresAt <= now,
          expiresInSeconds: timeUntilExpiry
        });
        
        // Se expira em menos de 60 segundos ou já expirou, fazer refresh
        if (timeUntilExpiry < 60) {
          console.log('⚠️ Token expirando em breve ou expirado, fazendo refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData?.session?.access_token) {
            console.error('❌ Erro ao refreshar sessão:', refreshError);
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
          }
          
          accessToken = refreshData.session.access_token;
          console.log('✅ Sessão renovada com sucesso');
        }
      }
      
      // Se não há sessão ou token, tentar refresh
      if (sessionError || !accessToken) {
        console.log('⚠️ Sessão inválida ou expirada, tentando refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session?.access_token) {
          console.error('❌ Erro ao refreshar sessão:', refreshError);
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        accessToken = refreshData.session.access_token;
        console.log('✅ Sessão renovada com sucesso');
      }
      
      if (!accessToken) {
        throw new Error('Não foi possível obter token de autenticação. Por favor, faça login novamente.');
      }
      
      console.log('🔐 Chamando createPayment (cartão) com token:', {
        hasToken: !!accessToken,
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + '...',
        expiresAt: sessionData?.session?.expires_at,
        businessId
      });
      
      // Usar supabase.functions.invoke em vez de fetch direto
      // O Supabase client gerencia automaticamente a autenticação
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'credit_card',
          email_cliente: email,
          token_cartao: tokenCartao,
          business_id: businessId,
          referencia_externa: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      // Processar resposta do invoke
      if (invokeError) {
        responseError = invokeError;
        responseData = {
          error: invokeError.message || 'Erro ao criar pagamento',
          code: invokeError.status || 401,
          message: invokeError.message || 'Invalid JWT'
        };
        console.error('❌ Erro ao chamar createPayment:', {
          error: invokeError,
          message: invokeError.message,
          status: invokeError.status,
          context: invokeError.context
        });
      } else {
        responseData = invokeData;
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
