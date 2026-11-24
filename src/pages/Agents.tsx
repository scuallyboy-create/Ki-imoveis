import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import { Link } from 'react-router-dom';
import { PROVINCES } from '@/src/constants';
import { DATA_UPDATED_EVENT, getAllAgents, getProperties } from '@/src/lib/dataService';
import { AgentDirectoryItem, Property } from '@/src/types';

export default function Agents() {
  const [agents, setAgents] = useState<AgentDirectoryItem[]>(() => getAllAgents());
  const [properties, setProperties] = useState<Property[]>(() => getProperties());
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'agent' | 'agency'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const sync = () => {
      setAgents(getAllAgents());
      setProperties(getProperties());
    };
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, sync);
  }, []);

  const filteredAgents = useMemo(() => {
    return agents.filter((ag) => {
      if (selectedType !== 'all' && ag.type !== selectedType) return false;
      if (
        selectedProvince !== 'all' &&
        !ag.location.toLowerCase().includes(selectedProvince.toLowerCase())
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (
          !ag.name.toLowerCase().includes(q) &&
          !ag.location.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [agents, selectedProvince, selectedType, searchTerm]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
              Agentes e Agências
            </h1>
            <p className="text-gray-500 text-sm">
              Profissionais licenciados com carteira de imóveis verificada em Angola.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Icons.Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Procurar agente..."
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Todas Províncias</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Todos Perfis</option>
              <option value="agency">Agências</option>
              <option value="agent">Agentes</option>
            </select>
          </div>
        </div>

        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
            {filteredAgents.map((agent) => {
              const agentProps = properties.filter((p) => p.agentId === agent.id);
              const availableCount = agentProps.filter(
                (p) => (p.availabilityStatus || 'available') === 'available'
              ).length;

              return (
                <Link
                  to={`/agents/${agent.id}`}
                  key={agent.id}
                  className="group bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all professional-shadow"
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                    <img
                      src={agent.image}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {agent.verified && (
                      <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 text-[11px] font-semibold text-gray-900">
                        <Icons.BadgeCheck size={13} className="text-brand-primary" />
                        <span>Verificado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex flex-col gap-1 mb-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {agent.type === 'agency' ? 'Agência Imobiliária' : 'Agente Profissional'}
                      </span>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-brand-primary transition-colors truncate">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Icons.MapPin size={13} />
                        {agent.location}, Angola
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3.5 tabular-nums">
                      <div>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                          Publicados
                        </span>
                        <p className="font-bold text-sm text-gray-900">
                          {agentProps.length} ({availableCount} disp.)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                          Avaliação
                        </span>
                        <p className="font-bold text-sm flex items-center justify-end gap-1 text-gray-900">
                          {agent.rating}
                          <Icons.Star size={12} className="text-amber-500 fill-current" />
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-3xl py-16 text-center bg-white">
            <p className="font-semibold text-gray-700">Nenhum agente encontrado para este filtro.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedProvince('all');
                setSelectedType('all');
                setSearchTerm('');
              }}
              className="mt-4 btn-outline px-6 py-2 text-sm"
            >
              Mostrar todos
            </button>
          </div>
        )}

        <div className="bg-gray-900 rounded-3xl p-10 md:p-12 text-center text-white mt-8 flex flex-col items-center gap-5">
          <h2 className="text-2xl md:text-3xl font-bold">É um agente profissional?</h2>
          <p className="text-gray-300 max-w-lg text-sm">
            Junte-se à rede Ki-Imóveis, obtenha a sua licença verificada e aceda a leads qualificados.
          </p>
          <Link to="/become-partner" className="btn-primary">
            Tornar-se um Parceiro
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
