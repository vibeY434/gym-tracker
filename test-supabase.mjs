import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

console.log('Supabase URL configured:', true);
console.log('Supabase key configured:', true);

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('gt_sessions').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
