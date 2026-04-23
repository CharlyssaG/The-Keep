'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type Ingredient = { id: string; recipe_id: string; item_name: string; quantity: number; unit: string };
type Recipe = {
  id: string;
  household_id: string;
  title: string;
  description: string;
  prep_minutes: number;
  cook_minutes: number;
  serves: number;
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string;
  recipe_ingredients: Ingredient[];
};

type AiSuggestion = {
  name: string;
  pitch: string;
  ingredients: string[];
  steps: string[];
};

export default function RecipesClient({
  initialRecipes, inventoryItems,
}: { initialRecipes: Recipe[]; inventoryItems: { name: string; quantity: number }[] }) {
  const supabase = createClient();
  const { profile, theme, toast } = useApp();
  const [recipes, setRecipes] = useState(initialRecipes);
  const [open, setOpen] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Build a set of available ingredient names (case-insensitive, qty > 0)
  const available = useMemo(() => {
    const s = new Set<string>();
    inventoryItems.forEach((i) => { if (Number(i.quantity) > 0) s.add(i.name.toLowerCase()); });
    return s;
  }, [inventoryItems]);

  async function addRecipe(form: FormData) {
    const title = String(form.get('title') || '').trim();
    if (!title) { toast('Title required'); return; }
    const rawIng = String(form.get('ingredients') || '').trim();
    const ingredients = rawIng
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        // Parse "2 cups rice" or "1 lb ground beef" or just "Spinach"
        const m = line.match(/^(?:(\d*\.?\d+)\s+)?(?:(\w+)\s+)?(.+)$/);
        return {
          quantity: m?.[1] ? parseFloat(m[1]) : 1,
          unit: m?.[2] ?? '',
          item_name: (m?.[3] ?? line).trim(),
        };
      });

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        household_id: profile.household_id,
        title,
        description: String(form.get('description') || '').trim(),
        prep_minutes: parseInt(String(form.get('prep_minutes') || '0')) || 0,
        cook_minutes: parseInt(String(form.get('cook_minutes') || '0')) || 0,
        serves: parseInt(String(form.get('serves') || '2')) || 2,
        difficulty: String(form.get('difficulty') || 'easy') as any,
        instructions: String(form.get('instructions') || ''),
        created_by: profile.id,
      } as any)
      .select('*, recipe_ingredients(*)')
      .single();

    if (error || !recipe) { toast(error?.message || 'Failed'); return; }

    if (ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        ingredients.map((i) => ({ ...i, recipe_id: recipe.id })) as any
      );
    }

    // Refresh
    const { data: updated } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .order('created_at', { ascending: false });
    if (updated) setRecipes(updated);
    setShowAdd(false);
    toast('Recipe saved');
  }

  async function requestAiSuggestions() {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    try {
      const res = await fetch('/api/suggest-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || 'Something went wrong.');
      } else {
        setAiSuggestions(data.suggestions as AiSuggestion[]);
      }
    } catch (e: any) {
      setAiError(e.message || 'Network error');
    } finally {
      setAiLoading(false);
    }
  }

  async function saveSuggestionAsRecipe(s: AiSuggestion) {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        household_id: profile.household_id,
        title: s.name,
        description: s.pitch,
        prep_minutes: 10,
        cook_minutes: 20,
        serves: 2,
        difficulty: 'easy' as any,
        instructions: s.steps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
        created_by: profile.id,
      } as any)
      .select('*, recipe_ingredients(*)')
      .single();
    if (error || !recipe) { toast(error?.message || 'Failed to save'); return; }
    if (s.ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        s.ingredients.map((name) => ({
          recipe_id: recipe.id,
          item_name: name,
          quantity: 1,
          unit: '',
        })) as any
      );
    }
    const { data: updated } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .order('created_at', { ascending: false });
    if (updated) setRecipes(updated);
    toast('Saved to your recipes');
  }

  return (
    <div>
      <SectionHeading title={theme.copy.recipes} subtitle={theme.copy.recipesSubtitle} ornament={theme.copy.ornament} />

      <button
        onClick={requestAiSuggestions}
        disabled={aiLoading}
        className="w-full p-4 mb-5 text-left active:scale-[0.99] transition disabled:opacity-60"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          className="display font-bold flex items-center gap-2"
          style={{ color: 'var(--accent)' }}
        >
          <span>{theme.copy.ornament}</span>
          <span>{aiLoading ? theme.copy.aiThinking : theme.copy.aiSuggest}</span>
        </div>
        <div className="text-xs italic mt-1" style={{ color: 'var(--ink-soft)' }}>
          {theme.copy.aiSuggestSubtitle}
        </div>
      </button>

      {recipes.length === 0 ? (
        <div className="text-center py-12 italic" style={{ color: 'var(--ink-soft)' }}>
          No recipes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => {
            const isOpen = open === r.id;
            const missing = r.recipe_ingredients.filter(
              (ing) => !available.has(ing.item_name.toLowerCase())
            );
            const canCook = missing.length === 0;
            return (
              <div
                key={r.id}
                onClick={() => setOpen(isOpen ? null : r.id)}
                className="p-4 border cursor-pointer transition active:scale-[0.99]"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <h3 className="display font-bold" style={{ color: 'var(--accent)' }}>{r.title}</h3>
                {r.description && (
                  <p className="text-sm italic mt-1 mb-2" style={{ color: 'var(--ink-soft)' }}>{r.description}</p>
                )}
                <div
                  className="flex gap-3 text-xs mt-2"
                  style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}
                >
                  <span>{r.prep_minutes + r.cook_minutes}m</span>
                  <span>serves {r.serves}</span>
                  <span className="capitalize">{r.difficulty}</span>
                </div>
                <div
                  className="mt-2 text-xs uppercase tracking-wider font-semibold"
                  style={{
                    color: canCook ? 'var(--success)' : 'var(--danger)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {canCook
                    ? `✓ ${theme.copy.allIngredientsPresent}`
                    : `◈ ${theme.copy.missingIngredients(missing.length)}`}
                </div>

                {isOpen && (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: '1px dotted var(--border)' }}
                  >
                    <div
                      className="text-xs uppercase tracking-widest mb-2"
                      style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                    >
                      Ingredients
                    </div>
                    <ul className="space-y-1 text-sm mb-3">
                      {r.recipe_ingredients.map((ing) => {
                        const have = available.has(ing.item_name.toLowerCase());
                        return (
                          <li
                            key={ing.id}
                            style={{
                              color: have ? 'var(--ink)' : 'var(--danger)',
                              textDecoration: have ? 'none' : 'none',
                            }}
                          >
                            <span style={{ color: have ? 'var(--accent-2)' : 'var(--danger)' }}>
                              {have ? '❖' : '✗'}
                            </span>{' '}
                            {ing.quantity} {ing.unit} {ing.item_name}
                          </li>
                        );
                      })}
                    </ul>
                    {r.instructions && (
                      <>
                        <div
                          className="text-xs uppercase tracking-widest mb-2"
                          style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                        >
                          Instructions
                        </div>
                        <pre
                          className="text-sm whitespace-pre-wrap"
                          style={{ fontFamily: 'var(--font-body)', color: 'var(--ink)' }}
                        >
                          {r.instructions}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

      {showAdd && <AddRecipeModal onClose={() => setShowAdd(false)} onSubmit={addRecipe} />}

      {(aiSuggestions || aiError) && (
        <AiSuggestionsModal
          suggestions={aiSuggestions}
          error={aiError}
          onClose={() => { setAiSuggestions(null); setAiError(null); }}
          onSave={saveSuggestionAsRecipe}
        />
      )}
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

function AddRecipeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: FormData) => void }) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-30 p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
        className="w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--accent-2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <h3 className="display text-lg font-bold text-center" style={{ color: 'var(--accent)' }}>New Recipe</h3>

        <Field label="Title"><input name="title" required className="inp" /></Field>
        <Field label="Description"><textarea name="description" rows={2} className="inp" /></Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Prep (m)"><input name="prep_minutes" type="number" className="inp" defaultValue={10} /></Field>
          <Field label="Cook (m)"><input name="cook_minutes" type="number" className="inp" defaultValue={20} /></Field>
          <Field label="Serves"><input name="serves" type="number" className="inp" defaultValue={2} /></Field>
        </div>

        <Field label="Difficulty">
          <select name="difficulty" className="inp" defaultValue="easy">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>

        <Field label="Ingredients (one per line, e.g. '2 cups rice')">
          <textarea name="ingredients" rows={5} className="inp font-mono text-sm" placeholder="1 lb Ground Beef&#10;1 Onion&#10;3 cloves Garlic" />
        </Field>

        <Field label="Instructions">
          <textarea name="instructions" rows={4} className="inp" placeholder="1. Brown beef...&#10;2. Add vegetables..." />
        </Field>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm uppercase tracking-wider" style={{ color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm uppercase tracking-wider font-semibold" style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}>Save</button>
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

function AiSuggestionsModal({
  suggestions, error, onClose, onSave,
}: {
  suggestions: AiSuggestion[] | null;
  error: string | null;
  onClose: () => void;
  onSave: (s: AiSuggestion) => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-30 p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--accent-2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="display text-lg font-bold" style={{ color: 'var(--accent)' }}>
            Suggestions
          </h3>
          <button onClick={onClose} style={{ color: 'var(--ink-soft)', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div className="text-sm p-3" style={{ background: 'color-mix(in srgb, var(--danger) 15%, var(--surface))', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {suggestions && suggestions.length === 0 && (
          <div className="text-sm italic" style={{ color: 'var(--ink-soft)' }}>
            No ideas this time. Try again with different items in stock.
          </div>
        )}

        {suggestions && suggestions.map((s, idx) => (
          <div
            key={idx}
            className="p-4"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div className="display font-bold" style={{ color: 'var(--accent)' }}>{s.name}</div>
            <div className="text-sm italic mt-1 mb-2" style={{ color: 'var(--ink-soft)' }}>{s.pitch}</div>

            {s.ingredients && s.ingredients.length > 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Uses</div>
                <div className="text-sm mb-3" style={{ color: 'var(--ink)' }}>
                  {s.ingredients.join(' · ')}
                </div>
              </>
            )}

            {s.steps && s.steps.length > 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Steps</div>
                <ol className="text-sm space-y-1 list-decimal list-inside mb-3" style={{ color: 'var(--ink)' }}>
                  {s.steps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </>
            )}

            <button
              onClick={() => onSave(s)}
              className="w-full py-2 text-xs uppercase tracking-wider font-semibold"
              style={{
                background: 'var(--accent)',
                color: 'var(--surface)',
                borderRadius: 'var(--radius)',
              }}
            >
              Save as recipe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
