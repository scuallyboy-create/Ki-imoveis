import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useCompare, MAX_COMPARE_ITEMS } from '../context/CompareContext';
import CompareTable from '../components/listings/CompareTable';
import { Icons } from '../components/ui/Icons';

export default function Compare() {
  const { compareProperties, removeFromCompare, clearCompare } = useCompare();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10 space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Comparar Imóveis ({compareProperties.length}/{MAX_COMPARE_ITEMS})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analise preço, área útil, tipologia, localização e comodidades lado a lado antes de decidir.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {compareProperties.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="btn-outline py-2 px-4 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              Limpar Seleção
            </button>
          )}
          <Link to="/listings" className="btn-primary py-2.5 px-5 text-xs flex items-center gap-1.5">
            <Icons.Plus size={14} />
            <span>Adicionar Imóveis</span>
          </Link>
        </div>
      </div>

      <CompareTable properties={compareProperties} onRemove={removeFromCompare} />
    </motion.div>
  );
}
