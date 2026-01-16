
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, Calendar, ShoppingBag, Settings, Users, DollarSign, LogOut, 
  Plus, Search, Star, Clock, Menu, X, TrendingUp, CreditCard, AlertCircle, 
  CheckCircle2, Bell, RefreshCw, ExternalLink, ShieldCheck, Zap, ArrowLeft, 
  Scissors, ShoppingBasket, ChevronRight, Sparkles, Package, UserCheck, TrendingDown,
  Trash2, Edit3, Heart, Filter, List, Minus, ShoppingCart, Camera, Image, Eye, EyeOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { User, Business, Service, Product, Appointment, Collaborator, UserRole, Transaction } from './types';
import { generateBusinessDescription } from './services/geminiService';
import { supabase, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, updatePassword } from './lib/supabase';
import CheckoutModal from './components/CheckoutModal';
import OAuthCallback from './components/OAuthCallback';

// --- TYPES ---
interface CartItem {
  product: Product;
  quantity: number;
}

// --- DEFAULT IMAGES ---
// Imagens padrão para businesses quando não há imagem definida
const DEFAULT_BARBERSHOP_IMAGE = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800';
const DEFAULT_SALON_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800';

// Dados mockados removidos - o sistema agora usa exclusivamente o banco de dados Supabase

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remover onClose das dependências para evitar re-renders infinitos

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[250] animate-in slide-in-from-bottom-4 duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
};

// --- COMPONENTS ---

