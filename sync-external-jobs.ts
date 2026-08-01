// supabase/functions/sync-external-jobs/index.ts
//
// Pulls live vacancies from an external job API (Jooble by default — free,
// no card required: https://jooble.org/api/about) and upserts them into the
// `jobs` table. The site's script.js already renders straight from `jobs`,
// and (with the realtime patch) refreshes itself the moment this writes.
//
// Deploy:   supabase functions deploy sync-external-jobs --no-verify-jwt
// Secrets:  supabase secrets set JOOBLE_API_KEY=your-key-from-jooble.org/api/about
//           (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-available)
//
// Swap-in note: to use a different provider (JSearch/RapidAPI, Adzuna, Careerjet…)
// only the `fetchFromSource()` function needs to change — everything else
// (upsert, dedupe, dead-listing cleanup) stays the same.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JOOBLE_API_KEY = Deno.env.get("JOOBLE_API_KEY")!;
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// One search per destination/role combo you want kept fresh. Add or remove freely —
// this list IS your vacancy strategy.
const SEARCH_QUERIES: { keywords: string; location: string; category: string; country: string }[] = [
  { keywords: "nurse",             location: "United Arab Emirates", category: "Healthcare",  country: "UAE" },
  { keywords: "civil engineer",    location: "Saudi Arabia",         category: "Construction", country: "Saudi Arabia" },
  { keywords: "chef",              location: "Qatar",                category: "Hospitality",  country: "Qatar" },
  { keywords: "software developer",location: "United Kingdom",       category: "IT",           country: "United Kingdom" },
  { keywords: "teacher",           location: "Germany",              category: "Education",    country: "Germany" },
  { keywords: "logistics",         location: "United Arab Emirates", category: "Logistics",    country: "UAE" },
  { keywords: "financial analyst", location: "Singapore",            category: "Finance",      country: "Singapore" },
  { keywords: "welder",            location: "Qatar",                category: "Construction", country: "Qatar" },
];

const CATEGORY_ICON: Record<string, string> = {
  Healthcare: "🏥", Construction: "🏗️", Hospitality: "🍽️", IT: "💻",
  Education: "📚", Logistics: "🚢", Finance: "📊", Domestic: "🏡",
};

async function fetchFromSource(keywords: string, location: string) {
  const res = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, location }),
  });
  if (!res.ok) throw new Error(`Jooble ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.jobs || []) as any[];
}

function pickBadge(index: number) {
  if (index === 0) return "hot";
  if (index < 3) return "new";
  return "featured";
}

Deno.serve(async () => {
  let inserted = 0, updated = 0;
  const errors: string[] = [];

  for (const q of SEARCH_QUERIES) {
    try {
      const jobs = await fetchFromSource(q.keywords, q.location);

      for (const [i, j] of jobs.slice(0, 8).entries()) {
        const row = {
          external_id: String(j.id),
          source: "jooble",
          title: j.title,
          company: j.company || "Confidential",
          location: j.location || q.location,
          country: q.country,
          category: q.category,
          salary: j.salary || "Negotiable — inquire",
          job_type: j.type || "Full-time",
          badge: pickBadge(i),
          icon: CATEGORY_ICON[q.category] || "💼",
          slots: 1,
          apply_url: j.link,
          active: true,
          updated_at: new Date().toISOString(),
        };

        const { data: existing } = await supabaseAdmin
          .from("jobs").select("id").eq("external_id", row.external_id).maybeSingle();

        if (existing) {
          await supabaseAdmin.from("jobs").update(row).eq("id", existing.id);
          updated++;
        } else {
          await supabaseAdmin.from("jobs").insert(row);
          inserted++;
        }
      }
    } catch (err) {
      errors.push(`${q.keywords}/${q.location}: ${(err as Error).message}`);
    }
  }

  // Retire external listings nobody has refreshed in 14 days (never touches source:'manual' rows)
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("jobs")
    .update({ active: false })
    .neq("source", "manual")
    .lt("updated_at", cutoff);

  return new Response(JSON.stringify({ inserted, updated, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
