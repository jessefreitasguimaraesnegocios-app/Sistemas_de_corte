import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, CreditCard, QrCode, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { criarPagamentoPix, criarPagamentoCartao, verificarStatusPagamento } from '../services/paymentService';
import { PixPaymentResponse, CreditCardPaymentResponse } from '../types';
import { supabase } from '../lib/supabase';
import { initMercadoPago, CardNumber, SecurityCode, ExpirationDate, createCardToken } from '@mercadopago/sdk-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  email: string;
  businessId?: string;
  onPaymentSuccess: () => void;
  productId?: string; // ID do produto para buscar business_id correto
}

type PaymentTab = 'pix' | 'card';

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  email,
  businessId,
  onPaymentSuccess,
  productId,
}: CheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [cardData, setCardData] = useState<CreditCardPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Formulário de cartão
  const [cardName, setCardName] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  
  // Refs para os campos seguros do Mercado Pago
  // ✅ IMPORTANTE: Os campos CardNumber, SecurityCode e ExpirationDate são gerenciados pelo SDK
  // Não usamos useState para eles - o SDK gerencia o estado internamente
  // ✅ Usar useRef para manter referências estáveis e evitar re-renderizações
  const cardNumberRef = useRef<any>(null);
  const securityCodeRef = useRef<any>(null);
  const expirationDateRef = useRef<any>(null);
  
  // ✅ Estilos dos campos do SDK - memoizados para evitar re-renderizações
  const cardFieldStyle = useMemo(() => ({
    fontSize: '15px',
    fontFamily: 'monospace',
    width: '100%',
    border: 'none',
    outline: 'none',
    color: '#0f172a',
    background: 'transparent'
  }), []);
  
  // Taxa de split (buscar do business)
  const [splitPercentage, setSplitPercentage] = useState<number>(10); // Default 10%

  // Calcula taxa baseada no split do business
  const applicationFee = total * (splitPercentage / 100);
  const totalWithFee = total;

  // Buscar taxa de split do business quando o modal abrir
  useEffect(() => {
    if (isOpen && businessId) {
      const fetchBusinessSplit = async () => {
        try {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('revenue_split')
            .eq('id', businessId)
            .single();
          
          if (!businessError && businessData?.revenue_split) {
            setSplitPercentage(Number(businessData.revenue_split));
            console.log('📊 Taxa de split do business:', businessData.revenue_split + '%');
          }
        } catch (error) {
          console.error('Erro ao buscar taxa de split:', error);
        }
      };
      
      fetchBusinessSplit();
    }
  }, [isOpen, businessId]);

  // ✅ Buscar e inicializar SDK do Mercado Pago quando o modal abrir e estiver na aba de cartão
  useEffect(() => {
    if (isOpen && activeTab === 'card' && businessId && !mpPublicKey) {
      const fetchPublicKey = async () => {
        try {
          console.log('🔑 Buscando public key do Mercado Pago...');
          
          // Buscar public key do business
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('mp_public_key')
            .eq('id', businessId)
            .single();
          
          if (businessError) {
            console.error('Erro ao buscar business:', businessError);
            // Tentar via Edge Function como fallback
            try {
              const { data: keyData, error: keyError } = await supabase.functions.invoke('getMercadoPagoPublicKey', {
                body: { business_id: businessId },
              });
              
              if (!keyError && keyData?.public_key) {
                console.log('✅ Public key obtida via Edge Function');
                setMpPublicKey(keyData.public_key);
                // ✅ Inicializar SDK apenas uma vez
                if (!mpInitialized) {
                  initMercadoPago(keyData.public_key);
                  setMpInitialized(true);
                  console.log('✅ SDK do Mercado Pago inicializado');
                }
                return;
              }
            } catch (e) {
              console.error('Erro ao buscar public key via Edge Function:', e);
            }
            
            setError('Public key do Mercado Pago não configurada. Configure no painel do desenvolvedor.');
            return;
          }
          
          if (businessData?.mp_public_key) {
            console.log('✅ Public key obtida do banco de dados');
            setMpPublicKey(businessData.mp_public_key);
            // ✅ Inicializar SDK apenas uma vez
            if (!mpInitialized) {
              initMercadoPago(businessData.mp_public_key);
              setMpInitialized(true);
              console.log('✅ SDK do Mercado Pago inicializado');
            }
          } else {
            // Tentar via Edge Function como fallback
            try {
              const { data: keyData, error: keyError } = await supabase.functions.invoke('getMercadoPagoPublicKey', {
                body: { business_id: businessId },
              });
              
              if (!keyError && keyData?.public_key) {
                console.log('✅ Public key obtida via Edge Function (fallback)');
                setMpPublicKey(keyData.public_key);
                if (!mpInitialized) {
                  initMercadoPago(keyData.public_key);
                  setMpInitialized(true);
                  console.log('✅ SDK do Mercado Pago inicializado');
                }
              } else {
                setError('Public key do Mercado Pago não configurada. Configure no painel do desenvolvedor.');
              }
            } catch (e) {
              console.error('Erro ao buscar public key:', e);
              setError('Public key do Mercado Pago não configurada.');
            }
          }
        } catch (error) {
          console.error('Erro ao buscar public key:', error);
          setError('Erro ao configurar pagamento com cartão. Tente novamente.');
        }
      };
      
      fetchPublicKey();
    }
  }, [isOpen, activeTab, businessId, mpPublicKey, mpInitialized]);

  useEffect(() => {
    if (!isOpen) {
      // Reset ao fechar
      setPixData(null);
      setCardData(null);
      setError(null);
      setActiveTab('pix');
      setCardName('');
      setCopied(false);
      setCheckingPayment(false);
      setPaymentStatus(null);
      setMpPublicKey(null);
      setMpInitialized(false);
      
      // ✅ Limpar campos do SDK do Mercado Pago via refs (se disponível)
      if (cardNumberRef.current) {
        try {
          cardNumberRef.current?.clear?.();
        } catch (e) {
          // Ignorar erros
        }
      }
      if (securityCodeRef.current) {
        try {
          securityCodeRef.current?.clear?.();
        } catch (e) {
          // Ignorar erros
        }
      }
      if (expirationDateRef.current) {
        try {
          expirationDateRef.current?.clear?.();
        } catch (e) {
          // Ignorar erros
        }
      }
      setSplitPercentage(10); // Reset para default
    }
  }, [isOpen]);

  // Polling para verificar status do pagamento PIX
  useEffect(() => {
    if (!pixData || !pixData.payment_id || paymentStatus === 'approved') return;

    const checkPaymentStatus = async () => {
      try {
        console.log('🔄 Verificando status do pagamento:', pixData.payment_id, 'businessId:', businessId);
        const result = await verificarStatusPagamento(pixData.payment_id, businessId);
        console.log('📊 Resultado da verificação:', result);

        if (result.approved) {
          console.log('✅ Pagamento aprovado! Mostrando confirmação...');
          setPaymentStatus('approved');
          setCheckingPayment(false);
          // Aguardar 2 segundos para mostrar a tela de sucesso, depois fechar
          setTimeout(() => {
            console.log('🎉 Chamando onPaymentSuccess e fechando modal');
            onPaymentSuccess();
            onClose();
          }, 2500);
        } else if (result.status === 'rejected' || result.status === 'cancelled' || result.status === 'error') {
          console.log('❌ Pagamento rejeitado/cancelado:', result.status);
          setPaymentStatus('rejected');
          setCheckingPayment(false);
          setError('Pagamento rejeitado ou cancelado. Tente novamente.');
        } else {
          console.log('⏳ Pagamento ainda pendente:', result.status);
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
        // Não interromper o polling por erros temporários
      }
    };

    if (pixData && !checkingPayment && (paymentStatus === null || paymentStatus === 'pending')) {
      setCheckingPayment(true);
      // Verificar imediatamente e depois a cada 3 segundos
      checkPaymentStatus();
      const interval = setInterval(checkPaymentStatus, 3000);
      
      // Limpar após 10 minutos (timeout)
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setCheckingPayment(false);
        if (paymentStatus !== 'approved') {
          setError('Tempo limite excedido. Por favor, tente novamente.');
        }
      }, 600000); // 10 minutos

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [pixData, checkingPayment, paymentStatus, onPaymentSuccess, onClose]);

  const handlePixPayment = async () => {
    // Validações
    if (!email || !email.includes('@')) {
      setError('Email inválido. Por favor, verifique seu email.');
      return;
    }

    if (!businessId) {
      setError('ID do estabelecimento não encontrado. Por favor, recarregue a página e tente novamente.');
      console.error('businessId não fornecido ao CheckoutModal');
      return;
    }

    if (total <= 0) {
      setError('Valor inválido. O total deve ser maior que zero.');
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus(null);

    try {
      // ✅ 1️⃣ BLOQUEAR CHAMADA ENQUANTO hasUser === false
      // Isso evita chamar PIX quando INITIAL_SESSION ainda não carregou o usuário
      console.log('🔐 Validando usuário antes de chamar PIX...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('⚠️ Usuário ainda não carregado ou sessão inválida, abortando pagamento', {
          hasUser: !!user,
          userError: userError?.message
        });
        setError('Sessão inválida. Por favor, faça login novamente e tente novamente.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Usuário validado:', { userId: user.id, email: user.email });
      
      console.log('CheckoutModal - Criando pagamento PIX:', { 
        total, 
        email, 
        businessId,
        productId,
        userId: user.id
      });
      
      let validBusinessId = businessId;
      
      // Verificar se o businessId fornecido existe no banco de dados
      const { data: existingBusiness, error: businessCheckError } = await supabase
        .from('businesses')
        .select('id, status, mp_access_token')
        .eq('id', businessId)
        .single();
      
      if (businessCheckError || !existingBusiness) {
        console.warn('Business não encontrado com o ID fornecido:', businessId);
        console.log('Tentando buscar business correto do banco de dados...');
        
        try {
          // Tentar buscar o business_id usando o ID do produto
          if (productId) {
            console.log('Buscando business_id usando productId:', productId);
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('business_id')
              .eq('id', productId)
              .single();
            
            if (!productError && productData && productData.business_id) {
              const productBusinessId = productData.business_id;
              console.log('business_id encontrado no produto:', productBusinessId);
              
              // Verificar se esse business existe e está ativo
              const { data: productBusiness, error: productBizError } = await supabase
                .from('businesses')
                .select('id, status')
                .eq('id', productBusinessId)
                .single();
              
              if (!productBizError && productBusiness && productBusiness.status === 'ACTIVE') {
                validBusinessId = productBusinessId;
                console.log('Usando business_id do produto:', validBusinessId);
              } else {
                console.warn('Business do produto não encontrado ou inativo:', productBusinessId);
              }
            }
          }
          
          // Se ainda não tem um businessId válido, buscar qualquer business ativo
          if (!validBusinessId || (existingBusiness && existingBusiness.status !== 'ACTIVE')) {
            console.log('Buscando businesses ativos...');
            const { data: businesses, error: bizError } = await supabase
              .from('businesses')
              .select('id')
              .eq('status', 'ACTIVE')
              .limit(1);
            
            if (!bizError && businesses && businesses.length > 0) {
              validBusinessId = businesses[0].id;
              console.log('Business ativo encontrado no banco:', validBusinessId);
            } else {
              console.error('Nenhum business ativo encontrado no banco');
              setError(`ID do estabelecimento inválido: ${businessId}. Nenhum estabelecimento válido encontrado no banco de dados. Por favor, entre em contato com o suporte.`);
              setLoading(false);
              return;
            }
          }
        } catch (lookupError) {
          console.error('Erro ao buscar business no banco:', lookupError);
          setError(`ID do estabelecimento inválido: ${businessId}. Erro ao buscar estabelecimento. Por favor, recarregue a página e tente novamente.`);
          setLoading(false);
          return;
        }
      } else if (existingBusiness.status !== 'ACTIVE') {
        // Business existe mas não está ativo
        setError('O estabelecimento não está ativo. Por favor, entre em contato com o suporte.');
        setLoading(false);
        return;
      } else if (!existingBusiness.mp_access_token) {
        // Business existe mas não tem token configurado
        setError('O estabelecimento não possui Access Token do Mercado Pago configurado. Configure o token antes de processar pagamentos.');
        setLoading(false);
        return;
      }
      
      const response = await criarPagamentoPix(total, email, validBusinessId);
      
      console.log('Resposta do pagamento PIX:', response);
      
      if (response.success && (response.qr_code_base64 || response.qr_code)) {
        setPixData(response);
        setPaymentStatus('pending');
      } else {
        const errorMsg = response.error || 'Erro ao gerar QR Code PIX. Verifique as configurações do Mercado Pago.';
        console.error('Erro na resposta do pagamento:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Erro ao criar pagamento PIX:', err);
      setError(err.message || 'Erro ao processar pagamento PIX. Tente novamente ou use outro método de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    // Validações
    if (!email || !email.includes('@')) {
      setError('Email inválido. Por favor, verifique seu email.');
      return;
    }

    if (!businessId) {
      setError('ID do estabelecimento não encontrado. Por favor, recarregue a página.');
      return;
    }

    // ✅ Validar apenas o nome do cartão (único campo que controlamos manualmente)
    if (!cardName || cardName.trim().length < 3) {
      setError('Nome no cartão é obrigatório e deve ter pelo menos 3 caracteres.');
      return;
    }

    // ✅ Os campos CardNumber, SecurityCode e ExpirationDate são validados pelo SDK do Mercado Pago
    // Não precisamos validar manualmente - o createCardToken já faz isso

    setLoading(true);
    setError(null);

    try {
      let validBusinessId = businessId;
      
      // Verificar se o businessId fornecido existe no banco de dados
      const { data: existingBusiness, error: businessCheckError } = await supabase
        .from('businesses')
        .select('id, status, mp_access_token')
        .eq('id', businessId)
        .single();
      
      if (businessCheckError || !existingBusiness) {
        console.warn('Business não encontrado com o ID fornecido:', businessId);
        console.log('Tentando buscar business correto do banco de dados...');
        
        try {
          // Tentar buscar o business_id usando o ID do produto
          if (productId) {
            console.log('Buscando business_id usando productId:', productId);
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('business_id')
              .eq('id', productId)
              .single();
            
            if (!productError && productData && productData.business_id) {
              const productBusinessId = productData.business_id;
              console.log('business_id encontrado no produto:', productBusinessId);
              
              // Verificar se esse business existe e está ativo
              const { data: productBusiness, error: productBizError } = await supabase
                .from('businesses')
                .select('id, status, mp_access_token')
                .eq('id', productBusinessId)
                .single();
              
              if (!productBizError && productBusiness && productBusiness.status === 'ACTIVE' && productBusiness.mp_access_token) {
                validBusinessId = productBusinessId;
                console.log('Usando business_id do produto:', validBusinessId);
              } else {
                console.warn('Business do produto não encontrado, inativo ou sem token:', productBusinessId);
              }
            }
          }
          
          // Se ainda não tem um businessId válido, buscar qualquer business ativo com token
          if (!validBusinessId || (existingBusiness && existingBusiness.status !== 'ACTIVE')) {
            console.log('Buscando businesses ativos com token configurado...');
            const { data: businesses, error: bizError } = await supabase
              .from('businesses')
              .select('id, mp_access_token')
              .eq('status', 'ACTIVE')
              .not('mp_access_token', 'is', null)
              .limit(1);
            
            if (!bizError && businesses && businesses.length > 0) {
              validBusinessId = businesses[0].id;
              console.log('Business ativo encontrado no banco:', validBusinessId);
            } else {
              console.error('Nenhum business ativo encontrado no banco');
              setError(`ID do estabelecimento inválido: ${businessId}. Nenhum estabelecimento válido encontrado no banco de dados. Por favor, entre em contato com o suporte.`);
              setLoading(false);
              return;
            }
          }
        } catch (lookupError) {
          console.error('Erro ao buscar business no banco:', lookupError);
          setError(`ID do estabelecimento inválido: ${businessId}. Erro ao buscar estabelecimento. Por favor, recarregue a página e tente novamente.`);
          setLoading(false);
          return;
        }
      } else if (existingBusiness.status !== 'ACTIVE') {
        // Business existe mas não está ativo
        setError('O estabelecimento não está ativo. Por favor, entre em contato com o suporte.');
        setLoading(false);
        return;
      } else if (!existingBusiness.mp_access_token) {
        // Business existe mas não tem token configurado
        setError('O estabelecimento não possui Access Token do Mercado Pago configurado. Configure o token antes de processar pagamentos.');
        setLoading(false);
        return;
      }
      
      // Gerar token do cartão usando o SDK oficial do Mercado Pago
      if (!mpInitialized || !mpPublicKey) {
        setError('SDK do Mercado Pago não inicializado. Aguarde um momento e tente novamente.');
        setLoading(false);
        return;
      }
      
      // ✅ Verificar se os refs estão disponíveis (verificação básica)
      if (!cardNumberRef.current || !securityCodeRef.current || !expirationDateRef.current) {
        console.warn('⚠️ Refs não disponíveis, mas tentando mesmo assim...');
        // Não bloquear - o SDK pode lidar com isso se os componentes estiverem renderizados
      }
      
      // ✅ CRÍTICO: Aguardar um tempo para garantir que os campos do SDK estão montados
      // O SDK do Mercado Pago cria iframes internamente e precisa de tempo para montar
      console.log('⏳ Aguardando campos do SDK estarem prontos...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 segundos para garantir montagem completa
      
      // ✅ Gerar token usando o SDK do Mercado Pago
      // O SDK valida automaticamente todos os campos (número, CVV, validade)
      // Se os campos não estiverem prontos, o SDK retornará um erro claro
      let cardToken: string;
      let paymentMethodId: string | null = null; // ✅ Declarar fora do try para estar no escopo correto
      
      try {
        console.log('🔄 Gerando token do cartão com SDK do Mercado Pago...');
        console.log('✅ SDK inicializado:', mpInitialized);
        console.log('✅ Public key disponível:', !!mpPublicKey);
        
        const tokenData = await createCardToken({
          cardholderName: cardName.trim(),
          identificationType: 'CPF',
          identificationNumber: '00000000000', // Em produção, coletar do usuário
        });
        
        if (!tokenData || !tokenData.id) {
          // ✅ O SDK retorna erro se os campos estiverem inválidos
          const errorMessage = tokenData?.error?.message || 'Não foi possível gerar o token do cartão. Verifique se todos os campos estão preenchidos corretamente.';
          setError(errorMessage);
          setLoading(false);
          return;
        }
        
        cardToken = tokenData.id;
        
        // ✅ IMPORTANTE: Não podemos buscar bandeira do frontend (CORS bloqueia)
        // A Edge Function vai buscar a bandeira do token via API do Mercado Pago
        // O SDK pode retornar payment_method_id, mas nem sempre está disponível
        paymentMethodId = tokenData.payment_method_id || null;
        
        console.log('✅ Token do cartão gerado com sucesso');
        if (paymentMethodId) {
          console.log('✅ Bandeira do cartão detectada pelo SDK:', paymentMethodId);
        } else {
          console.log('ℹ️ Bandeira não detectada pelo SDK, será buscada no backend');
        }
      } catch (tokenError: any) {
        console.error('❌ Erro ao gerar token do cartão:', tokenError);
        // ✅ O SDK do Mercado Pago retorna erros detalhados sobre campos inválidos
        const errorMessage = tokenError?.message || tokenError?.error?.message || 'Erro ao processar dados do cartão. Verifique se todos os campos estão preenchidos corretamente.';
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // ✅ Enviar token E payment_method_id para a Edge Function
      const response = await criarPagamentoCartao(
        total, 
        email, 
        cardToken, 
        validBusinessId,
        paymentMethodId // ✅ Bandeira do cartão (pode ser null, backend vai buscar)
      );
      
      if (response.success && response.status === 'approved') {
        setCardData(response);
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.error || `Pagamento não aprovado: ${response.status_detail || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('Erro ao processar pagamento com cartão:', err);
      setError(err.message || 'Erro ao processar pagamento com cartão. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ✅ Funções de formatação removidas - o SDK do Mercado Pago gerencia isso automaticamente
  // Os componentes CardNumber, SecurityCode e ExpirationDate já fazem a formatação

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">Finalizar Pagamento</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Total */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Total a pagar</span>
              <span className="text-3xl font-black text-slate-900">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-slate-500">
              <span>Taxa da plataforma ({splitPercentage}%)</span>
              <span>R$ {applicationFee.toFixed(2)}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex-1 px-6 py-4 font-bold text-sm transition-colors ${
                activeTab === 'pix'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode size={18} />
                PIX
              </div>
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`flex-1 px-6 py-4 font-bold text-sm transition-colors ${
                activeTab === 'card'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard size={18} />
                Cartão de Crédito
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <p className="text-red-700 font-semibold text-sm">{error}</p>
              </div>
            )}

            {/* PIX Tab */}
            {activeTab === 'pix' && (
              <div className="space-y-6">
                {!pixData ? (
                  <>
                    <div className="text-center py-8">
                      <QrCode size={64} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-600 font-semibold mb-2">
                        Pague com PIX e tenha aprovação instantânea
                      </p>
                      <p className="text-sm text-slate-500">
                        Clique no botão abaixo para gerar o QR Code
                      </p>
                    </div>
                    <button
                      onClick={handlePixPayment}
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Gerando QR Code...
                        </>
                      ) : (
                        <>
                          <QrCode size={20} />
                          Gerar QR Code PIX
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 inline-block mb-4">
                        {pixData.qr_code_base64 ? (
                          <img
                            src={`data:image/png;base64,${pixData.qr_code_base64}`}
                            alt="QR Code PIX"
                            className="w-64 h-64"
                          />
                        ) : (
                          <QRCodeSVG value={pixData.qr_code || ''} size={256} />
                        )}
                      </div>
                      <p className="text-slate-600 font-semibold mb-2">
                        Escaneie o QR Code com o app do seu banco
                      </p>
                      {pixData.qr_code && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={copyPixCode}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
                          >
                            <Copy size={16} />
                            {copied ? 'Copiado!' : 'Copiar código PIX'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                      {checkingPayment && paymentStatus === 'pending' ? (
                        <div className="flex items-center gap-3">
                          <Loader2 size={20} className="animate-spin text-indigo-600" />
                          <p className="text-sm text-indigo-700 font-semibold">
                            Aguardando pagamento... Verificando automaticamente...
                          </p>
                        </div>
                      ) : paymentStatus === 'approved' ? (
                        <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
                          <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle2 size={40} className="text-green-600" />
                          </div>
                          <p className="text-lg text-green-700 font-black">
                            Pagamento Aprovado!
                          </p>
                          <p className="text-sm text-green-600">
                            Obrigado pela sua compra. Redirecionando...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-indigo-700 font-semibold">
                          Escaneie o QR Code e finalize o pagamento. A confirmação será automática.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card Tab */}
            {activeTab === 'card' && (
              <div className="space-y-6">
                {!cardData ? (
                  <>
                    {!mpInitialized ? (
                      <div className="text-center py-8">
                        <Loader2 size={32} className="mx-auto text-indigo-600 animate-spin mb-4" />
                        <p className="text-slate-600 font-semibold">
                          Configurando pagamento seguro...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Número do Cartão */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Número do Cartão
                          </label>
                          <div className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                            <CardNumber
                              ref={cardNumberRef}
                              placeholder="0000 0000 0000 0000"
                              style={cardFieldStyle}
                            />
                          </div>
                        </div>

                        {/* Nome no Cartão */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Nome no Cartão
                          </label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            placeholder="NOME COMPLETO"
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 bg-white text-sm"
                          />
                        </div>

                        {/* Validade e CVV */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Validade
                            </label>
                            <div className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                              <ExpirationDate
                                ref={expirationDateRef}
                                placeholder="MM/AA"
                                style={cardFieldStyle}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              CVV
                            </label>
                            <div className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                              <SecurityCode
                                ref={securityCodeRef}
                                placeholder="123"
                                style={cardFieldStyle}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleCardPayment}
                      disabled={loading || !mpInitialized}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} />
                          Pagar R$ {total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      Pagamento Aprovado!
                    </h3>
                    <p className="text-slate-600">
                      ID do pagamento: {cardData.payment_id}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
