import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Componente de callback OAuth do Mercado Pago
 * 
 * Este componente:
 * 1. Lê o parâmetro ?code da URL
 * 2. Envia o code para a Edge Function mp-oauth-callback
 * 3. Exibe estado de loading durante o processamento
 * 4. Redireciona para a página principal com sucesso ou mostra erro
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Conectando Mercado Pago...');

  useEffect(() => {
    let isMounted = true; // Flag para evitar atualizações após desmontagem

    const processOAuth = async () => {
      try {
        // Ler o parâmetro code da URL
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // business_id

        // Validar que temos os parâmetros necessários
        if (!code || !state) {
          if (!isMounted) return;
          setStatus('error');
          setMessage('Parâmetros de autenticação inválidos. Por favor, tente novamente.');
          setTimeout(() => {
            if (isMounted) navigate('/');
          }, 3000);
          return;
        }

        // Obter redirect_uri da URL atual (mesmo usado na autorização)
        const redirectUri = `${window.location.origin}/oauth/callback`;

        console.log('🔄 Processando OAuth callback:', { code: code.substring(0, 10) + '...', state });

        // Chamar a Edge Function do Supabase para processar o OAuth
        // IMPORTANTE: A função agora é pública (--no-verify-jwt) porque o Mercado Pago não envia token
        const { data, error } = await supabase.functions.invoke('mp-oauth-callback', {
          body: {
            code,
            state,
            redirect_uri: redirectUri // Mesmo redirect_uri usado na URL de autorização
          }
        });

        if (!isMounted) return; // Evitar atualizações após desmontagem

        if (error) {
          console.error('❌ Erro ao processar OAuth:', error);
          setStatus('error');
          setMessage(
            error.message || 
            'Erro ao conectar com o Mercado Pago. Verifique suas credenciais e tente novamente.'
          );
          
          // Redirecionar após 3 segundos em caso de erro
          setTimeout(() => {
            if (isMounted) navigate('/');
          }, 3000);
          return;
        }

        // Sucesso - atualizar estado e redirecionar
        console.log('✅ OAuth processado com sucesso:', data);
        setStatus('success');
        setMessage('Mercado Pago conectado com sucesso! Redirecionando...');

        // Redirecionar para a página principal após 1.5 segundos
        setTimeout(() => {
          if (isMounted) {
            navigate('/', { 
              state: { 
                oauthSuccess: true,
                message: 'Mercado Pago conectado com sucesso!'
              }
            });
          }
        }, 1500);

      } catch (err: any) {
        if (!isMounted) return; // Evitar atualizações após desmontagem
        
        console.error('❌ Erro inesperado ao processar OAuth:', err);
        setStatus('error');
        setMessage(
          err?.message || 
          'Erro inesperado. Por favor, tente novamente mais tarde.'
        );
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
          if (isMounted) navigate('/');
        }, 3000);
      }
    };

    // Processar OAuth quando o componente montar
    processOAuth();

    // Cleanup: marcar como desmontado
    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        {/* Ícone de status */}
        <div className="flex justify-center mb-6">
          {status === 'loading' && (
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-16 h-16 text-red-600" />
          )}
        </div>

        {/* Mensagem */}
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {status === 'loading' && 'Conectando Mercado Pago...'}
          {status === 'success' && 'Conexão Realizada!'}
          {status === 'error' && 'Erro na Conexão'}
        </h2>

        <p className="text-slate-600 font-medium mb-8">
          {message}
        </p>

        {/* Barra de progresso (apenas durante loading) */}
        {status === 'loading' && (
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}

        {/* Botão para voltar (apenas em caso de erro) */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition-all mt-4"
          >
            Voltar à Página Principal
          </button>
        )}
      </div>
    </div>
  );
}
