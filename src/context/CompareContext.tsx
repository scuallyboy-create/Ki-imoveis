import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Property } from '@/src/types';
import { DATA_UPDATED_EVENT, getPublicProperties } from '@/src/lib/dataService';
import { useToast } from '@/src/components/ui/Toast';

const COMPARE_STORAGE_KEY = 'ki_imoveis_compare_ids_v1';
export const MAX_COMPARE_ITEMS = 3;

interface CompareContextType {
  compareIds: string[];
  compareProperties: Property[];
  isComparing: (propertyId: string) => boolean;
  toggleCompare: (property: Property) => 'added' | 'removed' | 'full';
  removeFromCompare: (propertyId: string) => void;
  clearCompare: () => void;
  isCompareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE_ITEMS) : [];
    } catch {
      return [];
    }
  });

  const [allProperties, setAllProperties] = useState<Property[]>(() => getPublicProperties());
  const [isCompareModalOpen, setCompareModalOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const latest = getPublicProperties();
      setAllProperties(latest);
      setCompareIds((prev) => prev.filter((id) => latest.some((p) => p.id === id)));
    };
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
    } catch {
      // Safe ignore
    }
  }, [compareIds]);

  const compareProperties = useMemo(() => {
    return compareIds
      .map((id) => allProperties.find((p) => p.id === id))
      .filter((p): p is Property => Boolean(p));
  }, [compareIds, allProperties]);

  const isComparing = useCallback(
    (propertyId: string) => compareIds.includes(propertyId),
    [compareIds]
  );

  const toggleCompare = useCallback(
    (property: Property): 'added' | 'removed' | 'full' => {
      if (compareIds.includes(property.id)) {
        setCompareIds((prev) => prev.filter((id) => id !== property.id));
        showToast(`"${property.title}" removido da comparação.`, 'info');
        return 'removed';
      }
      if (compareIds.length >= MAX_COMPARE_ITEMS) {
        showToast(
          `Pode comparar no máximo ${MAX_COMPARE_ITEMS} imóveis em simultâneo. Remova um para adicionar outro.`,
          'error'
        );
        return 'full';
      }
      setCompareIds((prev) => [...prev, property.id]);
      showToast(`"${property.title}" adicionado à comparação (${compareIds.length + 1}/3).`, 'success');
      return 'added';
    },
    [compareIds, showToast]
  );

  const removeFromCompare = useCallback((propertyId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== propertyId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setCompareModalOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        compareIds,
        compareProperties,
        isComparing,
        toggleCompare,
        removeFromCompare,
        clearCompare,
        isCompareModalOpen,
        setCompareModalOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return ctx;
}
