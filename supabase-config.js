// =====================================================================
// SUPABASE CONFIG — fill these in from Supabase Dashboard → Project Settings → API
// This file is loaded by index.html, login.html, and dashboard.html.
// The anon key is safe to expose publicly — it only allows what your
// Row Level Security policies in schema.sql allow.
// =====================================================================
const SUPABASE_URL = "https://oqptvdxnooyhkfszddsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gzvd1meo2JCyVMBr8GYHpA_BwnSfOsJ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =====================================================================
// SUPABASE CONFIG — fill these in from Supabase Dashboard → Project Settings → API
// This file is loaded by index.html, login.html, and dashboard.html.
// The anon key is safe to expose publicly — it only allows what your
// Row Level Security policies in schema.sql allow.
// =====================================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================================
// PEXELS_API_KEY — powers the real, free, commercially-licensed photos
// in the sliding showcase and hero section. Get a free key in ~2 minutes:
// 1. Go to https://www.pexels.com/api/
// 2. Sign up (no card needed) and click "Your API Key"
// 3. Paste it below.
// Pexels photos are free for commercial use, no attribution required.
// =====================================================================
const PEXELS_API_KEY = "sqzqhxhuv8KFmQyW6peN1e4l4C0lsmnnHYvfWyDUl05h41lK9InHW24H";
