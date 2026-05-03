import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables, fallback is handled gracefully
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzsaqrugvwcxsqxdkaxs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6PIw8EsLlNhtz7SQqovzmw_dC4mKqTz';

if (!supabaseAnonKey || supabaseAnonKey === 'PLACEHOLDER_KEY') {
  console.warn(
    'Supabase API Key is missing. Please add VITE_SUPABASE_ANON_KEY to your environment variables in AI Studio (Settings > Environment Variables).'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'PLACEHOLDER_KEY'
);
