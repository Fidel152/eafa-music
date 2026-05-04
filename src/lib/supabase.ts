import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzsaqrugvwcxsqxdkaxs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6PIw8EsLlNhtz7SQqovzmw_dC4mKqTz';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
