import { useState } from 'react';
import { Icons } from '../ui/Icons';
import { CATEGORIES } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface CategoryBarProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function CategoryBar({
  activeCategory,
  onSelectCategory,
}: CategoryBarProps) {
  const [internalActive, setInternalActive] = useState('all');
  const active = activeCategory ?? internalActive;

  const handleSelect = (id: string) => {
    if (onSelectCategory) {
      onSelectCategory(id);
    } else {
      setInternalActive(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-5 border-b border-gray-200 bg-white">
      <div className="flex justify-start md:justify-center gap-8 md:gap-12 overflow-x-auto no-scrollbar scroll-smooth px-4">
        <button
          type="button"
          onClick={() => handleSelect('all')}
          className={cn(
            'flex flex-col items-center gap-2 cursor-pointer pb-2 transition-all min-w-[76px] whitespace-nowrap shrink-0',
            active === 'all'
              ? 'text-gray-900 border-b-2 border-brand-dark'
              : 'text-gray-500 opacity-70 hover:opacity-100'
          )}
        >
          <Icons.LayoutGrid size={22} />
          <span className="text-xs font-semibold">Destaques</span>
        </button>

        {CATEGORIES.map((cat) => {
          const Icon = (Icons as any)[cat.icon];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.id)}
              className={cn(
                'flex flex-col items-center gap-2 cursor-pointer pb-2 transition-all min-w-[76px] whitespace-nowrap shrink-0',
                active === cat.id
                  ? 'text-gray-900 border-b-2 border-brand-dark'
                  : 'text-gray-500 opacity-70 hover:opacity-100'
              )}
            >
              {Icon && <Icon size={22} strokeWidth={active === cat.id ? 2.2 : 1.6} />}
              <span className="text-xs font-semibold">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
