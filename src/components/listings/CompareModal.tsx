import { Link } from 'react-router-dom';
import { useCompare } from '@/src/context/CompareContext';
import { Icons } from '../ui/Icons';
import CompareTable from './CompareTable';

export default function CompareModal() {
  const {
    compareProperties,
    isCompareModalOpen,
    setCompareModalOpen,
    removeFromCompare,
    clearCompare,
  } = useCompare();

  if (!isCompareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-brand-primary flex items-center justify-center">
              <Icons.ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Comparação de Imóveis ({compareProperties.length}/3)
              </h2>
              <p className="text-xs text-gray-500">
                Compare preço, localização, dimensões e comodidades lado a lado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compareProperties.length > 0 && (
              <>
                <Link
                  to="/compare"
                  onClick={() => setCompareModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Página Dedicada
                </Link>
                <button
                  type="button"
                  onClick={clearCompare}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  Limpar Tudo
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setCompareModalOpen(false)}
              aria-label="Fechar comparação"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-gray-50/70">
          <CompareTable
            properties={compareProperties}
            onRemove={removeFromCompare}
            onNavigate={() => setCompareModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
