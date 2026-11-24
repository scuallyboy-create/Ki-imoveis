import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import PropertyGrid from '../components/listings/PropertyGrid';
import { DATA_UPDATED_EVENT, getAgentById, getProperties } from '@/src/lib/dataService';
import { AvailabilityStatus, Property } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/Toast';

export default function AgentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [agent, setAgent] = useState(() => (id ? getAgentById(id) : undefined));
  const [allProperties, setAllProperties] = useState<Property[]>(() => getProperties());
  const [statusFilter, setStatusFilter] = useState<'all' | AvailabilityStatus>('all');
  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    const sync = () => {
      if (id) setAgent(getAgentById(id));
      setAllProperties(getProperties());
    };
    sync();
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, sync);
  }, [id]);

  const agentProperties = useMemo(
    () => allProperties.filter((p) => p.agentId === id),
    [allProperties, id]
  );

  const counts = useMemo(() => {
    return {
      all: agentProperties.length,
      available: agentProperties.filter((p) => (p.availabilityStatus || 'available') === 'available').length,
      sold: agentProperties.filter((p) => p.availabilityStatus === 'sold').length,
      rented: agentProperties.filter((p) => p.availabilityStatus === 'rented').length,
    };
  }, [agentProperties]);

  const filteredAgentProperties = useMemo(() => {
    if (statusFilter === 'all') return agentProperties;
    return agentProperties.filter(
      (p) => (p.availabilityStatus || 'available') === statusFilter
    );
  }, [agentProperties, statusFilter]);

  if (!agent) {
    return (
      <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
        <Icons.User size={48} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Agente não encontrado</h1>
        <Link to="/agents" className="btn-primary inline-block mt-6">
          Ver todos os Agentes
        </Link>
      </div>
    );
  }

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactOpen(false);
    setContactMsg('');
    showToast(`Mensagem enviada para ${agent.name}. Receberá resposta em breve.`, 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10"
    >
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Profile Sidebar */}
        <aside className="lg:w-80 shrink-0">
          <div className="bg-white border border-gray-200 rounded-3xl p-7 professional-shadow flex flex-col items-center gap-5 sticky top-28 text-center">
            <div className="relative">
              <img
                src={agent.image}
                referrerPolicy="no-referrer"
                className="w-28 h-28 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                alt={agent.name}
              />
              {agent.verified && (
                <div
                  title="Agente Verificado"
                  className="absolute bottom-0 right-0 bg-brand-primary p-1.5 rounded-full text-white shadow-md"
                >
                  <Icons.BadgeCheck size={16} />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                {agent.type === 'agency' ? 'Agência Imobiliária' : 'Agente Profissional'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-700 tabular-nums">
              <Icons.Star size={15} className="text-amber-500 fill-current" />
              <span className="font-bold">{agent.rating}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{agent.reviews} avaliações</span>
            </div>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="w-full btn-primary py-3 text-sm"
              >
                Contactar Agente
              </button>
              <button
                type="button"
                onClick={() => navigate(`/request-submission?agentId=${agent.id}`)}
                className="w-full btn-outline py-3 text-sm"
              >
                Solicitar Avaliação
              </button>
            </div>

            <div className="w-full pt-5 border-t border-gray-100 text-left space-y-3 text-sm">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Localização
                </span>
                <p className="font-semibold text-gray-900">{agent.location}, Angola</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Experiência
                </span>
                <p className="font-semibold text-gray-900">{agent.experience}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Contacto direto
                </span>
                <p className="font-mono text-xs text-gray-700 mt-0.5">{agent.phone}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">Sobre {agent.name}</h2>
            <p className="text-gray-600 leading-relaxed max-w-2xl">{agent.bio}</p>

            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-4">
              {agent.specialties.map((spec, idx) => (
                <span key={spec} className="font-medium text-gray-700">
                  {idx > 0 && <span className="mr-2 text-gray-300">·</span>}
                  {spec}
                </span>
              ))}
            </div>
          </section>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 py-6 border-y border-gray-200 tabular-nums">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-brand-dark">{counts.available}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mt-1">
                Disponíveis
              </p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-brand-dark">
                {counts.sold + counts.rented + agent.closedDeals}
              </p>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mt-1">
                Vendidos / Alugados
              </p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-brand-dark">{agent.responseRate}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mt-1">
                Taxa de Resposta
              </p>
            </div>
          </div>

          {/* Published Properties with Availability Status */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Imóveis Publicados</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Consulte abaixo o estado atualizado de cada imóvel (Disponível, Vendido ou Alugado).
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl self-start">
                {[
                  { id: 'all', label: `Todos (${counts.all})` },
                  { id: 'available', label: `Disponíveis (${counts.available})` },
                  { id: 'sold', label: `Vendidos (${counts.sold})` },
                  { id: 'rented', label: `Alugados (${counts.rented})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer',
                      statusFilter === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <PropertyGrid
              properties={filteredAgentProperties}
              showAvailability={true}
              onResetFilters={() => setStatusFilter('all')}
            />
          </section>

          {agent.adminEvaluation?.note && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Parecer da Administração Ki-Imóveis
                </span>
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1 tabular-nums">
                  <Icons.Star size={13} className="fill-current" />
                  {agent.adminEvaluation.rating.toFixed(1)} / 5.0
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{agent.adminEvaluation.note}</p>
            </div>
          )}

          {agent.verified && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-7 flex items-center gap-5">
              <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shrink-0">
                <Icons.BadgeCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Agente Verificado Ki-Imóveis</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Identidade e licença profissional validadas pela administração da plataforma em Angola.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Contact Agent Modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Contactar {agent.name}</h3>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>
            <form onSubmit={handleSendContact} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Seu Nome
                </label>
                <input
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nome completo"
                  className="input-field py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Seu Telefone / WhatsApp
                </label>
                <input
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+244 9XX XXX XXX"
                  className="input-field py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Mensagem
                </label>
                <textarea
                  required
                  rows={3}
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Descreva o imóvel que procura ou a sua dúvida..."
                  className="input-field py-2.5 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="flex-1 btn-outline py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                  Enviar Mensagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
