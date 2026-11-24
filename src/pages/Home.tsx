import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Hero from '../components/home/Hero';
import CategoryBar from '../components/home/CategoryBar';
import PropertyGrid from '../components/listings/PropertyGrid';
import { Icons } from '../components/ui/Icons';
import { cn } from '../lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DATA_UPDATED_EVENT, getPlanCatalog } from '../lib/dataService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { PlanCatalogItem, SubscriptionPlan } from '../types';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [planCatalog, setPlanCatalog] = useState<Record<SubscriptionPlan, PlanCatalogItem>>(() =>
    getPlanCatalog()
  );
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const syncCatalog = () => setPlanCatalog(getPlanCatalog());
    window.addEventListener(DATA_UPDATED_EVENT, syncCatalog);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, syncCatalog);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 80);
      }
    }
  }, [location.hash]);

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate(`/auth?plan=${plan}`);
      return;
    }

    if (user.role === 'admin') {
      showToast('A conta de administração gere os planos e licenças dos utilizadores.', 'info');
      navigate('/dashboard?tab=admin');
      return;
    }

    if (user.subscriptionPlan === plan && user.licenseStatus === 'active') {
      showToast(`Já possui o plano ${planCatalog[plan].name} ativo.`, 'info');
      navigate('/dashboard');
      return;
    }

    if (plan === 'free') {
      navigate('/dashboard');
      return;
    }

    await updateUserProfile({
      packageRequested: plan,
      licenseStatus: 'pending',
    });
    showToast(
      `Pedido para o pacote ${planCatalog[plan].name} enviado ao administrador para ativação da licença.`,
      'success'
    );
    navigate('/dashboard?tab=settings');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >
      <Hero />
      <main className="max-w-7xl mx-auto px-6 md:px-10">
        <CategoryBar
          activeCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <section className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {selectedCategory === 'all'
                  ? 'Destaques em Angola'
                  : selectedCategory === 'apartment'
                  ? 'Apartamentos Selecionados'
                  : selectedCategory === 'house'
                  ? 'Moradias & Vivendas'
                  : selectedCategory === 'luxury'
                  ? 'Coleção de Luxo'
                  : 'Espaços Comerciais'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Imóveis com disponibilidade atualizada em tempo real.
              </p>
            </div>
            <Link
              to={selectedCategory === 'all' ? '/listings' : `/listings?type=${selectedCategory}`}
              className="text-sm font-semibold text-gray-600 hover:text-brand-primary transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Ver todos</span>
              <Icons.ChevronRight size={16} />
            </Link>
          </div>
          <PropertyGrid
            category={selectedCategory}
            limit={8}
            onResetFilters={() => setSelectedCategory('all')}
          />
        </section>

        {/* Nossos Valores Section */}
        <section id="valores" className="mt-28 px-2 scroll-mt-24">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-14 text-gray-900 [text-wrap:balance]">
            Nossos Valores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Acolhimento',
                icon: <Icons.Heart className="text-amber-500" />,
                desc: 'Cada experiência é pensada para fazer você se sentir em casa em qualquer província de Angola.',
              },
              {
                title: 'Descoberta',
                icon: <Icons.Search className="text-brand-primary" />,
                desc: 'Pesquisa inteligente por localização, tipo de imóvel e compartimentos com mapa interativo.',
              },
              {
                title: 'Confiança',
                icon: <Icons.Shield className="text-blue-600" />,
                desc: 'Agentes licenciados e propriedades verificadas com estado transparente de disponibilidade.',
              },
              {
                title: 'Inovação',
                icon: <Icons.Zap className="text-emerald-600" />,
                desc: 'Gestão digital de visitas, candidaturas de parceiros e pacotes profissionais num só lugar.',
              },
            ].map((val, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 p-7 rounded-3xl professional-shadow flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5">
                  {val.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">{val.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">
            <div className="bg-white border border-gray-200 p-8 md:p-10 rounded-3xl professional-shadow">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Nossa Missão</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Digitalizar o setor imobiliário angolano, conectando proprietários, clientes e agentes licenciados com total transparência e eficiência.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-brand-primary">
                <span>Conectar</span>
                <span aria-hidden="true">·</span>
                <span>Digitalizar</span>
                <span aria-hidden="true">·</span>
                <span>Valorizar</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-brand-dark to-gray-800 p-8 md:p-10 rounded-3xl text-white professional-shadow relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Nossa Visão</h3>
                <p className="text-white/80 leading-relaxed mb-6">
                  Ser a principal plataforma imobiliária digital em Angola e nos PALOPs, promovendo negócios seguros e verificados.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-white/60">
                  <span>Angola</span>
                  <span aria-hidden="true">·</span>
                  <span>PALOPs</span>
                  <span aria-hidden="true">·</span>
                  <span>Excelência</span>
                </div>
              </div>
              <Icons.Home className="absolute -right-8 -bottom-8 w-44 h-44 opacity-10" />
            </div>
          </div>
        </section>

        {/* Pricing Plans Section */}
        <section className="mt-28 px-4 sm:px-8 py-16 bg-gray-100/80 border border-gray-200 rounded-[40px] scroll-mt-24" id="pricing">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-gray-900">
              Planos e Pacotes
            </h2>
            <p className="text-gray-600">
              Torne-se um Agente Verificado com licença aprovada pela administração e impulsione os seus negócios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(['free', 'silver', 'gold'] as SubscriptionPlan[]).map((planKey) => {
              const plan = planCatalog[planKey];
              const highlight = planKey === 'silver';
              const isCurrent = user?.subscriptionPlan === planKey && user?.licenseStatus === 'active';
              return (
                <div
                  key={planKey}
                  className={cn(
                    'p-8 rounded-3xl flex flex-col bg-white border professional-shadow relative',
                    highlight ? 'border-brand-primary ring-2 ring-brand-primary/15' : 'border-gray-200'
                  )}
                >
                  {highlight && (
                    <span className="self-start mb-3 text-[11px] font-bold text-brand-primary uppercase tracking-wider">
                      Mais Popular
                    </span>
                  )}
                  <h3 className="text-2xl font-bold mb-1 text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mb-6">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-brand-dark tabular-nums">
                      {plan.priceLabel}
                    </span>
                    {plan.priceAOA > 0 && (
                      <span className="text-sm text-gray-400 font-semibold">/mês</span>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="text-sm text-gray-600 font-medium flex items-center gap-2.5">
                        <Icons.Check size={16} className="text-brand-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handlePlanSelect(planKey)}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-semibold text-center transition-all cursor-pointer',
                      isCurrent
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : highlight
                        ? 'bg-brand-primary text-white hover:bg-rose-600 shadow-sm'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    )}
                  >
                    {isCurrent
                      ? 'Plano Ativo'
                      : plan.priceAOA === 0
                      ? `Começar ${plan.name}`
                      : `Escolher ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Propriedades de Luxo & Lazer
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Coberturas na Marginal e residências exclusivas no Mussulo.
              </p>
            </div>
            <Link
              to="/listings?type=luxury"
              className="text-sm font-semibold text-gray-600 hover:text-brand-primary transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Explorar mais</span>
              <Icons.ChevronRight size={16} />
            </Link>
          </div>
          <PropertyGrid category="luxury" limit={4} />
        </section>
      </main>
    </motion.div>
  );
}
