import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { ADMIN_EMAIL, ADMIN_MANAGEMENT_PERMISSIONS } from '@/src/constants';
import {
  adminUpdateUserProfile,
  DATA_UPDATED_EVENT,
  emitDataUpdate,
  evaluateAgent,
  formatPlanPriceLabel,
  getAllAgents,
  getAllUserProfiles,
  getDefaultPermissionsForPlan,
  getPlanCatalog,
  getProperties,
  resetPlanCatalog,
  updatePlanCatalogItem,
} from '@/src/lib/dataService';
import {
  AgentApplication,
  AgentDirectoryItem,
  LicenseStatus,
  PlanCatalogItem,
  Property,
  SubscriptionPlan,
  UserPermissions,
  UserProfile,
} from '@/src/types';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { useToast } from '../ui/Toast';
import { dispatchNotification } from '@/src/lib/notificationService';

type AdminSection = 'licenses' | 'agents' | 'packages' | 'users';

export default function AdminLicensePanel() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSection = (searchParams.get('section') as AdminSection | null) || 'licenses';
  const [section, setSection] = useState<AdminSection>(
    ['licenses', 'agents', 'packages', 'users'].includes(initialSection)
      ? initialSection
      : 'licenses'
  );

  const [planCatalog, setPlanCatalog] = useState<Record<SubscriptionPlan, PlanCatalogItem>>(() =>
    getPlanCatalog()
  );
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUserProfiles());
  const [agents, setAgents] = useState<AgentDirectoryItem[]>(() => getAllAgents());
  const [properties, setProperties] = useState<Property[]>(() => getProperties());
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | SubscriptionPlan>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LicenseStatus>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Package edit modal state
  const [editingPlanKey, setEditingPlanKey] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanCatalogItem | null>(null);
  const [planFeaturesText, setPlanFeaturesText] = useState('');
  const [syncPlanUsers, setSyncPlanUsers] = useState(true);

  // Agent Evaluation modal state
  const [evaluatingAgent, setEvaluatingAgent] = useState<AgentDirectoryItem | null>(null);
  const [evalRating, setEvalRating] = useState<number>(4.8);
  const [evalVerified, setEvalVerified] = useState<boolean>(true);
  const [evalNote, setEvalNote] = useState<string>('');

  useEffect(() => {
    const s = searchParams.get('section') as AdminSection | null;
    if (s && ['licenses', 'agents', 'packages', 'users'].includes(s)) {
      setSection(s);
    }
  }, [searchParams]);

  const changeSection = (next: AdminSection) => {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'admin');
    params.set('section', next);
    setSearchParams(params);
  };

  const loadAll = async () => {
    setPlanCatalog(getPlanCatalog());
    setUsers(getAllUserProfiles());
    setAgents(getAllAgents());
    setProperties(getProperties());
    try {
      const { data } = await supabase.from('partner_applications').select('*');
      setApplications((data as AgentApplication[]) || []);
    } catch {
      const raw = localStorage.getItem('offline_db_partner_applications');
      setApplications(raw ? JSON.parse(raw) : []);
    }
  };

  useEffect(() => {
    loadAll();
    window.addEventListener(DATA_UPDATED_EVENT, loadAll);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, loadAll);
  }, []);

  const pendingUpgrades = useMemo(
    () => users.filter((u) => u.packageRequested || u.licenseStatus === 'pending'),
    [users]
  );

  const pendingApps = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications]
  );

  const paidActiveCount = useMemo(
    () =>
      users.filter(
        (u) =>
          u.email.toLowerCase() !== ADMIN_EMAIL &&
          (u.subscriptionPlan === 'silver' || u.subscriptionPlan === 'gold') &&
          u.licenseStatus === 'active'
      ).length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (planFilter !== 'all' && (u.subscriptionPlan || 'free') !== planFilter) return false;
      if (statusFilter !== 'all' && (u.licenseStatus || 'active') !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !u.displayName.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.licenseNumber || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [users, planFilter, statusFilter, search]);

  const handleApprovePackage = (target: UserProfile) => {
    if (target.email.toLowerCase() === ADMIN_EMAIL) return;
    const plan: SubscriptionPlan = target.packageRequested || target.subscriptionPlan || 'silver';
    const nextLicenseNum =
      target.licenseNumber || `KI-${plan.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    adminUpdateUserProfile(target.uid, {
      subscriptionPlan: plan,
      packageRequested: null,
      licenseStatus: 'active',
      licenseNumber: nextLicenseNum,
      licenseExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      verified: plan !== 'free',
      role: target.role === 'user' ? 'agent' : target.role,
      permissions: getDefaultPermissionsForPlan(plan),
    });
    void dispatchNotification({
      userId: target.uid,
      userEmail: target.email,
      recipientName: target.displayName,
      type: 'license_status_changed',
      title: `Licença ${planCatalog[plan].name} ativada`,
      message: `A sua licença ${nextLicenseNum} (${planCatalog[plan].name}) foi validada e ativada pela administração Ki-Imóveis.`,
      emailSubject: `[Ki-Imóveis] Licença ${planCatalog[plan].name} ativada`,
      relatedId: target.uid,
      link: '/dashboard?tab=settings',
    });
    showToast(`Licença ${planCatalog[plan].name} ativada para ${target.displayName}.`, 'success');
  };

  const handleRejectPackage = (target: UserProfile) => {
    adminUpdateUserProfile(target.uid, {
      packageRequested: null,
      licenseStatus: target.subscriptionPlan === 'free' ? 'active' : 'suspended',
    });
    void dispatchNotification({
      userId: target.uid,
      userEmail: target.email,
      recipientName: target.displayName,
      type: 'license_status_changed',
      title: 'Pedido de pacote não aprovado',
      message: 'O seu pedido de alteração de plano/licença foi recusado pela administração. Verifique os seus dados em Definições.',
      emailSubject: '[Ki-Imóveis] Atualização sobre o pedido de licença',
      relatedId: target.uid,
      link: '/dashboard?tab=settings',
    });
    showToast(`Pedido de ${target.displayName} recusado.`, 'info');
  };

  const handleApplicationDecision = async (
    app: AgentApplication,
    decision: 'approved' | 'rejected'
  ) => {
    try {
      await supabase
        .from('partner_applications')
        .update({ status: decision })
        .eq('id', app.id);
    } catch {
      // Handled locally
    }

    const rawApps: AgentApplication[] = JSON.parse(
      localStorage.getItem('offline_db_partner_applications') || '[]'
    );
    localStorage.setItem(
      'offline_db_partner_applications',
      JSON.stringify(rawApps.map((a) => (a.id === app.id ? { ...a, status: decision } : a)))
    );

    if (decision === 'approved') {
      const targetUser = users.find(
        (u) => u.uid === app.userId || (app.userEmail && u.email === app.userEmail)
      );
      if (targetUser && targetUser.email.toLowerCase() !== ADMIN_EMAIL) {
        const plan = targetUser.packageRequested || targetUser.subscriptionPlan || 'silver';
        adminUpdateUserProfile(targetUser.uid, {
          role: app.type === 'agency' ? 'agency_admin' : 'agent',
          verified: true,
          licenseStatus: 'active',
          licenseNumber:
            app.licenseNumber ||
            app.license ||
            `KI-LIC-${Math.floor(1000 + Math.random() * 9000)}`,
          licenseExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          subscriptionPlan: plan,
          packageRequested: null,
          permissions: getDefaultPermissionsForPlan(plan),
        });
      }
      showToast(`Candidatura de ${app.fullName} aprovada e licença emitida.`, 'success');
    } else {
      showToast(`Candidatura de ${app.fullName} rejeitada.`, 'info');
    }
    emitDataUpdate();
  };

  const openEvaluationModal = (agent: AgentDirectoryItem) => {
    setEvaluatingAgent(agent);
    setEvalRating(agent.adminEvaluation?.rating ?? agent.rating ?? 4.8);
    setEvalVerified(agent.verified);
    setEvalNote(agent.adminEvaluation?.note || '');
  };

  const handleSaveEvaluation = (e: FormEvent) => {
    e.preventDefault();
    if (!evaluatingAgent) return;
    evaluateAgent(evaluatingAgent.id, evalRating, evalNote, evalVerified);
    showToast(`Avaliação de ${evaluatingAgent.name} guardada com sucesso!`, 'success');
    setEvaluatingAgent(null);
  };

  const saveEditedUser = (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const isRoot = editingUser.email.toLowerCase() === ADMIN_EMAIL;
    adminUpdateUserProfile(editingUser.uid, {
      role: isRoot ? 'admin' : editingUser.role,
      subscriptionPlan: editingUser.subscriptionPlan,
      licenseStatus: isRoot ? 'active' : editingUser.licenseStatus,
      licenseNumber: editingUser.licenseNumber,
      licenseExpiresAt: editingUser.licenseExpiresAt,
      verified: isRoot ? true : Boolean(editingUser.permissions?.verifiedBadge),
      permissions: isRoot ? ADMIN_MANAGEMENT_PERMISSIONS : editingUser.permissions,
      packageRequested: null,
    });
    showToast(`Permissões e licença de ${editingUser.displayName} guardadas.`, 'success');
    setEditingUser(null);
  };

  const applyPlanPreset = (plan: SubscriptionPlan) => {
    if (!editingUser) return;
    if (editingUser.email.toLowerCase() === ADMIN_EMAIL) return;
    const preset = getDefaultPermissionsForPlan(plan);
    setEditingUser({
      ...editingUser,
      subscriptionPlan: plan,
      verified: preset.verifiedBadge,
      permissions: preset,
    });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (!editingUser || !editingUser.permissions) return;
    if (editingUser.email.toLowerCase() === ADMIN_EMAIL) return;
    if (key === 'maxListings') return;
    setEditingUser({
      ...editingUser,
      permissions: {
        ...editingUser.permissions,
        [key]: !editingUser.permissions[key],
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Admin Role Notice */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Icons.Shield size={20} className="text-rose-300" />
          </div>
          <div>
            <p className="font-bold text-sm">Perfil Exclusivo de Gestão e Administração</p>
            <p className="text-xs text-gray-300">
              Avalie agentes, valide licenças profissionais e controle pacotes pagos sem publicar imóveis.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1 rounded-xl shrink-0">
          {[
            { id: 'licenses', label: `Licenças (${pendingUpgrades.length + pendingApps.length})` },
            { id: 'agents', label: `Avaliar Agentes (${agents.length})` },
            { id: 'packages', label: 'Pacotes & Preços' },
            { id: 'users', label: `Utilizadores (${users.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeSection(tab.id as AdminSection)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                section === tab.id ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Agentes Registados</span>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{agents.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Pacotes Pagos Ativos</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{paidActiveCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Upgrades Pendentes</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingUpgrades.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Candidaturas Parceiros</span>
          <p className="text-2xl font-extrabold text-brand-primary mt-1">{pendingApps.length}</p>
        </div>
      </div>

      {/* SECTION 1: VALIDATE LICENSES & PENDING REQUESTS */}
      {section === 'licenses' && (
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Pedidos de Licenças e Pacotes Pagos Pendentes
            </h3>

            {pendingUpgrades.length === 0 && pendingApps.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                Não existem pedidos de upgrade ou candidaturas pendentes de momento.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingUpgrades.map((u) => {
                  const reqPlan = u.packageRequested || u.subscriptionPlan || 'silver';
                  return (
                    <div
                      key={`upg-${u.uid}`}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {u.displayName}{' '}
                          <span className="font-normal text-gray-500">({u.email})</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Pacote solicitado:{' '}
                          <strong>
                            {planCatalog[reqPlan].name} ({planCatalog[reqPlan].priceLabel}
                            {planCatalog[reqPlan].priceAOA > 0 ? '/mês' : ''})
                          </strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprovePackage(u)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Validar & Ativar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPackage(u)}
                          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {pendingApps.map((app) => (
                  <div
                    key={`app-${app.id}`}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        Candidatura de Parceiro: {app.fullName}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Tipo: {app.type === 'agency' ? 'Agência' : 'Agente Individual'} · NIF:{' '}
                        <span className="font-mono">{app.nif}</span>
                        {app.documentUrl ? ` · Doc: ${app.documentUrl}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplicationDecision(app, 'approved')}
                        className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-rose-600 cursor-pointer"
                      >
                        Emitir Licença
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplicationDecision(app, 'rejected')}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION 2: EVALUATE AGENTS */}
      {section === 'agents' && (
        <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Avaliação de Agentes & Agências</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Classifique o desempenho dos agentes, atribua o selo de verificação e registe pareceres visíveis no perfil público.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((ag) => {
              const agProps = properties.filter((p) => p.agentId === ag.id);
              const available = agProps.filter((p) => (p.availabilityStatus || 'available') === 'available').length;
              const sold = agProps.filter((p) => p.availabilityStatus === 'sold').length;
              const rented = agProps.filter((p) => p.availabilityStatus === 'rented').length;

              return (
                <div
                  key={ag.id}
                  className="border border-gray-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={ag.image}
                      alt={ag.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/agents/${ag.id}`}
                          className="font-bold text-gray-900 hover:text-brand-primary truncate"
                        >
                          {ag.name}
                        </Link>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 tabular-nums shrink-0">
                          <Icons.Star size={13} className="fill-current" />
                          {ag.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ag.location} · {ag.verified ? 'Verificado' : 'Não verificado'} · Licença{' '}
                        <span className="font-mono">{ag.licenseNumber || 'Pendente'}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-2 tabular-nums">
                        {agProps.length} publicados ({available} disp. · {sold} vendidos · {rented} alugados)
                      </p>
                      {ag.adminEvaluation?.note && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          "{ag.adminEvaluation.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <Link
                      to={`/agents/${ag.id}`}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
                    >
                      Ver Perfil Público
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEvaluationModal(ag)}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-brand-primary transition-colors cursor-pointer"
                    >
                      Avaliar Agente
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2.5: MANAGE PACKAGES & PRICING */}
      {section === 'packages' && (
        <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Gestão de Pacotes, Preços e Benefícios
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Altere preços, nomes, descrições, benefícios e limites padrão. As alterações são aplicadas de imediato na página inicial e nos pedidos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlanCatalog(resetPlanCatalog());
                showToast('Pacotes repostos para os valores iniciais.', 'info');
              }}
              className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer self-start"
            >
              Repor Padrões
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['free', 'silver', 'gold'] as SubscriptionPlan[]).map((planKey) => {
              const item = planCatalog[planKey];
              return (
                <div
                  key={planKey}
                  className={cn(
                    'rounded-2xl border p-5 flex flex-col justify-between gap-5',
                    planKey === 'silver' ? 'border-brand-primary/50 bg-rose-50/20' : 'border-gray-200 bg-white'
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Código: {planKey}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-semibold">
                        {item.defaultPermissions.maxListings === -1
                          ? 'Ilimitado'
                          : `Até ${item.defaultPermissions.maxListings} imóveis`}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 pt-1">
                      <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                        {item.priceLabel}
                      </span>
                      {item.priceAOA > 0 && (
                        <span className="text-xs font-semibold text-gray-400">/mês</span>
                      )}
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-gray-100">
                      {item.features.map((feat, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                          <Icons.Check size={13} className="text-brand-primary shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanKey(planKey);
                      setPlanForm(JSON.parse(JSON.stringify(item)));
                      setPlanFeaturesText(item.features.join('\n'));
                      setSyncPlanUsers(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-brand-primary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icons.Edit3 size={14} />
                    <span>Editar Preço & Detalhes</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3 (also visible under licenses/users): FULL USER & LICENSE TABLE */}
      {(section === 'users' || section === 'licenses') && (
        <section className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Gestão de Utilizadores, Licenças e Permissões
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Controle planos pagos, validade de licenças e permissões de publicação.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar e-mail, nome ou licença..."
                className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="all">Todos Pacotes</option>
                <option value="free">{planCatalog.free.name} ({planCatalog.free.priceLabel})</option>
                <option value="silver">{planCatalog.silver.name}</option>
                <option value="gold">{planCatalog.gold.name}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="all">Todos Estados</option>
                <option value="active">Ativa</option>
                <option value="pending">Pendente</option>
                <option value="suspended">Suspensa</option>
                <option value="expired">Expirada</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 pr-4">Utilizador</th>
                  <th className="py-3 px-3">Função</th>
                  <th className="py-3 px-3">Pacote</th>
                  <th className="py-3 px-3">Licença</th>
                  <th className="py-3 px-3">Permissões</th>
                  <th className="py-3 pl-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 tabular-nums">
                {filteredUsers.map((u) => {
                  const plan = u.subscriptionPlan || 'free';
                  const status = u.licenseStatus || 'active';
                  const isRootAdmin = u.email.toLowerCase() === ADMIN_EMAIL;

                  return (
                    <tr key={u.uid} className="hover:bg-gray-50/70">
                      <td className="py-3.5 pr-4">
                        <p className="font-bold text-gray-900">{u.displayName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-semibold capitalize text-gray-700">
                        {isRootAdmin ? 'Admin · Gestão' : u.role.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-bold text-gray-900">
                          {isRootAdmin ? 'Gestão Global' : planCatalog[plan].name}
                        </span>
                        <span className="block text-[11px] text-gray-500">
                          {isRootAdmin ? 'Administração' : planCatalog[plan].priceLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border',
                            status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          )}
                        >
                          {status === 'active'
                            ? 'Ativa'
                            : status === 'pending'
                            ? 'Pendente'
                            : status === 'suspended'
                            ? 'Suspensa'
                            : 'Expirada'}
                        </span>
                        {u.licenseNumber && (
                          <span className="block text-[11px] font-mono text-gray-400 mt-0.5">
                            {u.licenseNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-gray-600">
                        {isRootAdmin
                          ? 'Gere licenças & agentes (sem publicação)'
                          : u.permissions?.canPublishListings
                          ? u.permissions.maxListings === -1
                            ? 'Ilimitado'
                            : `Até ${u.permissions.maxListings} imóveis`
                          : 'Apenas leitura'}
                        {!isRootAdmin && u.permissions?.verifiedBadge ? ' · Selo Verificado' : ''}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingUser(JSON.parse(JSON.stringify(u)))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-800 hover:bg-gray-100 cursor-pointer"
                        >
                          {isRootAdmin ? 'Ver Perfil Admin' : 'Gerir Licença'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Agent Evaluation Modal */}
      {evaluatingAgent && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEvaluation}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Avaliar Agente</h3>
                <p className="text-xs text-gray-500">{evaluatingAgent.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingAgent(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Classificação (1 a 5 estrelas)
                </label>
                <span className="text-sm font-bold text-amber-600 tabular-nums">
                  {evalRating.toFixed(1)} ★
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={evalRating}
                onChange={(e) => setEvalRating(Number(e.target.value))}
                className="w-full accent-brand-primary cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 cursor-pointer">
              <span>Selo de Agente Verificado</span>
              <input
                type="checkbox"
                checked={evalVerified}
                onChange={(e) => setEvalVerified(e.target.checked)}
                className="w-4 h-4 accent-brand-primary cursor-pointer"
              />
            </label>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Parecer / Observações da Administração
              </label>
              <textarea
                rows={3}
                value={evalNote}
                onChange={(e) => setEvalNote(e.target.value)}
                placeholder="Ex: Excelente taxa de resposta e documentação verificada em Luanda."
                className="input-field text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEvaluatingAgent(null)}
                className="flex-1 btn-outline py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                Guardar Avaliação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User License & Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={saveEditedUser}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Licença & Permissões</h3>
                <p className="text-xs text-gray-500">
                  {editingUser.displayName} ({editingUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {editingUser.email.toLowerCase() === ADMIN_EMAIL ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-700 space-y-2">
                <p className="font-bold text-gray-900">Conta de Administração Principal</p>
                <p>
                  Este perfil gere licenças, avalia agentes e modera o catálogo. A publicação direta
                  de imóveis está bloqueada por definição.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Pacote / Plano Pago
                    </label>
                    <select
                      value={editingUser.subscriptionPlan || 'free'}
                      onChange={(e) => applyPlanPreset(e.target.value as SubscriptionPlan)}
                      className="input-field py-2 text-sm"
                    >
                      <option value="free">
                        {planCatalog.free.name} ({planCatalog.free.priceLabel})
                      </option>
                      <option value="silver">
                        {planCatalog.silver.name} ({planCatalog.silver.priceLabel})
                      </option>
                      <option value="gold">
                        {planCatalog.gold.name} ({planCatalog.gold.priceLabel})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Estado da Licença
                    </label>
                    <select
                      value={editingUser.licenseStatus || 'active'}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          licenseStatus: e.target.value as LicenseStatus,
                        })
                      }
                      className="input-field py-2 text-sm"
                    >
                      <option value="active">Ativa</option>
                      <option value="pending">Pendente</option>
                      <option value="suspended">Suspensa</option>
                      <option value="expired">Expirada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Função
                    </label>
                    <select
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, role: e.target.value as any })
                      }
                      className="input-field py-2 text-sm"
                    >
                      <option value="user">Cliente</option>
                      <option value="agent">Agente</option>
                      <option value="agency_admin">Admin Agência</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Nº de Licença
                    </label>
                    <input
                      value={editingUser.licenseNumber || ''}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, licenseNumber: e.target.value })
                      }
                      placeholder="Ex: KI-SLV-2026"
                      className="input-field py-2 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase">Permissões do Plano</p>
                  {[
                    { key: 'canPublishListings', label: 'Permitir publicar imóveis no catálogo' },
                    { key: 'canFeatureListings', label: 'Destacar imóveis nos resultados de pesquisa' },
                    { key: 'canAccessLeads', label: 'Acesso prioritário a leads de proprietários' },
                    { key: 'verifiedBadge', label: 'Exibir selo de Agente Verificado' },
                  ].map((perm) => {
                    const checked = Boolean(
                      editingUser.permissions?.[perm.key as keyof UserPermissions]
                    );
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center justify-between gap-3 text-sm text-gray-800 cursor-pointer"
                      >
                        <span>{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.key as keyof UserPermissions)}
                          className="w-4 h-4 accent-brand-primary cursor-pointer"
                        />
                      </label>
                    );
                  })}

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-4">
                    <label className="text-xs font-semibold text-gray-700">
                      Limite máximo de imóveis (-1 = ilimitado)
                    </label>
                    <input
                      type="number"
                      min={-1}
                      value={editingUser.permissions?.maxListings ?? 10}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          permissions: {
                            ...(editingUser.permissions || getDefaultPermissionsForPlan('free')),
                            maxListings: Number(e.target.value),
                          },
                        })
                      }
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-right tabular-nums"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 btn-outline py-2.5 text-sm"
              >
                Fechar
              </button>
              {editingUser.email.toLowerCase() !== ADMIN_EMAIL && (
                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                  Guardar Permissões
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Edit Package Pricing & Details Modal */}
      {editingPlanKey && planForm && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsedFeatures = planFeaturesText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
              const nextCatalog = updatePlanCatalogItem(
                editingPlanKey,
                {
                  ...planForm,
                  priceLabel: formatPlanPriceLabel(planForm.priceAOA),
                  features: parsedFeatures,
                },
                syncPlanUsers
              );
              setPlanCatalog(nextCatalog);
              showToast(`Pacote "${planForm.name}" atualizado com sucesso!`, 'success');
              setEditingPlanKey(null);
              setPlanForm(null);
            }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Editar Pacote ({editingPlanKey.toUpperCase()})
                </h3>
                <p className="text-xs text-gray-500">
                  Atualize preço em Kwanzas, descrição, benefícios e permissões padrão.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPlanKey(null);
                  setPlanForm(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Nome do Pacote
                </label>
                <input
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="input-field py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Preço Mensal (AOA / Kz)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={planForm.priceAOA}
                  onChange={(e) => {
                    const num = Math.max(0, Number(e.target.value) || 0);
                    setPlanForm({
                      ...planForm,
                      priceAOA: num,
                      priceLabel: formatPlanPriceLabel(num),
                    });
                  }}
                  className="input-field py-2 text-sm tabular-nums"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Exibição: <strong>{formatPlanPriceLabel(planForm.priceAOA)}</strong>
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Descrição Curta
              </label>
              <textarea
                rows={2}
                required
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Benefícios incluídos (1 por linha)
              </label>
              <textarea
                rows={4}
                value={planFeaturesText}
                onChange={(e) => setPlanFeaturesText(e.target.value)}
                placeholder="Ex: Até 50 Imóveis&#10;Destaque nos Resultados&#10;Acesso a Leads"
                className="input-field text-sm"
              />
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase">
                Permissões Padrão do Pacote
              </p>
              {[
                { key: 'canPublishListings', label: 'Permitir publicar imóveis' },
                { key: 'canFeatureListings', label: 'Destacar imóveis na pesquisa' },
                { key: 'canAccessLeads', label: 'Acesso prioritário a leads' },
                { key: 'verifiedBadge', label: 'Atribuir selo de Agente Verificado' },
              ].map((perm) => {
                const checked = Boolean(planForm.defaultPermissions[perm.key as keyof UserPermissions]);
                return (
                  <label
                    key={perm.key}
                    className="flex items-center justify-between gap-3 text-sm text-gray-800 cursor-pointer"
                  >
                    <span>{perm.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPlanForm({
                          ...planForm,
                          defaultPermissions: {
                            ...planForm.defaultPermissions,
                            [perm.key]: !checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-brand-primary cursor-pointer"
                    />
                  </label>
                );
              })}

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-4">
                <label className="text-xs font-semibold text-gray-700">
                  Limite de imóveis (-1 = ilimitado)
                </label>
                <input
                  type="number"
                  min={-1}
                  value={planForm.defaultPermissions.maxListings}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      defaultPermissions: {
                        ...planForm.defaultPermissions,
                        maxListings: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-right tabular-nums"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={syncPlanUsers}
                onChange={(e) => setSyncPlanUsers(e.target.checked)}
                className="w-4 h-4 accent-brand-primary cursor-pointer"
              />
              <span>Atualizar permissões dos utilizadores já subscritos neste pacote</span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingPlanKey(null);
                  setPlanForm(null);
                }}
                className="flex-1 btn-outline py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                Guardar Pacote
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