const Navbar = ({ user, onLogout, onBack, cartCount, onOpenCart, onMenuToggle, isMenuOpen, notificationCount, onOpenNotifications }: any) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
      )}
      {user?.role === 'SUPER_ADMIN' && !onBack && (
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} className="text-slate-600" />
        </button>
      )}
      <div className="flex items-center gap-2 font-bold text-xl text-indigo-600 cursor-pointer" onClick={onBack}>
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
          <Zap size={20} fill="currentColor" />
        </div>
        <span className="tracking-tight hidden sm:block">Beleza<span className="text-slate-900">Hub</span></span>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {user && user.role === 'CUSTOMER' && (
        <>
          {/* Ícone de Notificações */}
          <button 
            onClick={onOpenNotifications}
            className={`relative p-2 rounded-full transition-all active:scale-90 ${
              notificationCount > 0 
                ? 'text-indigo-600 hover:bg-indigo-50' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell size={22} className={notificationCount > 0 ? 'fill-current' : ''} />
            {notificationCount > 0 && (
              <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          {/* Ícone do Carrinho */}
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-90"
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">{cartCount}</span>}
          </button>
        </>
      )}
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
          </div>
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 rounded-full border-2 border-indigo-100" alt="avatar" />
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors ml-2">
            <LogOut size={20} />
          </button>
        </div>
      )}
    </div>
  </header>
);

// Componente de Notificações
const NotificationsDrawer = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }: any) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md animate-in slide-in-from-right duration-300">
          <div className="h-full flex flex-col bg-white shadow-2xl">
            <div className="flex-1 py-8 overflow-y-auto px-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Notificações</h2>
                  {unreadCount > 0 && (
                    <p className="text-sm text-slate-500 mt-1">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={onMarkAllAsRead}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-500"><X size={24} /></button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Bell size={64} className="mb-4 opacity-20" />
                  <p className="font-bold">Nenhuma notificação ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && onMarkAsRead(notification.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        notification.read
                          ? 'bg-slate-50 border-slate-100'
                          : 'bg-indigo-50 border-indigo-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          notification.type === 'APPOINTMENT'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {notification.type === 'APPOINTMENT' ? (
                            <Calendar size={20} />
                          ) : (
                            <ShoppingBag size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className={`font-black text-sm ${
                              notification.read ? 'text-slate-600' : 'text-slate-900'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{notification.message}</p>
                          
                          {/* Dados adicionais */}
                          {notification.data && (
                            <div className="space-y-2 text-xs">
                              {notification.type === 'APPOINTMENT' && (
                                <>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <Clock size={14} />
                                    <span>{notification.data.date} às {notification.data.time}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <Scissors size={14} />
                                    <span>{notification.data.service_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <UserCheck size={14} />
                                    <span>{notification.data.collaborator_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <LayoutGrid size={14} />
                                    <span>{notification.data.business_name}</span>
                                  </div>
                                </>
                              )}
                              {notification.type === 'PURCHASE' && (
                                <>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <DollarSign size={14} />
                                    <span className="font-bold text-green-600">R$ {Number(notification.data.amount).toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <LayoutGrid size={14} />
                                    <span>{notification.data.business_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <Clock size={14} />
                                    <span>{new Date(notification.data.date).toLocaleDateString('pt-BR', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartDrawer = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemove, onCheckout, accentBg }: any) => {
  const total = cartItems.reduce((acc: number, item: CartItem) => acc + (item.product.price * item.quantity), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md animate-in slide-in-from-right duration-300">
          <div className="h-full flex flex-col bg-white shadow-2xl">
            <div className="flex-1 py-8 overflow-y-auto px-8">
              <div className="flex items-start justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Sua Sacola</h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-500"><X size={24} /></button>
              </div>

              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                   <ShoppingBasket size={64} className="mb-4 opacity-20" />
                   <p className="font-bold">Sua sacola está vazia.</p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-my-6 divide-y divide-slate-100">
                    {cartItems.map((item: CartItem) => (
                      <li key={item.product.id} className="py-6 flex">
                        <div className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden shadow-sm">
                          <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="ml-4 flex-1 flex flex-col">
                          <div>
                            <div className="flex justify-between text-base font-bold text-slate-900">
                              <h3 className="truncate max-w-[150px]">{item.product.name}</h3>
                              <p className="ml-4">R$ {(item.product.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <p className="mt-1 text-xs font-black text-indigo-600 uppercase tracking-widest">{item.product.category}</p>
                          </div>
                          <div className="flex-1 flex items-end justify-between text-sm">
                            <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                               <button 
                                 onClick={() => onUpdateQuantity(item.product.id, -1)}
                                 className="p-1 hover:bg-white rounded-lg transition-colors"
                               >
                                 <Minus size={14} />
                               </button>
                               <span className="font-black w-4 text-center">{item.quantity}</span>
                               <button 
                                 onClick={() => onUpdateQuantity(item.product.id, 1)}
                                 className="p-1 hover:bg-white rounded-lg transition-colors"
                               >
                                 <Plus size={14} />
                               </button>
                            </div>
                            <button onClick={() => onRemove(item.product.id)} className="font-bold text-rose-500 hover:text-rose-600">Remover</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-slate-100 py-8 px-8 bg-slate-50">
                <div className="flex justify-between text-base font-medium text-slate-500 mb-2">
                  <p>Subtotal</p>
                  <p>R$ {total.toFixed(2)}</p>
                </div>
                <div className="flex justify-between text-sm text-slate-400 mb-6">
                  <p>Taxas do Hub incluídas</p>
                  <p>Check-out Seguro</p>
                </div>
                <div className="flex justify-between text-xl font-black text-slate-900 mb-8">
                  <p>Total</p>
                  <p>R$ {total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={onCheckout}
                  className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${accentBg || 'bg-indigo-600'}`}
                >
                  <CreditCard size={20} />
                  Finalizar Compra
                </button>
                <button onClick={onClose} className="w-full mt-4 text-slate-400 font-bold text-sm hover:text-slate-600">Continuar Comprando</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CRM BUSINESS OWNER VIEW ---

const BusinessOwnerDashboard = ({ business, collaborators, products, services, appointments, setCollaborators, setProducts, setServices, setAppointments, addToast, setBusinesses, businesses }: any) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPOINTMENTS' | 'STORE' | 'SERVICES' | 'TEAM' | 'SETTINGS'>('DASHBOARD');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<any>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{type: 'product' | 'collaborator' | 'service', id: string, name: string} | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showBusinessEditModal, setShowBusinessEditModal] = useState(false);
  const [businessEditForm, setBusinessEditForm] = useState({ name: business.name, image: business.image });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Configuração OAuth Mercado Pago
  const handleStartMpOauth = async () => {
    if (!business?.id) {
      addToast('Erro: Estabelecimento não encontrado', 'error');
      return;
    }

    try {
      // Obter token de autenticação para chamar Edge Function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        // Tentar refresh silencioso antes de mostrar erro
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            // Se conseguiu refreshar, usar o novo token
            accessToken = refreshData.session.access_token;
          } else {
            console.error('❌ Sem sessão/Access Token para chamar getMpOauthUrl:', sessionError);
            addToast('Sessão expirada. Faça login novamente.', 'error');
            return;
          }
        } catch (refreshError) {
          console.error('❌ Erro ao refreshar sessão:', refreshError);
          addToast('Sessão expirada. Faça login novamente.', 'error');
          return;
        }
      }

      // Construir redirect URI dinamicamente baseado na URL atual
      const redirectUri = `${window.location.origin}/oauth/callback`;
      
      console.log('🔐 Chamando getMpOauthUrl com token:', {
        businessId: business.id,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
        redirectUri,
      });

      // Chamar Edge Function para obter URL de OAuth
      // Passar redirect_uri dinamicamente para evitar problemas com URLs diferentes (dev/prod)
      // O Supabase client já adiciona o apikey automaticamente, mas vamos garantir
      const { data, error } = await supabase.functions.invoke('getMpOauthUrl', {
        body: { 
          business_id: business.id,
          redirect_uri: redirectUri // URL dinâmica do frontend
        },
        // Não precisamos passar headers manualmente - o Supabase client faz isso automaticamente
        // Ele já adiciona Authorization e apikey baseado na sessão atual
      });

      if (error) {
        console.error('❌ Erro ao obter URL OAuth:', {
          error,
          message: error.message,
          context: error.context,
          status: error.status,
        });
        
        // Mensagem mais específica baseada no erro
        let errorMessage = 'Erro ao conectar ao Mercado Pago. Verifique a configuração.';
        if (error.message?.includes('401') || error.status === 401) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else if (error.message?.includes('MP_CLIENT_ID') || error.message?.includes('MP_REDIRECT_URI')) {
          errorMessage = 'Configuração do Mercado Pago incompleta. Contate o suporte.';
        }
        
        addToast(errorMessage, 'error');
        return;
      }

      // Verificar se temos a URL (pode vir como 'url' ou 'oauth_url')
      const oauthUrl = data?.url || data?.oauth_url;
      
      if (!oauthUrl) {
        console.error('❌ URL de OAuth não encontrada na resposta:', data);
        addToast('Erro: URL de OAuth não retornada', 'error');
        return;
      }

      console.log('✅ URL OAuth recebida com sucesso!');
      console.log('✅ Redirecionando para:', oauthUrl);
      
      // Redirecionar para URL de OAuth
      window.location.href = oauthUrl;
    } catch (err: any) {
      console.error('Erro ao iniciar OAuth:', err);
      addToast('Erro ao conectar ao Mercado Pago', 'error');
    }
  };

  const handleDisconnectMp = async () => {
    if (!business?.id) return;
    
    if (!confirm('Tem certeza que deseja desconectar o Mercado Pago? Você precisará reconectar para receber pagamentos.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          mp_access_token: null,
          mp_refresh_token: null,
          mp_public_key: null,
          mp_user_id: null,
          mp_live_mode: null,
          mp_token_expires_at: null
        })
        .eq('id', business.id);

      if (error) throw error;

      // Atualizar business local
      const updatedBusiness = {
        ...business,
        mp_access_token: null,
        mp_refresh_token: null,
        mp_public_key: null,
        mp_user_id: null,
        mp_live_mode: null,
        mp_token_expires_at: null
      };
      
      setBusinesses(businesses.map((b: any) => b.id === business.id ? updatedBusiness : b));
      addToast('Mercado Pago desconectado com sucesso', 'success');
    } catch (error: any) {
      console.error('Erro ao desconectar Mercado Pago:', error);
      addToast('Erro ao desconectar Mercado Pago', 'error');
    }
  };

  // Verificar status de conexão
  const isMpConnected = !!(business?.mp_access_token);
  const mpLiveMode = business?.mp_live_mode;

  // Buscar email do usuário
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUserEmail();
  }, []);

  // Atualizar formulário quando business mudar (incluindo após OAuth)
  useEffect(() => {
    setBusinessEditForm({ name: business.name, image: business.image });
  }, [business.name, business.image, business.mp_access_token]);

  // Buscar serviços do banco de dados
  const fetchServices = useCallback(async () => {
    if (!business?.id) return;
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar serviços:', error);
        return;
      }

      if (data && data.length > 0) {
        const servicesData: Service[] = data.map((s: any) => ({
          id: s.id,
          businessId: s.business_id,
          name: s.name,
          price: Number(s.price),
          duration: s.duration,
        }));
        setServices(servicesData);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoadingServices(false);
    }
  }, [business?.id, setServices]);

  // Buscar produtos do banco de dados
  const fetchProducts = useCallback(async () => {
    if (!business?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        return;
      }

      if (data && data.length > 0) {
        const productsData: Product[] = data.map((p: any) => ({
          id: p.id,
          businessId: p.business_id,
          name: p.name,
          price: Number(p.price),
          stock: p.stock,
          image: p.image,
          category: p.category,
        }));
        setProducts(productsData);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  }, [business?.id, setProducts]);

  // Buscar colaboradores do banco de dados
  const fetchCollaborators = useCallback(async () => {
    if (!business?.id) return;
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar colaboradores:', error);
        return;
      }

      if (data && data.length > 0) {
        const collaboratorsData: Collaborator[] = data.map((c: any) => ({
          id: c.id,
          businessId: c.business_id,
          name: c.name,
          role: c.role,
          avatar: c.avatar,
          rating: Number(c.rating),
        }));
        setCollaborators(collaboratorsData);
      } else {
        setCollaborators([]);
      }
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
    }
  }, [business?.id, setCollaborators]);

  useEffect(() => {
    fetchServices();
    fetchProducts();
    fetchCollaborators();
  }, [fetchServices, fetchProducts, fetchCollaborators]);

  const handleAddItem = async () => {
    if (showModal === 'PRODUCT') {
      if (editingItem && editingItem._type === 'product') {
        // Editar produto existente
        try {
          const { error } = await supabase
            .from('products')
            .update({
              name: newItem.name,
              price: Number(newItem.price),
              stock: Number(newItem.stock),
              category: newItem.category || 'Geral',
              image: newItem.image || editingItem.image,
            })
            .eq('id', editingItem.id);

          if (error) throw error;

          const updated = products.map((p: any) => 
            p.id === editingItem.id 
              ? { ...p, name: newItem.name, price: Number(newItem.price), stock: Number(newItem.stock), category: newItem.category || 'Geral', image: newItem.image || p.image }
              : p
          );
          setProducts(updated);
          addToast('Produto atualizado!', 'success');
        } catch (error: any) {
          console.error('Erro ao atualizar produto:', error);
          addToast('Erro ao atualizar produto. Tente novamente.', 'error');
        }
      } else {
        // Adicionar novo produto
        try {
          const { data, error } = await supabase
            .from('products')
            .insert({
              business_id: business.id,
              name: newItem.name,
              price: Number(newItem.price),
              stock: Number(newItem.stock),
              image: newItem.image || 'https://picsum.photos/seed/prod/400/400',
              category: newItem.category || 'Geral',
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;

          const prod: Product = {
            id: data.id,
            businessId: data.business_id,
            name: data.name,
            price: Number(data.price),
            stock: data.stock,
            image: data.image,
            category: data.category,
          };
          setProducts([...products, prod]);
          addToast('Produto adicionado ao estoque!', 'success');
        } catch (error: any) {
          console.error('Erro ao criar produto:', error);
          addToast('Erro ao cadastrar produto. Tente novamente.', 'error');
        }
      }
    } else if (showModal === 'TEAM') {
      if (editingItem && editingItem._type === 'collaborator') {
        // Editar colaborador existente
        try {
          const { error } = await supabase
            .from('collaborators')
            .update({
              name: newItem.name,
              role: newItem.role,
              avatar: newItem.avatar || editingItem.avatar,
            })
            .eq('id', editingItem.id);

          if (error) throw error;

          const updated = collaborators.map((c: any) => 
            c.id === editingItem.id 
              ? { ...c, name: newItem.name, role: newItem.role, avatar: newItem.avatar || c.avatar }
              : c
          );
          setCollaborators(updated);
          addToast('Profissional atualizado!', 'success');
        } catch (error: any) {
          console.error('Erro ao atualizar colaborador:', error);
          addToast('Erro ao atualizar profissional. Tente novamente.', 'error');
        }
      } else {
        // Adicionar novo colaborador
        try {
          const { data, error } = await supabase
            .from('collaborators')
            .insert({
              business_id: business.id,
              name: newItem.name,
              role: newItem.role,
              avatar: newItem.avatar || `https://i.pravatar.cc/150?u=${Math.random()}`,
              rating: 5.0,
              status: 'ACTIVE',
            })
            .select()
            .single();

          if (error) throw error;

          const pro: Collaborator = {
            id: data.id,
            businessId: data.business_id,
            name: data.name,
            role: data.role,
            avatar: data.avatar,
            rating: Number(data.rating),
          };
          setCollaborators([...collaborators, pro]);
          addToast('Novo profissional cadastrado!', 'success');
        } catch (error: any) {
          console.error('Erro ao criar colaborador:', error);
          addToast('Erro ao cadastrar profissional. Tente novamente.', 'error');
        }
      }
    } else if (showModal === 'SERVICE') {
      if (editingItem && editingItem._type === 'service') {
        // Editar serviço existente
        try {
          const { error } = await supabase
            .from('services')
            .update({
              name: newItem.name,
              price: Number(newItem.price),
              duration: Number(newItem.duration),
              description: newItem.description || null,
              category: newItem.category || null,
            })
            .eq('id', editingItem.id);

          if (error) throw error;

          const updated = services.map((s: any) => 
            s.id === editingItem.id 
              ? { ...s, name: newItem.name, price: Number(newItem.price), duration: Number(newItem.duration) }
              : s
          );
          setServices(updated);
          addToast('Serviço atualizado!', 'success');
        } catch (error: any) {
          console.error('Erro ao atualizar serviço:', error);
          addToast('Erro ao atualizar serviço. Tente novamente.', 'error');
        }
      } else {
        // Adicionar novo serviço
        try {
          const { data, error } = await supabase
            .from('services')
            .insert({
              business_id: business.id,
              name: newItem.name,
              price: Number(newItem.price),
              duration: Number(newItem.duration),
              description: newItem.description || null,
              category: newItem.category || null,
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;

          const newService: Service = {
            id: data.id,
            businessId: data.business_id,
            name: data.name,
            price: Number(data.price),
            duration: data.duration,
          };
          setServices([...services, newService]);
          addToast('Serviço cadastrado com sucesso!', 'success');
        } catch (error: any) {
          console.error('Erro ao criar serviço:', error);
          addToast('Erro ao cadastrar serviço. Tente novamente.', 'error');
        }
      }
    }
    setShowModal(null);
    setNewItem({});
    setEditingItem(null);
  };

  const handleEditItem = (item: any, type: 'product' | 'collaborator' | 'service') => {
    setEditingItem({ ...item, _type: type });
    setNewItem({ ...item, _type: type });
    if (type === 'product') setShowModal('PRODUCT');
    else if (type === 'collaborator') setShowModal('TEAM');
    else if (type === 'service') setShowModal('SERVICE');
  };

  const handleDeleteItem = (id: string, type: 'product' | 'collaborator' | 'service', name: string) => {
    setConfirmDeleteModal({ type, id, name });
  };

  const confirmDelete = async () => {
    if (!confirmDeleteModal) return;

    const { type, id, name } = confirmDeleteModal;

    if (type === 'product') {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setProducts(products.filter((p: any) => p.id !== id));
        addToast(`Produto "${name}" removido.`, 'success');
      } catch (error: any) {
        console.error('Erro ao deletar produto:', error);
        addToast('Erro ao remover produto. Tente novamente.', 'error');
      }
    } else if (type === 'collaborator') {
      try {
        const { error } = await supabase
          .from('collaborators')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setCollaborators(collaborators.filter((c: any) => c.id !== id));
        addToast(`Profissional "${name}" removido.`, 'success');
      } catch (error: any) {
        console.error('Erro ao deletar colaborador:', error);
        addToast('Erro ao remover profissional. Tente novamente.', 'error');
      }
    } else if (type === 'service') {
      try {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setServices(services.filter((s: any) => s.id !== id));
        addToast(`Serviço "${name}" removido.`, 'success');
      } catch (error: any) {
        console.error('Erro ao deletar serviço:', error);
        addToast('Erro ao remover serviço. Tente novamente.', 'error');
      }
    }

    setConfirmDeleteModal(null);
  };

  const deleteProduct = (id: string) => {
    const product = products.find((p: any) => p.id === id);
    if (product) {
      handleDeleteItem(id, 'product', product.name);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'APPOINTMENTS':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Agenda da Unidade</h3>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-colors">Gerenciar Horários</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {appointments.filter((a: any) => a.businessId === business.id).map((app: any) => (
                <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-indigo-500 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="bg-slate-100 text-slate-900 w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black">
                      <span className="text-sm opacity-40 uppercase">Hoje</span>
                      <span className="text-lg leading-none">{app.time}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Cliente #{(app.id as string).slice(-4)}</p>
                      <h4 className="font-bold text-slate-800">Serviço Agendado</h4>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"><CheckCircle2 size={18} /></button>
                    <button className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><X size={18} /></button>
                  </div>
                </div>
              ))}
              {appointments.filter((a: any) => a.businessId === business.id).length === 0 && (
                <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                  <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">Nenhum agendamento ativo.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'SERVICES':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Serviços Oferecidos</h3>
              <button onClick={() => setShowModal('SERVICE')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl hover:bg-indigo-700 transition-colors">+ Novo Serviço</button>
            </div>
            {loadingServices ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.filter((s: any) => s.businessId === business.id).map((service: any) => (
                  <div key={service.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col group hover:border-indigo-500 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-slate-900 mb-1">{service.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {service.duration} min
                          </span>
                          <span className="text-indigo-600 font-black">R$ {service.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditItem(service, 'service')}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                          title="Editar serviço"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(service.id, 'service', service.name)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                          title="Remover serviço"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {services.filter((s: any) => s.businessId === business.id).length === 0 && (
                  <div className="col-span-full bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                    <Scissors className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-bold">Nenhum serviço cadastrado.</p>
                    <p className="text-slate-300 text-sm mt-2">Adicione serviços para que clientes possam agendar.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'STORE':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Estoque & Vitrine</h3>
              <button onClick={() => setShowModal('PRODUCT')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl hover:bg-indigo-700 transition-colors">+ Novo Produto</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {products.filter((p: any) => p.businessId === business.id).map((prod: any) => (
                <div key={prod.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                  <div className="h-40 relative">
                    <img src={prod.image} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditItem(prod, 'product')}
                        className="p-2 bg-white/90 backdrop-blur rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Editar produto"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(prod.id)} 
                        className="p-2 bg-white/90 backdrop-blur rounded-full text-red-500 hover:bg-red-50 transition-colors"
                        title="Remover produto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-slate-800">{prod.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prod.category}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-indigo-600 font-black">R$ {prod.price}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${prod.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{prod.stock} em stock</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'TEAM':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Gestão de Equipe</h3>
              <button onClick={() => setShowModal('TEAM')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl hover:bg-indigo-700 transition-colors">+ Adicionar Profissional</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collaborators.filter((c: any) => c.businessId === business.id).map((pro: any) => (
                <div key={pro.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                  <img src={pro.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-slate-900">{pro.name}</h4>
                    <p className="text-sm text-slate-600 font-medium">{pro.role}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star size={14} fill="#f59e0b" className="text-amber-500" />
                      <span className="text-xs font-black text-slate-700">{pro.rating}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditItem(pro, 'collaborator')}
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"
                      title="Editar profissional"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(pro.id, 'collaborator', pro.name)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                      title="Remover profissional"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'SETTINGS':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <Settings className="text-indigo-600" size={24} />
                Configurações da Conta
              </h3>

              <div className="space-y-6">
                {/* Integração Mercado Pago */}
                <div className={`p-6 rounded-2xl border-2 ${
                  isMpConnected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-black text-slate-900">Integração Mercado Pago</h4>
                        {isMpConnected ? (
                          <span className="px-3 py-1 rounded-full bg-green-600 text-white text-xs font-black flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Conectado
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black flex items-center gap-1">
                            <AlertCircle size={12} />
                            Não Conectado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        {isMpConnected 
                          ? 'Seu estabelecimento está conectado ao Mercado Pago e pode receber pagamentos.'
                          : 'Conecte sua conta do Mercado Pago para receber pagamentos de clientes.'}
                      </p>
                      
                      {isMpConnected && (
                        <div className="space-y-2 text-sm">
                          {mpLiveMode !== undefined && mpLiveMode !== null && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="font-bold">Ambiente:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-black ${
                                mpLiveMode 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {mpLiveMode ? 'Produção' : 'Teste'}
                              </span>
                            </div>
                          )}
                          {business?.mp_user_id && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="font-bold">User ID:</span>
                              <span className="font-mono text-xs">{business.mp_user_id}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {!isMpConnected ? (
                      <button
                        onClick={handleStartMpOauth}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        Conectar ao Mercado Pago
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleStartMpOauth}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Reconectar
                        </button>
                        <button
                          onClick={handleDisconnectMp}
                          className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition-all shadow-lg flex items-center gap-2"
                        >
                          <X size={16} />
                          Desconectar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Segurança</h4>
                      <p className="text-sm text-slate-500 mt-1">Altere sua senha de acesso</p>
                    </div>
                    <button
                      onClick={() => setShowChangePasswordModal(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg"
                    >
                      Alterar Senha
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-900 mb-4">Informações da Conta</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Email</label>
                      <input
                        type="email"
                        value={userEmail}
                        disabled
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Estabelecimento</label>
                      <input
                        type="text"
                        value={business.name}
                        disabled
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default: // DASHBOARD
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { label: 'Receita Líquida', value: 'R$ 8.420', icon: DollarSign, color: 'text-green-600' },
                 { label: 'Serviços Realizados', value: appointments.length, icon: Scissors, color: 'text-indigo-600' },
                 { label: 'Vendas Loja', value: '28', icon: ShoppingBag, color: 'text-rose-600' },
                 { label: 'Profissionais', value: collaborators.filter((c:any) => c.businessId === business.id).length, icon: Users, color: 'text-blue-600' },
               ].map((s, i) => (
                 <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                   <div className={`bg-slate-50 ${s.color} p-3 rounded-xl`}><s.icon size={24} /></div>
                   <div>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{s.label}</p>
                     <p className="text-xl font-black text-slate-900">{s.value}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        );
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      addToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('As senhas não coincidem', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      // Verificar senha atual fazendo login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Usuário não encontrado');
      }

      // Tentar fazer login com a senha atual para validar
      try {
        await signInWithEmail(user.email, passwordForm.currentPassword);
      } catch (error: any) {
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Senha atual incorreta');
        }
        throw error;
      }

      // Atualizar senha
      await updatePassword(passwordForm.newPassword);
      
      addToast('Senha alterada com sucesso!', 'success');
      setShowChangePasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      addToast(error.message || 'Erro ao alterar senha. Verifique os dados e tente novamente.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img src={businessEditForm.image || business.image} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" alt="" />
            <button
              onClick={() => {
                setBusinessEditForm({ name: business.name, image: business.image });
                setShowBusinessEditModal(true);
              }}
              className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Editar estabelecimento"
            >
              <Edit3 size={14} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900">{businessEditForm.name || business.name} <span className="text-indigo-600">Admin</span></h2>
              <p className="text-slate-500 text-sm font-medium">Gestão Inteligente & Automação.</p>
            </div>
            <button
              onClick={() => {
                setBusinessEditForm({ name: business.name, image: business.image });
                setShowBusinessEditModal(true);
              }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Editar estabelecimento"
            >
              <Edit3 size={18} />
            </button>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
           {[
             { id: 'DASHBOARD', icon: LayoutGrid },
             { id: 'APPOINTMENTS', icon: Calendar },
             { id: 'STORE', icon: ShoppingBag },
             { id: 'SERVICES', icon: Scissors },
             { id: 'TEAM', icon: Users },
             { id: 'SETTINGS', icon: Settings },
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`p-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
             >
               <tab.icon size={22} />
             </button>
           ))}
        </div>
      </div>
      {renderTabContent()}

      {/* CRM Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-900">
                {editingItem 
                  ? (showModal === 'PRODUCT' ? 'Editar Produto' : showModal === 'SERVICE' ? 'Editar Serviço' : 'Editar Profissional')
                  : (showModal === 'PRODUCT' ? 'Novo Produto' : showModal === 'SERVICE' ? 'Novo Serviço' : 'Novo Profissional')
                }
              </h3>
              <button 
                onClick={() => {
                  setShowModal(null);
                  setNewItem({});
                  setEditingItem(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X />
              </button>
            </div>
            <div className="space-y-6">
              {showModal === 'SERVICE' ? (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Serviço</label>
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      placeholder="Ex: Corte Masculino, Pintura de Unhas"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItem.price || ''}
                        onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                        placeholder="0.00"
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Duração (min)</label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.duration || ''}
                        onChange={(e) => setNewItem({...newItem, duration: e.target.value})}
                        placeholder="30"
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Categoria (opcional)</label>
                    <input
                      type="text"
                      value={newItem.category || ''}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      placeholder="Ex: Corte, Pintura, Manicure"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Descrição (opcional)</label>
                    <textarea
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Descrição detalhada do serviço..."
                      rows={3}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </>
              ) : showModal === 'PRODUCT' ? (
                <>
                  {/* Foto do Produto */}
                  <div className="flex flex-col items-center gap-4 pb-2">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                        {(newItem.image || editingItem?.image) ? (
                          <img 
                            src={newItem.image || editingItem?.image} 
                            alt="Foto do produto" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                            <Image className="text-indigo-400" size={40} />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                        <Image size={14} />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                        <Camera size={14} />
                        Foto do Produto
                      </label>
                      <label className="block">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Verificar tamanho (máximo 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                addToast('A imagem deve ter no máximo 5MB', 'error');
                                return;
                              }
                              
                              // Converter para base64
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewItem({...newItem, image: reader.result as string});
                              };
                              reader.onerror = () => {
                                addToast('Erro ao carregar a imagem', 'error');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Camera className="text-indigo-600" size={24} />
                            <span className="text-sm font-bold">
                              {newItem.image || editingItem?.image ? 'Trocar Foto' : 'Selecionar da Galeria'}
                            </span>
                          </div>
                        </div>
                      </label>
                      {(newItem.image || editingItem?.image) && (
                        <button
                          onClick={() => setNewItem({...newItem, image: ''})}
                          className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                        >
                          <X size={12} />
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Produto</label>
                    <input type="text" placeholder="Ex: Pomada Matte Extra" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Preço (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        placeholder="0.00" 
                        value={newItem.price || ''} 
                        onChange={e => {
                          const value = e.target.value;
                          // Permitir números decimais
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewItem({...newItem, price: value});
                          }
                        }} 
                        className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Estoque Inicial</label>
                      <input type="number" placeholder="0" value={newItem.stock || ''} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Categoria</label>
                    <input type="text" placeholder="Ex: Barba, Cabelo, Tratamento" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </>
              ) : (
                <>
                  {/* Foto de Perfil */}
                  <div className="flex flex-col items-center gap-4 pb-2">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                        {(newItem.avatar || editingItem?.avatar) ? (
                          <img 
                            src={newItem.avatar || editingItem?.avatar} 
                            alt="Foto de perfil" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${newItem.name || 'Profissional'}&size=112`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                            <Camera className="text-indigo-400" size={32} />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                        <Image size={14} />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                        <Camera size={14} />
                        Foto de Perfil
                      </label>
                      <label className="block">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Verificar tamanho (máximo 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                addToast('A imagem deve ter no máximo 5MB', 'error');
                                return;
                              }
                              
                              // Converter para base64
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewItem({...newItem, avatar: reader.result as string});
                              };
                              reader.onerror = () => {
                                addToast('Erro ao carregar a imagem', 'error');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Camera className="text-indigo-600" size={24} />
                            <span className="text-sm font-bold">
                              {newItem.avatar || editingItem?.avatar ? 'Trocar Foto' : 'Selecionar da Galeria'}
                            </span>
                          </div>
                        </div>
                      </label>
                      {(newItem.avatar || editingItem?.avatar) && (
                        <button
                          onClick={() => setNewItem({...newItem, avatar: ''})}
                          className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                        >
                          <X size={12} />
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <input type="text" placeholder="Nome do Profissional" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="text" placeholder="Cargo/Especialidade" value={newItem.role || ''} onChange={e => setNewItem({...newItem, role: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                </>
              )}
              <button 
                onClick={handleAddItem}
                disabled={!newItem.name}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Salvar Alterações' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição do Estabelecimento */}
      {showBusinessEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-900">Editar Estabelecimento</h3>
              <button 
                onClick={() => {
                  setShowBusinessEditModal(false);
                  setBusinessEditForm({ name: business.name, image: business.image });
                }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6">
              {/* Foto do Estabelecimento */}
              <div className="flex flex-col items-center gap-4 pb-2">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                    {businessEditForm.image ? (
                      <img 
                        src={businessEditForm.image} 
                        alt="Foto do estabelecimento" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                        <Image className="text-indigo-400" size={40} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <Image size={14} />
                  </div>
                </div>
                <div className="w-full">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    <Camera size={14} />
                    Foto do Estabelecimento
                  </label>
                  <label className="block">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            addToast('A imagem deve ter no máximo 5MB', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBusinessEditForm({...businessEditForm, image: reader.result as string});
                          };
                          reader.onerror = () => {
                            addToast('Erro ao carregar a imagem', 'error');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="text-indigo-600" size={24} />
                        <span className="text-sm font-bold">
                          {businessEditForm.image ? 'Trocar Foto' : 'Selecionar da Galeria'}
                        </span>
                      </div>
                    </div>
                  </label>
                  {businessEditForm.image && (
                    <button
                      onClick={() => setBusinessEditForm({...businessEditForm, image: ''})}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                    >
                      <X size={12} />
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Estabelecimento</label>
                <input 
                  type="text" 
                  placeholder="Ex: Barbearia do João" 
                  value={businessEditForm.name} 
                  onChange={e => setBusinessEditForm({...businessEditForm, name: e.target.value})} 
                  className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <button
                onClick={async () => {
                  if (!businessEditForm.name) {
                    addToast('Preencha o nome do estabelecimento', 'error');
                    return;
                  }
                  
                  try {
                    // Atualizar no banco de dados
                    const { error: updateError } = await supabase
                      .from('businesses')
                      .update({
                        name: businessEditForm.name,
                        image: businessEditForm.image || null
                      })
                      .eq('id', business.id);
                    
                    if (updateError) {
                      console.error('Erro ao atualizar estabelecimento:', updateError);
                      addToast('Erro ao salvar alterações. Tente novamente.', 'error');
                      return;
                    }
                    
                    // Atualizar o estabelecimento na lista local
                    if (setBusinesses && businesses) {
                      const updated = businesses.map((b: any) => 
                        b.id === business.id 
                          ? { ...b, name: businessEditForm.name, image: businessEditForm.image || b.image }
                          : b
                      );
                      setBusinesses(updated);
                    }
                    
                    // O business já foi atualizado na lista acima, não precisa atualizar userBusiness aqui
                    
                    addToast('Estabelecimento atualizado com sucesso!', 'success');
                    setShowBusinessEditModal(false);
                  } catch (error: any) {
                    console.error('Erro ao atualizar estabelecimento:', error);
                    addToast('Erro ao salvar alterações. Tente novamente.', 'error');
                  }
                }}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-red-100">
                <AlertCircle className="text-red-600" size={32} />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Remover {confirmDeleteModal.type === 'product' ? 'Produto' : 'Profissional'}?
                </h3>
                <p className="text-slate-600 font-medium">
                  {confirmDeleteModal.name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200">
                <p className="text-sm font-bold text-slate-700 mb-2">
                  Esta ação não pode ser desfeita!
                </p>
                <ul className="list-disc list-inside space-y-1 text-left text-xs text-slate-600">
                  {confirmDeleteModal.type === 'product' ? (
                    <>
                      <li>O produto será removido permanentemente</li>
                      <li>Será removido do estoque e da vitrine</li>
                      <li>Histórico de vendas será mantido</li>
                    </>
                  ) : (
                    <>
                      <li>O profissional será removido da equipe</li>
                      <li>Agendamentos futuros serão cancelados</li>
                      <li>Histórico será mantido</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setConfirmDeleteModal(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all shadow-xl"
                >
                  Confirmar Remoção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alterar Senha */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-900">Alterar Senha</h3>
              <button 
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full p-5 pr-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                    title={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full p-5 pr-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                    title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a nova senha novamente"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full p-5 pr-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                    title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword.length < 6}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- CUSTOMER VIEW ---

const BusinessDetailView = ({ business, collaborators, services, products, appointments, setAppointments, onBack, addToast, addToCart, user, createAppointmentNotification }: any) => {
  const [activeSubTab, setActiveSubTab] = useState<'SERVICES' | 'STORE'>('SERVICES');
  const [selectedPro, setSelectedPro] = useState<Collaborator | null>(null);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Tudo');
  const [priceFilter, setPriceFilter] = useState<string>('Qualquer Valor');

  const accentBg = business.type === 'BARBERSHOP' ? 'bg-indigo-600' : 'bg-rose-500';
  const accentText = business.type === 'BARBERSHOP' ? 'text-indigo-400' : 'text-rose-500';

  const categories = useMemo<string[]>(() => {
    const unique = Array.from(new Set(products.filter((p: any) => p.businessId === business.id).map((p: any) => p.category))).filter(Boolean) as string[];
    return ['Tudo', ...unique];
  }, [products, business.id]);

  const priceRanges = ['Qualquer Valor', 'Até R$ 50', 'R$ 50 a R$ 100', 'Acima de R$ 100'];

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (p.businessId !== business.id) return false;
      const matchCategory = selectedCategory === 'Tudo' || p.category === selectedCategory;
      let matchPrice = true;
      if (priceFilter === 'Até R$ 50') matchPrice = p.price <= 50;
      else if (priceFilter === 'R$ 50 a R$ 100') matchPrice = p.price > 50 && p.price <= 100;
      else if (priceFilter === 'Acima de R$ 100') matchPrice = p.price > 100;
      return matchCategory && matchPrice;
    });
  }, [products, business.id, selectedCategory, priceFilter]);

  // Gerar próximos 30 dias
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Gerar horários disponíveis (8h às 18h, de hora em hora)
  const getAvailableTimes = (date: Date | null) => {
    if (!date) return [];
    
    const times: string[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Filtrar horários já ocupados
    const dateStr = date.toISOString().split('T')[0];
    const occupiedTimes = appointments
      .filter((app: any) => {
        const appDate = new Date(app.date).toISOString().split('T')[0];
        return appDate === dateStr && app.collaboratorId === selectedPro?.id;
      })
      .map((app: any) => app.time);

    return times.filter(time => !occupiedTimes.includes(time));
  };

  const handleServiceSelect = (service: Service) => {
    if (!selectedPro) {
      addToast('Selecione um profissional primeiro', 'error');
      return;
    }
    setBookingService(service);
    setShowCalendar(true);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime || !bookingService || !selectedPro) {
      addToast('Selecione data e horário', 'error');
      return;
    }
    if (!user || !user.email) {
      addToast('É necessário estar logado para finalizar o agendamento', 'error');
      return;
    }
    // Fechar calendário e abrir checkout
    setShowCalendar(false);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedDate || !selectedTime || !bookingService || !selectedPro) return;

    const app: Appointment = {
      id: Math.random().toString(),
      businessId: business.id,
      customerId: user?.id || 'user1',
      collaboratorId: selectedPro.id,
      serviceId: bookingService.id,
      date: selectedDate.toISOString(),
      time: selectedTime,
      status: 'SCHEDULED'
    };
    setAppointments([...appointments, app]);
    addToast('Agendamento confirmado com sucesso!', 'success');
    
    // Criar notificação de agendamento
    if (user?.id && createAppointmentNotification) {
      await createAppointmentNotification(
        user.id,
        business.name,
        business.type,
        selectedPro.name,
        bookingService.name,
        selectedDate,
        selectedTime
      );
    }
    
    // Resetar estado
    setBookingService(null);
    setSelectedPro(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setShowCheckout(false);
    setShowCalendar(false);
  };

  return (
    <div className={`min-h-[calc(100vh-64px)] pb-20 ${business.type === 'BARBERSHOP' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="relative h-[400px] overflow-hidden">
        <img src={business.image} className="w-full h-full object-cover" alt="" />
        <div className={`absolute inset-0 bg-gradient-to-t ${business.type === 'BARBERSHOP' ? 'from-slate-950' : 'from-white/95'} via-transparent to-transparent`} />
        <div className="absolute bottom-0 left-0 p-10 w-full max-w-6xl mx-auto space-y-4">
           <div className={`inline-flex items-center gap-2 ${accentBg} text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl`}>
             {business.type === 'BARBERSHOP' ? <Scissors size={14} /> : <Sparkles size={14} />}
             Experiência Premium
           </div>
           <h1 className="text-5xl font-black tracking-tighter leading-none">{business.name}</h1>
           <p className={`text-lg font-medium max-w-2xl ${business.type === 'BARBERSHOP' ? 'text-slate-400' : 'text-slate-500'}`}>{business.description}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-10 py-10">
        <div className={`flex gap-8 border-b ${business.type === 'BARBERSHOP' ? 'border-slate-800' : 'border-slate-200'} mb-12`}>
           <button onClick={() => setActiveSubTab('SERVICES')} className={`pb-6 text-sm font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'SERVICES' ? accentText : 'text-slate-500'}`}>
             Serviços & Agenda
             {activeSubTab === 'SERVICES' && <div className={`absolute bottom-0 left-0 w-full h-1.5 ${accentBg} rounded-t-full`} />}
           </button>
           <button onClick={() => setActiveSubTab('STORE')} className={`pb-6 text-sm font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'STORE' ? accentText : 'text-slate-500'}`}>
             Loja Integrada
             {activeSubTab === 'STORE' && <div className={`absolute bottom-0 left-0 w-full h-1.5 ${accentBg} rounded-t-full`} />}
           </button>
        </div>

        {activeSubTab === 'SERVICES' ? (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             <div className="lg:col-span-2 space-y-12">
                <section>
                  <h3 className="text-xl font-black flex items-center gap-2 mb-8 uppercase tracking-tighter"><Users className={accentText} /> 1. Escolha o Profissional</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {collaborators.filter((c:any) => c.businessId === business.id).map((pro: any) => (
                      <button 
                        key={pro.id} 
                        onClick={() => setSelectedPro(pro)}
                        className={`min-w-[150px] p-6 rounded-[2rem] border transition-all text-center space-y-3 ${
                          selectedPro?.id === pro.id ? `${accentBg} border-transparent text-white shadow-2xl scale-105` : (business.type === 'BARBERSHOP' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-600 shadow-sm')
                        }`}
                      >
                        <img src={pro.avatar} className="w-16 h-16 rounded-2xl mx-auto object-cover shadow-lg" alt="" />
                        <div><p className="text-xs font-black truncate">{pro.name.split(' ')[0]}</p><p className="text-[10px] opacity-60 font-bold">{pro.role}</p></div>
                      </button>
                    ))}
                  </div>
                </section>
                
                <section>
                  <h3 className="text-xl font-black flex items-center gap-2 mb-8 uppercase tracking-tighter"><Clock className={accentText} /> 2. Selecione o Serviço</h3>
                  <div className="space-y-4">
                     {services.filter((s:any) => s.businessId === business.id).map((service: any) => (
                       <div key={service.id} className={`p-6 rounded-3xl border flex justify-between items-center transition-all ${business.type === 'BARBERSHOP' ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-100 shadow-sm hover:border-rose-300'}`}>
                         <div><h4 className="font-black text-lg">{service.name}</h4><p className="text-xs font-bold text-slate-500 mt-1">{service.duration} min • <span className="text-green-500">R$ {service.price}</span></p></div>
                         <button 
                          disabled={!selectedPro}
                          onClick={() => handleServiceSelect(service)}
                          className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${accentBg} text-white disabled:opacity-30 shadow-xl transition-all active:scale-95`}
                         >
                           {selectedPro ? 'Agendar' : 'Selecione Pro'}
                         </button>
                       </div>
                     ))}
                  </div>
                </section>
             </div>
           </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                      selectedCategory === cat 
                      ? accentBg + ' text-white shadow-lg' 
                      : (business.type === 'BARBERSHOP' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500 border border-slate-100 shadow-sm')
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Filter size={16} className={accentText} />
                <select 
                  value={priceFilter} 
                  onChange={e => setPriceFilter(e.target.value)}
                  className={`bg-transparent font-black text-xs uppercase tracking-widest outline-none ${business.type === 'BARBERSHOP' ? 'text-white' : 'text-slate-900'}`}
                >
                  {priceRanges.map(range => (
                    <option key={range} value={range} className="text-slate-900">{range}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-in fade-in duration-500">
               {filteredProducts.map((prod: any) => (
                 <div key={prod.id} className={`rounded-[2rem] overflow-hidden border transition-all hover:scale-105 group ${business.type === 'BARBERSHOP' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-lg'}`}>
                   <div className="h-56 relative overflow-hidden">
                     <img src={prod.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                     <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-slate-900">{prod.category}</div>
                   </div>
                   <div className="p-6 space-y-4 text-center">
                      <h4 className="font-black text-sm uppercase truncate">{prod.name}</h4>
                      <p className={`text-xl font-black ${accentText}`}>R$ {prod.price}</p>
                      <button onClick={() => addToCart(prod)} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${business.type === 'BARBERSHOP' ? 'bg-indigo-600' : 'bg-rose-500'} text-white shadow-xl shadow-slate-900/10 transition-all active:scale-95`}>
                        Adicionar
                      </button>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Calendário */}
      {showCalendar && bookingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className={`rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-200 ${business.type === 'BARBERSHOP' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className={`text-2xl font-black ${business.type === 'BARBERSHOP' ? 'text-white' : 'text-slate-900'}`}>Agendar {bookingService.name}</h3>
                <p className={`text-sm mt-1 ${business.type === 'BARBERSHOP' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedPro?.name} • {bookingService.duration} min • R$ {bookingService.price}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowCalendar(false);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className={`p-2 rounded-full hover:bg-opacity-20 transition-colors ${business.type === 'BARBERSHOP' ? 'text-slate-400 hover:text-white hover:bg-white' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Seleção de Data */}
              <div>
                <h4 className={`text-sm font-black uppercase tracking-widest mb-4 ${business.type === 'BARBERSHOP' ? 'text-slate-400' : 'text-slate-500'}`}>Selecione a Data</h4>
                <div className="grid grid-cols-7 gap-2">
                  {getAvailableDates().map((date, idx) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDateSelect(date)}
                        className={`p-3 rounded-2xl font-black text-xs transition-all ${
                          isSelected
                            ? `${accentBg} text-white shadow-xl scale-105`
                            : business.type === 'BARBERSHOP'
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[10px] opacity-60">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]}</div>
                        <div className="text-lg leading-none mt-1">{date.getDate()}</div>
                        {isToday && (
                          <div className={`text-[8px] mt-1 ${isSelected ? 'text-white' : accentText}`}>Hoje</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de Horário */}
              {selectedDate && (
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-widest mb-4 ${business.type === 'BARBERSHOP' ? 'text-slate-400' : 'text-slate-500'}`}>Selecione o Horário</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {getAvailableTimes(selectedDate).map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`p-4 rounded-2xl font-black text-sm transition-all ${
                            isSelected
                              ? `${accentBg} text-white shadow-xl scale-105`
                              : business.type === 'BARBERSHOP'
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {getAvailableTimes(selectedDate).length === 0 && (
                    <p className={`text-center py-8 ${business.type === 'BARBERSHOP' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nenhum horário disponível para esta data
                    </p>
                  )}
                </div>
              )}

              {/* Botão Finalizar */}
              <button
                onClick={handleConfirmBooking}
                disabled={!selectedDate || !selectedTime}
                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  business.type === 'BARBERSHOP'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {selectedDate && selectedTime ? `Finalizar Agendamento • R$ ${bookingService.price}` : 'Selecione Data e Horário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal para Agendamento */}
      <CheckoutModal
        isOpen={showCheckout && !!bookingService}
        onClose={() => {
          setShowCheckout(false);
          setShowCalendar(true);
        }}
        total={bookingService?.price || 0}
        email={user?.email || "cliente@example.com"}
        businessId={business.id}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

// --- CENTRAL ADMIN (HUB) ---

const CentralAdminView = ({ businesses, setBusinesses, activeTab, addToast, fetchBusinesses }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [newBiz, setNewBiz] = useState<any>({ type: 'BARBERSHOP', revenueSplit: 10, monthlyFee: 150 });
  const [loading, setLoading] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [confirmPauseModal, setConfirmPauseModal] = useState<{business: Business | null, action: 'pause' | 'activate'}>({business: null, action: 'pause'});
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<Business | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para configurações
  const [defaultSplit, setDefaultSplit] = useState(10);
  const [sponsorId, setSponsorId] = useState('2622924811');
  const [webhookUrl, setWebhookUrl] = useState('https://hgkvhgjtjsycbpeglrrs.supabase.co/functions/v1/mercadopago-webhook');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Estados para dados financeiros
  const [platformSummary, setPlatformSummary] = useState<any>(null);
  const [businessSummaries, setBusinessSummaries] = useState<Record<string, any>>({});
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [dateRange, setDateRange] = useState({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() });

  // Buscar resumo financeiro da plataforma
  const fetchPlatformSummary = async () => {
    setLoadingFinance(true);
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
      
      const { data, error } = await supabase.rpc('get_platform_summary', {
        start_date: startDate,
        end_date: endDate
      });

      if (error) {
        console.error('Erro ao buscar resumo da plataforma:', error);
        addToast('Erro ao carregar dados financeiros', 'error');
        return;
      }

      if (data && data.length > 0) {
        setPlatformSummary(data[0]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar resumo da plataforma:', error);
      addToast('Erro ao carregar dados financeiros', 'error');
    } finally {
      setLoadingFinance(false);
    }
  };

  // Buscar resumo financeiro por business
  const fetchBusinessSummaries = async () => {
    if (businesses.length === 0) return;
    
    try {
      const summaries: Record<string, any> = {};
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      await Promise.all(
        businesses.map(async (business: any) => {
          const { data, error } = await supabase.rpc('get_business_summary', {
            business_id_param: business.id,
            start_date: startDate,
            end_date: endDate
          });

          if (!error && data && data.length > 0) {
            summaries[business.id] = data[0];
          }
        })
      );

      setBusinessSummaries(summaries);
    } catch (error: any) {
      console.error('Erro ao buscar resumos dos businesses:', error);
    }
  };

  // Calcular MRR (Monthly Recurring Revenue) baseado em monthly_fee dos businesses ativos
  const calculateMRR = () => {
    return businesses
      .filter((b: any) => b.status === 'ACTIVE')
      .reduce((total: number, b: any) => total + (Number(b.monthlyFee) || 0), 0);
  };

  // Buscar dados financeiros quando a aba FINANCE for ativada
  useEffect(() => {
    if (activeTab === 'FINANCE') {
      fetchPlatformSummary();
      fetchBusinessSummaries();
    }
  }, [activeTab, dateRange, businesses.length]);

  // Buscar usuários do banco de dados
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Buscar informações dos businesses para usuários que são proprietários
      const usersWithBusinesses = await Promise.all(
        (usersData || []).map(async (user: any) => {
          if (user.business_id) {
            const { data: businessData, error: businessError } = await supabase
              .from('businesses')
              .select('id, name')
              .eq('id', user.business_id)
              .maybeSingle();
            
            return {
              ...user,
              business: businessError ? null : businessData
            };
          }
          return user;
        })
      );

      setUsers(usersWithBusinesses);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      addToast('Erro ao carregar usuários', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Buscar usuários quando a aba USERS for selecionada
  useEffect(() => {
    if (activeTab === 'USERS') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleAddPartner = async () => {
    if (!newBiz.email || !newBiz.password || newBiz.password.length < 6) {
      addToast('Preencha email e senha (mínimo 6 caracteres)', 'error');
      return;
    }

    setLoading(true);
    try {
      // Criar usuário no Supabase Auth usando signUp
      let authData;
      try {
        authData = await signUpWithEmail(
          newBiz.email,
          newBiz.password,
          newBiz.name
        );
      } catch (signUpError: any) {
        console.error('Erro no signUp:', signUpError);
        
        // Se o usuário já está registrado, tentar fazer login
        if (signUpError.message?.includes('already registered') || 
            signUpError.message?.includes('User already registered') ||
            signUpError.status === 422) {
          try {
            // Tentar fazer login com as credenciais fornecidas
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: newBiz.email,
              password: newBiz.password
            });
            
            if (signInError) {
              throw new Error('Este email já está cadastrado, mas a senha está incorreta. Use a opção de recuperação de senha ou entre com a senha correta.');
            }
            
            if (signInData?.user) {
              authData = signInData;
              addToast('Usuário já existe. Login realizado automaticamente.', 'success');
            } else {
              throw new Error('Usuário já cadastrado. Faça login ou use outro email.');
            }
          } catch (loginError: any) {
            throw new Error(loginError.message || 'Este email já está cadastrado. Faça login ou use outro email.');
          }
        } else {
          throw new Error(signUpError.message || 'Erro ao criar usuário no sistema de autenticação');
        }
      }

      if (!authData) {
        throw new Error('Erro ao criar usuário: nenhum dado retornado');
      }

      if (!authData || !authData.user) {
        // Se o Supabase tiver confirmação de email habilitada, o user pode ser null
        // Nesse caso, o usuário precisa confirmar o email primeiro
        throw new Error('Erro ao criar usuário: usuário não foi criado. Verifique se o email já está cadastrado ou se a confirmação de email está habilitada no Supabase. Se estiver, desabilite a confirmação de email nas configurações do Supabase Auth.');
      }

      const ownerId = authData.user.id;
      
      if (!ownerId) {
        throw new Error('Erro ao criar usuário: ID do usuário não foi gerado');
      }
      
      const desc = await generateBusinessDescription(newBiz.name, newBiz.type);
      
      // Gerar UUID válido para o business (formato UUID v4)
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const businessId = generateUUID();
      
      // Criar business no banco de dados
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          id: businessId,
          name: newBiz.name,
          type: newBiz.type,
          description: desc,
          address: 'Novo Endereço, 00',
          image: newBiz.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE,
          owner_id: ownerId,
          revenue_split: newBiz.revenueSplit || 10,
          monthly_fee: newBiz.monthlyFee || 150,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (businessError) {
        console.error('Erro ao criar business:', businessError);
        console.error('Detalhes do erro:', JSON.stringify(businessError, null, 2));
        
        let errorMessage = 'Erro ao criar estabelecimento. ';
        
        if (businessError.code === '42501' || businessError.message?.includes('permission') || businessError.message?.includes('policy')) {
          errorMessage += 'Erro de permissão: Execute a migração 010_allow_super_admin_create_businesses.sql no Supabase para permitir que SUPER_ADMIN crie businesses.';
        } else if (businessError.code === '23505') {
          errorMessage += 'Já existe um estabelecimento com este ID.';
        } else {
          errorMessage += businessError.message || 'Verifique as configurações do banco de dados.';
        }
        
        throw new Error(errorMessage);
      }

      // Validar que o businessId retornado é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(businessData.id)) {
        console.error('Business ID retornado não é um UUID válido:', businessData.id);
        throw new Error('Erro: ID do estabelecimento gerado não é válido. Tente novamente.');
      }

      const biz: Business = {
        id: businessData.id,
        name: businessData.name,
        type: businessData.type,
        description: businessData.description || desc,
        address: businessData.address || 'Novo Endereço, 00',
        image: businessData.image || (newBiz.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE),
        rating: 5.0,
        ownerId: businessData.owner_id,
        revenueSplit: businessData.revenue_split || newBiz.revenueSplit || 10,
        monthlyFee: businessData.monthly_fee || newBiz.monthlyFee || 150,
        status: businessData.status || 'ACTIVE'
      };

      // Atualizar business_id no user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ business_id: businessId })
        .eq('id', ownerId);

      if (profileError) {
        console.warn('Erro ao atualizar business_id no perfil:', profileError);
        // Não bloqueia o fluxo, apenas loga o aviso
      }

      // Recarregar businesses do banco para garantir sincronização
      if (fetchBusinesses) {
        await fetchBusinesses();
      } else {
        // Fallback: adicionar ao estado local
        setBusinesses([...businesses, biz]);
      }
      
      // Recarregar usuários se estiver na aba USERS
      if (activeTab === 'USERS') {
        fetchUsers();
      }
      
      addToast(`Parceiro ${newBiz.name} cadastrado! Credenciais: ${newBiz.email} / ${newBiz.password}`, 'success');
      setShowModal(false);
      setNewBiz({ type: 'BARBERSHOP', revenueSplit: 10, monthlyFee: 150 });
    } catch (error: any) {
      console.error('Erro ao criar parceiro:', error);
      addToast(error.message || 'Erro ao criar parceiro. Verifique os dados e tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handlers de configurações
  const handleSaveSplit = () => {
    addToast(`Taxa de split padrão atualizada para ${defaultSplit}%`, 'success');
    // Aqui você salvaria no banco de dados
  };

  const handleUpdateSponsorId = () => {
    addToast(`Sponsor ID atualizado: ${sponsorId}`, 'success');
    // Aqui você atualizaria o secret no Supabase
  };

  const handleTestWebhook = async () => {
    addToast('Testando webhook...', 'success');
    // Aqui você testaria o webhook
    setTimeout(() => {
      addToast('Webhook respondendo corretamente!', 'success');
    }, 1500);
  };

  const handleSyncData = async () => {
    setLoading(true);
    addToast('Sincronizando dados com Supabase...', 'success');
    // Simular sincronização
    setTimeout(() => {
      setLoading(false);
      addToast('Dados sincronizados com sucesso!', 'success');
    }, 2000);
  };

  const handleBackup = async () => {
    setLoading(true);
    addToast('Gerando backup do banco de dados...', 'success');
    // Simular backup
    setTimeout(() => {
      setLoading(false);
      addToast('Backup gerado com sucesso!', 'success');
    }, 2000);
  };

  const handleOpenDashboard = () => {
    window.open('https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs', '_blank');
  };

  const handleViewLogs = () => {
    addToast('Abrindo logs do sistema...', 'success');
    // Aqui você abriria um modal com logs ou redirecionaria
  };

  const handleAuditLogs = () => {
    setShowAuditLogs(true);
  };

  // Dados de exemplo de audit logs (em produção, buscar do banco de dados)
  const auditLogs = [
    { id: 1, timestamp: new Date().toISOString(), user: 'SUPER_ADMIN', action: 'CREATE_BUSINESS', target: 'Barbearia Elite', status: 'SUCCESS', details: 'Novo parceiro cadastrado' },
    { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'SUPER_ADMIN', action: 'UPDATE_BUSINESS', target: 'Salão Beleza', status: 'SUCCESS', details: 'Configurações atualizadas' },
    { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'SUPER_ADMIN', action: 'PAUSE_BUSINESS', target: 'Barbearia Moderna', status: 'SUCCESS', details: 'Estabelecimento pausado' },
    { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), user: 'SUPER_ADMIN', action: 'UPDATE_SETTINGS', target: 'Plataforma', status: 'SUCCESS', details: 'Taxa de split atualizada para 12%' },
    { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), user: 'SUPER_ADMIN', action: 'BACKUP', target: 'Database', status: 'SUCCESS', details: 'Backup completo gerado' },
    { id: 6, timestamp: new Date(Date.now() - 18000000).toISOString(), user: 'SUPER_ADMIN', action: 'SYNC_DATA', target: 'Supabase', status: 'SUCCESS', details: 'Dados sincronizados' },
    { id: 7, timestamp: new Date(Date.now() - 21600000).toISOString(), user: 'SUPER_ADMIN', action: 'DELETE_BUSINESS', target: 'Estabelecimento Teste', status: 'SUCCESS', details: 'Parceiro removido da plataforma' },
    { id: 8, timestamp: new Date(Date.now() - 25200000).toISOString(), user: 'SUPER_ADMIN', action: 'UPDATE_WEBHOOK', target: 'Mercado Pago', status: 'SUCCESS', details: 'Webhook URL atualizada' },
  ];

  const handleConfirmPauseAction = () => {
    if (!confirmPauseModal.business) return;

    const { business, action } = confirmPauseModal;
    const isActivating = action === 'activate';

    const updated = businesses.map((bus: any) => 
      bus.id === business.id 
        ? { ...bus, status: isActivating ? 'ACTIVE' : 'SUSPENDED', isPaused: !isActivating }
        : bus
    );
    
    setBusinesses(updated);
    addToast(
      isActivating 
        ? `${business.name} foi ativado com sucesso!` 
        : `${business.name} foi pausado. Não receberá novos agendamentos ou pagamentos.`,
      'success'
    );
    
    setConfirmPauseModal({business: null, action: 'pause'});
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteModal) return;

    const businessName = confirmDeleteModal.name;
    const businessId = confirmDeleteModal.id;

    try {
      // Deletar do banco de dados
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (error) throw error;

      // Remover do estado local
      setBusinesses(businesses.filter((x: any) => x.id !== businessId));
      addToast(`${businessName} foi removido da plataforma`, 'success');
    } catch (error: any) {
      console.error('Erro ao deletar business:', error);
      addToast('Erro ao remover estabelecimento. Tente novamente.', 'error');
    } finally {
      setConfirmDeleteModal(null);
    }
  };

  const handleConfigureBusiness = (business: Business) => {
    setEditingBusiness(business);
    const isPaused = business.status === 'SUSPENDED' || (business as any).isPaused;
    setEditForm({
      name: business.name,
      type: business.type,
      revenueSplit: business.revenueSplit || 10,
      monthlyFee: business.monthlyFee || 150,
      status: business.status || 'ACTIVE',
      isPaused: isPaused,
      description: business.description || '',
      address: business.address || '',
      image: business.image || '' // Adicionar campo image ao editForm
    });
  };

  const handleSaveBusinessConfig = async () => {
    if (!editingBusiness) return;

    setLoading(true);
    
    try {
      // Preparar dados para atualizar no Supabase
      // Apenas incluir campos que foram alterados e são válidos
      const updateData: any = {
        name: editForm.name || '',
        type: editForm.type,
        revenue_split: Number(editForm.revenueSplit) || 10,
        monthly_fee: Number(editForm.monthlyFee) || 0,
        status: editForm.status || 'ACTIVE',
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (editForm.description !== undefined) {
        updateData.description = editForm.description || null;
      }
      if (editForm.address !== undefined) {
        updateData.address = editForm.address || null;
      }
      // Adicionar campo image se tiver valor
      if (editForm.image !== undefined) {
        updateData.image = editForm.image || null;
      }
      
      // NOTA: mp_access_token e mp_public_key NÃO são editados aqui
      // Eles só podem ser atualizados via OAuth no painel do estabelecimento
      
      // Log para debug
      console.log('💾 Salvando configurações do business:', {
        business_id: editingBusiness.id,
        business_name: editForm.name,
        updateData_keys: Object.keys(updateData)
      });

      // Atualizar no Supabase via Edge Function (bypass RLS)
      // IMPORTANT: passar Authorization explicitamente (evita 401 quando o invoke não envia o JWT)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        console.error('❌ Sem sessão/Access Token para chamar updateBusinessConfig:', sessionError);
        addToast('Sessão expirada. Faça login novamente e tente salvar.', 'error');
        setLoading(false);
        return;
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke('updateBusinessConfig', {
        body: {
          business_id: editingBusiness.id,
          update: updateData,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (fnError) {
        console.error('❌ Erro ao salvar via Edge Function updateBusinessConfig:', fnError);
        console.error('Detalhes do erro:', JSON.stringify(fnError, null, 2));
        addToast(`Erro ao salvar: ${fnError.message || 'Falha ao salvar no servidor'}`, 'error');
        setLoading(false);
        return;
      }

      console.log('✅ updateBusinessConfig OK:', fnData);

      // Atualizar o negócio na lista local (preservar tokens existentes)
      const updatedBusinesses = businesses.map((b: Business) => {
        if (b.id === editingBusiness.id) {
          return {
            ...b,
            name: editForm.name,
            type: editForm.type,
            revenueSplit: editForm.revenueSplit,
            monthlyFee: editForm.monthlyFee,
            status: editForm.status,
            description: editForm.description,
            address: editForm.address,
            image: editForm.image || b.image,
            // Preservar tokens existentes (não são editados aqui)
            isPaused: editForm.status === 'SUSPENDED'
          };
        }
        return b;
      });

      setBusinesses(updatedBusinesses);
      
      setLoading(false);
      setEditingBusiness(null);
      addToast(`Configurações de ${editForm.name} salvas com sucesso!`, 'success');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      addToast(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`, 'error');
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'FINANCE':
        const mrr = calculateMRR();
        const totalAdminFees = platformSummary?.total_admin_fees || 0;
        const formatCurrency = (value: number) => {
          if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
          return `R$ ${value.toFixed(2)}`;
        };

        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             {/* Filtro de período */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4">
               <label className="text-sm font-bold text-slate-700">Período:</label>
               <input
                 type="date"
                 value={dateRange.start.toISOString().split('T')[0]}
                 onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                 className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold"
               />
               <span className="text-slate-400">até</span>
               <input
                 type="date"
                 value={dateRange.end.toISOString().split('T')[0]}
                 onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                 className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold"
               />
               <button
                 onClick={() => {
                   setDateRange({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() });
                 }}
                 className="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100"
               >
                 Últimos 30 dias
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                   <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Receita Hub (Split)</p>
                   {loadingFinance ? (
                     <p className="text-4xl font-black mt-2">Carregando...</p>
                   ) : (
                     <p className="text-4xl font-black mt-2">{formatCurrency(totalAdminFees)}</p>
                   )}
                   <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">SaaS Recorrente (MRR)</p>
                   <p className="text-4xl font-black text-slate-900 mt-2">{formatCurrency(mrr)}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estabelecimentos</p>
                   <p className="text-4xl font-black text-slate-900 mt-2">{businesses.length}</p>
                </div>
             </div>
             <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-black text-slate-900">Extrato Consolidado</h4>
                  <button className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100">
                    Exportar CSV
                  </button>
                </div>
                {loadingFinance ? (
                  <div className="p-8 text-center text-slate-400">Carregando dados financeiros...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Estabelecimento</th>
                        <th className="px-8 py-4 text-center">Status Pagamento</th>
                        <th className="px-8 py-4 text-center">Faturamento Bruto</th>
                        <th className="px-8 py-4 text-right">Split Líquido Hub</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {businesses.map((b: any) => {
                        const summary = businessSummaries[b.id];
                        const totalRevenue = summary?.total_revenue || 0;
                        const adminFee = summary?.total_admin_fee || 0;
                        const isPaid = b.status === 'ACTIVE' && (Number(b.monthlyFee) || 0) > 0;
                        
                        return (
                          <tr key={b.id} className="text-sm hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-4 font-bold text-slate-900">{b.name}</td>
                            <td className="px-8 py-4 text-center">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                isPaid 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isPaid ? 'EM DIA' : 'PENDENTE'}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-center font-medium text-slate-700">
                              R$ {totalRevenue.toFixed(2)}
                            </td>
                            <td className="px-8 py-4 text-right font-black text-indigo-600">
                              R$ {adminFee.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        );
      case 'PARTNERS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
             {businesses.map((b: any) => {
               const isPaused = b.status === 'SUSPENDED' || (b as any).isPaused;
               return (
                 <div key={b.id} className={`bg-white rounded-[2.5rem] overflow-hidden border shadow-sm hover:shadow-xl transition-all group ${isPaused ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                   <div className="h-40 relative overflow-hidden">
                      <img src={b.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black uppercase">{b.type}</div>
                      {isPaused && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                          <AlertCircle size={12} />
                          PAUSADO
                        </div>
                      )}
                   </div>
                   <div className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <h4 className="text-2xl font-black tracking-tighter leading-none">{b.name}</h4>
                        <span className="text-indigo-600 font-black text-xs">{b.revenueSplit}% Taxa</span>
                      </div>
                      
                      {/* Status do Estabelecimento */}
                      <div className="space-y-2">
                        {/* Toggle de Pausar/Ativar Rápido */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                            <span className="text-xs font-bold text-slate-700">{isPaused ? 'Pausado' : 'Ativo'}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!isPaused}
                              onChange={(e) => {
                                // Abrir modal de confirmação
                                setConfirmPauseModal({
                                  business: b,
                                  action: e.target.checked ? 'activate' : 'pause'
                                });
                              }}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        
                        {/* Status Mercado Pago */}
                        <div className={`p-2 rounded-lg flex items-center justify-between ${
                          (b as any).mp_access_token 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {(b as any).mp_access_token ? (
                              <CheckCircle2 className="text-green-600" size={14} />
                            ) : (
                              <AlertCircle className="text-red-600" size={14} />
                            )}
                            <span className="text-xs font-bold text-slate-700">
                              {(b as any).mp_access_token ? '🟢 Conectado' : '🔴 Não Conectado'}
                            </span>
                          </div>
                          {(b as any).mp_live_mode !== undefined && (b as any).mp_live_mode !== null && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              (b as any).mp_live_mode 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {(b as any).mp_live_mode ? 'Prod' : 'Teste'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleConfigureBusiness(b)}
                          className="bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-indigo-600 transition-colors"
                        >
                          Configurar
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteModal(b)}
                          className="bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                   </div>
                 </div>
               );
             })}
          </div>
        );
      case 'SETTINGS':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <Settings className="text-indigo-600" size={24} />
                Configurações da Plataforma
              </h3>

              <div className="space-y-8">
                {/* Configurações de Split */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Taxa de Split Padrão</h4>
                      <p className="text-sm text-slate-500 mt-1">Porcentagem padrão de comissão para novos parceiros</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={defaultSplit}
                        onChange={(e) => setDefaultSplit(Number(e.target.value))}
                        min={0}
                        max={50}
                        className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-2xl font-black text-slate-400">%</span>
                      <button 
                        onClick={handleSaveSplit}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200"></div>

                {/* Configurações Mercado Pago */}
                <section className="space-y-4">
                  <h4 className="text-lg font-black text-slate-900">Integração Mercado Pago</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Sponsor ID (Plataforma)</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={sponsorId}
                          onChange={(e) => setSponsorId(e.target.value)}
                          placeholder="User ID da conta plataforma"
                          className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                          onClick={handleUpdateSponsorId}
                          className="px-6 py-4 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-indigo-600 transition-all"
                        >
                          Atualizar
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">ID da conta que recebe a comissão de 10%</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Webhook URL</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="URL do webhook"
                          className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                          onClick={handleTestWebhook}
                          className="px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
                        >
                          Testar
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">URL para receber notificações de pagamento</p>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200"></div>

                {/* Configurações Gerais */}
                <section className="space-y-4">
                  <h4 className="text-lg font-black text-slate-900">Configurações Gerais</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-black text-slate-900">Notificações por Email</p>
                        <p className="text-sm text-slate-500">Receber alertas de novos pagamentos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                      <div>
                        <p className="font-black text-slate-900">Modo Manutenção Global</p>
                        <p className="text-sm text-slate-500">Pausar TODAS as operações da plataforma</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={maintenanceMode}
                          onChange={(e) => {
                            setMaintenanceMode(e.target.checked);
                            if (e.target.checked) {
                              addToast('Modo manutenção ativado - Todos os estabelecimentos foram pausados', 'success');
                            } else {
                              addToast('Modo manutenção desativado - Estabelecimentos podem ser ativados individualmente', 'success');
                            }
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-black text-slate-900">Auto-aprovação de Parceiros</p>
                        <p className="text-sm text-slate-500">Aprovar novos parceiros automaticamente</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoApprove}
                          onChange={(e) => setAutoApprove(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200"></div>

                {/* Ações */}
                <section className="space-y-4">
                  <h4 className="text-lg font-black text-slate-900">Ações Rápidas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleSyncData}
                      disabled={loading}
                      className="p-6 bg-indigo-50 border-2 border-indigo-200 rounded-2xl text-left hover:bg-indigo-100 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <RefreshCw className={`text-indigo-600 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform`} size={20} />
                        <span className="font-black text-slate-900">Sincronizar Dados</span>
                      </div>
                      <p className="text-xs text-slate-500">Atualizar informações do Supabase</p>
                    </button>

                    <button 
                      onClick={handleBackup}
                      disabled={loading}
                      className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl text-left hover:bg-slate-100 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="text-slate-600" size={20} />
                        <span className="font-black text-slate-900">Backup Completo</span>
                      </div>
                      <p className="text-xs text-slate-500">Gerar backup do banco de dados</p>
                    </button>

                    <button 
                      onClick={handleOpenDashboard}
                      className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl text-left hover:bg-green-100 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ExternalLink className="text-green-600" size={20} />
                        <span className="font-black text-slate-900">Abrir Dashboard</span>
                      </div>
                      <p className="text-xs text-slate-500">Acessar Supabase Dashboard</p>
                    </button>

                    <button 
                      onClick={handleViewLogs}
                      className="p-6 bg-rose-50 border-2 border-rose-200 rounded-2xl text-left hover:bg-rose-100 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="text-rose-600" size={20} />
                        <span className="font-black text-slate-900">Logs do Sistema</span>
                      </div>
                      <p className="text-xs text-slate-500">Visualizar logs e erros</p>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        );
      case 'USERS':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="text-indigo-600" size={28} />
                  Usuários do Sistema
                </h3>
                <p className="text-slate-500 text-sm mt-1">Gerencie todos os usuários cadastrados na plataforma</p>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={loadingUsers ? 'animate-spin' : ''} size={18} />
                Atualizar
              </button>
            </div>

            {loadingUsers ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-20 text-center">
                <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
                <p className="text-slate-600 font-semibold">Carregando usuários...</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-black text-slate-900">Lista de Usuários ({users.length})</h4>
                  <button className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                    Exportar CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Nome</th>
                        <th className="px-8 py-4">Email</th>
                        <th className="px-8 py-4 text-center">Tipo</th>
                        <th className="px-8 py-4">Estabelecimento</th>
                        <th className="px-8 py-4 text-center">Status</th>
                        <th className="px-8 py-4 text-center">Último Login</th>
                        <th className="px-8 py-4 text-center">Cadastrado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-12 text-center text-slate-500">
                            Nenhum usuário encontrado
                          </td>
                        </tr>
                      ) : (
                        users.map((user: any) => (
                          <tr key={user.id} className="text-sm hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-4 font-bold text-slate-900">{user.full_name || 'N/A'}</td>
                            <td className="px-8 py-4 text-slate-700">{user.email}</td>
                            <td className="px-8 py-4 text-center">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                user.role === 'BUSINESS_OWNER' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {user.role === 'SUPER_ADMIN' ? 'ADMIN' :
                                 user.role === 'BUSINESS_OWNER' ? 'PROPRIETÁRIO' :
                                 'CLIENTE'}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-slate-600">
                              {user.business?.name || user.business_id || '-'}
                            </td>
                            <td className="px-8 py-4 text-center">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.is_active ? 'ATIVO' : 'INATIVO'}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-center text-slate-600 text-xs">
                              {user.last_login 
                                ? new Date(user.last_login).toLocaleDateString('pt-BR', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Nunca'}
                            </td>
                            <td className="px-8 py-4 text-center text-slate-600 text-xs">
                              {user.created_at 
                                ? new Date(user.created_at).toLocaleDateString('pt-BR', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric'
                                  })
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      default: // DASHBOARD
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm h-[450px] flex flex-col">
                   <h3 className="text-xl font-black mb-8 flex items-center gap-2"><TrendingUp className="text-indigo-600" /> Volume Global da Rede</h3>
                   <div className="flex-1 min-h-0">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{n:'Jan',v:12000},{n:'Fev',v:15000},{n:'Mar',v:13000},{n:'Abr',v:25000},{n:'Mai',v:38000}]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="n" />
                          <YAxis />
                          <Bar dataKey="v" fill="#6366f1" radius={[8,8,0,0]} barSize={50} />
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between">
                   <div>
                     <h4 className="text-2xl font-black tracking-tighter">Status Supabase</h4>
                     <p className="text-slate-400 text-sm mt-2">Conectado e persistindo dados.</p>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold"><span>Database Engine</span><span className="text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> ONLINE</span></div>
                      <div className="flex justify-between items-center text-xs font-bold"><span>Realtime Sync</span><span className="text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> ONLINE</span></div>
                   </div>
                   <button 
                     onClick={handleAuditLogs}
                     className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/40 hover:bg-indigo-700 transition-all"
                   >
                     Audit Logs
                   </button>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex justify-between items-center">
        <div><h2 className="text-4xl font-black tracking-tighter text-slate-900">Hub <span className="text-indigo-600">Admin</span></h2><p className="text-slate-500 font-medium">Gestão global de infraestrutura e receita.</p></div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-2xl active:scale-95"><Plus /> Novo Parceiro</button>
      </div>
      {renderTabContent()}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900">Adicionar Parceiro</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-700 hover:text-slate-900 transition-colors"><X /></button>
              </div>
              <div className="space-y-6">
                 <input type="text" placeholder="Nome do Estabelecimento" value={newBiz.name || ''} onChange={e => setNewBiz({...newBiz, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                 <div className="grid grid-cols-2 gap-4">
                    <select value={newBiz.type} onChange={e => setNewBiz({...newBiz, type: e.target.value})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="BARBERSHOP">Barbearia</option>
                      <option value="SALON">Salão</option>
                    </select>
                    <input type="number" placeholder="Split Hub %" value={newBiz.revenueSplit || ''} onChange={e => setNewBiz({...newBiz, revenueSplit: Number(e.target.value)})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 <div className="space-y-4 pt-2 border-t border-slate-200">
                   <div>
                     <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Email do Proprietário</label>
                     <input type="email" placeholder="proprietario@exemplo.com" value={newBiz.email || ''} onChange={e => setNewBiz({...newBiz, email: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Senha Inicial</label>
                     <div className="relative">
                       <input 
                         type={showPassword ? "text" : "password"} 
                         placeholder="Mínimo 6 caracteres" 
                         value={newBiz.password || ''} 
                         onChange={e => setNewBiz({...newBiz, password: e.target.value})} 
                         className="w-full p-5 pr-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                       />
                       <button
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                         title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                       >
                         {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                       </button>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">O proprietário poderá alterar a senha após o primeiro login</p>
                   </div>
                 </div>
                 <button onClick={handleAddPartner} disabled={loading || !newBiz.name || !newBiz.email || !newBiz.password || newBiz.password.length < 6} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                   {loading ? 'Provisionando...' : 'Cadastrar e Ativar'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Configuração do Parceiro */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Configurar Parceiro</h3>
                <p className="text-sm text-slate-500 mt-1">{editingBusiness.name}</p>
              </div>
              <button 
                onClick={() => setEditingBusiness(null)}
                className="text-slate-700 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Informações Básicas */}
              <section className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">Informações Básicas</h4>
                
                {/* Foto do Estabelecimento */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                      {editForm.image ? (
                        <img 
                          src={editForm.image} 
                          alt="Foto do estabelecimento" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                          <Image className="text-indigo-400" size={40} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                      <Camera size={14} />
                      Foto do Estabelecimento
                    </label>
                    <label className="block">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              addToast('A imagem deve ter no máximo 5MB', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditForm({...editForm, image: reader.result as string});
                            };
                            reader.onerror = () => {
                              addToast('Erro ao carregar a imagem', 'error');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="text-indigo-600" size={24} />
                          <span className="text-sm font-bold">
                            {editForm.image ? 'Trocar Foto' : 'Selecionar da Galeria'}
                          </span>
                        </div>
                      </div>
                    </label>
                    {editForm.image && (
                      <button
                        onClick={() => setEditForm({...editForm, image: ''})}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                      >
                        <X size={12} />
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estabelecimento</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                    <select
                      value={editForm.type || 'BARBERSHOP'}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="BARBERSHOP">Barbearia</option>
                      <option value="SALON">Salão</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                    <select
                      value={editForm.status || 'ACTIVE'}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value, isPaused: e.target.value === 'SUSPENDED'})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="PENDING">Pendente</option>
                      <option value="SUSPENDED">Suspenso (Pausado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Descrição do estabelecimento..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Endereço completo..."
                  />
                </div>
              </section>

              {/* Configurações Financeiras */}
              <section className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">Configurações Financeiras</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Taxa de Split (%)</label>
                    <input
                      type="number"
                      value={editForm.revenueSplit || 10}
                      onChange={(e) => setEditForm({...editForm, revenueSplit: Number(e.target.value)})}
                      min={0}
                      max={50}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Taxa Mensal (R$)</label>
                    <input
                      type="number"
                      value={editForm.monthlyFee || 150}
                      onChange={(e) => setEditForm({...editForm, monthlyFee: Number(e.target.value)})}
                      min={0}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Status Integração Mercado Pago (Apenas Visualização) */}
              <section className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">Status Mercado Pago</h4>

                <div className={`p-4 rounded-xl border-2 ${
                  editingBusiness?.mp_access_token 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {editingBusiness?.mp_access_token ? (
                        <CheckCircle2 className="text-green-600" size={24} />
                      ) : (
                        <AlertCircle className="text-red-600" size={24} />
                      )}
                      <div>
                        <p className="font-black text-slate-900">
                          {editingBusiness?.mp_access_token ? '🟢 Conectado ao Mercado Pago' : '🔴 Não conectado'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {editingBusiness?.mp_access_token 
                            ? 'O estabelecimento está conectado e pode receber pagamentos.'
                            : 'O estabelecimento precisa conectar sua conta Mercado Pago no painel próprio.'}
                        </p>
                        {editingBusiness?.mp_access_token && editingBusiness?.mp_live_mode !== undefined && editingBusiness?.mp_live_mode !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">Ambiente:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-black ${
                              editingBusiness?.mp_live_mode 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {editingBusiness?.mp_live_mode ? 'Produção' : 'Teste'}
                            </span>
                          </div>
                        )}
                        {editingBusiness?.mp_user_id && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">User ID:</span>
                            <span className="text-xs font-mono text-slate-700">{editingBusiness.mp_user_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 italic">
                    💡 O dono do estabelecimento deve conectar via OAuth no painel próprio (Configurações → Integração Mercado Pago)
                  </p>
                </div>
              </section>

              {/* Controle de Pausa Individual */}
              <section className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">Controle de Operação</h4>
                
                <div className={`flex items-center justify-between p-4 rounded-xl ${editForm.status === 'SUSPENDED' ? 'bg-amber-50 border-2 border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <div>
                    <p className="font-black text-slate-900">Pausar Este Estabelecimento</p>
                    <p className="text-sm text-slate-500">Pausar apenas este estabelecimento (não afeta outros)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editForm.status === 'SUSPENDED'}
                      onChange={(e) => {
                        const newStatus = e.target.checked ? 'SUSPENDED' : 'ACTIVE';
                        setEditForm({...editForm, status: newStatus, isPaused: e.target.checked});
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {editForm.status === 'SUSPENDED' && (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                      <AlertCircle size={14} />
                      Este estabelecimento está pausado e não receberá novos agendamentos ou pagamentos
                    </p>
                  </div>
                )}
              </section>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSaveBusinessConfig}
                  disabled={loading || !editForm.name}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  onClick={() => setEditingBusiness(null)}
                  className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Pausa/Ativação */}
      {confirmPauseModal.business && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                confirmPauseModal.action === 'pause' 
                  ? 'bg-amber-100' 
                  : 'bg-green-100'
              }`}>
                {confirmPauseModal.action === 'pause' ? (
                  <AlertCircle className="text-amber-600" size={32} />
                ) : (
                  <CheckCircle2 className="text-green-600" size={32} />
                )}
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  {confirmPauseModal.action === 'pause' ? 'Pausar Estabelecimento?' : 'Ativar Estabelecimento?'}
                </h3>
                <p className="text-slate-600 font-medium">
                  {confirmPauseModal.business.name}
                </p>
              </div>

              <div className={`p-4 rounded-2xl ${
                confirmPauseModal.action === 'pause' 
                  ? 'bg-amber-50 border-2 border-amber-200' 
                  : 'bg-green-50 border-2 border-green-200'
              }`}>
                <p className="text-sm font-bold text-slate-700">
                  {confirmPauseModal.action === 'pause' ? (
                    <>
                      Ao pausar, este estabelecimento:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-left text-xs">
                        <li>Não receberá novos agendamentos</li>
                        <li>Não processará novos pagamentos</li>
                        <li>Pode ser reativado a qualquer momento</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      Ao ativar, este estabelecimento:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-left text-xs">
                        <li>Voltará a receber agendamentos</li>
                        <li>Poderá processar pagamentos</li>
                        <li>Estará totalmente operacional</li>
                      </ul>
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setConfirmPauseModal({business: null, action: 'pause'})}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPauseAction}
                  className={`flex-1 px-6 py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all ${
                    confirmPauseModal.action === 'pause'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {confirmPauseModal.action === 'pause' ? 'Sim, Pausar' : 'Sim, Ativar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-red-100">
                <AlertCircle className="text-red-600" size={32} />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Remover Parceiro?
                </h3>
                <p className="text-slate-600 font-medium">
                  {confirmDeleteModal.name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200">
                <p className="text-sm font-bold text-slate-700 mb-3">
                  Esta ação não pode ser desfeita!
                </p>
                <ul className="list-disc list-inside space-y-1 text-left text-xs text-slate-600">
                  <li>O estabelecimento será removido permanentemente</li>
                  <li>Todos os dados serão perdidos</li>
                  <li>Histórico de transações será mantido</li>
                  <li>Não será possível recuperar esta ação</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-700">
                  Digite <span className="text-red-600 font-black">REMOVER</span> para confirmar
                </p>
                <input
                  type="text"
                  id="delete-confirm-input"
                  placeholder="Digite REMOVER"
                  className="w-full mt-2 p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  onChange={(e) => {
                    const input = e.target;
                    if (input.value.toUpperCase() === 'REMOVER') {
                      input.classList.remove('border-slate-200');
                      input.classList.add('border-green-500', 'bg-green-50');
                    } else {
                      input.classList.remove('border-green-500', 'bg-green-50');
                      input.classList.add('border-slate-200');
                    }
                  }}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setConfirmDeleteModal(null);
                    const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
                    if (input) {
                      input.value = '';
                      input.classList.remove('border-green-500', 'bg-green-50');
                      input.classList.add('border-slate-200');
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
                    if (input && input.value.toUpperCase() === 'REMOVER') {
                      handleConfirmDelete();
                      const inputEl = document.getElementById('delete-confirm-input') as HTMLInputElement;
                      if (inputEl) {
                        inputEl.value = '';
                        inputEl.classList.remove('border-green-500', 'bg-green-50');
                        inputEl.classList.add('border-slate-200');
                      }
                    } else {
                      addToast('Digite "REMOVER" para confirmar a exclusão', 'error');
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Remoção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Audit Logs */}
      {showAuditLogs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Audit Logs</h3>
                <p className="text-sm text-slate-500 mt-1">Registro de todas as ações administrativas</p>
              </div>
              <button 
                onClick={() => setShowAuditLogs(false)}
                className="text-slate-700 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-3">
                {auditLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const timeAgo = Math.floor((Date.now() - logDate.getTime()) / 60000);
                  const timeAgoText = timeAgo < 60 
                    ? `${timeAgo} min atrás` 
                    : timeAgo < 1440 
                    ? `${Math.floor(timeAgo / 60)} h atrás`
                    : `${Math.floor(timeAgo / 1440)} dias atrás`;

                  return (
                    <div 
                      key={log.id} 
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-2 h-2 rounded-full ${
                              log.status === 'SUCCESS' ? 'bg-green-500' : 
                              log.status === 'ERROR' ? 'bg-red-500' : 
                              'bg-amber-500'
                            }`}></div>
                            <span className="font-black text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                            <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-full">
                              {log.user}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium mb-1">
                            <span className="font-black">Target:</span> {log.target}
                          </p>
                          <p className="text-xs text-slate-500">{log.details}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 mb-1">{timeAgoText}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {logDate.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Total de {auditLogs.length} registros
              </p>
              <button
                onClick={() => {
                  addToast('Exportando logs...', 'success');
                  // Aqui você implementaria a exportação
                }}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-indigo-600 transition-all"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ENTRY ---

// Added missing SidebarItem component to fix errors in navigation sidebar
const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-8 py-4 font-bold text-sm transition-all border-r-4 ${
      active 
        ? 'bg-indigo-50 text-indigo-600 border-indigo-600' 
        : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [userBusiness, setUserBusiness] = useState<Business | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [businessLoadTimeout, setBusinessLoadTimeout] = useState(false);
  // Flags para evitar loops infinitos e múltiplas chamadas simultâneas
  const fetchingBusinessesRef = useRef(false);
  const fetchingUserBusinessRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2; // Limitar tentativas
  
  // Cart State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Notifications State Management
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showBusinessLoginModal, setShowBusinessLoginModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' });
  const [adminLoginForm, setAdminLoginForm] = useState({ email: '', password: '' });

  // Função para buscar produtos de um business específico
  const fetchProductsForBusiness = useCallback(async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
      }

      if (data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          businessId: p.business_id,
          name: p.name,
          price: Number(p.price),
          stock: p.stock,
          image: p.image,
          category: p.category,
        }));
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }, []);

  // Função para buscar colaboradores de um business específico
  const fetchCollaboratorsForBusiness = useCallback(async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar colaboradores:', error);
        return [];
      }

      if (data && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          businessId: c.business_id,
          name: c.name,
          role: c.role,
          avatar: c.avatar,
          rating: Number(c.rating),
        }));
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      return [];
    }
  }, []);

  // Função para buscar serviços de um business específico
  const fetchServicesForBusiness = useCallback(async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar serviços:', error);
        return [];
      }

      if (data && data.length > 0) {
        return data.map((s: any) => ({
          id: s.id,
          businessId: s.business_id,
          name: s.name,
          price: Number(s.price),
          duration: s.duration,
        }));
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      return [];
    }
  }, []);

  // Função para buscar businesses do banco de dados
  const fetchBusinesses = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (fetchingBusinessesRef.current) {
      console.log('⏸️ fetchBusinesses já em execução, ignorando chamada duplicada');
      return;
    }
    
    fetchingBusinessesRef.current = true;
    setLoadingBusinesses(true);
    setBusinessLoadTimeout(false);
    
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar businesses:', error);
        console.error('Detalhes do erro:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Em caso de erro, usar array vazio (não usar dados mockados)
        setBusinesses([]);
        setBusinessLoadTimeout(true);
        setToast({ message: 'Erro ao carregar estabelecimentos. Verifique sua conexão.', type: 'error' });
        return;
      }

      if (data && data.length > 0) {
        // Converter dados do banco para o formato do Business
        const businessesData: Business[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type as 'BARBERSHOP' | 'SALON',
          description: b.description || '',
          address: b.address || '',
          image: b.image || (b.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE),
          rating: Number(b.rating) || 0,
          ownerId: b.owner_id,
          monthlyFee: Number(b.monthly_fee) || 0,
          revenueSplit: Number(b.revenue_split) || 10,
          status: b.status as 'ACTIVE' | 'PENDING' | 'SUSPENDED',
          gatewayId: b.gateway_id,
          lastPaymentDate: b.last_payment_date,
          mp_access_token: b.mp_access_token || null,
          mp_refresh_token: b.mp_refresh_token || null,
          mp_public_key: b.mp_public_key || null,
          mp_user_id: b.mp_user_id || null,
          mp_live_mode: b.mp_live_mode ?? null,
          mp_token_expires_at: b.mp_token_expires_at || null
        }));
        setBusinesses(businessesData as any);
        setBusinessLoadTimeout(false);
        
        // Se o usuário é BUSINESS_OWNER e ainda não tem userBusiness, tentar encontrar
        if (user && user.role === 'BUSINESS_OWNER' && !userBusiness) {
          const userBiz = businessesData.find(b => b.ownerId === user.id || b.id === user.businessId);
          if (userBiz) {
            setUserBusiness(userBiz as Business);
            setBusinessLoadTimeout(false);
          }
        }
      } else {
        // Se não houver dados, usar array vazio (não usar dados mockados)
        setBusinesses([]);
        setBusinessLoadTimeout(false);
      }
    } catch (error: any) {
      console.error('Erro ao buscar businesses:', error);
      console.error('Detalhes do erro:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      // Em caso de erro, usar array vazio (não usar dados mockados)
      setBusinesses([]);
      setBusinessLoadTimeout(true);
      setToast({ message: 'Erro ao carregar estabelecimentos. Verifique sua conexão.', type: 'error' });
    } finally {
      setLoadingBusinesses(false);
      fetchingBusinessesRef.current = false;
    }
  }, [user, userBusiness]);

  // Função para buscar business do usuário logado com retry e refresh de sessão
  const fetchUserBusiness = useCallback(async (userId: string, retryCount = 0) => {
    if (!userId) return null;
    
    // Evitar múltiplas chamadas simultâneas
    if (fetchingUserBusinessRef.current && retryCount === 0) {
      console.log('⏸️ fetchUserBusiness já em execução, ignorando chamada duplicada');
      return null;
    }
    
    // Limitar retries
    if (retryCount > MAX_RETRIES) {
      console.log('⛔ Limite de retries atingido para fetchUserBusiness');
      return null;
    }
    
    fetchingUserBusinessRef.current = true;
    
    try {
      // Verificar sessão (o Supabase já faz refresh automático)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Se não tem sessão, tentar refresh silencioso (sem log de erro)
      if (sessionError || !sessionData?.session) {
        // Tentar refresh silencioso (sem logar como erro)
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session) {
          // Só logar como erro se realmente não conseguir após retry
          if (retryCount >= MAX_RETRIES) {
            console.error('Erro ao refreshar sessão após múltiplas tentativas:', refreshError);
          }
          // Se não conseguir refreshar e for primeira tentativa, tentar novamente
          if (retryCount < 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchUserBusiness(userId, retryCount + 1);
          }
          return null;
        }
        // Se conseguiu refreshar, continuar silenciosamente
      }
      
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();
      
      // Se erro de autenticação, tentar refresh e retry
      if (businessError) {
        if (businessError.code === 'PGRST116') {
          // Não encontrado - não é erro
          return null;
        }
        
        // Se for erro de autenticação e ainda não tentou refresh, tentar novamente
        if ((businessError.message?.includes('JWT') || businessError.message?.includes('token') || businessError.status === 401) && retryCount < 2) {
          console.warn('Erro de autenticação, tentando refresh e retry...', businessError);
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchUserBusiness(userId, retryCount + 1);
          }
        }
        
        console.error('Erro ao buscar business do usuário:', businessError);
        return null;
      }
      
      if (businessData) {
        const biz: Business = {
          id: businessData.id,
          name: businessData.name,
          type: businessData.type as 'BARBERSHOP' | 'SALON',
          description: businessData.description || '',
          address: businessData.address || '',
          image: businessData.image || (businessData.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE),
          rating: Number(businessData.rating) || 0,
          ownerId: businessData.owner_id,
          monthlyFee: Number(businessData.monthly_fee) || 0,
          revenueSplit: Number(businessData.revenue_split) || 10,
          status: businessData.status as 'ACTIVE' | 'PENDING' | 'SUSPENDED',
          gatewayId: businessData.gateway_id,
          lastPaymentDate: businessData.last_payment_date,
          mp_access_token: businessData.mp_access_token || null,
          mp_refresh_token: businessData.mp_refresh_token || null,
          mp_public_key: businessData.mp_public_key || null,
          mp_user_id: businessData.mp_user_id || null,
          mp_live_mode: businessData.mp_live_mode ?? null,
          mp_token_expires_at: businessData.mp_token_expires_at || null
        };
        
        setUserBusiness(biz as Business);
        setBusinessLoadTimeout(false);
        setBusinesses(prev => {
          const exists = prev.find(b => b.id === biz.id);
          if (!exists) {
            return [...prev, biz as Business];
          }
          return prev.map(b => b.id === biz.id ? (biz as Business) : b);
        });
        
        return biz;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar business do usuário:', error);
      return null;
    } finally {
      fetchingUserBusinessRef.current = false;
    }
  }, []);

  // Função para buscar notificações do usuário
  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return;
      }

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  }, []);

  // Função para criar notificação de agendamento
  const createAppointmentNotification = useCallback(async (
    userId: string,
    businessName: string,
    businessType: string,
    collaboratorName: string,
    serviceName: string,
    date: Date,
    time: string
  ) => {
    try {
      const { error } = await supabase.rpc('create_appointment_notification', {
        p_user_id: userId,
        p_business_name: businessName,
        p_business_type: businessType,
        p_collaborator_name: collaboratorName,
        p_service_name: serviceName,
        p_date: date.toISOString().split('T')[0],
        p_time: time
      });

      if (error) {
        console.error('Erro ao criar notificação de agendamento:', error);
      } else {
        // Recarregar notificações
        await fetchNotifications(userId);
      }
    } catch (error) {
      console.error('Erro ao criar notificação de agendamento:', error);
    }
  }, [fetchNotifications]);

  // Função para criar notificação de compra
  const createPurchaseNotification = useCallback(async (
    userId: string,
    businessName: string,
    businessType: string,
    amount: number,
    date: Date
  ) => {
    try {
      const { error } = await supabase.rpc('create_purchase_notification', {
        p_user_id: userId,
        p_business_name: businessName,
        p_business_type: businessType,
        p_amount: amount,
        p_date: date.toISOString()
      });

      if (error) {
        console.error('Erro ao criar notificação de compra:', error);
      } else {
        // Recarregar notificações
        await fetchNotifications(userId);
      }
    } catch (error) {
      console.error('Erro ao criar notificação de compra:', error);
    }
  }, [fetchNotifications]);

  // Função para marcar notificação como lida
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      } else {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  // Função para marcar todas as notificações como lidas
  const markAllNotificationsAsRead = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  }, []);

  // Carregar businesses quando o app inicia (apenas uma vez)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadBusinesses = async () => {
      // Evitar múltiplas chamadas
      if (fetchingBusinessesRef.current) {
        return;
      }
      
      try {
        await fetchBusinesses();
      } catch (error) {
        console.error('Erro ao carregar businesses:', error);
        if (isMounted) {
          setLoadingBusinesses(false);
          setBusinessLoadTimeout(true);
        }
      }
    };
    
    // Timeout mais agressivo para evitar travamento (8 segundos)
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('⏱️ Timeout ao carregar businesses, parando loading');
        setLoadingBusinesses(false);
        setBusinessLoadTimeout(true);
      }
    }, 8000);
    
    loadBusinesses();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Executar apenas uma vez na montagem

  useEffect(() => {
    // Verificar se há um parâmetro de role na URL (após redirect do OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    
    // Listener para mudanças de autenticação com refresh automático preventivo
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Refresh automático quando token está prestes a expirar (silencioso)
      if (event === 'TOKEN_REFRESHED' && session) {
        // Não logar - refresh automático silencioso
        // O Supabase já faz isso automaticamente com autoRefreshToken: true
      }
      
      // Se sessão expirou (SIGNED_OUT), só fazer logout se realmente foi logout manual
      // Não tentar refresh aqui - o Supabase já faz isso automaticamente
      if (event === 'SIGNED_OUT') {
        // Só fazer logout se realmente foi um logout manual
        // Não tentar refresh - se foi logout manual, não devemos tentar recuperar
        if (!session) {
          setUser(null);
        }
        return;
      }
      
      // Se não tem sessão mas tinha usuário, pode ser refresh em andamento
      // Não fazer nada - deixar o Supabase gerenciar
      if (!session && user && event !== 'SIGNED_OUT') {
        // Pode ser refresh em andamento, aguardar
        return;
      }
      
      if (session?.user) {
        let userRole = (session.user.user_metadata.role as any) || 'CUSTOMER';
        let businessId = session.user.user_metadata.business_id;
        
        // Se veio do login de estabelecimento, definir como BUSINESS_OWNER
        if (roleParam === 'BUSINESS_OWNER' || window.localStorage.getItem('pending_role') === 'BUSINESS_OWNER') {
          userRole = 'BUSINESS_OWNER';
          window.localStorage.removeItem('pending_role');
          
          // Se não tem business_id, buscar do banco de dados
          if (!businessId) {
            const { data: businessData, error: businessError } = await supabase
              .from('businesses')
              .select('id')
              .eq('owner_id', session.user.id)
              .maybeSingle();
            
            if (!businessError && businessData) {
              businessId = businessData.id;
            }
          }
        }

        // Se veio do login de admin, definir como SUPER_ADMIN
        if (roleParam === 'SUPER_ADMIN' || window.localStorage.getItem('pending_role') === 'SUPER_ADMIN') {
          userRole = 'SUPER_ADMIN';
          window.localStorage.removeItem('pending_role');
          // Persistir role no metadata para o trigger atualizar user_profiles.role
          // Usar um pequeno delay para evitar race conditions e abort errors
          setTimeout(async () => {
            try {
              const { data: currentSession } = await supabase.auth.getSession();
              if (currentSession?.session) {
                await supabase.auth.updateUser({ data: { role: 'SUPER_ADMIN' } });
              }
            } catch (e: any) {
              // Ignorar erros de abort (componente desmontado ou requisição cancelada)
              if (e?.name !== 'AbortError' && !e?.message?.includes('aborted')) {
                console.warn('Não foi possível atualizar metadata role para SUPER_ADMIN:', e);
              }
            }
          }, 100);
        }
        
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: userRole,
          avatar: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
          businessId: businessId
        });

        // Se for CUSTOMER, buscar notificações
        if (userRole === 'CUSTOMER' && session.user.id) {
          fetchNotifications(session.user.id);
        }
        
        // Se for BUSINESS_OWNER, buscar o business do banco
        if (userRole === 'BUSINESS_OWNER' && session.user.id) {
            try {
              const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', session.user.id)
                .maybeSingle();
              
              if (businessError && businessError.code !== 'PGRST116') {
                console.error('Erro ao buscar business:', businessError);
                // Não bloquear o fluxo, apenas logar o erro
            } else if (businessData) {
            const biz: Business = {
              id: businessData.id,
              name: businessData.name,
              type: businessData.type as 'BARBERSHOP' | 'SALON',
              description: businessData.description || '',
              address: businessData.address || '',
              image: businessData.image || (businessData.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE),
              rating: Number(businessData.rating) || 0,
              ownerId: businessData.owner_id,
              monthlyFee: Number(businessData.monthly_fee) || 0,
              revenueSplit: Number(businessData.revenue_split) || 10,
              status: businessData.status as 'ACTIVE' | 'PENDING' | 'SUSPENDED',
              gatewayId: businessData.gateway_id,
              lastPaymentDate: businessData.last_payment_date,
              mp_access_token: businessData.mp_access_token || null,
              mp_refresh_token: businessData.mp_refresh_token || null,
              mp_public_key: businessData.mp_public_key || null,
              mp_user_id: businessData.mp_user_id || null,
              mp_live_mode: businessData.mp_live_mode ?? null,
              mp_token_expires_at: businessData.mp_token_expires_at || null
            };
          setUserBusiness(biz as Business);
            setBusinessLoadTimeout(false); // Reset timeout quando encontrar
            // Atualizar lista de businesses
            setBusinesses(prev => {
              const exists = prev.find(b => b.id === biz.id);
              if (!exists) {
                return [...prev, biz];
              }
              return prev.map(b => b.id === biz.id ? biz : b);
            });
          } else {
            // Business não encontrado
            setBusinessLoadTimeout(true);
          }
        } catch (error) {
          console.error('Erro ao buscar business:', error);
          setBusinessLoadTimeout(true); // Marcar timeout em caso de erro
        }
      }
        
        // Limpar parâmetros da URL
        if (roleParam) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else {
        setUser(null);
      }
    });

    // Cleanup do subscription
    return () => {
      subscription.unsubscribe();
    };
    
    // Verificar sessão atual ao carregar
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        setLoadingBusinesses(false);
        setBusinessLoadTimeout(true);
        return;
      }
      
      if (session?.user) {
        try {
          const roleParam = new URLSearchParams(window.location.search).get('role');
          let userRole: UserRole = (session.user.user_metadata.role as any) || 'CUSTOMER';
          let businessId = session.user.user_metadata.business_id;
          
          if (roleParam === 'BUSINESS_OWNER' || window.localStorage.getItem('pending_role') === 'BUSINESS_OWNER') {
            userRole = 'BUSINESS_OWNER';
            window.localStorage.removeItem('pending_role');
            if (!businessId) {
              // Buscar business do banco de dados pelo owner_id
              try {
                const { data: businessData, error: businessError } = await supabase
                  .from('businesses')
                  .select('id')
                  .eq('owner_id', session.user.id)
                  .maybeSingle();
                
                if (businessError && businessError.code !== 'PGRST116') {
                  console.error('Erro ao buscar business no getSession:', businessError);
                  // Não bloquear, apenas logar
                } else if (businessData) {
                  businessId = businessData.id;
                }
              } catch (error) {
                console.error('Erro ao buscar business:', error);
              }
            }
          }

          if (roleParam === 'SUPER_ADMIN' || window.localStorage.getItem('pending_role') === 'SUPER_ADMIN') {
            userRole = 'SUPER_ADMIN';
            window.localStorage.removeItem('pending_role');
            // Usar um pequeno delay para evitar race conditions e abort errors
            setTimeout(async () => {
              try {
                const { data: currentSession } = await supabase.auth.getSession();
                if (currentSession?.session) {
                  await supabase.auth.updateUser({ data: { role: 'SUPER_ADMIN' } });
                }
              } catch (e: any) {
                // Ignorar erros de abort (componente desmontado ou requisição cancelada)
                if (e?.name !== 'AbortError' && !e?.message?.includes('aborted')) {
                  console.warn('Não foi possível atualizar metadata role para SUPER_ADMIN:', e);
                }
              }
            }, 100);
          }
          
          setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            role: userRole,
            avatar: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
            businessId: businessId
          });
          
          // Se for BUSINESS_OWNER, buscar o business completo do banco
          if (userRole === 'BUSINESS_OWNER' && session.user.id) {
            const biz = await fetchUserBusiness(session.user.id);
            if (!biz) {
              setBusinessLoadTimeout(true);
            }
          }
        } catch (error) {
          console.error('Erro ao processar sessão:', error);
          setBusinessLoadTimeout(true);
        }
      } else {
        // Sem sessão, garantir que estados estão limpos
        setUser(null);
        setLoadingBusinesses(false);
      }
    }).catch((error) => {
      console.error('Erro ao obter sessão:', error);
      setLoadingBusinesses(false);
      setBusinessLoadTimeout(true);
    });
  }, []);

  // Buscar business do usuário quando ele faz login como BUSINESS_OWNER
  useEffect(() => {
    // Evitar loops: só buscar se realmente necessário e não estiver carregando
    if (user && user.role === 'BUSINESS_OWNER' && user.id && !userBusiness && !loadingBusinesses && !fetchingUserBusinessRef.current) {
      // Limitar retries
      if (retryCountRef.current >= MAX_RETRIES) {
        console.log('⛔ Limite de retries atingido, não tentando mais buscar userBusiness');
        setBusinessLoadTimeout(true);
        return;
      }
      
      retryCountRef.current += 1;
      
      // Aguardar um pouco para garantir que fetchBusinesses terminou
      const timer = setTimeout(async () => {
        const biz = await fetchUserBusiness(user.id);
        if (!biz && !businessLoadTimeout && retryCountRef.current < MAX_RETRIES) {
          // Se não encontrou e ainda não deu timeout, tentar novamente após um delay maior
          setTimeout(async () => {
            await fetchUserBusiness(user.id, 1);
          }, 3000);
        } else if (!biz) {
          // Se não encontrou após todas as tentativas, marcar timeout
          setBusinessLoadTimeout(true);
        }
      }, 1500);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [user?.id, user?.role, userBusiness, loadingBusinesses, businessLoadTimeout, fetchUserBusiness]);

  // Refresh preventivo da sessão (a cada 30 minutos) para evitar expiração
  // O Supabase já faz refresh automático, mas fazemos um preventivo para garantir
  useEffect(() => {
    if (user && user.id) {
      const refreshInterval = setInterval(async () => {
        try {
          // Verificar se sessão ainda é válida
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            // Refresh preventivo silencioso (antes de expirar)
            // O Supabase já faz isso automaticamente, mas garantimos aqui também
            await supabase.auth.refreshSession();
            // Não logar - refresh preventivo silencioso
          }
        } catch (error) {
          // Erro silencioso - não logar como erro crítico
          // O Supabase já gerencia o refresh automaticamente
        }
      }, 30 * 60 * 1000); // 30 minutos (refresh preventivo antes de expirar)

      return () => clearInterval(refreshInterval);
    }
  }, [user?.id]);

  // Refresh periódico do userBusiness (a cada 5 minutos) para manter dados atualizados
  useEffect(() => {
    if (user && user.role === 'BUSINESS_OWNER' && user.id && userBusiness) {
      const refreshInterval = setInterval(async () => {
        try {
          // Atualizar business para garantir que está sincronizado
          const biz = await fetchUserBusiness(user.id);
          if (biz) {
            setUserBusiness(biz);
            // Atualizar também na lista de businesses
            setBusinesses(prev => prev.map(b => b.id === biz.id ? biz : b));
          }
        } catch (error) {
          // Erro silencioso - não interromper o app
          console.warn('Erro no refresh periódico do business (não crítico):', error);
        }
      }, 5 * 60 * 1000); // 5 minutos

      return () => clearInterval(refreshInterval);
    }
  }, [user, userBusiness, fetchUserBusiness]);

  // Buscar dados quando um business é selecionado
  useEffect(() => {
    if (selectedBusiness?.id) {
      const loadBusinessData = async () => {
        const [prods, collabs, servs] = await Promise.all([
          fetchProductsForBusiness(selectedBusiness.id),
          fetchCollaboratorsForBusiness(selectedBusiness.id),
          fetchServicesForBusiness(selectedBusiness.id),
        ]);
        setProducts(prods);
        setCollaborators(collabs);
        setServices(servs);
      };
      loadBusinessData();
    }
  }, [selectedBusiness?.id, fetchProductsForBusiness, fetchCollaboratorsForBusiness, fetchServicesForBusiness]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // --- CART LOGIC ---
  const addToCart = (product: Product) => {
    // Verificar se há estoque disponível
    const currentStock = products.find(p => p.id === product.id)?.stock || 0;
    const existingCartItem = cart.find(item => item.product.id === product.id);
    const currentQuantity = existingCartItem ? existingCartItem.quantity : 0;
    
    if (currentStock <= currentQuantity) {
      addToast(`Estoque insuficiente para ${product.name}. Disponível: ${currentStock}`, 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Verificar se não excede o estoque ao aumentar a quantidade
        if (existing.quantity + 1 > currentStock) {
          addToast(`Estoque insuficiente. Disponível: ${currentStock}`, 'error');
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    addToast(`${product.name} adicionado à sacola!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Verificar se não excede o estoque disponível
        const product = products.find(p => p.id === productId);
        const availableStock = product?.stock || 0;
        
        if (newQty > availableStock) {
          addToast(`Estoque insuficiente. Disponível: ${availableStock}`, 'error');
          return item;
        }
        
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      addToast('Adicione produtos ao carrinho antes de finalizar a compra', 'error');
      return;
    }
    if (!user || !user.email) {
      addToast('É necessário estar logado para finalizar a compra', 'error');
      return;
    }
    // Verificar se há businessId válido
    const businessId = cart[0]?.product.businessId;
    if (!businessId) {
      addToast('Erro: Produto sem estabelecimento associado. Recarregue a página.', 'error');
      console.error('Produto no carrinho sem businessId:', cart[0]?.product);
      return;
    }
    // Fecha o drawer e abre o modal de checkout
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      // Calcula total e identifica businessId
      const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const applicationFee = total * 0.1;
      const partnerNet = total - applicationFee;
      
      // Pega o businessId do primeiro produto (assumindo que todos são do mesmo negócio)
      const businessId = cart[0]?.product.businessId;

      // Verificar estoque antes de processar a venda
      const stockIssues: string[] = [];
      cart.forEach(item => {
        const product = products.find(p => p.id === item.product.id);
        if (product && product.stock < item.quantity) {
          stockIssues.push(`${product.name}: estoque insuficiente (disponível: ${product.stock}, solicitado: ${item.quantity})`);
        }
      });

      if (stockIssues.length > 0) {
        addToast(`Erro: ${stockIssues.join('; ')}`, 'error');
        return;
      }

      // Atualizar estoque dos produtos vendidos
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.product.id === product.id);
        if (cartItem) {
          const newStock = product.stock - cartItem.quantity;
          return { ...product, stock: Math.max(0, newStock) };
        }
        return product;
      });
      setProducts(updatedProducts);

      // Salva transação no Supabase
      if (user && businessId) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            business_id: businessId,
            amount: total,
            admin_fee: applicationFee,
            partner_net: partnerNet,
            date: new Date().toISOString(),
            status: 'PAID',
            gateway: 'MERCADO_PAGO',
          });

        if (transactionError) {
          console.error('Erro ao salvar transação:', transactionError);
          // Não bloqueia o fluxo, apenas loga o erro
        }
      }

      addToast('Pagamento realizado com sucesso! Estoque atualizado.', 'success');
      
      // Criar notificação de compra
      if (user?.id && businessId) {
        const business = businesses.find(b => b.id === businessId);
        if (business) {
          await createPurchaseNotification(
            user.id,
            business.name,
            business.type,
            total,
            new Date()
          );
        }
      }
      
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (error: any) {
      console.error('Erro ao processar sucesso do pagamento:', error);
      addToast('Pagamento realizado, mas houve um erro ao salvar a transação', 'error');
      // Ainda limpa o carrinho mesmo com erro
      setCart([]);
      setIsCheckoutOpen(false);
    }
  };


  // Calcula total do carrinho
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setSelectedBusiness(null);
    setCart([]);
  };

  // Função mockLogin removida - usar autenticação real do Supabase
  // const mockLogin = (role: UserRole) => {
  //   setUser({
  //     id: Math.random().toString(),
  //     name: role === 'SUPER_ADMIN' ? 'Henrique Admin' : role === 'BUSINESS_OWNER' ? 'Marcos Dono' : 'Diego Cliente',
  //     email: 'user@test.com',
  //     role: role,
  //     businessId: role === 'BUSINESS_OWNER' ? '1' : undefined
  //   });
  // };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30">
          <div className="bg-white p-14 rounded-[4rem] shadow-2xl max-w-md w-full text-center space-y-12 border border-slate-100 animate-in zoom-in-95 duration-500">
             <div className="bg-indigo-600 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl rotate-12"><Zap size={56} fill="currentColor" /></div>
             <div><h2 className="text-4xl font-black tracking-tighter text-slate-900">Beleza<span className="text-indigo-600">Hub</span></h2><p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Infraestrutura SaaS de Estética Integrada ao Supabase.</p></div>
             <div className="space-y-4">
                <button 
                  onClick={async () => {
                    try {
                      await signInWithGoogle('CUSTOMER');
                    } catch (error: any) {
                      console.error('Erro ao fazer login com Google:', error);
                      setToast({
                        message: error?.message?.includes('redirect') 
                          ? 'Erro de configuração. Verifique o guia GOOGLE_OAUTH_SETUP.md'
                          : 'Erro ao fazer login. Verifique se o Google OAuth está configurado no Supabase.',
                        type: 'error'
                      });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white p-6 rounded-[1.8rem] font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl active:scale-95"
                >
                  Sou Cliente
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowBusinessLoginModal(true)} 
                    className="bg-white border-2 border-slate-200 p-4 rounded-2xl font-black text-xs text-slate-900 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    Sou Estabelecimento
                  </button>
                  <button
                    onClick={() => setShowAdminLoginModal(true)}
                    className="bg-white border-2 border-slate-200 p-4 rounded-2xl font-black text-xs text-slate-900 hover:bg-slate-900 hover:border-slate-900 hover:text-white transition-all active:scale-95 shadow-sm hover:shadow-md"
                  >
                    Admin Central
                  </button>
                </div>
             </div>
          </div>
        </div>
      );
    }

    if (selectedBusiness) {
      return (
        <BusinessDetailView
          business={selectedBusiness}
          collaborators={collaborators.filter((c: any) => c.businessId === selectedBusiness.id)}
          services={services.filter((s: any) => s.businessId === selectedBusiness.id)}
          products={products.filter((p: any) => p.businessId === selectedBusiness.id)}
          appointments={appointments}
          setAppointments={setAppointments}
          onBack={() => setSelectedBusiness(null)}
          addToast={addToast}
          addToCart={addToCart}
          user={user}
          createAppointmentNotification={createAppointmentNotification}
        />
      );
    }
    
    if (user.role === 'SUPER_ADMIN') {
      return <CentralAdminView businesses={businesses} setBusinesses={setBusinesses} activeTab={activeTab} addToast={addToast} fetchBusinesses={fetchBusinesses} />;
    }
    
    if (user.role === 'BUSINESS_OWNER') {
      // Usar userBusiness se disponível, senão buscar na lista
      const biz = userBusiness || businesses.find(b => b.ownerId === user.id || b.id === user.businessId);
      
      // Debug: log para verificar estado
      if (process.env.NODE_ENV === 'development') {
        console.log('BUSINESS_OWNER render:', {
          hasUserBusiness: !!userBusiness,
          businessesCount: businesses.length,
          loadingBusinesses,
          businessLoadTimeout,
          hasBiz: !!biz,
          userId: user.id,
          userBusinessId: user.businessId
        });
      }
      
      // Se não encontrou o business e ainda está carregando (mas não passou do timeout), mostrar loading
      if (!biz && loadingBusinesses && !businessLoadTimeout) {
        return (
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
            <div className="text-center">
              <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
              <p className="text-slate-600 font-semibold">Carregando estabelecimento...</p>
              <p className="text-slate-400 text-sm mt-2">Aguarde alguns instantes...</p>
            </div>
          </div>
        );
      }
      
      // Se não encontrou o business após carregar ou timeout, mostrar erro
      if (!biz && (!loadingBusinesses || businessLoadTimeout)) {
        return (
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
              <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-2xl font-black text-slate-900 mb-2">Estabelecimento não encontrado</h3>
              <p className="text-slate-600 mb-6">
                Não foi possível encontrar um estabelecimento associado à sua conta.
              </p>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    // Resetar estados
                    setBusinessLoadTimeout(false);
                    setLoadingBusinesses(true);
                    
                    // Tentar buscar novamente
                    if (user.id) {
                      try {
                        const { data: businessData, error: businessError } = await supabase
                          .from('businesses')
                          .select('*')
                          .eq('owner_id', user.id)
                          .maybeSingle();
                        
                        if (businessError && businessError.code !== 'PGRST116') {
                          console.error('Erro ao buscar business:', businessError);
                          addToast('Erro ao buscar estabelecimento. Verifique sua conexão.', 'error');
                          setLoadingBusinesses(false);
                          setBusinessLoadTimeout(true);
                          return;
                        }
                        
                        if (businessData) {
                          const biz: Business = {
                            id: businessData.id,
                            name: businessData.name,
                            type: businessData.type as 'BARBERSHOP' | 'SALON',
                            description: businessData.description || '',
                            address: businessData.address || '',
                            image: businessData.image || (businessData.type === 'BARBERSHOP' ? DEFAULT_BARBERSHOP_IMAGE : DEFAULT_SALON_IMAGE),
                            rating: Number(businessData.rating) || 0,
                            ownerId: businessData.owner_id,
                            monthlyFee: Number(businessData.monthly_fee) || 0,
                            revenueSplit: Number(businessData.revenue_split) || 10,
                            status: businessData.status as 'ACTIVE' | 'PENDING' | 'SUSPENDED',
                            gatewayId: businessData.gateway_id,
                            lastPaymentDate: businessData.last_payment_date,
                            mp_access_token: businessData.mp_access_token || null,
                            mp_refresh_token: businessData.mp_refresh_token || null,
                            mp_public_key: businessData.mp_public_key || null,
                            mp_user_id: businessData.mp_user_id || null,
                            mp_live_mode: businessData.mp_live_mode ?? null,
                            mp_token_expires_at: businessData.mp_token_expires_at || null
                          };
                          setUserBusiness(biz);
                          setBusinessLoadTimeout(false);
                          setBusinesses(prev => {
                            const exists = prev.find(b => b.id === biz.id);
                            if (!exists) {
                              return [...prev, biz];
                            }
                            return prev.map(b => b.id === biz.id ? biz : b);
                          });
                          setLoadingBusinesses(false);
                          addToast('Estabelecimento carregado com sucesso!', 'success');
                        } else {
                          addToast('Estabelecimento não encontrado. Entre em contato com o suporte.', 'error');
                          setLoadingBusinesses(false);
                          setBusinessLoadTimeout(true);
                        }
                      } catch (error: any) {
                        console.error('Erro ao buscar business:', error);
                        addToast('Erro ao buscar estabelecimento. Tente novamente.', 'error');
                        setLoadingBusinesses(false);
                        setBusinessLoadTimeout(true);
                      }
                    }
                  }}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => {
                    // Fazer logout
                    handleLogout();
                  }}
                  className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  Fazer Logout
                </button>
              </div>
            </div>
          </div>
        );
      }
      
      // Se encontrou o business, renderizar o dashboard
      if (biz) {
        return (
        <BusinessOwnerDashboard 
          business={biz} 
          collaborators={collaborators} 
          products={products}
          services={services}
          appointments={appointments}
          setCollaborators={setCollaborators}
          setProducts={setProducts}
          setServices={setServices}
          setAppointments={setAppointments}
          addToast={addToast}
          setBusinesses={setBusinesses}
          businesses={businesses}
        />
        );
      }
      
      // Fallback: se chegou aqui sem business e sem estar em loading/timeout, mostrar erro
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h3 className="text-2xl font-black text-slate-900 mb-2">Erro inesperado</h3>
            <p className="text-slate-600 mb-6">
              Ocorreu um erro ao carregar o estabelecimento. Tente fazer logout e login novamente.
            </p>
            <button
              onClick={() => handleLogout()}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all"
            >
              Fazer Logout
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto p-10 space-y-12 pb-24">
        <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
           <div className="relative z-10 max-w-2xl space-y-6">
              <h1 className="text-6xl font-black leading-none tracking-tighter">Sua beleza, <br/>em boas mãos.</h1>
              <p className="text-slate-400 text-xl font-medium">Encontre as melhores barbearias e salões e agende em segundos.</p>
              <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-2xl focus-within:bg-white transition-all">
                <Search className="text-slate-400 m-4" />
                <input type="text" placeholder="Estilo, serviço ou profissional..." className="flex-1 bg-transparent border-none outline-none font-medium text-slate-900" />
                <button className="bg-indigo-600 px-10 py-4 rounded-xl font-black shadow-xl">Explorar</button>
              </div>
           </div>
           <div className="absolute right-[-10%] bottom-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[160px] opacity-20" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {businesses.map(biz => (
            <div key={biz.id} onClick={() => setSelectedBusiness(biz)} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group">
               <div className="h-64 relative overflow-hidden">
                 <img src={biz.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                 <div className="absolute top-6 left-6 bg-white/90 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">{biz.type === 'BARBERSHOP' ? 'Barbearia' : 'Salão Premium'}</div>
                 <div className="absolute bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2"><Star size={16} fill="#f59e0b" className="text-amber-500" /> {biz.rating}</div>
               </div>
               <div className="p-10 space-y-6">
                 <div><h3 className="text-3xl font-black tracking-tighter mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors">{biz.name}</h3><p className="text-slate-600 font-medium line-clamp-2">{biz.description}</p></div>
                 <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">Ver Agenda & Loja <ChevronRight size={18} /></button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const location = useLocation();

  // Se estiver na rota de callback OAuth, renderizar apenas o componente de callback
  if (location.pathname === '/oauth/callback') {
    return <OAuthCallback />;
  }

  // Recarregar business após OAuth bem-sucedido
  useEffect(() => {
    if (location.state?.oauthSuccess && user?.role === 'BUSINESS_OWNER' && user?.id) {
      // Recarregar business do usuário após OAuth
      fetchUserBusiness(user.id).then(() => {
        addToast(location.state?.message || 'Mercado Pago conectado com sucesso!', 'success');
        // Limpar state para não recarregar novamente
        window.history.replaceState({}, document.title, location.pathname);
      });
    }
  }, [location.state, user, fetchUserBusiness, addToast]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onBack={selectedBusiness ? () => setSelectedBusiness(null) : undefined} 
        cartCount={totalCartItems} 
        onOpenCart={() => setIsCartOpen(true)}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
        notificationCount={notifications.filter(n => !n.read).length}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />
      
      {/* Menu Mobile - Aparece abaixo da navbar em telas pequenas */}
      {user?.role === 'SUPER_ADMIN' && !selectedBusiness && (
        <div className={`lg:hidden bg-white border-b border-slate-200 transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <nav className="px-4 py-4 space-y-1">
            <button 
              onClick={() => {
                setActiveTab('DASHBOARD');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-bold text-sm rounded-xl transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={20} />
              Dashboard Hub
            </button>
            <button 
              onClick={() => {
                setActiveTab('PARTNERS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-bold text-sm rounded-xl transition-all ${
                activeTab === 'PARTNERS'
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Users size={20} />
              Parceiros Ativos
            </button>
            <button 
              onClick={() => {
                setActiveTab('USERS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-bold text-sm rounded-xl transition-all ${
                activeTab === 'USERS'
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <UserCheck size={20} />
              Usuários
            </button>
            <button 
              onClick={() => {
                setActiveTab('FINANCE');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-bold text-sm rounded-xl transition-all ${
                activeTab === 'FINANCE'
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <DollarSign size={20} />
              Split Financeiro
            </button>
            <button 
              onClick={() => {
                setActiveTab('SETTINGS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-bold text-sm rounded-xl transition-all ${
                activeTab === 'SETTINGS'
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Settings size={20} />
              Configurações Hub
            </button>
          </nav>
        </div>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {user?.role === 'SUPER_ADMIN' && !selectedBusiness && (
          <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-64px)] py-10">
            <nav className="space-y-2">
              <SidebarItem icon={LayoutGrid} label="Dashboard Hub" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
              <SidebarItem icon={Users} label="Parceiros Ativos" active={activeTab === 'PARTNERS'} onClick={() => setActiveTab('PARTNERS')} />
              <SidebarItem icon={UserCheck} label="Usuários" active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} />
              <SidebarItem icon={DollarSign} label="Split Financeiro" active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} />
              <SidebarItem icon={Settings} label="Configurações Hub" active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} />
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-y-auto max-h-[calc(100vh-64px)] scroll-smooth">{renderContent()}</main>
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={() => user?.id && markAllNotificationsAsRead(user.id)}
      />

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cartItems={cart} 
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        accentBg={selectedBusiness?.type === 'BARBERSHOP' ? 'bg-indigo-600' : 'bg-rose-500'}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotal}
        email={user?.email || ''}
        businessId={cart[0]?.product.businessId}
        productId={cart[0]?.product.id}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal de Login/Cadastro para Estabelecimento */}
      {showBusinessLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">
                {isSignUp ? 'Criar Conta' : 'Login Estabelecimento'}
              </h3>
              <button 
                onClick={() => {
                  setShowBusinessLoginModal(false);
                  setIsSignUp(false);
                  setLoginForm({ email: '', password: '', name: '' });
                }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Estabelecimento</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Barbearia do João" 
                    value={loginForm.name} 
                    onChange={e => setLoginForm({...loginForm, name: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Email</label>
                <input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={loginForm.email} 
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Senha</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      if (isSignUp) {
                        if (!loginForm.email || !loginForm.password) {
                          addToast('Preencha email e senha', 'error');
                          return;
                        }
                        window.localStorage.setItem('pending_role', 'BUSINESS_OWNER');
                        await signUpWithEmail(loginForm.email, loginForm.password, loginForm.name);
                        addToast('Conta criada! Verifique seu email para confirmar.', 'success');
                        setShowBusinessLoginModal(false);
                        setLoginForm({ email: '', password: '', name: '' });
                        setIsSignUp(false);
                      } else {
                        if (!loginForm.email || !loginForm.password) {
                          addToast('Preencha email e senha', 'error');
                          return;
                        }
                        window.localStorage.setItem('pending_role', 'BUSINESS_OWNER');
                        await signInWithEmail(loginForm.email, loginForm.password);
                        addToast('Login realizado com sucesso!', 'success');
                        setShowBusinessLoginModal(false);
                        setLoginForm({ email: '', password: '', name: '' });
                      }
                    } catch (error: any) {
                      console.error('Erro:', error);
                      
                      // Tratar erro de usuário já registrado
                      if (isSignUp && (
                        error?.message?.includes('already registered') || 
                        error?.message?.includes('User already registered') ||
                        error?.status === 422
                      )) {
                        addToast(
                          'Este email já está cadastrado. Faça login ou use outro email.',
                          'error'
                        );
                        // Sugerir fazer login em vez de criar conta
                        setTimeout(() => {
                          setIsSignUp(false);
                          addToast('Tente fazer login com este email e senha.', 'success');
                        }, 2000);
                      } else {
                        addToast(
                          error?.message || (isSignUp ? 'Erro ao criar conta' : 'Email ou senha incorretos'),
                          'error'
                        );
                      }
                    }
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all"
                >
                  {isSignUp ? 'Criar Conta' : 'Entrar'}
                </button>

                <button
                  onClick={async () => {
                    try {
                      window.localStorage.setItem('pending_role', 'BUSINESS_OWNER');
                      await signInWithGoogle('BUSINESS_OWNER');
                    } catch (error: any) {
                      window.localStorage.removeItem('pending_role');
                      console.error('Erro ao fazer login com Google:', error);
                      addToast(
                        error?.message?.includes('redirect') 
                          ? 'Erro de configuração. Verifique o guia GOOGLE_OAUTH_SETUP.md'
                          : 'Erro ao fazer login com Google.',
                        'error'
                      );
                    }
                  }}
                  className="w-full bg-white border-2 border-slate-200 text-slate-900 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  Continuar com Google
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setLoginForm({ email: '', password: '', name: '' });
                  }}
                  className="text-sm text-slate-600 hover:text-indigo-600 font-bold transition-colors"
                >
                  {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Criar conta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Login para Admin */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">
                Login Admin Central
              </h3>
              <button
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setAdminLoginForm({ email: '', password: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Email</label>
                <input
                  type="email"
                  placeholder="admin@email.com"
                  value={adminLoginForm.email}
                  onChange={e => setAdminLoginForm({...adminLoginForm, email: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminLoginForm.password}
                  onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      if (!adminLoginForm.email || !adminLoginForm.password) {
                        addToast('Preencha email e senha', 'error');
                        return;
                      }
                      window.localStorage.setItem('pending_role', 'SUPER_ADMIN');
                      await signInWithEmail(adminLoginForm.email, adminLoginForm.password);
                      addToast('Login realizado com sucesso!', 'success');
                      setShowAdminLoginModal(false);
                      setAdminLoginForm({ email: '', password: '' });
                    } catch (error: any) {
                      console.error('Erro ao fazer login admin:', error);
                      addToast(
                        error?.message || 'Email ou senha incorretos',
                        'error'
                      );
                    }
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all"
                >
                  Entrar como Admin
                </button>

                <button
                  onClick={async () => {
                    try {
                      window.localStorage.setItem('pending_role', 'SUPER_ADMIN');
                      await signInWithGoogle('SUPER_ADMIN');
                    } catch (error: any) {
                      window.localStorage.removeItem('pending_role');
                      console.error('Erro ao fazer login com Google:', error);
                      addToast(
                        error?.message?.includes('redirect')
                          ? 'Erro de configuração. Verifique o guia GOOGLE_OAUTH_SETUP.md'
                          : 'Erro ao fazer login com Google.',
                        'error'
                      );
                    }
                  }}
                  className="w-full bg-white border-2 border-slate-200 text-slate-900 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  Continuar com Google
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
