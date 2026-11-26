import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { AvailabilityStatus, Property } from '@/src/types';
import { cn, formatCurrency, getUSDToAOA } from '@/src/lib/utils';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '../ui/Toast';
import { useCompare } from '@/src/context/CompareContext';

interface PropertyCardProps {
  property: Property;
  showAvailability?: boolean;
  key?: React.Key;
}

const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; badgeClass: string; icon: 'CheckCircle2' | 'Lock' | 'KeyRound' }
> = {
  available: {
    label: 'Disponível',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: 'CheckCircle2',
  },
  sold: {
    label: 'Vendido',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: 'Lock',
  },
  rented: {
    label: 'Alugado',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'KeyRound',
  },
};

export default function PropertyCard({ property, showAvailability = true }: PropertyCardProps) {
  const { user, toggleFavorite } = useAuth();
  const { showToast } = useToast();
  const { isComparing, toggleCompare } = useCompare();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const isFavorite = Boolean(user?.favorites?.includes(property.id));
  const comparing = isComparing(property.id);
  const availability: AvailabilityStatus = property.availabilityStatus || 'available';
  const statusMeta = AVAILABILITY_META[availability];
  const StatusIcon = Icons[statusMeta.icon];

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Inicie sessão para guardar imóveis nos favoritos.', 'info');
      navigate('/auth');
      return;
    }
    const added = await toggleFavorite(property.id);
    showToast(added ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 'success');
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(property);
  };

  const typeLabel =
    property.type === 'apartment'
      ? 'Apartamento'
      : property.type === 'house'
      ? 'Moradia'
      : property.type === 'luxury'
      ? 'Luxo'
      : 'Comercial';

  return (
    <Link to={`/property/${property.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-3 bg-gray-100 border border-gray-200/70">
        {!imgError && property.images?.[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 p-4 text-center">
            <Icons.Home size={32} className="mb-2 text-gray-400" />
            <span className="text-xs font-semibold line-clamp-2">{property.title}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-sm cursor-pointer',
            isFavorite
              ? 'bg-brand-primary text-white'
              : 'bg-black/35 text-white hover:bg-brand-primary'
          )}
        >
          <Icons.Heart size={18} className={isFavorite ? 'fill-current' : ''} />
        </button>

        {showAvailability && (
          <div
            className={cn(
              'absolute top-3 left-3 px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 shadow-sm',
              statusMeta.badgeClass
            )}
          >
            <StatusIcon size={12} />
            <span>{statusMeta.label}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleCompare}
          aria-label={comparing ? 'Remover da comparação' : 'Comparar imóvel'}
          className={cn(
            'absolute bottom-3 right-3 px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer',
            comparing
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white/90 text-gray-800 border-white/60 hover:bg-white'
          )}
        >
          <Icons.ArrowLeftRight size={12} />
          <span>{comparing ? 'A Comparar' : 'Comparar'}</span>
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-gray-900 truncate">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0 text-gray-700">
            <Icons.Star size={13} className="text-amber-500 fill-current" />
            <span className="text-xs font-semibold tabular-nums">{(property.rating || 4.9).toFixed(2)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 truncate">
          {property.location.city}, {property.location.province} · {typeLabel} · T{property.details.bedrooms} · {property.details.area} m²
        </p>

        <div className="pt-1 flex items-baseline justify-between gap-2">
          <p className="font-bold text-gray-900 tabular-nums">
            {formatCurrency(property.price)}
            <span className="font-normal text-gray-500 text-xs ml-1">
              {property.status === 'rent' ? '/ mês' : ''}
            </span>
          </p>
          <p className="text-[11px] text-gray-400 font-mono tabular-nums shrink-0">
            ≈ {formatCurrency(getUSDToAOA(property.price), 'USD')}
          </p>
        </div>
      </div>
    </Link>
  );
}
