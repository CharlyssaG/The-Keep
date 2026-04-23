'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type ShoppingRow = {
  id: string;
  household_id: string;
  item_name: string;
  quantity: string;
  notes: string;
  added_by: string | null;
  added_at: string;
  checked_at: string | null;
  checked_by: string | null;
  source_item_id: string | null;
  category: string;
  added_by_profile?: { display_name: string; avatar_glyph: string } | null;
  checked_by_profile?: { display_name: string } | null;
};

export default function ShoppingClient({ initialItems }: { initialItems: ShoppingRow[] }) {
  const supabase = createClient();
  const { profile, theme, toast } = useApp();
  const [items, setItems] = useState<ShoppingRow[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('shopping-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, async () => {
        const { data } = await supabase
          .from('shopping_list')
          .select('*, added_by_profile:added_by(display_name, avatar_glyph), checked_by_profile:checked_by(display_name)')
          .order('checked_at', { ascending: true, nullsFirst: true })
          .order('added_at', { ascending: false });
        if (data) setItems(data as any);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const open = items.filter((i) => !i.checked_at);
  const done = items.filter((i) => !!i.checked_at);

  async function toggleCheck(row: ShoppingRow) {
    const nowChecked = !row.checked_at;
    const { error } = await supabase
      .from('shopping_list')
      .update({
        checked_at: nowChecked ? new Date().toISOString() : null,
        checked_by: nowChecked ? profile.id : null,
      } as any)
      .eq('id', row.id);
    if (error) { toast(error.message); return; }

    // If we're checking off an auto-added item, restock the source inventory item.
    if (nowChecked && row.source_item_id) {
      // Fetch current to get threshold
      const { data: srcItem } = await supabase
        .from('inventory_items')
        .select('id, quantity, low_threshold')
        .eq('id', row.source_item_id)
        .maybeSingle();
      if (srcItem) {
        const restockTo = Math.max(1, (srcItem.low_threshold ?? 1) + 1);
        await supabase
          .from('inventory_items')
          .update({
            quantity: restockTo,
            updated_at: new Date().toISOString(),
            updated_by: profile.id,
          } as any)
          .eq('id', srcItem.id);
      }
    }
  }

  async function clearCompleted() {
    if (done.length === 0) return;
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .not('checked_at', 'is', null);
    if (error) toast(error.message);
  }

  async function addItem(form: FormData) {
    const item_name = String(form.get('item_name') || '').trim();
    if (!item_name) { toast('Name required'); return; }
    const payload = {
      household_id: profile.household_id,
      item_name,
      quantity: String(form.get('quantity') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
      category: String(form.get('category') || '').trim(),
      added_by: profile.id,
    };
    const { error } = await supabase.from('shopping_list').insert(payload as any);
    if (error) { toast(error.message); return; }
    setShowAdd(false);
  }

  async function removeRow(row: ShoppingRow) {
    const { error } = await supabase.from('shopping_list').delete().eq('id', row.id);
    if (error) toast(error.message);
  }

  return (
    <div>
      <SectionHeading title={theme.copy.shopping} subtitle={theme.copy.shoppingSubtitle} ornament={theme.copy.ornament} />

      {open.length === 0 && done.length === 0 ? (
        <div className="text-center py-16 italic" style={{ color: 'var(--ink-soft)' }}>
          {theme.copy.shoppingEmpty}
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {open.map((row) => (
                <Row key={row.id} row={row} onToggle={() => toggleCheck(row)} onRemove={() => removeRow(row)} />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div>
              <div
                className="flex items-center justify-between text-xs uppercase tracking-widest pb-1 mb-2"
                style={{ color: 'var(--ink-soft)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}
              >
                <span>In the cart</span>
                <button
                  onClick={clearCompleted}
                  className="text-[11px] normal-case underline"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  clear
                </button>
              </div>
              <div className="space-y-1.5 opacity-70">
                {done.map((row) => (
                  <Row key={row.id} row={row} onToggle={() => toggleCheck(row)} onRemove={() => removeRow(row)} />
                ))}
              </div>
            </div>
          )}
        </>
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

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSubmit={addItem} />}
    </div>
  );
}

function Row({ row, onToggle, onRemove }: { row: ShoppingRow; onToggle: () => void; onRemove: () => void }) {
  const checked = !!row.checked_at;
  return (
    <div
      className="grid items-center gap-3 p-3"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-7 h-7 rounded-sm flex items-center justify-center"
        style={{
          background: checked ? 'var(--accent)' : 'transparent',
          color: 'var(--surface)',
          border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
          fontWeight: 'bold',
        }}
        aria-label={checked ? 'Uncheck' : 'Check off'}
      >
        {checked && '✓'}
      </button>

      <div>
        <div
          className="font-medium"
          style={{
            color: 'var(--ink)',
            textDecoration: checked ? 'line-through' : 'none',
          }}
        >
          {row.item_name}
          {row.quantity && <span style={{ color: 'var(--ink-soft)' }}> · {row.quantity}</span>}
        </div>
        {(row.notes || row.category || row.added_by_profile) && (
          <div className="text-xs italic flex gap-2" style={{ color: 'var(--ink-soft)' }}>
            {row.category && <span>{row.category}</span>}
            {row.notes && <span>— {row.notes}</span>}
            {row.added_by_profile && <span>· {row.added_by_profile.display_name}</span>}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center"
        style={{ color: 'var(--ink-soft)', fontSize: '1.1rem' }}
        aria-label="Remove"
      >
        ×
      </button>
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

function AddModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (f: FormData) => void }) {
  const { theme } = useApp();
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
        <h3 className="display text-lg font-bold text-center" style={{ color: 'var(--accent)' }}>
          {theme.copy.addToShopping}
        </h3>

        <Field label="Item">
          <input name="item_name" required autoFocus className="inp" placeholder="e.g. Toilet paper" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Quantity">
            <input name="quantity" className="inp" placeholder="optional" />
          </Field>
          <Field label="Category">
            <input name="category" className="inp" placeholder="optional" />
          </Field>
        </div>

        <Field label="Notes">
          <input name="notes" className="inp" placeholder="brand, aisle, etc." />
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
