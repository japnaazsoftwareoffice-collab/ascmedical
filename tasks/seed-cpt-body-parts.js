
import { createClient } from '@supabase/supabase-js';
import { CPT_MAPPING } from '../src/data/cpt_mapping.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HEURISTIC LOGIC (Mirrors CPTAutoUpdate.jsx with 'Other' default) ---
const getCategoryAndBodyPartFromCode = (code) => {
    const codeStr = String(code).toUpperCase().trim();

    // 1. Check Specific Map Override
    if (CPT_MAPPING[codeStr]) {
        const entry = CPT_MAPPING[codeStr];
        let parts = 'Other';
        let category = entry.category || 'Other';

        if (entry.bodyParts && Array.isArray(entry.bodyParts)) {
            parts = entry.bodyParts.join(' / ');
        } else if (entry.bodyPart) {
            parts = entry.bodyPart;
        }
        return { category, bodyPart: parts };
    }

    // Default Fallback
    const defaultRes = { category: 'Other', bodyPart: 'Other' };

    // 2. Emerging Technology (T-Codes)
    if (codeStr.endsWith('T')) return { category: 'Emerging Technology (T-Code)', bodyPart: 'Other' };
    if (codeStr.endsWith('F')) return { category: 'Performance Measurement', bodyPart: 'Other' };

    const c = parseInt(code);
    if (isNaN(c)) return defaultRes;

    // --- RANGE BASED LOGIC ---
    // Update logic to fallback to range heuristics if available, otherwise 'Other'

    // Anesthesiology
    if (c >= 100 && c <= 1999) return { category: 'Anesthesiology', bodyPart: 'Other' };

    // Integumentary
    if (c >= 19100 && c <= 19299) return { category: 'Breast Oncology', bodyPart: 'Breast' };
    if (c >= 10000 && c <= 19999) return { category: 'Plastic / Cosmetic', bodyPart: 'Skin / Soft Tissue' };

    // Musculoskeletal
    if (c >= 28000 && c <= 28899) return { category: 'Podiatry', bodyPart: 'Foot / Ankle' };
    if (c >= 20000 && c <= 29999) return { category: 'Orthopedics', bodyPart: 'Musculoskeletal' };

    // Respiratory & Cardiovascular
    if (c >= 30000 && c <= 32999) return { category: 'Otolaryngology (ENT)', bodyPart: 'Ear / Nose / Throat' };
    if (c >= 33000 && c <= 39999) return { category: 'Cardiology', bodyPart: 'Heart' };

    // Digestive
    if (c >= 40000 && c <= 49999) return { category: 'Gastroenterology', bodyPart: 'Stomach / Intestine' };

    // Urinary
    if (c >= 50000 && c <= 59999) return { category: 'Urology', bodyPart: 'Urinary System' };

    // Nervous System
    if (c >= 62000 && c <= 64999) return { category: 'Pain Management', bodyPart: 'Spine / Back' };
    if (c >= 60000 && c <= 64999) return { category: 'Neurology', bodyPart: 'Brain / Spine' };

    // Eye / Ear
    if (c >= 65000 && c <= 68999) return { category: 'Ophthalmology', bodyPart: 'Eyes' };
    if (c >= 69000 && c <= 69999) return { category: 'Otolaryngology (ENT)', bodyPart: 'Ear / Nose / Throat' };

    // Radiology / Pathology / Medicine
    if (c >= 70000 && c <= 79999) return { category: 'Radiology', bodyPart: 'Other' };
    if (c >= 80000 && c <= 89999) return { category: 'Pathology / Lab', bodyPart: 'Other' };
    if (c >= 90000 && c <= 99999) return { category: 'Evaluations / Medicine', bodyPart: 'Other' };

    return defaultRes;
};

const seedCPTBodyParts = async () => {
    console.log('🚀 Starting FULL CPT Analysis & Update...');

    // 1. Fetch ALL codes from DB
    console.log('📥 Fetching all existing codes from DB...');
    const { data: allCodes, error: fetchError } = await supabase
        .from('cpt_codes')
        .select('code, category, body_part');

    if (fetchError) {
        console.error('Error fetching codes:', fetchError);
        return;
    }

    console.log(`✅ Analyzng ${allCodes.length} codes against Map + Heuristics...`);

    // 2. Determine Updates
    const updates = [];

    for (const record of allCodes) {
        const logicResult = getCategoryAndBodyPartFromCode(record.code);

        // Update if existing data is missing or different from our source of truth
        let needsUpdate = false;

        // Logic: 
        // 1. If DB doesn't have body_part, update.
        // 2. If DB has different body_part, update (Enforce map consistency).
        // 3. If DB category is 'General' but we have a better one, update.
        // 4. If DB category is different from map, update.

        if (record.body_part !== logicResult.bodyPart) needsUpdate = true;
        if (record.category !== logicResult.category) needsUpdate = true;

        if (needsUpdate) {
            updates.push({
                code: record.code,
                category: logicResult.category,
                body_part: logicResult.bodyPart
            });
        }
    }

    if (updates.length === 0) {
        console.log('🎉 Database is already fully synced! No changes needed.');
        return;
    }

    console.log(`📝 Identified ${updates.length} records needing updates.`);

    // 3. Process updates in concurrent batches
    const BATCH_SIZE = 50;
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (u) => {
            const { error } = await supabase
                .from('cpt_codes')
                .update({
                    category: u.category,
                    body_part: u.body_part
                })
                .eq('code', u.code);

            if (error) {
                console.error(`❌ Error ${u.code}: ${error.message}`);
                errors++;
            } else {
                completed++;
            }
        }));

        process.stdout.write(`\r✅ Progress: ${completed}/${updates.length} (Errors: ${errors})`);
    }

    console.log(`\n\n🎉 Finished! Updated ${completed} records with smart mapping.`);
};

seedCPTBodyParts();
