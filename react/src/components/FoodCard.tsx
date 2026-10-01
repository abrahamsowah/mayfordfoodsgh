/* ==================================================================
   FOOD CARD — the product's signature ordering component.
   One component, two presentations:
     • "card"  → image-led grid card (home rails, menu grid)
     • "row"   → compact list row (mobile menu list, search results)
================================================================== */
import { Check, Clock, Flame, Plus } from 'lucide-react';
import type { MenuItem } from '../types';
import { effectivePrice, ghs } from '../utils';
import { Badge, Card, RatingPill, ZoomImg } from './ui';

function Price({ item, className = '' }: { item: MenuItem; className?: string }) {
  const discount = Number(item.discount_percent || 0);
  return (
    <span className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="text-[15px] font-extrabold tabular-nums tracking-[-0.01em] text-ink-900">
        {ghs(effectivePrice(item))}
      </span>
      {discount > 0 && <del className="text-[12px] font-semibold text-ink-400">{ghs(item.price)}</del>}
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
  const base =
    'flex items-center justify-center gap-1.5 font-extrabold transition duration-300 active:scale-90 border';
  const state = added
    ? 'border-success-600 bg-success-600 text-white'
    : 'border-ink-200 bg-white text-ink-900 hover:border-mayford-600 hover:bg-mayford-600 hover:text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${base} ${state} ${
        shape === 'tile' ? 'h-11 w-11 rounded-tile shadow-raised' : 'h-9 rounded-tile px-3 text-[12.5px]'
      }`}
    >
      {added ? (
        <Check className={shape === 'tile' ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={3} />
      ) : (
        <Plus className={shape === 'tile' ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={3} />
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
    <Card interactive className={`group flex h-full flex-col ${className}`}>
      <div className="relative">
        <ZoomImg src={`/assets/images/${item.image}`} alt={item.food_name} className="aspect-[4/3]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span>
            {discount > 0 && (
              <Badge tone="dark" size="sm" icon={Flame} className="!bg-flame-500">
                {discount}% off
              </Badge>
            )}
          </span>
          <RatingPill value={4.6 + ((item.id % 4) * 0.1)} />
        </div>
        <div className="absolute -bottom-5 right-3">
          <AddButton added={added} onClick={onAdd} label={`Add ${item.food_name} to cart`} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-ink-900">{item.food_name}</h3>
          <Price item={item} />
        </div>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-500">{item.description}</p>
        {showEta && (
          <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.3} />
            25–35 min
            <span className="text-ink-200">•</span>
            <span className="truncate">{item.category}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function FoodRow({ item, added, onAdd }: { item: MenuItem; added: boolean; onAdd: () => void }) {
  const discount = Number(item.discount_percent || 0);
  return (
    <Card className="flex items-stretch gap-3 p-3">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-tile bg-ink-100">
        <img
          src={`/assets/images/${item.image}`}
          alt={item.food_name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {discount > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded-pill bg-flame-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
            {discount}%
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-1 text-[14.5px] font-extrabold tracking-[-0.01em] text-ink-900">{item.food_name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">{item.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price item={item} />
          <AddButton added={added} onClick={onAdd} label={`Add ${item.food_name} to cart`} shape="pill" />
        </div>
      </div>
    </Card>
  );
}
