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
    
    try {
      // ✅ REGRA DE OURO: SEMPRE buscar a sessão NA HORA do pagamento
      // ❌ NUNCA usar token salvo em state, context ou localStorage
      
      // ✅ 1️⃣ VALIDAÇÃO CRÍTICA: Verificar se usuário está carregado ANTES de tudo
      // Isso evita chamar quando INITIAL_SESSION ainda não carregou o usuário
      console.log('🔐 Validando usuário antes de processar pagamento...');
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError || !currentUser) {
        console.error('❌ ERRO CRÍTICO: Usuário não carregado - hasUser: false', {
          hasUser: !!currentUser,
          getUserError: getUserError?.message,
          getUserErrorName: getUserError?.name
        });
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      console.log('✅ Usuário confirmado antes de processar:', { userId: currentUser.id });
      
      // 🔄 FORÇAR REFRESH DA SESSÃO antes de chamar (garante token válido)
      // Isso é crítico quando verify_jwt = true no gateway
      console.log('🔄 Fazendo refresh da sessão antes de chamar Edge Function...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData?.session) {
        console.error('❌ ERRO ao refreshar sessão:', refreshError);
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // ⚠️ CRÍTICO: refreshSession() pode disparar TOKEN_REFRESHED com hasUser: false temporariamente
      // Precisamos aguardar o evento estabilizar e garantir que o usuário está carregado
      console.log('⏳ Aguardando estabilização da sessão após refresh...');
      
      // Aguardar um pouco para o evento TOKEN_REFRESHED completar
      // O evento TOKEN_REFRESHED pode ter hasUser: false temporariamente
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Validar novamente após refresh (garantir que usuário está carregado)
      const { data: { user: userAfterRefresh }, error: getUserAfterRefreshError } = await supabase.auth.getUser();
      
      if (getUserAfterRefreshError || !userAfterRefresh) {
        console.error('❌ ERRO: Usuário não carregado após refresh', {
          hasUser: !!userAfterRefresh,
          error: getUserAfterRefreshError?.message
        });
        throw new Error('Usuário não autenticado após refresh. Por favor, faça login novamente.');
      }
      
      console.log('✅ Usuário confirmado após refresh:', { userId: userAfterRefresh.id });
      
      const sessionData = refreshData;
      
      // 🔹 2️⃣ VALIDAÇÃO OBRIGATÓRIA: Verificar sessão E usuário após refresh
      if (!sessionData?.session) {
        console.error('❌ ERRO: Sessão não existe após refresh');
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }
      
      // ⚠️ VALIDAÇÃO CRÍTICA: Se hasUser: false → 401 garantido
      if (!sessionData.session.user) {
        console.error('❌ ERRO CRÍTICO: hasUser: false após refresh - Sessão existe mas usuário não!', {
          hasSession: !!sessionData.session,
          hasUser: !!sessionData.session.user,
          session: sessionData.session
        });
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      // 🔥 LOG DE DEBUG (obrigatório)
      console.log('🔐 AUTH CHECK (antes de chamar PIX):', {
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        userId: sessionData.session?.user?.id,
        tokenPreview: sessionData.session?.access_token?.slice(0, 25),
        tokenType: typeof sessionData.session?.access_token,
        tokenLength: sessionData.session?.access_token?.length,
        startsWithEyJ: sessionData.session?.access_token?.startsWith('eyJ'),
        expiresAt: sessionData.session?.expires_at,
        now: Math.floor(Date.now() / 1000),
        timeUntilExpiry: sessionData.session?.expires_at ? sessionData.session.expires_at - Math.floor(Date.now() / 1000) : null,
      });
      
      // ✅ O ÚNICO resultado aceitável:
      // hasSession: true
      // hasUser: true
      // tokenPreview: eyJhbGciOiJIUzI1NiIs...
      
      // Se hasUser: false → NÃO CHAMAR O PIX (já lançamos erro acima)
      
      const accessToken = sessionData.session.access_token;
      
      if (!accessToken || typeof accessToken !== 'string') {
        console.error('❌ ERRO: Token inválido ou não é string', {
          hasToken: !!accessToken,
          tokenType: typeof accessToken,
        });
        throw new Error('Token de autenticação inválido. Por favor, faça login novamente.');
      }
      
      console.log('✅ Validação completa - Pronto para chamar Edge Function', {
        hasToken: !!accessToken,
        tokenType: typeof accessToken,
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 25) + '...',
      });
      
      // ✅ SOLUÇÃO RECOMENDADA: Usar supabase.functions.invoke
      // O Supabase injeta o JWT automaticamente e evita problemas de header/Invalid JWT
      // NÃO passar Authorization manualmente - o client já envia automaticamente
      console.log('📤 Chamando createPayment Edge Function (PIX) via supabase.functions.invoke...');
      
      // ✅ VERIFICAR TOKEN ANTES DE CHAMAR (debug)
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      console.log('🔐 Token final antes de invoke:', {
        hasSession: !!finalSession,
        hasUser: !!finalSession?.user,
        tokenPreview: finalSession?.access_token?.substring(0, 30) + '...',
        expiresAt: finalSession?.expires_at,
        now: Math.floor(Date.now() / 1000),
        timeUntilExpiry: finalSession?.expires_at ? finalSession.expires_at - Math.floor(Date.now() / 1000) : null,
      });
      
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'pix',
          email_cliente: email,
          business_id: businessId,
          referencia_externa: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      });
      
      // Processar resposta
      if (invokeError) {
        responseError = invokeError;
        
        // Tentar extrair detalhes do erro do context
        let errorDetails = invokeError.message || 'Erro ao criar pagamento';
        if (invokeError.context?.body) {
          try {
            const errorBody = typeof invokeError.context.body === 'string' 
              ? JSON.parse(invokeError.context.body) 
              : invokeError.context.body;
            if (errorBody.error) errorDetails = errorBody.error;
            if (errorBody.details) errorDetails += ` - ${errorBody.details}`;
          } catch (e) {
            // Ignorar erro de parse
          }
        }
        
        responseData = {
          error: errorDetails,
          code: invokeError.status || 401,
          message: errorDetails
        };
        
        console.error('❌ Erro ao chamar createPayment:', {
          error: invokeError,
          message: invokeError.message,
          status: invokeError.status,
          context: invokeError.context,
          errorDetails
        });
      } else {
        responseData = invokeData;
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
  businessId?: string
): Promise<CreditCardPaymentResponse> {
  try {
    if (!tokenCartao) {
      throw new Error('Token do cartão é obrigatório');
    }

    let responseData: any = null;
    let responseError: any = null;
    
    try {
      // ✅ REGRA DE OURO: SEMPRE buscar a sessão NA HORA do pagamento (cartão)
      
      // ✅ 1️⃣ VALIDAÇÃO CRÍTICA: Verificar se usuário está carregado ANTES de tudo
      // Isso evita chamar quando INITIAL_SESSION ainda não carregou o usuário
      console.log('🔐 Validando usuário antes de processar pagamento (cartão)...');
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError || !currentUser) {
        console.error('❌ ERRO CRÍTICO: Usuário não carregado - hasUser: false (cartão)', {
          hasUser: !!currentUser,
          getUserError: getUserError?.message,
          getUserErrorName: getUserError?.name
        });
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      console.log('✅ Usuário confirmado antes de processar (cartão):', { userId: currentUser.id });
      
      // 🔄 FORÇAR REFRESH DA SESSÃO antes de chamar (garante token válido)
      // Isso é crítico quando verify_jwt = true no gateway
      console.log('🔄 Fazendo refresh da sessão antes de chamar Edge Function (cartão)...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData?.session) {
        console.error('❌ ERRO ao refreshar sessão (cartão):', refreshError);
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // ⚠️ CRÍTICO: refreshSession() pode disparar TOKEN_REFRESHED com hasUser: false temporariamente
      // Precisamos aguardar o evento estabilizar e garantir que o usuário está carregado
      console.log('⏳ Aguardando estabilização da sessão após refresh (cartão)...');
      
      // Aguardar um pouco para o evento TOKEN_REFRESHED completar
      // O evento TOKEN_REFRESHED pode ter hasUser: false temporariamente
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Validar novamente após refresh (garantir que usuário está carregado)
      const { data: { user: userAfterRefresh }, error: getUserAfterRefreshError } = await supabase.auth.getUser();
      
      if (getUserAfterRefreshError || !userAfterRefresh) {
        console.error('❌ ERRO: Usuário não carregado após refresh (cartão)', {
          hasUser: !!userAfterRefresh,
          error: getUserAfterRefreshError?.message
        });
        throw new Error('Usuário não autenticado após refresh. Por favor, faça login novamente.');
      }
      
      console.log('✅ Usuário confirmado após refresh (cartão):', { userId: userAfterRefresh.id });
      
      const sessionData = refreshData;
      
      // 🔹 2️⃣ VALIDAÇÃO OBRIGATÓRIA: Verificar sessão E usuário após refresh
      if (!sessionData?.session || !sessionData.session.user) {
        console.error('❌ ERRO: Sessão inválida ou usuário não autenticado (cartão)', {
          hasSession: !!sessionData?.session,
          hasUser: !!sessionData?.session?.user,
        });
        throw new Error('Sessão inválida. Por favor, faça login novamente.');
      }
      
      // 🔥 LOG DE DEBUG (obrigatório)
      console.log('🔐 AUTH CHECK (antes de chamar cartão):', {
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        userId: sessionData.session?.user?.id,
        tokenPreview: sessionData.session?.access_token?.slice(0, 25),
        expiresAt: sessionData.session?.expires_at,
        now: Math.floor(Date.now() / 1000),
        timeUntilExpiry: sessionData.session?.expires_at ? sessionData.session.expires_at - Math.floor(Date.now() / 1000) : null,
      });
      
      const accessToken = sessionData.session.access_token;
      
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Token de autenticação inválido. Por favor, faça login novamente.');
      }
      
      // ✅ SOLUÇÃO RECOMENDADA: Usar supabase.functions.invoke
      // O Supabase injeta o JWT automaticamente e evita problemas de header
      console.log('📤 Chamando createPayment Edge Function (Cartão) via supabase.functions.invoke...');
      
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('createPayment', {
        body: {
          valor,
          metodo_pagamento: 'credit_card',
          email_cliente: email,
          token_cartao: tokenCartao,
          business_id: businessId,
          referencia_externa: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
