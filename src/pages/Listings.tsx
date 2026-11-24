import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import PropertyGrid from '../components/listings/PropertyGrid';
import CategoryBar from '../components/home/CategoryBar';
import SearchEngineBar, { SearchEngineValues } from '../components/home/SearchEngineBar';
import GooglePropertyMap from '../components/maps/GooglePropertyMap';
import { PROVINCES } from '@/src/constants';
import {
  DATA_UPDATED_EVENT,
  filterProperties,
  getCoordinatesForLocation,
  getProperties,
} from '@/src/lib/dataService';
import { AvailabilityStatus, Property } from '@/src/types';
import { Icons } from '../components/ui/Icons';
import { cn } from '@/src/lib/utils';

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProperties, setAllProperties] = useState<Property[]>(() => getProperties());
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [visibleLimit, setVisibleLimit] = useState(8);

  const locationParam = searchParams.get('location') || '';
  const provinceParam = searchParams.get('province') || 'all';
  const typeParam = searchParams.get('type') || 'all';
  const intentParam = (searchParams.get('intent') as 'all' | 'sale' | 'rent') || 'all';
  const bedroomsParam = searchParams.get('bedrooms');
  const parsedBedrooms: number | 'any' =
    bedroomsParam && !Number.isNaN(Number(bedroomsParam)) ? Number(bedroomsParam) : 'any';
  const maxPriceParam = Number(searchParams.get('maxPrice') || '0');
  const availabilityParam = (searchParams.get('availability') as 'all' | AvailabilityStatus) || 'all';
  const sortParam = (searchParams.get('sort') as 'recent' | 'price_asc' | 'price_desc') || 'recent';

  useEffect(() => {
    const sync = () => setAllProperties(getProperties());
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, sync);
  }, []);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 'any' || value === '0') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleSearchBar = (values: SearchEngineValues) => {
    const next = new URLSearchParams();
    if (values.location.trim()) next.set('location', values.location.trim());
    if (values.type !== 'all') next.set('type', values.type);
    if (values.intent !== 'all') next.set('intent', values.intent);
    if (values.bedrooms !== 'any') next.set('bedrooms', String(values.bedrooms));
    if (provinceParam !== 'all') next.set('province', provinceParam);
    if (maxPriceParam > 0) next.set('maxPrice', String(maxPriceParam));
    if (availabilityParam !== 'all') next.set('availability', availabilityParam);
    if (sortParam !== 'recent') next.set('sort', sortParam);
    setSearchParams(next);
    setVisibleLimit(8);
  };

  const resetFilters = () => {
    setSearchParams({});
    setVisibleLimit(8);
  };

  const filters = useMemo(
    () => ({
      location: locationParam,
      province: provinceParam,
      type: typeParam,
      intent: intentParam,
      bedrooms: parsedBedrooms,
      maxPrice: maxPriceParam,
      availability: availabilityParam,
      sort: sortParam,
    }),
    [locationParam, provinceParam, typeParam, intentParam, parsedBedrooms, maxPriceParam, availabilityParam, sortParam]
  );

  const matchedProperties = useMemo(
    () => filterProperties(allProperties, filters),
    [allProperties, filters]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    const first = matchedProperties[0];
    if (first?.location.lat && first?.location.lng) {
      return [first.location.lat, first.location.lng];
    }
    if (provinceParam !== 'all') {
      const c = getCoordinatesForLocation(provinceParam);
      return [c.lat, c.lng];
    }
    return [-8.839, 13.289];
  }, [matchedProperties, provinceParam]);

  const hasActiveFilters = Boolean(
    locationParam ||
      provinceParam !== 'all' ||
      typeParam !== 'all' ||
      intentParam !== 'all' ||
      parsedBedrooms !== 'any' ||
      maxPriceParam > 0 ||
      availabilityParam !== 'all'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Explore Imóveis em Angola
            </h1>
            <p className="text-gray-500 mt-1 text-sm tabular-nums">
              {matchedProperties.length}{' '}
              {matchedProperties.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
              {locationParam ? ` em "${locationParam}"` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icons.List size={15} />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icons.Map size={15} />
              <span>Mapa</span>
            </button>
          </div>
        </div>

        <SearchEngineBar
          compact
          initialValues={{
            location: locationParam,
            type: typeParam,
            intent: intentParam,
            bedrooms: parsedBedrooms,
          }}
          onSearch={handleSearchBar}
        />

        <CategoryBar
          activeCategory={typeParam}
          onSelectCategory={(cat) => updateParam('type', cat)}
        />

        {/* Secondary Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={provinceParam}
              onChange={(e) => updateParam('province', e.target.value)}
              aria-label="Filtrar por província"
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
            >
              <option value="all">Todas Províncias</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={maxPriceParam ? String(maxPriceParam) : '0'}
              onChange={(e) => updateParam('maxPrice', e.target.value)}
              aria-label="Filtrar por preço máximo"
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
            >
              <option value="0">Preço máximo</option>
              <option value="250000">Até 250.000 Kz</option>
              <option value="1000000">Até 1.000.000 Kz</option>
              <option value="50000000">Até 50.000.000 Kz</option>
              <option value="150000000">Até 150.000.000 Kz</option>
            </select>

            <select
              value={parsedBedrooms === 'any' ? 'any' : String(parsedBedrooms)}
              onChange={(e) => updateParam('bedrooms', e.target.value)}
              aria-label="Filtrar por compartimentos"
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
            >
              <option value="any">Compartimentos (Todos)</option>
              <option value="1">T1 (1 Quarto)</option>
              <option value="2">T2 (2 Quartos)</option>
              <option value="3">T3 (3 Quartos)</option>
              <option value="4">T4+ (4+ Quartos)</option>
            </select>

            <select
              value={availabilityParam}
              onChange={(e) => updateParam('availability', e.target.value)}
              aria-label="Filtrar por estado"
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
            >
              <option value="all">Estado: Todos</option>
              <option value="available">Disponível</option>
              <option value="sold">Vendido</option>
              <option value="rented">Alugado</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3.5 py-2.5 text-xs font-semibold text-brand-primary hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordenar</span>
            <select
              value={sortParam}
              onChange={(e) => updateParam('sort', e.target.value)}
              aria-label="Ordenar imóveis"
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none text-brand-dark cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Preço: Baixo-Alto</option>
              <option value="price_desc">Preço: Alto-Baixo</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {viewMode === 'grid' ? (
          <>
            <div className="mt-2">
              <PropertyGrid
                properties={matchedProperties}
                limit={visibleLimit}
                onResetFilters={resetFilters}
              />
            </div>

            {matchedProperties.length > visibleLimit && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 8)}
                  className="btn-outline px-10 py-3 text-sm font-semibold"
                >
                  Carregar mais imóveis ({matchedProperties.length - visibleLimit} restantes)
                </button>
              </div>
            )}
          </>
        ) : (
          <GooglePropertyMap
            properties={matchedProperties}
            center={{ lat: mapCenter[0], lng: mapCenter[1] }}
            zoom={provinceParam !== 'all' || locationParam ? 11 : 6}
            heightClassName="h-[540px]"
          />
        )}
      </div>
    </motion.div>
  );
}
