
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, Calendar, ShoppingBag, Settings, Users, DollarSign, LogOut, 
  Plus, Search, Star, Clock, Menu, X, TrendingUp, CreditCard, AlertCircle, 
  CheckCircle2, Bell, RefreshCw, ExternalLink, ShieldCheck, Zap, ArrowLeft, 
  Scissors, ShoppingBasket, ChevronRight, Sparkles, Package, UserCheck, TrendingDown,
  Trash2, Edit3, Heart, Filter, List, Minus, ShoppingCart
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { User, Business, Service, Product, Appointment, Collaborator, UserRole } from './types';
import { generateBusinessDescription } from './services/geminiService';
import { supabase, signInWithGoogle, signOut } from './lib/supabase';

// --- TYPES ---
interface CartItem {
  product: Product;
  quantity: number;
}

// --- INITIAL MOCK DATA ---
const INITIAL_BUSINESSES: Business[] = [
  { 
    id: '1', name: 'Barba de Respeito', type: 'BARBERSHOP', description: 'Atendimento clássico com técnicas modernas de visagismo.', address: 'Av. Paulista, 100', image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800', rating: 4.8, ownerId: '1', monthlyFee: 150, revenueSplit: 10, status: 'ACTIVE'
  },
  { 
    id: '2', name: 'Studio Glamour', type: 'SALON', description: 'A excelência em colorimetria e tratamentos capilares avançados.', address: 'Rua Augusta, 500', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800', rating: 4.9, ownerId: '2', monthlyFee: 200, revenueSplit: 12, status: 'ACTIVE'
  }
];

const INITIAL_COLLABORATORS: Collaborator[] = [
  { id: 'c1', businessId: '1', name: 'João Mestre', role: 'Barbeiro Sênior', avatar: 'https://i.pravatar.cc/150?u=c1', rating: 4.9 },
  { id: 'c2', businessId: '1', name: 'Lucas Corte', role: 'Especialista em Fade', avatar: 'https://i.pravatar.cc/150?u=c2', rating: 4.7 },
  { id: 'c3', businessId: '2', name: 'Maria Estilo', role: 'Colorista', avatar: 'https://i.pravatar.cc/150?u=c3', rating: 5.0 },
];

const INITIAL_SERVICES: Service[] = [
  { id: 's1', businessId: '1', name: 'Corte Social', price: 45, duration: 30 },
  { id: 's2', businessId: '1', name: 'Barba Completa', price: 35, duration: 25 },
  { id: 's3', businessId: '2', name: 'Escova Progressiva', price: 180, duration: 120 },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', businessId: '1', name: 'Óleo para Barba Wood', price: 55, stock: 20, image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=400', category: 'Barba' },
  { id: 'p2', businessId: '2', name: 'Sérum Reparador', price: 85, stock: 15, image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=400', category: 'Tratamento' },
  { id: 'p3', businessId: '1', name: 'Pomada Matte Extra', price: 42, stock: 10, image: 'https://images.unsplash.com/photo-1599351431247-f10b21ce5602?auto=format&fit=crop&q=80&w=400', category: 'Cabelo' },
  { id: 'p4', businessId: '2', name: 'Shampoo Detox Lux', price: 65, stock: 25, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=400', category: 'Shampoo' },
];

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[250] animate-in slide-in-from-bottom-4 duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
};

// --- COMPONENTS ---

const Navbar = ({ user, onLogout, onBack, cartCount, onOpenCart }: any) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
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
        <button 
          onClick={onOpenCart}
          className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-90"
        >
          <ShoppingBag size={22} />
          {cartCount > 0 && <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">{cartCount}</span>}
        </button>
      )}
      {user ? (
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
      ) : (
        <button onClick={signInWithGoogle} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2">
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 brightness-200" alt="" />
          Google Login
        </button>
      )}
    </div>
  </header>
);

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

