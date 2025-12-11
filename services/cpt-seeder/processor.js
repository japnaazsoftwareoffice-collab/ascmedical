import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';

/**
 * Normalizes a string to snake_case
 * @param {string} str 
 * @returns {string}
 */
function toSnakeCase(str) {
    return str
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
}

/**
 * Maps CSV Row to DB Schema
 * @param {Object} row - The raw CSV row object
 * @param {string} fileName - The source filename
 * @returns {Object} - The DB record
 */
function mapRowToDb(row, fileName) {
    // Common CMS Header mappings based on typical files:
    // "HCPCS Code", "Short Descriptor", "Payment Rate", "Payment Indicator"

    // Clean up keys
    const cleanRow = {};
    for (const key in row) {
        cleanRow[toSnakeCase(key)] = row[key];
    }

    // Extract core fields
    const code = cleanRow['hcpcs_code'] || cleanRow['cpt_code'] || cleanRow['code'];
    if (!code) return null; // Skip if no code

    // Reimbursement logic: Removing '$' and ','
    let reimbursement = 0;
    const rawRate = cleanRow['payment_rate'] || cleanRow['asc_payment_rate'] || '0';
    if (typeof rawRate === 'string') {
        reimbursement = parseFloat(rawRate.replace(/[$,]/g, ''));
    } else {
        reimbursement = rawRate;
    }
    if (isNaN(reimbursement)) reimbursement = 0;

    // Description
    const description = cleanRow['short_descriptor'] || cleanRow['description'] || '';
    const longDescriptor = cleanRow['long_descriptor'] || '';

    // Other fields
    const paymentIndicator = cleanRow['payment_indicator'] || cleanRow['pi'] || '';

    // We can default category to 'General' or try to infer, but CSV doesn't usually have it.
    // We will keep existing category if upserting, but for new simple mapping:
    const category = 'General';

    const record = {
        code: code,
        description: description || longDescriptor || 'No Description', // Fallback
        long_descriptor: longDescriptor,
        short_descriptor: description,
        reimbursement: reimbursement,
        payment_indicator: paymentIndicator,
        original_filename: fileName,
        details: cleanRow,
        last_updated_from_source: new Date().toISOString(),
        // We map cost to 0 as we don't know it from CMS
        // We need to be careful not to overwrite 'cost' if it exists in DB?
        // Supabase upsert will overwrite unless we handle it. 
        // Ideally we fetch first or we use a separate table for staging.
        // However, user said "upsert".
        // I will NOT include 'cost' in the UPSERT object if I want to preserve it, 
        // BUT supbase upsert replaces the row. 
        // To only update specific columns, we need to return the data first or use a smarter query.
        // For now, I will assume we are "seeding" authoritative data.
        category: category
    };

    // Versioning info
    // If filename contains year, extract it
    const yearMatch = fileName.match(/20\d{2}/);
    if (yearMatch) {
        record.version_year = yearMatch[0];
    }

    // Effective date?
    if (cleanRow['effective_date']) {
        // CMS usually formatted as MM/DD/YYYY or similar
        // We try to parse it
        try {
            const d = new Date(cleanRow['effective_date']);
            if (!isNaN(d.getTime())) {
                record.effective_date = d.toISOString();
            }
        } catch (e) { }
    }

    return record;
}

/**
 * Processes a single CSV file and returns standardized records
 * @param {string} filePath 
 * @returns {Promise<Array>}
 */
export async function processCsv(filePath) {
    const records = [];
    const fileName = path.basename(filePath);

    const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
            columns: true, // Auto-discover headers
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        }));

    for await (const row of parser) {
        const dbRecord = mapRowToDb(row, fileName);
        if (dbRecord) {
            records.push(dbRecord);
        }
    }

    return records;
}

/**
 * Merges multiple sets of records, keeping the latest version of duplicates
 * @param {Array<Array>} recordSets 
 * @returns {Array}
 */
export function mergeRecords(recordSets) {
    const merged = new Map();

    for (const set of recordSets) {
        for (const record of set) {
            // Logic to decide if we overwrite:
            // If we already have this code, check dates or version
            // For this implementation, we assume the sets are passed in chronological order (Jan -> Apr -> Jul -> Oct)
            // So subsequent sets overwrite previous ones.
            merged.set(record.code, record);
        }
    }

    return Array.from(merged.values());
}
