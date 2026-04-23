import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/suggest-recipes
// Reads the household's current inventory (items with quantity > 0)
// and asks Claude for 3 recipe suggestions based on what's on hand.
//
// Requires ANTHROPIC_API_KEY in environment variables.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI is not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.' },
      { status: 500 },
    );
  }

  const supabase = createClient();

  // Who's asking? (for auth — RLS scopes to their household)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Optional body: { preference?: string } — e.g. "quick dinner", "vegetarian"
  let preference = '';
  try {
    const body = await req.json();
    preference = typeof body?.preference === 'string' ? body.preference.slice(0, 200) : '';
  } catch { /* no body, fine */ }

  // Pull current inventory — only things we actually have
  const { data: items, error: invErr } = await supabase
    .from('inventory_items')
    .select('name, quantity, unit, category_id')
    .gt('quantity', 0);

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Nothing is in stock to cook with.' }, { status: 400 });
  }

  // Also grab categories for context
  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('id, name');
  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  // Group items by category for a cleaner prompt
  const byCategory: Record<string, string[]> = {};
  for (const it of items) {
    const cat = catMap.get(it.category_id ?? '') || 'Other';
    if (cat === 'Pets') continue; // never suggest cooking with pet food!
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(it.name);
  }

  const inventorySummary = Object.entries(byCategory)
    .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
    .join('\n');

  const userPrompt =
`Here is what we have in the kitchen right now:

${inventorySummary}

${preference ? `The person asking wants: ${preference}\n\n` : ''}Suggest 3 realistic meals or dishes we can make RIGHT NOW using mostly what we already have. For each suggestion, return:
- a short dish name
- a one-sentence pitch
- the main ingredients used (from the list above)
- up to 3 short prep steps

Respond with ONLY a JSON array — no preamble, no markdown fences. Exact shape:
[
  {
    "name": "string",
    "pitch": "string",
    "ingredients": ["string", "..."],
    "steps": ["string", "..."]
  },
  ...
]

Assume salt, pepper, water, and basic heat (stove/oven) are available. Prefer dishes that use several items from the list. Don't invent ingredients we don't have.`;

  // Call Anthropic
  let aiResponse: Response;
  try {
    aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1400,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Network error reaching AI: ${e.message}` }, { status: 502 });
  }

  if (!aiResponse.ok) {
    const text = await aiResponse.text().catch(() => '');
    return NextResponse.json(
      { error: `AI request failed (${aiResponse.status}). ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const data = await aiResponse.json();
  const textBlocks = (data?.content ?? []) as Array<{ type: string; text?: string }>;
  const raw = textBlocks.filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();

  // Strip accidental markdown fences if they sneak in
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

  let suggestions: any;
  try {
    suggestions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'AI returned something we couldn\'t parse. Try again in a moment.', raw: cleaned.slice(0, 400) },
      { status: 502 },
    );
  }

  if (!Array.isArray(suggestions)) {
    return NextResponse.json({ error: 'AI response was not a list.' }, { status: 502 });
  }

  return NextResponse.json({ suggestions });
}
