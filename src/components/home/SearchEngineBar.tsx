import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { ANGOLA_LOCATIONS, CATEGORIES } from '@/src/constants';
import { findNearestLocationLabel } from '@/src/lib/dataService';
import { cn } from '@/src/lib/utils';
import { useToast } from '../ui/Toast';

export interface SearchEngineValues {
  location: string;
  type: string;
  intent: 'all' | 'sale' | 'rent';
  bedrooms: number | 'any';
}

interface SearchEngineBarProps {
  initialValues?: Partial<SearchEngineValues>;
  onSearch?: (values: SearchEngineValues) => void;
  compact?: boolean;
}

export default function SearchEngineBar({
  initialValues,
  onSearch,
  compact = false,
}: SearchEngineBarProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [location, setLocation] = useState(initialValues?.location || '');
  const [type, setType] = useState(initialValues?.type || 'all');
  const [intent, setIntent] = useState<'all' | 'sale' | 'rent'>(initialValues?.intent || 'all');
  const [bedrooms, setBedrooms] = useState<number | 'any'>(initialValues?.bedrooms ?? 'any');
  const [activePanel, setActivePanel] = useState<'where' | 'type' | 'rooms' | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setLocation(initialValues?.location || '');
    setType(initialValues?.type || 'all');
    setIntent(initialValues?.intent || 'all');
    setBedrooms(initialValues?.bedrooms ?? 'any');
  }, [initialValues?.location, initialValues?.type, initialValues?.intent, initialValues?.bedrooms]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredLocations = ANGOLA_LOCATIONS.filter((loc) =>
    !location.trim()
      ? true
      : loc.label.toLowerCase().includes(location.toLowerCase()) ||
        loc.province.toLowerCase().includes(location.toLowerCase()) ||
        loc.city.toLowerCase().includes(location.toLowerCase())
  );

  const handleUseMyLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      showToast('Geolocalização não suportada neste navegador.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestLocationLabel(pos.coords.latitude, pos.coords.longitude);
        setLocation(nearest);
        setLocating(false);
        setActivePanel(null);
        showToast(`Localização detetada: ${nearest}`, 'info');
      },
      () => {
        setLocation('Luanda');
        setLocating(false);
        setActivePanel(null);
        showToast('Usando Luanda como localização padrão.', 'info');
      },
      { timeout: 6000 }
    );
  };

  const executeSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setActivePanel(null);
    const values: SearchEngineValues = { location, type, intent, bedrooms };
    if (onSearch) {
      onSearch(values);
    } else {
      const params = new URLSearchParams();
      if (location.trim()) params.set('location', location.trim());
      if (type !== 'all') params.set('type', type);
      if (intent !== 'all') params.set('intent', intent);
      if (bedrooms !== 'any') params.set('bedrooms', String(bedrooms));
      navigate(`/listings?${params.toString()}`);
    }
  };

  const typeLabel =
    type === 'all'
      ? intent === 'sale'
        ? 'Comprar · Todos'
        : intent === 'rent'
        ? 'Arrendar · Todos'
        : 'Qualquer tipo'
      : `${CATEGORIES.find((c) => c.id === type)?.label || type}${
          intent === 'sale' ? ' · Compra' : intent === 'rent' ? ' · Arrendar' : ''
        }`;

  const roomsLabel =
    bedrooms === 'any'
      ? 'Qualquer compartimento'
      : bedrooms >= 4
      ? 'T4+ (4 ou mais quartos)'
      : `T${bedrooms} (${bedrooms} ${bedrooms === 1 ? 'quarto' : 'quartos'})`;

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      <form
        onSubmit={executeSearch}
        className={cn(
          'bg-white rounded-3xl md:rounded-full border border-gray-200 flex flex-col md:flex-row md:items-center transition-all',
          compact ? 'shadow-md' : 'search-pill-shadow'
        )}
      >
        {/* 1. ONDE */}
        <div
          onClick={() => setActivePanel('where')}
          className={cn(
            'flex-[1.3] px-6 py-3.5 md:py-4 cursor-pointer rounded-t-3xl md:rounded-l-full md:rounded-tr-none transition-colors border-b md:border-b-0 md:border-r border-gray-100',
            activePanel === 'where' ? 'bg-gray-50' : 'hover:bg-gray-50/70'
          )}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Onde
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <Icons.MapPin size={15} className="text-brand-primary shrink-0" />
            <input
              type="text"
              value={location}
              onFocus={() => setActivePanel('where')}
              onChange={(e) => {
                setLocation(e.target.value);
                setActivePanel('where');
              }}
              placeholder="Província, cidade ou bairro..."
              className="bg-transparent border-none focus:outline-none text-sm font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal w-full"
            />
            {location && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation('');
                }}
                className="text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                aria-label="Limpar localização"
              >
                <Icons.X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 2. TIPO */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'type' ? null : 'type')}
          className={cn(
            'flex-1 px-6 py-3.5 md:py-4 text-left cursor-pointer transition-colors border-b md:border-b-0 md:border-r border-gray-100',
            activePanel === 'type' ? 'bg-gray-50' : 'hover:bg-gray-50/70'
          )}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Tipo
          </span>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{typeLabel}</span>
            <Icons.ChevronDown size={15} className="text-gray-400 shrink-0" />
          </div>
        </button>

        {/* 3. COMPARTIMENTO */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'rooms' ? null : 'rooms')}
          className={cn(
            'flex-1 px-6 py-3.5 md:py-4 text-left cursor-pointer transition-colors',
            activePanel === 'rooms' ? 'bg-gray-50' : 'hover:bg-gray-50/70'
          )}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Compartimento
          </span>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{roomsLabel}</span>
            <Icons.ChevronDown size={15} className="text-gray-400 shrink-0" />
          </div>
        </button>

        {/* SEARCH CTA */}
        <div className="p-2.5 md:pr-3 flex items-center justify-end">
          <button
            type="submit"
            className="w-full md:w-auto px-6 h-12 md:h-14 bg-brand-primary rounded-2xl md:rounded-full flex items-center justify-center gap-2 text-white font-semibold hover:bg-rose-600 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Icons.Search size={18} strokeWidth={2.5} />
            <span>Pesquisar</span>
          </button>
        </div>
      </form>

      {/* POPOVER: ONDE */}
      {activePanel === 'where' && (
        <div className="absolute left-0 top-full mt-3 w-full md:w-[420px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 z-40">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-rose-50/70 hover:bg-rose-50 text-brand-primary text-sm font-semibold transition-colors cursor-pointer mb-3"
          >
            {locating ? (
              <Icons.Loader size={16} className="animate-spin" />
            ) : (
              <Icons.Navigation size={16} />
            )}
            <span>{locating ? 'A detetar localização...' : 'Perto de mim (Usar localização atual)'}</span>
          </button>

          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">
            Destinos Populares em Angola
          </p>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => {
                    setLocation(loc.city === loc.province ? loc.province : loc.city);
                    setActivePanel('type');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                    <Icons.MapPin size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{loc.city}</p>
                    <p className="text-xs text-gray-500">{loc.province}, Angola</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-500 px-3 py-4 text-center">
                Pressione Pesquisar para procurar por "{location}".
              </p>
            )}
          </div>
        </div>
      )}

      {/* POPOVER: TIPO */}
      {activePanel === 'type' && (
        <div className="absolute left-0 md:left-1/3 top-full mt-3 w-full md:w-[380px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 z-40 space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Modalidade
            </p>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'sale', label: 'Comprar' },
                { id: 'rent', label: 'Arrendar' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntent(item.id as any)}
                  className={cn(
                    'py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                    intent === item.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              Tipo de Imóvel
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('all')}
                className={cn(
                  'px-3 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2',
                  type === 'all'
                    ? 'border-brand-primary bg-rose-50 text-brand-primary'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                )}
              >
                <Icons.LayoutGrid size={15} />
                <span>Todos os tipos</span>
              </button>
              {CATEGORIES.map((cat) => {
                const Icon = (Icons as any)[cat.icon];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setType(cat.id)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2',
                      type === cat.id
                        ? 'border-brand-primary bg-rose-50 text-brand-primary'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {Icon && <Icon size={15} />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setActivePanel('rooms')}
              className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
            >
              Escolher compartimento →
            </button>
          </div>
        </div>
      )}

      {/* POPOVER: COMPARTIMENTO */}
      {activePanel === 'rooms' && (
        <div className="absolute right-0 top-full mt-3 w-full md:w-[340px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 z-40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Quartos / Tipologia</p>
              <p className="text-xs text-gray-500">Escolha o número de compartimentos</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setBedrooms((prev) =>
                    prev === 'any' ? 'any' : prev <= 1 ? 'any' : prev - 1
                  )
                }
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 cursor-pointer"
                aria-label="Diminuir quartos"
              >
                <Icons.Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold tabular-nums">
                {bedrooms === 'any' ? '—' : bedrooms >= 4 ? '4+' : `T${bedrooms}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setBedrooms((prev) =>
                    prev === 'any' ? 1 : prev >= 4 ? 4 : prev + 1
                  )
                }
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 cursor-pointer"
                aria-label="Aumentar quartos"
              >
                <Icons.Plus size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-2">
            {[
              { id: 'any', label: 'Todos' },
              { id: 1, label: 'T1' },
              { id: 2, label: 'T2' },
              { id: 3, label: 'T3' },
              { id: 4, label: 'T4+' },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => setBedrooms(opt.id as any)}
                className={cn(
                  'py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                  bedrooms === opt.id
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => executeSearch()}
            className="w-full btn-primary py-2.5 text-sm"
          >
            Aplicar e Pesquisar
          </button>
        </div>
      )}
    </div>
  );
}
