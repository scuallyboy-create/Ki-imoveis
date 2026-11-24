import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icons } from '../components/ui/Icons';
import { ADMIN_EMAIL } from '@/src/constants';
import { formatCurrency, cn } from '@/src/lib/utils';
import { calculateCommission } from '@/src/lib/commissionService';
import PropertyCard from '../components/listings/PropertyCard';
import ProfilePhotoModal from '../components/dashboard/ProfilePhotoModal';
import AdminLicensePanel from '../components/dashboard/AdminLicensePanel';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { ASSETS } from '@/src/lib/assets';
import {
  DATA_UPDATED_EVENT,
  deleteProperty,
  emitDataUpdate,
  getPlanCatalog,
  getProperties,
  getVisitRequests,
  updateProperty,
  updateVisitStatus,
} from '@/src/lib/dataService';
import {
  AvailabilityStatus,
  AppNotification,
  NotificationPreferences,
  PlanCatalogItem,
  Property,
  PropertyRequest,
  SubscriptionPlan,
  VisitRequest,
} from '@/src/types';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  dispatchNotification,
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/src/lib/notificationService';

type DashboardTab =
  | 'listings'
  | 'requests'
  | 'finances'
  | 'calendar'
  | 'notifications'
  | 'settings'
  | 'admin';

const VALID_TABS: DashboardTab[] = [
  'listings',
  'requests',
  'finances',
  'calendar',
  'notifications',
  'settings',
  'admin',
];