const BusinessOwnerDashboard = ({ business, collaborators, products, appointments, setCollaborators, setProducts, setAppointments, addToast }: any) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPOINTMENTS' | 'STORE' | 'TEAM'>('DASHBOARD');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<any>({});

  const handleAddItem = () => {
    if (showModal === 'PRODUCT') {
      const prod: Product = { ...newItem, id: Math.random().toString(), businessId: business.id, price: Number(newItem.price), stock: Number(newItem.stock), image: 'https://picsum.photos/seed/prod/400/400', category: newItem.category || 'Geral' };
      setProducts([...products, prod]);
      addToast('Produto adicionado ao estoque!', 'success');
    } else if (showModal === 'TEAM') {
      const pro: Collaborator = { ...newItem, id: Math.random().toString(), businessId: business.id, rating: 5.0, avatar: `https://i.pravatar.cc/150?u=${Math.random()}` };
      setCollaborators([...collaborators, pro]);
      addToast('Novo profissional cadastrado!', 'success');
    }
    setShowModal(null);
    setNewItem({});
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((p: any) => p.id !== id));
    addToast('Produto removido.', 'success');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'APPOINTMENTS':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black">Agenda da Unidade</h3>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl shadow-indigo-200">Gerenciar Horários</button>
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
      case 'STORE':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black">Estoque & Vitrine</h3>
              <button onClick={() => setShowModal('PRODUCT')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl">+ Novo Produto</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {products.filter((p: any) => p.businessId === business.id).map((prod: any) => (
                <div key={prod.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                  <div className="h-40 relative">
                    <img src={prod.image} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => deleteProduct(prod.id)} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
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
              <h3 className="text-xl font-black">Gestão de Equipe</h3>
              <button onClick={() => setShowModal('TEAM')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-xl">+ Adicionar Profissional</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collaborators.filter((c: any) => c.businessId === business.id).map((pro: any) => (
                <div key={pro.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                  <img src={pro.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{pro.name}</h4>
                    <p className="text-sm text-slate-500">{pro.role}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star size={14} fill="#f59e0b" className="text-amber-500" />
                      <span className="text-xs font-black">{pro.rating}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600"><Edit3 size={18} /></button>
                    <button onClick={() => setCollaborators(collaborators.filter((c:any) => c.id !== pro.id))} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
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
                   <div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{s.label}</p><p className="text-xl font-black">{s.value}</p></div>
                 </div>
               ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="flex items-center gap-4">
          <img src={business.image} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" alt="" />
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-slate-900">{business.name} <span className="text-indigo-600">Admin</span></h2>
            <p className="text-slate-500 text-sm font-medium">Gestão Inteligente & Automação.</p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
           {[
             { id: 'DASHBOARD', icon: LayoutGrid },
             { id: 'APPOINTMENTS', icon: Calendar },
             { id: 'STORE', icon: ShoppingBag },
             { id: 'TEAM', icon: Users },
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
              <h3 className="text-2xl font-black">{showModal === 'PRODUCT' ? 'Novo Produto' : 'Novo Profissional'}</h3>
              <button onClick={() => setSelectedBusiness(null)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="space-y-6">
              {showModal === 'PRODUCT' ? (
                <>
                  <input type="text" placeholder="Nome do Produto" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Preço (R$)" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: e.target.value})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                    <input type="number" placeholder="Estoque Inicial" value={newItem.stock || ''} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                  </div>
                  <input type="text" placeholder="Categoria" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                </>
              ) : (
                <>
                  <input type="text" placeholder="Nome do Profissional" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                  <input type="text" placeholder="Cargo/Especialidade" value={newItem.role || ''} onChange={e => setNewItem({...newItem, role: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" />
                </>
              )}
              <button onClick={handleAddItem} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- CUSTOMER VIEW ---

const BusinessDetailView = ({ business, collaborators, services, products, appointments, setAppointments, onBack, addToast, addToCart }: any) => {
  const [activeSubTab, setActiveSubTab] = useState<'SERVICES' | 'STORE'>('SERVICES');
  const [selectedPro, setSelectedPro] = useState<Collaborator | null>(null);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  
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

  const confirmBooking = () => {
    const app: Appointment = {
      id: Math.random().toString(),
      businessId: business.id,
      customerId: 'user1',
      collaboratorId: selectedPro!.id,
      serviceId: bookingService!.id,
      date: new Date().toISOString(),
      time: '14:30',
      status: 'SCHEDULED'
    };
    setAppointments([...appointments, app]);
    addToast('Agendamento confirmado com sucesso!', 'success');
    setBookingService(null);
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
                          onClick={() => setBookingService(service)}
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
    </div>
  );
};

// --- CENTRAL ADMIN (HUB) ---

const CentralAdminView = ({ businesses, setBusinesses, activeTab, addToast }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [newBiz, setNewBiz] = useState<any>({ type: 'BARBERSHOP', revenueSplit: 10, monthlyFee: 150 });
  const [loading, setLoading] = useState(false);

  const handleAddPartner = async () => {
    setLoading(true);
    const desc = await generateBusinessDescription(newBiz.name, newBiz.type);
    const biz: Business = {
      ...newBiz,
      id: Math.random().toString(),
      description: desc,
      address: 'Novo Endereço, 00',
      image: newBiz.type === 'BARBERSHOP' ? INITIAL_BUSINESSES[0].image : INITIAL_BUSINESSES[1].image,
      rating: 5.0,
      ownerId: Math.random().toString(),
      status: 'ACTIVE'
    };
    setBusinesses([...businesses, biz]);
    addToast(`Parceiro ${newBiz.name} cadastrado e ativo!`, 'success');
    setLoading(false);
    setShowModal(false);
    setNewBiz({ type: 'BARBERSHOP', revenueSplit: 10, monthlyFee: 150 });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'FINANCE':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                   <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Receita Hub (Split)</p>
                   <p className="text-4xl font-black mt-2">R$ 142.5k</p>
                   <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">SaaS Recorrente (MRR)</p>
                   <p className="text-4xl font-black text-slate-900 mt-2">R$ 28.9k</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estabelecimentos</p>
                   <p className="text-4xl font-black text-slate-900 mt-2">{businesses.length}</p>
                </div>
             </div>
             <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h4 className="font-black text-slate-900">Extrato Consolidado</h4><button className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">Exportar CSV</button></div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-8 py-4">Estabelecimento</th><th className="px-8 py-4 text-center">Status Pagamento</th><th className="px-8 py-4 text-center">Faturamento Bruto</th><th className="px-8 py-4 text-right">Split Líquido Hub</th></thead>
                  <tbody className="divide-y divide-slate-100">
                    {businesses.map((b: any) => (
                      <tr key={b.id} className="text-sm hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 font-bold">{b.name}</td>
                        <td className="px-8 py-4 text-center"><span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full">EM DIA</span></td>
                        <td className="px-8 py-4 text-center font-medium text-slate-500">R$ 12.400</td>
                        <td className="px-8 py-4 text-right font-black text-indigo-600">R$ {(12400 * b.revenueSplit / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        );
      case 'PARTNERS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
             {businesses.map((b: any) => (
               <div key={b.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                 <div className="h-40 relative overflow-hidden">
                    <img src={b.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                    <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black uppercase">{b.type}</div>
                 </div>
                 <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <h4 className="text-2xl font-black tracking-tighter leading-none">{b.name}</h4>
                      <span className="text-indigo-600 font-black text-xs">{b.revenueSplit}% Taxa</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-indigo-600 transition-colors">Configurar</button>
                      <button onClick={() => setBusinesses(businesses.filter((x:any)=>x.id !== b.id))} className="bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs hover:bg-red-50 hover:text-red-500 transition-colors">Remover</button>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        );
      default: // DASHBOARD
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm h-[450px]">
                   <h3 className="text-xl font-black mb-8 flex items-center gap-2"><TrendingUp className="text-indigo-600" /> Volume Global da Rede</h3>
                   <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={[{n:'Jan',v:12000},{n:'Fev',v:15000},{n:'Mar',v:13000},{n:'Abr',v:25000},{n:'Mai',v:38000}]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="n" />
                        <YAxis />
                        <Bar dataKey="v" fill="#6366f1" radius={[8,8,0,0]} barSize={50} />
                      </BarChart>
                   </ResponsiveContainer>
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
                   <button className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/40">Audit Logs</button>
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
              <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-black">Adicionar Parceiro</h3><button onClick={() => setShowModal(false)}><X /></button></div>
              <div className="space-y-6">
                 <input type="text" placeholder="Nome do Estabelecimento" value={newBiz.name || ''} onChange={e => setNewBiz({...newBiz, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                 <div className="grid grid-cols-2 gap-4">
                    <select value={newBiz.type} onChange={e => setNewBiz({...newBiz, type: e.target.value})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none"><option value="BARBERSHOP">Barbearia</option><option value="SALON">Salão</option></select>
                    <input type="number" placeholder="Split Hub %" value={newBiz.revenueSplit || ''} onChange={e => setNewBiz({...newBiz, revenueSplit: Number(e.target.value)})} className="p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                 </div>
                 <button onClick={handleAddPartner} disabled={loading || !newBiz.name} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all">
                   {loading ? 'Provisionando...' : 'Cadastrar e Ativar'}
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
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(INITIAL_COLLABORATORS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Cart State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || 'Usuário',
          email: session.user.email || '',
          role: (session.user.user_metadata.role as any) || 'CUSTOMER',
          avatar: session.user.user_metadata.avatar_url,
          businessId: session.user.user_metadata.business_id
        });
      }
    });
  }, []);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // --- CART LOGIC ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
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
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = () => {
    addToast('Compra finalizada com sucesso! Verifique seu e-mail.', 'success');
    setCart([]);
    setIsCartOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setSelectedBusiness(null);
    setCart([]);
  };

  const mockLogin = (role: UserRole) => {
    setUser({
      id: Math.random().toString(),
      name: role === 'SUPER_ADMIN' ? 'Henrique Admin' : role === 'BUSINESS_OWNER' ? 'Marcos Dono' : 'Diego Cliente',
      email: 'user@test.com',
      role: role,
      businessId: role === 'BUSINESS_OWNER' ? '1' : undefined
    });
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30">
          <div className="bg-white p-14 rounded-[4rem] shadow-2xl max-w-md w-full text-center space-y-12 border border-slate-100 animate-in zoom-in-95 duration-500">
             <div className="bg-indigo-600 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl rotate-12"><Zap size={56} fill="currentColor" /></div>
             <div><h2 className="text-4xl font-black tracking-tighter text-slate-900">Beleza<span className="text-indigo-600">Hub</span></h2><p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Infraestrutura SaaS de Estética Integrada ao Supabase.</p></div>
             <div className="space-y-4">
                <button onClick={() => mockLogin('CUSTOMER')} className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white p-6 rounded-[1.8rem] font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl active:scale-95">Sou Cliente</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => mockLogin('BUSINESS_OWNER')} className="bg-white border border-slate-200 p-4 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all">Sou Estabelecimento</button>
                  <button onClick={() => mockLogin('SUPER_ADMIN')} className="bg-white border border-slate-200 p-4 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all">Admin Central</button>
                </div>
                <button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-2 text-slate-400 font-black text-xs mt-4 hover:text-indigo-600 transition-colors">
                   <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" /> Login Oficial Google
                </button>
             </div>
          </div>
        </div>
      );
    }

    if (selectedBusiness) {
      return (
        <BusinessDetailView 
          business={selectedBusiness} 
          collaborators={collaborators} 
          services={services} 
          products={products} 
          appointments={appointments}
          setAppointments={setAppointments}
          onBack={() => setSelectedBusiness(null)}
          addToast={addToast}
          addToCart={addToCart}
        />
      );
    }
    
    if (user.role === 'SUPER_ADMIN') {
      return <CentralAdminView businesses={businesses} setBusinesses={setBusinesses} activeTab={activeTab} addToast={addToast} />;
    }
    
    if (user.role === 'BUSINESS_OWNER') {
      const biz = businesses.find(b => b.id === user.businessId) || businesses[0];
      return (
        <BusinessOwnerDashboard 
          business={biz} 
          collaborators={collaborators} 
          products={products} 
          appointments={appointments}
          setCollaborators={setCollaborators}
          setProducts={setProducts}
          setAppointments={setAppointments}
          addToast={addToast}
        />
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
                 <div><h3 className="text-3xl font-black tracking-tighter mb-2 group-hover:text-indigo-600 transition-colors">{biz.name}</h3><p className="text-slate-500 font-medium line-clamp-2">{biz.description}</p></div>
                 <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">Ver Agenda & Loja <ChevronRight size={18} /></button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onBack={selectedBusiness ? () => setSelectedBusiness(null) : undefined} 
        cartCount={totalCartItems} 
        onOpenCart={() => setIsCartOpen(true)}
      />
      <div className="flex flex-1 relative overflow-hidden">
        {user?.role === 'SUPER_ADMIN' && !selectedBusiness && (
          <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-64px)] py-10">
            <nav className="space-y-2">
              <SidebarItem icon={LayoutGrid} label="Dashboard Hub" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
              <SidebarItem icon={Users} label="Parceiros Ativos" active={activeTab === 'PARTNERS'} onClick={() => setActiveTab('PARTNERS')} />
              <SidebarItem icon={DollarSign} label="Split Financeiro" active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} />
              <SidebarItem icon={Settings} label="Configurações Hub" active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} />
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-y-auto max-h-[calc(100vh-64px)] scroll-smooth">{renderContent()}</main>
      </div>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cartItems={cart} 
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        accentBg={selectedBusiness?.type === 'BARBERSHOP' ? 'bg-indigo-600' : 'bg-rose-500'}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
