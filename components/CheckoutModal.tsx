import React, { useState, useEffect } from 'react';
import { X, CreditCard, QrCode, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { criarPagamentoPix, criarPagamentoCartao, verificarStatusPagamento } from '../services/paymentService';
import { PixPaymentResponse, CreditCardPaymentResponse } from '../types';
import { supabase } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  email: string;
  businessId?: string;
  onPaymentSuccess: () => void;
}

type PaymentTab = 'pix' | 'card';

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  email,
  businessId,
  onPaymentSuccess,
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
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Calcula taxa de 10%
  const applicationFee = total * 0.1;
  const totalWithFee = total;

  useEffect(() => {
    if (!isOpen) {
      // Reset ao fechar
      setPixData(null);
      setCardData(null);
      setError(null);
      setActiveTab('pix');
      setCardNumber('');
      setCardName('');
      setCardExpiry('');
      setCardCvv('');
      setCopied(false);
      setCheckingPayment(false);
      setPaymentStatus(null);
    }
  }, [isOpen]);

  // Polling para verificar status do pagamento PIX
  useEffect(() => {
    if (!pixData || !pixData.payment_id || paymentStatus === 'approved') return;

    const checkPaymentStatus = async () => {
      try {
        const result = await verificarStatusPagamento(pixData.payment_id);

        if (result.approved) {
          setPaymentStatus('approved');
          setCheckingPayment(false);
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
          }, 2000);
        } else if (result.status === 'rejected' || result.status === 'cancelled' || result.status === 'error') {
          setPaymentStatus('rejected');
          setCheckingPayment(false);
          setError('Pagamento rejeitado ou cancelado. Tente novamente.');
        }
      } catch (err) {
        console.error('Erro ao verificar status do pagamento:', err);
        // Não interromper o polling por erros temporários
      }
    };

    if (pixData && !checkingPayment && paymentStatus === null) {
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
      console.log('CheckoutModal - Criando pagamento PIX:', { 
        total, 
        email, 
        businessId,
        businessIdType: typeof businessId,
        businessIdLength: businessId?.length 
      });
      
      // Verificar se businessId parece ser um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let validBusinessId = businessId;
      
      if (businessId && !uuidRegex.test(businessId) && !businessId.match(/^\d+$/)) {
        console.warn('businessId não parece ser um UUID válido:', businessId);
        console.log('Tentando buscar business correto do banco de dados...');
        
        // Tentar buscar o business correto do banco de dados
        // Buscar todos os businesses ativos e usar o primeiro (ou buscar por nome se possível)
        try {
          const { data: businesses, error: bizError } = await supabase
            .from('businesses')
            .select('id')
            .eq('status', 'ACTIVE')
            .limit(1);
          
          if (!bizError && businesses && businesses.length > 0) {
            validBusinessId = businesses[0].id;
            console.log('Business válido encontrado no banco:', validBusinessId);
          } else {
            // Se não encontrar, mostrar erro
            setError(`ID do estabelecimento inválido: ${businessId}. Por favor, recarregue a página e tente novamente. Se o problema persistir, entre em contato com o suporte.`);
            setLoading(false);
            return;
          }
        } catch (lookupError) {
          console.error('Erro ao buscar business no banco:', lookupError);
          setError(`ID do estabelecimento inválido: ${businessId}. Por favor, recarregue a página e tente novamente.`);
          setLoading(false);
          return;
        }
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

    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      setError('Preencha todos os campos do cartão');
      return;
    }

    // Validação de formato básico
    const cardNumberClean = cardNumber.replace(/\s/g, '');
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      setError('Número do cartão inválido');
      return;
    }

    // Validar data de expiração
    const [month, year] = cardExpiry.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      setError('Data de validade inválida. Use o formato MM/AA');
      return;
    }

    // Validar CVV
    if (cardCvv.length < 3 || cardCvv.length > 4) {
      setError('CVV inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // NOTA: Em produção, você deve usar o Mercado Pago SDK para gerar o token
      // Por enquanto, vamos simular um token (isso NÃO funciona em produção real)
      // Para produção, instale: npm install @mercadopago/sdk-react
      // e use o componente CardForm do Mercado Pago
      
      // Simulação de token (SUBSTITUIR POR SDK REAL EM PRODUÇÃO)
      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Em produção, use:
      // const { token } = await mp.getCardToken({ cardNumber, cardholderName, cardExpirationMonth, cardExpirationYear, securityCode });
      
      const response = await criarPagamentoCartao(total, email, mockToken, businessId);
      
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    }
    return v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

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
              <span>Taxa da plataforma (10%)</span>
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
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-green-600" />
                          <p className="text-sm text-green-700 font-semibold">
                            Pagamento confirmado! Redirecionando...
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Número do Cartão
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Nome no Cartão
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          placeholder="NOME COMPLETO"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Validade
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-700">
                        ⚠️ <strong>Nota:</strong> Esta é uma implementação de demonstração. Em produção, 
                        use o SDK oficial do Mercado Pago para tokenização segura do cartão.
                      </p>
                    </div>
                    <button
                      onClick={handleCardPayment}
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} />
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
