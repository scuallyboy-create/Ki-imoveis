import { useState, useEffect, useCallback, type Key } from 'react';
import { Link } from 'react-router-dom';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { AvailabilityStatus, Property } from '@/src/types';
import { getCoordinatesForLocation } from '@/src/lib/dataService';
import { formatCurrency } from '@/src/lib/utils';
import { Icons } from '../ui/Icons';

export interface GooglePropertyMapProps {
  properties: Property[];
  center: { lat: number; lng: number };
  zoom?: number;
  heightClassName?: string;
  selectedPropertyId?: string | null;
  onSelectProperty?: (propertyId: string) => void;
  showPropertyLink?: boolean;
}

const AVAILABILITY_BADGE: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: 'Disponível', color: '#059669' },
  sold: { label: 'Vendido', color: '#e11d48' },
  rented: { label: 'Alugado', color: '#d97706' },
};

function PropertyMarkerItem({
  property,
  isOpen,
  onOpen,
  onClose,
  showPropertyLink = true,
}: {
  key?: Key;
  property: Property;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  showPropertyLink?: boolean;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const coords =
    property.location.lat && property.location.lng
      ? { lat: property.location.lat, lng: property.location.lng }
      : getCoordinatesForLocation(property.location.province, property.location.city);

  const avail = property.availabilityStatus || 'available';
  const pinColor = AVAILABILITY_BADGE[avail].color;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={coords}
        title={property.title}
        onClick={onOpen}
      >
        <Pin
          background={pinColor}
          borderColor="#ffffff"
          glyphColor="#ffffff"
          scale={isOpen ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={260}>
          <div className="p-1 space-y-1.5 text-gray-900">
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white"
                style={{ backgroundColor: pinColor }}
              >
                {AVAILABILITY_BADGE[avail].label}
              </span>
              <span className="text-[11px] font-semibold text-gray-500">
                T{property.details.bedrooms}
              </span>
            </div>
            <p className="font-bold text-xs text-gray-900 leading-snug">{property.title}</p>
            <p className="text-[11px] text-gray-500">
              {property.location.address}, {property.location.city}
            </p>
            <p className="font-bold text-rose-600 text-xs tabular-nums">
              {formatCurrency(property.price)}
              {property.status === 'rent' ? ' /mês' : ''}
            </p>
            {showPropertyLink && (
              <Link
                to={`/property/${property.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-900 underline pt-0.5"
              >
                Ver detalhes <Icons.ChevronRight size={12} />
              </Link>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapViewportSync({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom]);

  return null;
}

export default function GooglePropertyMap({
  properties,
  center,
  zoom = 11,
  heightClassName = 'h-[540px]',
  selectedPropertyId,
  onSelectProperty,
  showPropertyLink = true,
}: GooglePropertyMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const loadingStatus = useApiLoadingStatus();
  const [activeId, setActiveId] = useState<string | null>(selectedPropertyId ?? null);

  useEffect(() => {
    if (selectedPropertyId !== undefined) {
      setActiveId(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (
      loadingStatus === APILoadingStatus.AUTH_FAILURE ||
      loadingStatus === APILoadingStatus.FAILED
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [loadingStatus]);

  const handleOpen = useCallback(
    (id: string) => {
      setActiveId(id);
      onSelectProperty?.(id);
    },
    [onSelectProperty]
  );

  const handleClose = useCallback(() => {
    setActiveId(null);
  }, []);

  if (!apiKey) {
    return (
      <div
        className={`${heightClassName} w-full rounded-3xl border border-gray-200 bg-gray-100 flex flex-col items-center justify-center p-6 text-center`}
      >
        <Icons.MapPin size={32} className="text-gray-400 mb-2" />
        <p className="font-bold text-gray-800 text-sm">Mapa Google Maps indisponível</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          A chave VITE_GOOGLE_MAPS_API_KEY não foi detetada no ambiente atual.
        </p>
      </div>
    );
  }

  if (loadingStatus === APILoadingStatus.AUTH_FAILURE || loadingStatus === APILoadingStatus.FAILED) {
    return (
      <div
        className={`${heightClassName} w-full rounded-3xl border border-amber-200 bg-amber-50 flex flex-col items-center justify-center p-6 text-center`}
      >
        <Icons.AlertCircle size={32} className="text-amber-600 mb-2" />
        <p className="font-bold text-amber-900 text-sm">
          Não foi possível carregar o Google Maps
        </p>
        <p className="text-xs text-amber-800 mt-1 max-w-md">
          Verifique as restrições ou quota da chave Google Maps Platform na Google Cloud Console.
        </p>
      </div>
    );
  }

  return (
    <div className={`${heightClassName} w-full rounded-3xl overflow-hidden border border-gray-200 relative`}>
      <GoogleMap
        defaultCenter={center}
        defaultZoom={zoom}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <MapViewportSync center={center} zoom={zoom} />
        {properties.map((prop) => (
          <PropertyMarkerItem
            key={prop.id}
            property={prop}
            isOpen={activeId === prop.id}
            onOpen={() => handleOpen(prop.id)}
            onClose={handleClose}
            showPropertyLink={showPropertyLink}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