const AVAILABILITY_LABELS: Record<AvailabilityStatus, { label: string; style: string }> = {
  available: { label: 'Disponível', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  sold: { label: 'Vendido', style: 'bg-rose-50 text-rose-800 border-rose-200' },
  rented: { label: 'Alugado', style: 'bg-amber-50 text-amber-800 border-amber-200' },
};

export default function Dashboard() {
  const { user, loading, signOut, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (() => {
    const t = searchParams.get('tab') as DashboardTab | null;
    return t && VALID_TABS.includes(t) ? t : 'listings';
  })();

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [planCatalog, setPlanCatalog] = useState<Record<SubscriptionPlan, PlanCatalogItem>>(() =>
    getPlanCatalog()
  );
  const [properties, setProperties] = useState<Property[]>(() => getProperties());
  const [visits, setVisits] = useState<VisitRequest[]>(() => getVisitRequests());
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Admin catalog scope defaults to full platform moderation
  const adminShowAllProperties = true;

  // Modals & inline confirmations
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [confirmDeletePropId, setConfirmDeletePropId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PropertyRequest | null>(null);

  // Settings controlled form state
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as DashboardTab | null;
    if (paramTab && VALID_TABS.includes(paramTab)) {
      if (paramTab === 'admin' && user && user.role !== 'admin') {
        setActiveTab('listings');
      } else {
        setActiveTab(paramTab);
      }
    } else if (!paramTab && user?.role === 'admin') {
      setActiveTab('admin');
    } else if (!paramTab && user && user.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('listings');
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName || '');
      setPhoneInput(user.phoneNumber || '');
      setAddressInput(user.address || user.location || '');
      setBioInput(user.bio || '');
    }
  }, [user]);

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'listings' ? {} : { tab });
  };

  const fetchRequests = async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const { data } = await supabase.from('property_requests').select('*');
      const allRows = Array.isArray(data) ? (data as PropertyRequest[]) : [];
      // Strict client-side ownership isolation
      const scoped = allRows.filter((item) => {
        if (user.role === 'admin') return true;
        if (user.role === 'user') return item.ownerId === user.uid;
        return item.assignedAgentId === user.uid || item.ownerId === user.uid;
      });
      setRequests(scoped.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch {
      setRequests([]);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    const syncStore = () => {
      setPlanCatalog(getPlanCatalog());
      setProperties(getProperties());
      setVisits(getVisitRequests());
      if (user) {
        setNotifications(getNotificationsForUser(user.uid, user.email));
        fetchRequests();
      } else {
        setNotifications([]);
      }
    };
    syncStore();
    window.addEventListener(DATA_UPDATED_EVENT, syncStore);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, syncStore);
  }, [user?.uid, user?.email, user?.role]);

  // Strictly isolated owned properties (for admin: moderation view of catalog)
  const myOwnedProperties = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return adminShowAllProperties ? properties : [];
    }
    return properties.filter((p) => p.agentId === user.uid || p.ownerId === user.uid);
  }, [properties, user, adminShowAllProperties]);

  const myFavoriteProperties = useMemo(() => {
    if (!user || !Array.isArray(user.favorites)) return [];
    return properties.filter((p) => user.favorites.includes(p.id));
  }, [properties, user]);

  // Strictly isolated visits for current user/agent
  const myVisits = useMemo(() => {
    if (!user) return [];
    return visits.filter((v) => {
      if (user.role === 'admin') return true;
      return v.userId === user.uid || v.agentId === user.uid;
    });
  }, [visits, user]);

  // Computed finances from user's own closed deals
  const closedDeals = useMemo(() => {
    return myOwnedProperties.filter(
      (p) => p.availabilityStatus === 'sold' || p.availabilityStatus === 'rented'
    );
  }, [myOwnedProperties]);

  const financialStats = useMemo(() => {
    let totalVolume = 0;
    let totalCommission = 0;
    let totalPlatformFee = 0;
    closedDeals.forEach((p) => {
      const calc = calculateCommission(p.price, p.status);
      totalVolume += calc.totalValue;
      totalCommission += calc.agentEarnings;
      totalPlatformFee += calc.platformFee;
    });
    return {
      totalVolume,
      totalCommission,
      totalPlatformFee,
      closedCount: closedDeals.length,
    };
  }, [closedDeals]);

  const handleAvailabilityChange = (id: string, availabilityStatus: AvailabilityStatus) => {
    updateProperty(id, { availabilityStatus });
    const label = AVAILABILITY_LABELS[availabilityStatus].label;
    showToast(`Estado do imóvel alterado para "${label}".`, 'success');
  };

  const handleSavePropertyEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    updateProperty(editingProperty.id, {
      title: editingProperty.title.trim() || 'Imóvel sem título',
      price: Number(editingProperty.price) || 0,
      status: editingProperty.status,
      availabilityStatus: editingProperty.availabilityStatus,
      description: editingProperty.description,
      details: {
        ...editingProperty.details,
        bedrooms: Math.max(1, Number(editingProperty.details.bedrooms) || 1),
      },
    });
    showToast('Alterações ao imóvel guardadas com sucesso.', 'success');
    setEditingProperty(null);
  };

  const handleConfirmDeleteProperty = (id: string) => {
    deleteProperty(id);
    setConfirmDeletePropId(null);
    showToast('Imóvel removido do catálogo.', 'info');
  };

  const handleUpdateRequestStatus = async (
    req: PropertyRequest,
    nextStatus: PropertyRequest['status']
  ) => {
    try {
      await supabase.from('property_requests').update({ status: nextStatus }).eq('id', req.id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r)));
      if (selectedRequest?.id === req.id) {
        setSelectedRequest({ ...req, status: nextStatus });
      }
      emitDataUpdate();
      if (req.status !== nextStatus && req.ownerEmail) {
        const statusText = nextStatus === 'completed' ? 'Concluído' : 'Em Análise';
        void dispatchNotification({
          userId: req.ownerId,
          userEmail: req.ownerEmail,
          recipientName: req.ownerName,
          type: 'request_status_changed',
          title: `Pedido "${req.propertyTitle}" — ${statusText}`,
          message: `O estado do seu pedido de publicação/avaliação para "${req.propertyTitle}" foi atualizado para "${statusText}".`,
          emailSubject: `[Ki-Imóveis] Atualização do pedido: ${req.propertyTitle} (${statusText})`,
          relatedId: req.id,
          link: '/dashboard?tab=requests',
        });
      }
      showToast('Estado do pedido atualizado.', 'success');
    } catch {
      showToast('Não foi possível atualizar o pedido.', 'error');
    }
  };

  const handleVisitAction = (id: string, nextStatus: VisitRequest['status']) => {
    updateVisitStatus(id, nextStatus);
    showToast(
      nextStatus === 'confirmed'
        ? 'Visita confirmada e alerta enviado ao cliente!'
        : 'Visita cancelada e cliente notificado.',
      nextStatus === 'confirmed' ? 'success' : 'info'
    );
  };

  const handleToggleNotifPref = async (key: keyof NotificationPreferences) => {
    if (!user) return;
    const currentPrefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user.notificationPreferences || {}),
    };
    const nextPrefs: NotificationPreferences = {
      ...currentPrefs,
      [key]: !currentPrefs[key],
    };
    await updateUserProfile({ notificationPreferences: nextPrefs });
    showToast('Preferência de alertas por e-mail atualizada.', 'success');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateUserProfile({
        displayName: displayNameInput.trim() || user?.displayName || 'Utilizador',
        phoneNumber: phoneInput.trim(),
        address: addressInput.trim(),
        location: addressInput.trim(),
        bio: bioInput.trim(),
      });
      showToast('Definições de perfil guardadas!', 'success');
    } catch {
      showToast('Erro ao guardar definições.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestPlanUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) return;
    if (user.subscriptionPlan === plan && user.licenseStatus === 'active') {
      showToast(`Já possui o plano ${planCatalog[plan].name} ativo.`, 'info');
      return;
    }
    await updateUserProfile({
      packageRequested: plan,
      licenseStatus: 'pending',
    });
    showToast(
      `Pedido de adesão ao plano ${planCatalog[plan].name} enviado para aprovação do administrador.`,
      'success'
    );
  };

  if (loading || !user) {
    return (
      <div className="pt-32 pb-20 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
      </div>
    );
  }

  const isRootAdmin = user.email.toLowerCase() === ADMIN_EMAIL || user.role === 'admin';
  const currentPlan: SubscriptionPlan = user.subscriptionPlan || 'free';
  const licenseStatus = user.licenseStatus || 'active';

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const navTabs: { id: DashboardTab; label: string; icon: keyof typeof Icons; badge?: number }[] = isRootAdmin
    ? [
        { id: 'admin', label: 'Licenças & Agentes', icon: 'KeyRound' },
        { id: 'listings', label: 'Moderar Catálogo', icon: 'Home' },
        { id: 'requests', label: 'Pedidos & Leads', icon: 'Search' },
        { id: 'calendar', label: 'Visitas', icon: 'Calendar' },
        { id: 'notifications', label: 'Notificações', icon: 'Bell', badge: unreadNotifs },
        { id: 'finances', label: 'Financeiro', icon: 'Gem' },
        { id: 'settings', label: 'Definições', icon: 'Settings' },
      ]
    : [
        { id: 'listings', label: user.role === 'user' ? 'Meus Imóveis & Favoritos' : 'Meus Imóveis', icon: 'Home' },
        { id: 'requests', label: user.role === 'user' ? 'Meus Pedidos' : 'Leads de Proprietários', icon: 'Search' },
        { id: 'calendar', label: 'Visitas', icon: 'Calendar' },
        { id: 'notifications', label: 'Notificações', icon: 'Bell', badge: unreadNotifs },
        { id: 'finances', label: 'Financeiro', icon: 'Gem' },
        { id: 'settings', label: 'Definições', icon: 'Settings' },
      ];

  const pageHeading =
    activeTab === 'listings'
      ? isRootAdmin
        ? 'Moderação do Catálogo'
        : user.role === 'user'
        ? 'Meus Imóveis & Favoritos'
        : 'Meus Imóveis'
      : activeTab === 'requests'
      ? isRootAdmin
        ? 'Gestão de Pedidos & Leads'
        : user.role === 'user'
        ? 'Meus Pedidos de Avaliação'
        : 'Leads de Proprietários'
      : activeTab === 'calendar'
      ? 'Calendário de Visitas'
      : activeTab === 'notifications'
      ? 'Notificações & Alertas por E-mail'
      : activeTab === 'finances'
      ? 'Resumo Financeiro'
      : activeTab === 'admin'
      ? 'Consola de Gestão, Licenças & Agentes'
      : 'Definições da Conta';

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-2">
          <div className="flex flex-col items-center gap-4 p-7 bg-white border border-gray-200 rounded-3xl mb-6 text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icons.User size={38} className="text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                title="Alterar foto de perfil"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-gray-900 text-white hover:bg-brand-primary transition-colors shadow-md cursor-pointer"
              >
                <Icons.Camera size={14} />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-gray-900">{user.displayName}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-md capitalize">
                  {isRootAdmin ? 'Administrador' : user.role.replace('_', ' ')}
                </span>
                <span className="px-2.5 py-0.5 bg-rose-50 text-brand-primary border border-rose-200 text-[11px] font-semibold rounded-md">
                  {isRootAdmin ? 'Gestão Global' : planCatalog[currentPlan].name}
                </span>
              </div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navTabs.map((item) => {
              const Icon = Icons[item.icon];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all text-sm font-semibold cursor-pointer',
                    activeTab === item.id
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[11px] font-bold tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {pageHeading}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isRootAdmin
                  ? 'Administração Ki-Imóveis: avalie agentes, valide licenças e supervisione o catálogo.'
                  : user.role === 'user'
                  ? 'Consulte apenas os seus imóveis guardados, publicações próprias e visitas.'
                  : 'Gerencie os seus imóveis publicados, disponibilidade, leads e visitas.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isRootAdmin ? (
                <button
                  type="button"
                  onClick={() => selectTab('admin')}
                  className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4 bg-gray-900 hover:bg-gray-800"
                >
                  <Icons.KeyRound size={17} />
                  <span>Licenças & Agentes</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/request-submission')}
                  className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4"
                >
                  <Icons.Plus size={18} />
                  <span>Publicar Imóvel</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="p-2.5 rounded-xl border border-gray-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Terminar Sessão"
              >
                <Icons.LogOut size={18} />
              </button>
            </div>
          </div>

          {/* TAB 1: LISTINGS & FAVORITES */}
          {activeTab === 'listings' && (
            <div className="space-y-10">
              {/* Own Published Listings (or Full Catalog Moderation for Admin) */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {isRootAdmin ? 'Catálogo da Plataforma (Moderação)' : 'Os Meus Imóveis Publicados'}
                    <span className="ml-2 text-xs font-semibold text-gray-400 tabular-nums">
                      ({myOwnedProperties.length})
                    </span>
                  </h2>
                </div>

                {myOwnedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myOwnedProperties.map((prop) => {
                      const avail = prop.availabilityStatus || 'available';
                      const badge = AVAILABILITY_LABELS[avail];
                      const isConfirming = confirmDeletePropId === prop.id;

                      return (
                        <div
                          key={prop.id}
                          className="border border-gray-200 rounded-3xl p-4 bg-white flex flex-col justify-between gap-4"
                        >
                          <div>
                            <Link
                              to={`/property/${prop.id}`}
                              className="block relative aspect-[4/3] rounded-2xl overflow-hidden mb-3.5 bg-gray-100"
                            >
                              <img
                                src={prop.images?.[0] || ASSETS.propTalatonaFlat}
                                alt={prop.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                              <span
                                className={cn(
                                  'absolute top-3 left-3 px-2.5 py-1 rounded-md border text-[11px] font-semibold',
                                  badge.style
                                )}
                              >
                                {badge.label}
                              </span>
                            </Link>

                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/property/${prop.id}`}
                                className="font-bold text-gray-900 hover:text-brand-primary line-clamp-1"
                              >
                                {prop.title}
                              </Link>
                              <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                                {formatCurrency(prop.price)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {prop.location.city}, {prop.location.province} · T{prop.details.bedrooms} ·{' '}
                              {prop.status === 'rent' ? 'Arrendamento' : 'Venda'}
                            </p>
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase">
                                Estado:
                              </span>
                              <select
                                value={avail}
                                onChange={(e) =>
                                  handleAvailabilityChange(prop.id, e.target.value as AvailabilityStatus)
                                }
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold bg-white cursor-pointer"
                              >
                                <option value="available">Disponível</option>
                                <option value="sold">Vendido</option>
                                <option value="rented">Alugado</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingProperty(JSON.parse(JSON.stringify(prop)))}
                                className="flex-1 btn-outline py-2 text-xs flex items-center justify-center gap-1.5"
                              >
                                <Icons.Edit3 size={14} />
                                Editar
                              </button>
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDeleteProperty(prop.id)}
                                    className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeletePropId(null)}
                                    className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeletePropId(prop.id)}
                                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                                  title="Remover imóvel"
                                >
                                  <Icons.Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-3 bg-gray-50/40">
                    <Icons.Home size={36} className="mx-auto text-gray-300" />
                    <p className="font-semibold text-gray-700">
                      {isRootAdmin
                        ? 'Sem imóveis para moderar de momento.'
                        : 'Ainda não publicou nenhum imóvel com esta conta.'}
                    </p>
                    {!isRootAdmin && (
                      <button
                        type="button"
                        onClick={() => navigate('/request-submission')}
                        className="btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2"
                      >
                        <Icons.Plus size={16} /> Publicar Primeiro Imóvel
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Favorites Section */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Imóveis Favoritos
                  <span className="ml-2 text-xs font-semibold text-gray-400 tabular-nums">
                    ({myFavoriteProperties.length})
                  </span>
                </h2>
                {myFavoriteProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myFavoriteProperties.map((p) => (
                      <PropertyCard key={p.id} property={p} />
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl p-6 text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <span>Guarde imóveis clicando no coração para os comparar aqui.</span>
                    <Link to="/listings" className="text-brand-primary font-semibold hover:underline">
                      Explorar Catálogo
                    </Link>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: REQUESTS / LEADS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {isDataLoading ? (
                <div className="py-12 text-center text-gray-400">A carregar pedidos...</div>
              ) : requests.length > 0 ? (
                requests.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={item.propertyImages?.[0] || ASSETS.propVianaVilla}
                        alt={item.propertyTitle}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{item.propertyTitle}</h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.ownerName} · {item.location}
                          {item.estimatedValue ? ` · ${formatCurrency(item.estimatedValue)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-semibold border',
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'claimed'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        )}
                      >
                        {item.status === 'completed'
                          ? 'Concluído'
                          : item.status === 'claimed'
                          ? 'Em Análise'
                          : 'Pendente'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(item)}
                        className="btn-primary py-2 px-4 text-xs"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-3xl space-y-2">
                  <Icons.Search size={36} className="mx-auto text-gray-300" />
                  <p className="font-semibold">Nenhum pedido ou lead associado à sua conta.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CALENDAR / VISITAS */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              {myVisits.length > 0 ? (
                myVisits.map((visit) => {
                  const intentLabel =
                    visit.intent === 'buy'
                      ? 'Proposta de Compra'
                      : visit.intent === 'rent'
                      ? 'Proposta de Arrendamento'
                      : 'Visita Presencial';

                  return (
                    <div
                      key={visit.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={visit.propertyImage || ASSETS.propTalatonaFlat}
                          alt={visit.propertyTitle}
                          referrerPolicy="no-referrer"
                          className="w-20 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
                        />
                        <div>
                          <Link
                            to={`/property/${visit.propertyId}`}
                            className="font-bold text-gray-900 hover:text-brand-primary"
                          >
                            {visit.propertyTitle}
                          </Link>
                          <p className="text-xs text-gray-600 mt-1 tabular-nums">
                            {visit.date} às {visit.time} · <span className="font-semibold">{intentLabel}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Cliente: {visit.userName} ({visit.userPhone || visit.userEmail})
                          </p>
                          {visit.message && (
                            <p className="text-xs text-gray-600 mt-1.5 italic">"{visit.message}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-semibold border',
                            visit.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : visit.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          {visit.status === 'confirmed'
                            ? 'Confirmada'
                            : visit.status === 'cancelled'
                            ? 'Cancelada'
                            : 'Pendente'}
                        </span>

                        {visit.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVisitAction(visit.id, 'confirmed')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVisitAction(visit.id, 'cancelled')}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-14 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-3xl space-y-2">
                  <Icons.Calendar size={36} className="mx-auto text-gray-300" />
                  <p className="font-semibold">Sem visitas agendadas de momento.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINANCES */}
          {activeTab === 'finances' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 tabular-nums">
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">
                    Volume Negociado (Seus Imóveis)
                  </span>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1.5">
                    {formatCurrency(financialStats.totalVolume)}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">
                    Comissões Estimadas (3%)
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">
                    {formatCurrency(financialStats.totalCommission)}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">
                    Negócios Fechados
                  </span>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1.5">
                    {financialStats.closedCount}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-lg text-gray-900">
                  Imóveis Vendidos e Alugados ({closedDeals.length})
                </h3>
                {closedDeals.length > 0 ? (
                  <div className="divide-y divide-gray-100 tabular-nums">
                    {closedDeals.map((deal) => {
                      const calc = calculateCommission(deal.price, deal.status);
                      return (
                        <div
                          key={deal.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-bold text-sm text-gray-900">{deal.title}</p>
                            <p className="text-xs text-gray-500">
                              {deal.availabilityStatus === 'sold' ? 'Vendido' : 'Alugado'} · Valor:{' '}
                              {formatCurrency(calc.totalValue)}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-sm font-bold text-emerald-700">
                              +{formatCurrency(calc.agentEarnings)}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Taxa plataforma (2.5%): {formatCurrency(calc.platformFee)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Quando marcar um dos seus imóveis como Vendido ou Alugado, os cálculos de comissão aparecerão aqui.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & PROFILE PHOTO */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <form
                onSubmit={handleSaveSettings}
                className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
                  <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 shrink-0 flex items-center justify-center">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icons.User size={40} className="text-gray-400" />
                    )}
                  </div>
                  <div className="text-center sm:text-left space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">{user.displayName}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <button
                      type="button"
                      onClick={() => setPhotoModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer"
                    >
                      <Icons.Camera size={14} />
                      <span>Alterar Foto de Perfil</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Nome de Exibição
                    </label>
                    <input
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Telefone
                    </label>
                    <input
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Localização
                  </label>
                  <input
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Luanda, Angola"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Biografia / Apresentação
                  </label>
                  <textarea
                    rows={3}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Fale brevemente sobre a sua experiência ou preferência imobiliária..."
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="btn-primary py-2.5 px-6 text-sm"
                  >
                    {savingSettings ? 'A guardar...' : 'Guardar Alterações'}
                  </button>
                </div>
              </form>

              {/* Plan & License Status Card */}
              <section className="p-6 sm:p-8 bg-gray-900 text-white rounded-3xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                      {isRootAdmin ? 'Estatuto Administrativo Ki-Imóveis' : 'Plano & Licença Ki-Imóveis'}
                    </span>
                    <h3 className="text-2xl font-bold mt-1">
                      {isRootAdmin
                        ? 'Administrador & Gestor da Plataforma'
                        : `${planCatalog[currentPlan].name} (${planCatalog[currentPlan].priceLabel})`}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-semibold',
                      licenseStatus === 'active'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : licenseStatus === 'pending'
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                    )}
                  >
                    {isRootAdmin
                      ? 'Acesso Administrativo Ativo'
                      : `Licença: ${
                          licenseStatus === 'active'
                            ? 'Ativa'
                            : licenseStatus === 'pending'
                            ? 'Pendente Aprovação'
                            : licenseStatus === 'suspended'
                            ? 'Suspensa'
                            : 'Expirada'
                        }`}
                  </span>
                </div>

                <p className="text-sm text-gray-300">
                  {isRootAdmin
                    ? 'Permissões: Validar licenças, avaliar agentes, gerir pacotes pagos e preços, e moderar o catálogo. Publicação de imóveis desativada para este perfil.'
                    : `${user.licenseNumber ? `Nº de Licença: ${user.licenseNumber} · ` : ''}Limite: ${
                        user.permissions?.maxListings === -1
                          ? 'Imóveis ilimitados'
                          : `Até ${
                              user.permissions?.maxListings ??
                              planCatalog[currentPlan].defaultPermissions.maxListings
                            } imóveis`
                      }`}
                </p>

                {!isRootAdmin && user.packageRequested && (
                  <p className="text-xs text-amber-300 font-semibold">
                    Pedido em curso para o pacote {planCatalog[user.packageRequested].name}. A aguardar ativação pelo administrador.
                  </p>
                )}

                {!isRootAdmin && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {currentPlan !== 'silver' && (
                      <button
                        type="button"
                        onClick={() => handleRequestPlanUpgrade('silver')}
                        className="px-4 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        Solicitar {planCatalog.silver.name} ({planCatalog.silver.priceLabel})
                      </button>
                    )}
                    {currentPlan !== 'gold' && (
                      <button
                        type="button"
                        onClick={() => handleRequestPlanUpgrade('gold')}
                        className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-rose-600 cursor-pointer"
                      >
                        Solicitar {planCatalog.gold.name} ({planCatalog.gold.priceLabel})
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS & EMAIL ALERTS */}
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Preferências de Alertas por E-mail</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Os alertas são enviados para <span className="font-semibold text-gray-800">{user.email}</span> e registados na sua caixa de entrada.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      key: 'emailOnVisitUpdates' as const,
                      label: 'Visitas e Confirmações',
                      desc: 'Alertas quando uma visita for agendada, confirmada ou cancelada.',
                    },
                    {
                      key: 'emailOnPropertyStatusChanges' as const,
                      label: 'Estado dos Imóveis',
                      desc: 'Avisos quando imóveis guardados ou visitados mudarem de estado.',
                    },
                    {
                      key: 'emailOnRequestUpdates' as const,
                      label: 'Pedidos e Licenças',
                      desc: 'Notificações sobre aprovação de pacotes, licenças e pedidos.',
                    },
                  ].map((pref) => {
                    const enabled = {
                      ...DEFAULT_NOTIFICATION_PREFERENCES,
                      ...(user.notificationPreferences || {}),
                    }[pref.key];
                    return (
                      <label
                        key={pref.key}
                        className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">{pref.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{pref.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => void handleToggleNotifPref(pref.key)}
                          className="w-4 h-4 mt-1 accent-brand-primary cursor-pointer shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    Histórico de Notificações ({notifications.length})
                  </h3>
                  {unreadNotifs > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead(user.uid, user.email)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                    >
                      <Icons.CheckCheck size={15} /> Marcar todas como lidas
                    </button>
                  )}
                </div>

                {notifications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'py-4 px-3 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                          !n.read && 'bg-rose-50/40'
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />}
                            <p className="font-bold text-sm text-gray-900">{n.title}</p>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-semibold border',
                                n.emailSent
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              )}
                            >
                              {n.emailSent
                                ? `E-mail enviado (${n.deliveryProvider.toUpperCase()})`
                                : 'Registado na caixa'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{n.message}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">
                            Assunto: {n.emailSubject}
                          </p>
                          {n.deliveryNote && (
                            <p className="text-[11px] text-gray-400">{n.deliveryNote}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markNotificationRead(n.id)}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Marcar lida
                            </button>
                          )}
                          {n.link && (
                            <Link
                              to={n.link}
                              onClick={() => markNotificationRead(n.id)}
                              className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-brand-primary"
                            >
                              Abrir
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
                    <Icons.Bell size={34} className="mx-auto text-gray-300" />
                    <p className="font-semibold text-sm">Sem notificações de momento.</p>
                    <p className="text-xs text-gray-400">
                      Receberá alertas aqui e por e-mail quando as suas visitas forem confirmadas ou o estado de um imóvel mudar.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 7: ADMIN LICENSE & PERMISSIONS CONSOLE (scuallyboy@gmail.com) */}
          {activeTab === 'admin' && isRootAdmin && <AdminLicensePanel />}
        </main>
      </div>

      {/* Profile Photo Crop/Upload Modal */}
      {photoModalOpen && (
        <ProfilePhotoModal
          currentPhoto={user.photoURL}
          displayName={user.displayName}
          onSave={async (dataUrl) => {
            await updateUserProfile({ photoURL: dataUrl });
          }}
          onRemove={async () => {
            await updateUserProfile({ photoURL: '' });
          }}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePropertyEdit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Editar Imóvel</h3>
              <button
                type="button"
                onClick={() => setEditingProperty(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Título
              </label>
              <input
                value={editingProperty.title}
                onChange={(e) =>
                  setEditingProperty({ ...editingProperty, title: e.target.value })
                }
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Preço (AOA)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editingProperty.price}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, price: Number(e.target.value) })
                  }
                  className="input-field tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Quartos (T)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editingProperty.details.bedrooms}
                  onChange={(e) =>
                    setEditingProperty({
                      ...editingProperty,
                      details: { ...editingProperty.details, bedrooms: Number(e.target.value) },
                    })
                  }
                  className="input-field tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Modalidade
                </label>
                <select
                  value={editingProperty.status}
                  onChange={(e) =>
                    setEditingProperty({
                      ...editingProperty,
                      status: e.target.value as 'sale' | 'rent',
                    })
                  }
                  className="input-field"
                >
                  <option value="sale">Venda</option>
                  <option value="rent">Arrendamento</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Disponibilidade
                </label>
                <select
                  value={editingProperty.availabilityStatus || 'available'}
                  onChange={(e) =>
                    setEditingProperty({
                      ...editingProperty,
                      availabilityStatus: e.target.value as AvailabilityStatus,
                    })
                  }
                  className="input-field"
                >
                  <option value="available">Disponível</option>
                  <option value="sold">Vendido</option>
                  <option value="rented">Alugado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Descrição
              </label>
              <textarea
                rows={3}
                value={editingProperty.description}
                onChange={(e) =>
                  setEditingProperty({ ...editingProperty, description: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProperty(null)}
                className="flex-1 btn-outline py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                Guardar Imóvel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Detalhes do Pedido</h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {selectedRequest.propertyImages && selectedRequest.propertyImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedRequest.propertyImages.slice(0, 3).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${selectedRequest.propertyTitle} ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="aspect-[4/3] w-full rounded-xl object-cover bg-gray-100"
                  />
                ))}
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-bold text-lg text-gray-900">{selectedRequest.propertyTitle}</p>
              <p>
                <strong>Localização:</strong> {selectedRequest.location}
                {selectedRequest.address ? ` — ${selectedRequest.address}` : ''}
              </p>
              {selectedRequest.estimatedValue && (
                <p>
                  <strong>Valor Estimado:</strong> {formatCurrency(selectedRequest.estimatedValue)}
                </p>
              )}
              <p>
                <strong>Proprietário:</strong> {selectedRequest.ownerName} · {selectedRequest.ownerPhone}
              </p>
              <p className="text-gray-600 pt-1">{selectedRequest.propertyDescription}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {user.role !== 'user' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateRequestStatus(selectedRequest, 'claimed')}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                  >
                    Marcar Em Análise
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateRequestStatus(selectedRequest, 'completed')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                  >
                    Marcar Concluído
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="ml-auto btn-outline py-2 px-4 text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
