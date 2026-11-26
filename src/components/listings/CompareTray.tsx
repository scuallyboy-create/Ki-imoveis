import { useCompare, MAX_COMPARE_ITEMS } from '@/src/context/CompareContext';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '@/src/lib/utils';
import { ASSETS } from '@/src/lib/assets';

export default function CompareTray() {
  const {
    compareProperties,
    removeFromCompare,
    clearCompare,
    setCompareModalOpen,
  } = useCompare();

  if (compareProperties.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 sm:right-auto sm:left-6 z-40 max-w-2xl bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 overflow-x-auto">
        {compareProperties.map((prop) => (
          <div
            key={prop.id}
            className="flex items-center gap-2 bg-white/10 rounded-xl pl-1.5 pr-2 py-1 shrink-0 max-w-[190px]"
          >
            <img
              src={prop.images?.[0] || ASSETS.propTalatonaFlat}
              alt={prop.title}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold truncate">{prop.title}</p>
              <p className="text-[10px] text-gray-300 tabular-nums truncate">
                {formatCurrency(prop.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeFromCompare(prop.id)}
              aria-label={`Remover ${prop.title}`}
              className="p-0.5 text-gray-300 hover:text-white cursor-pointer shrink-0"
            >
              <Icons.X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0 justify-end">
        <button
          type="button"
          onClick={clearCompare}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={() => setCompareModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Icons.ArrowLeftRight size={14} />
          <span>
            Comparar ({compareProperties.length}/{MAX_COMPARE_ITEMS})
          </span>
        </button>
      </div>
    </div>
  );
}
