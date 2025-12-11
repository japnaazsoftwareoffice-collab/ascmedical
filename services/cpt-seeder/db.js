import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file or local .env
dotenv.config({ path: path.resolve('../../.env') });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Stats: Supabase URL or Key missing in environment variables.");
  // We don't exit here to allow testing without DB if needed, but in production it will fail
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function upsertCptCodes(records) {
  if (!records || records.length === 0) return { count: 0, error: null };

  // Helper to chunk the inserts because Supabase/Postgres has limits
  const CHUNK_SIZE = 1000;
  let totalUpserted = 0;
  
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    
    const { data, error } = await supabase
      .from('cpt_codes')
      .upsert(chunk, { 
        onConflict: 'code',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`❌ Error upserting chunk ${i/CHUNK_SIZE + 1}:`, error);
      return { count: totalUpserted, error };
    }
    
    totalUpserted += chunk.length;
    console.log(`✅ Upserted batch ${i/CHUNK_SIZE + 1} (${chunk.length} records)`);
  }

  return { count: totalUpserted, error: null };
}
