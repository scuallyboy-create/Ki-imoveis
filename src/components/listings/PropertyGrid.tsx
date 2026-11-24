import { useState, useEffect } from 'react';
import PropertyCard from './PropertyCard';
import { Property } from '@/src/types';
import {
  DATA_UPDATED_EVENT,
  filterProperties,
  getProperties,
  PropertySearchFilters,
} from '@/src/lib/dataService';
import { Icons } from '../ui/Icons';

interface PropertyGridProps {
  limit?: number;
  category?: string;
  filters?: PropertySearchFilters;
  properties?: Property[];
  showAvailability?: boolean;
  onResetFilters?: () => void;
}

export default function PropertyGrid({
  limit,
  category,
  filters,
  properties: externalProperties,
  showAvailability = true,
  onResetFilters,
}: PropertyGridProps) {
  const [allProperties, setAllProperties] = useState<Property[]>(() => getProperties());

  useEffect(() => {
    const sync = () => setAllProperties(getProperties());
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, sync);
  }, []);

  const baseList = externalProperties || allProperties;
  const effectiveFilters: PropertySearchFilters = {
    ...filters,
    ...(category && category !== 'all' ? { type: category } : {}),
  };

  const filtered = filterProperties(baseList, effectiveFilters);
  const visible = limit ? filtered.slice(0, limit) : filtered;

  if (visible.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-3xl py-16 px-6 text-center bg-white">
        <Icons.Search size={36} className="mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-900">Nenhum imóvel encontrado</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Tente ajustar a localização, o tipo de imóvel ou o número de compartimentos na pesquisa.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 btn-outline px-6 py-2.5 text-sm"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
      {visible.map((prop) => (
        <PropertyCard
          key={prop.id}
          property={prop}
          showAvailability={showAvailability}
        />
      ))}
    </div>
  );
}
