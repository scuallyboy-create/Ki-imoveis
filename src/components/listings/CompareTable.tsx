import { Link } from 'react-router-dom';
import { Property } from '@/src/types';
import { Icons } from '../ui/Icons';
import { cn, formatCurrency, getUSDToAOA } from '@/src/lib/utils';
import { getAgentById } from '@/src/lib/dataService';
import { ASSETS } from '@/src/lib/assets';

interface CompareTableProps {
  properties: Property[];
  onRemove: (id: string) => void;
  onNavigate?: () => void;
}

const TYPE_LABELS: Record<Property['type'], string> = {
  apartment: 'Apartamento',
  house: 'Moradia / Vivenda',
  luxury: 'Luxo & Exclusivo',
  commercial: 'Espaço Comercial',
};

export default function CompareTable({ properties, onRemove, onNavigate }: CompareTableProps) {
  if (properties.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-white space-y-3">
        <Icons.ArrowLeftRight size={38} className="mx-auto text-gray-300" />
        <h3 className="text-lg font-bold text-gray-900">Nenhum imóvel selecionado para comparação</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Selecione até 3 imóveis nos cartões do catálogo clicando no botão &ldquo;Comparar&rdquo; para analisar preço, área, compartimentos e localização lado a lado.
        </p>
        <Link
          to="/listings"
          onClick={onNavigate}
          className="btn-primary inline-block mt-2 text-sm px-6 py-2.5"
        >
          Explorar Imóveis
        </Link>
      </div>
    );
  }

  const lowestPrice = Math.min(...properties.map((p) => p.price));
  const largestArea = Math.max(...properties.map((p) => p.details.area || 0));
  const sameTransactionMode = properties.every((p) => p.status === properties[0].status);

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-3xl">
      <table className="w-full min-w-[680px] text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 align-top">
            <th className="w-44 p-5 bg-gray-50/80 text-xs font-bold uppercase tracking-wider text-gray-500">
              Característica
            </th>
            {properties.map((prop) => (
              <th key={prop.id} className="p-5 min-w-[210px] border-l border-gray-100">
                <div className="space-y-3">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={prop.images?.[0] || ASSETS.propTalatonaFlat}
                      alt={prop.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(prop.id)}
                      aria-label={`Remover ${prop.title}`}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/65 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <Icons.X size={14} />
                    </button>
                  </div>

                  <div>
                    <Link
                      to={`/property/${prop.id}`}
                      onClick={onNavigate}
                      className="font-bold text-sm text-gray-900 hover:text-brand-primary line-clamp-2 leading-snug"
                    >
                      {prop.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 font-normal">
                      {prop.location.city}, {prop.location.province}
                    </p>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 text-sm tabular-nums">
          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Preço (AOA)
            </td>
            {properties.map((prop) => {
              const isBestPrice =
                properties.length > 1 && sameTransactionMode && prop.price === lowestPrice;
              return (
                <td key={prop.id} className="p-4 px-5 border-l border-gray-100">
                  <span className="font-extrabold text-gray-900 text-base">
                    {formatCurrency(prop.price)}
                  </span>
                  {prop.status === 'rent' && (
                    <span className="text-xs text-gray-500 ml-1">/mês</span>
                  )}
                  {isBestPrice && (
                    <span className="block text-[11px] font-bold text-emerald-700 mt-0.5">
                      Melhor valor nesta seleção
                    </span>
                  )}
                </td>
              );
            })}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Equivalente (USD)
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 font-mono text-xs text-gray-600">
                ≈ {formatCurrency(getUSDToAOA(prop.price), 'USD')}
                {prop.status === 'rent' ? ' /mês' : ''}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Modalidade
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 font-semibold text-gray-800">
                {prop.status === 'rent' ? 'Arrendamento' : 'Venda'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Disponibilidade
            </td>
            {properties.map((prop) => {
              const avail = prop.availabilityStatus || 'available';
              return (
                <td key={prop.id} className="p-4 px-5 border-l border-gray-100">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-semibold',
                      avail === 'available'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : avail === 'sold'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    )}
                  >
                    {avail === 'available' ? 'Disponível' : avail === 'sold' ? 'Vendido' : 'Alugado'}
                  </span>
                </td>
              );
            })}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Localização
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-gray-700">
                <p className="font-semibold text-gray-900">
                  {prop.location.city}, {prop.location.province}
                </p>
                {prop.location.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{prop.location.address}</p>
                )}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Tipo de Imóvel
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-gray-800 font-medium">
                {TYPE_LABELS[prop.type] || prop.type}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Área Útil (m²)
            </td>
            {properties.map((prop) => {
              const area = prop.details.area || 0;
              const pricePerSqm = area > 0 ? Math.round(prop.price / area) : 0;
              const isLargest = properties.length > 1 && area === largestArea && area > 0;
              return (
                <td key={prop.id} className="p-4 px-5 border-l border-gray-100">
                  <span className="font-bold text-gray-900">{area} m²</span>
                  {pricePerSqm > 0 && (
                    <span className="block text-[11px] text-gray-400">
                      {formatCurrency(pricePerSqm)} / m²
                    </span>
                  )}
                  {isLargest && (
                    <span className="block text-[11px] font-bold text-brand-primary mt-0.5">
                      Maior área
                    </span>
                  )}
                </td>
              );
            })}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Quartos (Tipologia)
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 font-semibold text-gray-900">
                T{prop.details.bedrooms} ({prop.details.bedrooms} quarto{prop.details.bedrooms > 1 ? 's' : ''})
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Casas de Banho
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-gray-800">
                {prop.details.bathrooms}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Mobilado
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-gray-800">
                {prop.details.furnished ? 'Sim (Mobilado)' : 'Não'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Comodidades
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-xs text-gray-700">
                {prop.amenities?.length > 0 ? prop.amenities.join(' · ') : 'Não especificadas'}
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Agente / Agência
            </td>
            {properties.map((prop) => {
              const ag = getAgentById(prop.agentId);
              return (
                <td key={prop.id} className="p-4 px-5 border-l border-gray-100 text-xs">
                  {ag ? (
                    <Link
                      to={`/agents/${ag.id}`}
                      onClick={onNavigate}
                      className="font-semibold text-gray-900 hover:text-brand-primary underline"
                    >
                      {ag.name}
                    </Link>
                  ) : (
                    <span className="text-gray-500">Agente Ki-Imóveis</span>
                  )}
                </td>
              );
            })}
          </tr>

          <tr>
            <td className="p-4 px-5 bg-gray-50/60 text-xs font-bold text-gray-600 uppercase">
              Ação
            </td>
            {properties.map((prop) => (
              <td key={prop.id} className="p-4 px-5 border-l border-gray-100">
                <Link
                  to={`/property/${prop.id}`}
                  onClick={onNavigate}
                  className="inline-flex items-center justify-center w-full py-2 px-3 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-brand-primary transition-colors"
                >
                  Ver Detalhes & Agendar
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
