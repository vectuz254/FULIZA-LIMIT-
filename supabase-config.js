// =====================================================================
// SUPABASE CONFIG — fill these in from Supabase Dashboard → Project Settings → API
// This file is loaded by index.html, login.html, and dashboard.html.
// The anon key is safe to expose publicly — it only allows what your
// Row Level Security policies in schema.sql allow.
// =====================================================================
const SUPABASE_URL = "https://oqptvdxnooyhkfszddsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gzvd1meo2JCyVMBr8GYHpA_BwnSfOsJ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
