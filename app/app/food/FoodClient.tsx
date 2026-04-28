'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useApp } from '@/components/AppShell';
import KitchenClient from '../kitchen/KitchenClient';
import ShoppingClient from '../shopping/ShoppingClient';
import RecipesClient from '../recipes/RecipesClient';

type Tab = 'stock' | 'shopping' | 'recipes';

const VALID_TABS: Tab[] = ['stock', 'shopping', 'recipes'];
const SESSION_KEY = 'roost.food.lastTab';

export default function FoodClient({
  initialCategories, initialItems, initialShopping, initialRecipes, recipeInventory,
}: {
  initialCategories: any[];
  initialItems: any[];
  initialShopping: any[];
  initialRecipes: any[];
  recipeInventory: { name: string; quantity: number }[];
}) {
  const { theme } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine starting tab. Priority:
  //   1. ?tab= URL param (so deep links and bookmarks work)
  //   2. Session-remembered last tab
  //   3. Default 'stock'
  const initialTab: Tab = useMemo(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl && VALID_TABS.includes(fromUrl as Tab)) return fromUrl as Tab;
    if (typeof window !== 'undefined') {
      const fromSession = sessionStorage.getItem(SESSION_KEY);
      if (fromSession && VALID_TABS.includes(fromSession as Tab)) return fromSession as Tab;
    }
    return 'stock';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tab, setTab] = useState<Tab>(initialTab);

  // Whenever the tab changes, mirror it in the URL (replaceState — no history
  // entry, so the back button doesn't get cluttered) and remember in session.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, tab);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'stock') {
      params.delete('tab'); // stock is the default — keep URL clean
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, '', newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabLabels: Record<Tab, string> = {
    stock: theme.copy.stockTab,
    shopping: theme.copy.shoppingTab,
    recipes: theme.copy.recipesTab,
  };

  return (
    <div>
      {/* ===== Section heading ===== */}
      <div className="text-center mt-2 mb-3">
        <h2 className="display text-xl font-bold" style={{ color: 'var(--accent)' }}>
          {theme.copy.ornament} {theme.copy.food} {theme.copy.ornament}
        </h2>
        <p className="text-sm italic mt-1" style={{ color: 'var(--ink-soft)' }}>
          {theme.copy.foodSubtitle}
        </p>
      </div>

      {/* ===== Sub-tab strip ===== */}
      <div
        className="flex gap-1 p-1 mb-4"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
        role="tablist"
      >
        {VALID_TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className="flex-1 py-2 px-3 text-xs uppercase tracking-wider transition"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--surface)' : 'var(--ink-soft)',
                fontFamily: 'var(--font-mono)',
                fontWeight: active ? 600 : 400,
                borderRadius: 'var(--radius)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tabLabels[t]}
            </button>
          );
        })}
      </div>

      {/* ===== Active panel ===== */}
      {tab === 'stock' && (
        <KitchenClient
          initialCategories={initialCategories}
          initialItems={initialItems}
        />
      )}
      {tab === 'shopping' && (
        <ShoppingClient initialItems={initialShopping} />
      )}
      {tab === 'recipes' && (
        <RecipesClient
          initialRecipes={initialRecipes}
          inventoryItems={recipeInventory}
        />
      )}
    </div>
  );
}
