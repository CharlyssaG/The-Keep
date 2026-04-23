'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type Category = { id: string; name: string; sort_order: number; household_id: string };
type Item = {
  id: string;
  household_id: string;
  category_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  low_threshold: number;
};

export default function KitchenClient({
  initialCategories, initialItems,
}: { initialCategories: Category[]; initialItems: Item[] }) {
  const supabase = createClient();
  const { profile, theme, toast } = useApp();
  const [categories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('inv-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, async () => {
        const { data } = await supabase.from('inventory_items').select('*').order('name');
        if (data) setItems(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  async function changeQty(item: Item, delta: number) {
    const newQty = Math.max(0, Number(item.quantity) + delta);
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: newQty, updated_at: new Date().toISOString(), updated_by: profile.id } as any)
      .eq('id', item.id);
    if (error) toast(error.message);
    // Trigger low-stock notification when we cross threshold
    if (newQty === 0 && item.quantity > 0) {
      await supabase.from('notifications').insert({
        household_id: profile.household_id,
        sender_id: profile.id,
        recipient_id: null,
        title: `${item.name} is out`,
        body: `${profile.display_name} used the last of the ${item.name}.`,
        kind: 'inventory',
      } as any);
    }
  }

  async function addItem(form: FormData) {
    const payload = {
      household_id: profile.household_id,
      category_id: (form.get('category_id') as string) || null,
      name: String(form.get('name') || '').trim(),
      quantity: Number(form.get('quantity') || 0),
      unit: String(form.get('unit') || '').trim(),
      low_threshold: Number(form.get('low_threshold') || 1),
    };
    if (!payload.name) { toast('Name required'); return; }
    const { error } = await supabase.from('inventory_items').insert(payload as any);
    if (error) { toast(error.message); return; }
    setShowAdd(false);
  }

  return (
    <div>
      <SectionHeading title={theme.copy.inventory} subtitle={theme.copy.inventorySubtitle} ornament={theme.copy.ornament} />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={theme.copy.searchInventory}
        className="w-full p-3 mb-4 text-sm italic"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-body)',
        }}
      />

      {categories.map((cat) => {
        const catItems = filtered.filter((i) => i.category_id === cat.id);
        if (catItems.length === 0) return null;
        return (
          <div key={cat.id} className="mb-5">
            <div
              className="text-xs uppercase tracking-widest pb-1 mb-2"
              style={{
                color: 'var(--accent)',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {cat.name}
            </div>
            <div className="space-y-1.5">
              {catItems.map((item) => (
                <ItemRow key={item.id} item={item} onChange={(d) => changeQty(item, d)} />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 italic" style={{ color: 'var(--ink-soft)' }}>
          Nothing matches.
        </div>
      )}

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center text-3xl font-light shadow-lg active:scale-95 transition z-10"
        style={{
          background: 'var(--accent)',
          color: 'var(--surface)',
          border: '3px solid var(--accent-2)',
        }}
      >
        +
      </button>

      {showAdd && (
        <AddItemModal categories={categories} onClose={() => setShowAdd(false)} onSubmit={addItem} />
      )}
    </div>
  );
}

function ItemRow({ item, onChange }: { item: Item; onChange: (delta: number) => void }) {
  const { theme } = useApp();
  const low = item.quantity <= item.low_threshold;
  const depleted = item.quantity === 0;

  return (
    <div
      className="grid items-center gap-3 p-3"
      style={{
        gridTemplateColumns: '1fr auto',
        background: depleted ? 'color-mix(in srgb, var(--danger) 10%, var(--surface))' : 'var(--surface)',
        border: `1px solid ${depleted ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
      }}
    >
      <div>
        <div className="font-medium" style={{ color: 'var(--ink)' }}>{item.name}</div>
        {depleted ? (
          <div className="text-xs italic" style={{ color: 'var(--danger)' }}>{theme.copy.depleted}</div>
        ) : low ? (
          <div className="text-xs italic" style={{ color: 'var(--danger)' }}>{theme.copy.lowStock}</div>
        ) : (
          <div className="text-xs italic" style={{ color: 'var(--ink-soft)' }}>
            {item.unit ? `${item.unit} on hand` : 'on hand'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
          style={{ background: 'var(--accent)', color: 'var(--surface)', border: '1px solid var(--accent-2)' }}
        >
          −
        </button>
        <div className="font-bold min-w-[2rem] text-center display" style={{ color: 'var(--accent)' }}>
          {item.quantity}
        </div>
        <button
          onClick={() => onChange(1)}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
          style={{ background: 'var(--accent)', color: 'var(--surface)', border: '1px solid var(--accent-2)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, ornament }: { title: string; subtitle: string; ornament: string }) {
  return (
    <div className="text-center mt-2 mb-4">
      <h2 className="display text-xl font-bold" style={{ color: 'var(--accent)' }}>
        {ornament} {title} {ornament}
      </h2>
      <p className="text-sm italic mt-1" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
    </div>
  );
}

function AddItemModal({
  categories, onClose, onSubmit,
}: { categories: Category[]; onClose: () => void; onSubmit: (form: FormData) => void }) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-30 p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
        className="w-full max-w-md p-5 space-y-3"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--accent-2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <h3 className="display text-lg font-bold text-center" style={{ color: 'var(--accent)' }}>Add Item</h3>

        <Field label="Name">
          <input name="name" required className="inp" autoFocus placeholder="e.g. Eggs" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Quantity">
            <input name="quantity" type="number" step="0.5" className="inp" defaultValue={1} />
          </Field>
          <Field label="Unit">
            <input name="unit" className="inp" placeholder="e.g. lb" />
          </Field>
        </div>

        <Field label="Category">
          <select name="category_id" className="inp" defaultValue={categories[0]?.id || ''}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Low threshold">
          <input name="low_threshold" type="number" step="0.5" className="inp" defaultValue={1} />
        </Field>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm uppercase tracking-wider" style={{ color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm uppercase tracking-wider font-semibold" style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}>Add</button>
        </div>

        <style jsx>{`
          .inp {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--ink);
            font-family: var(--font-body);
            border-radius: var(--radius);
            font-size: 0.95rem;
          }
          .inp:focus { outline: none; border-color: var(--accent); }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      {children}
    </label>
  );
}
