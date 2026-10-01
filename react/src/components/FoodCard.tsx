/* ==================================================================
   FOOD CARD — the product's signature ordering component.
   Two presentations, both stripped back to photography + type:
     • "card"  → image-led grid card (home rails, menu grid)
     • "row"   → hairline list row (mobile menu list, search results)
   No decorative chrome: no fake ratings, no floating badges, no shadows.
================================================================== */
import { Check, Plus } from 'lucide-react';
import type { MenuItem } from '../types';
import { effectivePrice, ghs } from '../utils';
import { ZoomImg } from './ui';

function Price({ item, className = '' }: { item: MenuItem; className?: string }) {
  const discount = Number(item.discount_percent || 0);
  return (
    <span className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-ink-900">
        {ghs(effectivePrice(item))}
      </span>
      {discount > 0 && <del className="text-[12px] font-normal text-ink-400">{ghs(item.price)}</del>}
    </span>
  );
}

function AddButton({
  added,
  onClick,
  label,
  shape = 'tile',
}: {
  added: boolean;
  onClick: () => void;
  label: string;
  shape?: 'tile' | 'pill';
}) {
  const state = added
    ? 'bg-success-600 text-white'
    : 'bg-ink-900 text-white hover:bg-mayford-600';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-tile font-semibold transition-colors duration-150 ${state} ${
        shape === 'tile' ? 'h-9 w-9' : 'h-9 px-3 text-[12.5px]'
      }`}
    >
      {added ? (
        <Check className={shape === 'tile' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.4} />
      ) : (
        <Plus className={shape === 'tile' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.4} />
      )}
      {shape === 'pill' && (added ? 'Added' : 'Add')}
    </button>
  );
}

export function FoodCard({
  item,
  added,
  onAdd,
  showEta = true,
  className = '',
}: {
  item: MenuItem;
  added: boolean;
  onAdd: () => void;
  showEta?: boolean;
  className?: string;
}) {
  const discount = Number(item.discount_percent || 0);
  return (
    <article className={`group flex h-full flex-col ${className}`}>
      <div className="relative overflow-hidden rounded-card bg-ink-100">
        <ZoomImg src={`/assets/images/${item.image}`} alt={item.food_name} className="aspect-[4/3]" />
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-[5px] bg-ink-900 px-1.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white">
            {discount}% off
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">{item.food_name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-500">{item.description}</p>
        {showEta && (
          <p className="mt-2 text-[12px] text-ink-400">
            25–35 min · {item.category}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <Price item={item} />
          <AddButton added={added} onClick={onAdd} label={`Add ${item.food_name} to cart`} />
        </div>
      </div>
    </article>
  );
}

export function FoodRow({ item, added, onAdd }: { item: MenuItem; added: boolean; onAdd: () => void }) {
  const discount = Number(item.discount_percent || 0);
  return (
    <div className="flex items-center gap-4 border-b border-ink-100 py-4 last:border-b-0">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-ink-100">
        <img
          src={`/assets/images/${item.image}`}
          alt={item.food_name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {discount > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded-[5px] bg-ink-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
            {discount}%
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-1 text-[14.5px] font-semibold tracking-[-0.01em] text-ink-900">{item.food_name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">{item.description}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price item={item} />
          <AddButton added={added} onClick={onAdd} label={`Add ${item.food_name} to cart`} shape="pill" />
        </div>
      </div>
    </div>
  );
}
