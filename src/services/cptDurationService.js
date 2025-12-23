// Gemini AI Service to fetch surgical durations for CPT codes
// This uses Gemini to search medical databases and estimate realistic surgical times

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Fetch realistic surgical duration for a CPT code using Gemini AI
 * @param {string} cptCode - The CPT code (e.g., "27130")
 * @param {string} description - The procedure description
 * @param {string} category - The specialty category
 * @returns {Promise<number>} - Estimated duration in minutes
 */
export async function fetchCPTDuration(cptCode, description, category) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `You are a medical coding expert. Based on industry standards and typical ASC (Ambulatory Surgery Center) surgical times, provide the AVERAGE surgical duration in minutes for this procedure:

CPT Code: ${cptCode}
Description: ${description}
Category: ${category}

Consider:
- Typical ASC surgical times (not hospital times)
- Industry averages from Medicare data
- Standard procedure duration including prep and closure
- Exclude pre-op and post-op recovery time
- Include only actual surgical time

Respond with ONLY a number (the duration in minutes). No explanation, just the number.

Examples:
- Total Hip Replacement (27130): 120
- Colonoscopy (45378): 35
- Carpal Tunnel Release (64721): 20
- Cataract Surgery (66984): 25

Your response (number only):`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Extract number from response
        const duration = parseInt(text);

        // Validate duration (must be between 5 and 480 minutes)
        if (isNaN(duration) || duration < 5 || duration > 480) {
            console.warn(`Invalid duration for ${cptCode}: ${text}, using default 60`);
            return 60;
        }

        return duration;
    } catch (error) {
        console.error(`Error fetching duration for ${cptCode}:`, error);
        return 60; // Default fallback
    }
}

/**
 * Batch fetch durations for multiple CPT codes with rate limiting
 * @param {Array} cptCodes - Array of {code, description, category}
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Map of code -> duration
 */
export async function batchFetchCPTDurations(cptCodes, onProgress = null) {
    const durations = {};
    const batchSize = 10; // Process 10 at a time
    const delayMs = 1000; // 1 second delay between batches

    for (let i = 0; i < cptCodes.length; i += batchSize) {
        const batch = cptCodes.slice(i, i + batchSize);

        // Process batch in parallel
        const promises = batch.map(cpt =>
            fetchCPTDuration(cpt.code, cpt.description, cpt.category)
                .then(duration => ({ code: cpt.code, duration }))
        );

        const results = await Promise.all(promises);

        // Store results
        results.forEach(({ code, duration }) => {
            durations[code] = duration;
        });

        // Progress callback
        if (onProgress) {
            const progress = Math.min(100, Math.round(((i + batch.length) / cptCodes.length) * 100));
            onProgress(progress, i + batch.length, cptCodes.length);
        }

        // Rate limiting delay (except for last batch)
        if (i + batchSize < cptCodes.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return durations;
}

/**
 * Generate SQL UPDATE statements for Supabase
 * @param {Object} durations - Map of code -> duration
 * @returns {string} - SQL statements
 */
export function generateDurationSQL(durations) {
    let sql = '-- Auto-generated CPT duration updates\n\n';

    Object.entries(durations).forEach(([code, duration]) => {
        sql += `UPDATE cpt_codes SET average_duration = ${duration} WHERE code = '${code}';\n`;
    });

    return sql;
}

/**
 * Category-based duration estimates (fallback if Gemini fails)
 */
export const CATEGORY_DURATION_ESTIMATES = {
    'Orthopedics': {
        'Joint Replacement': 120,
        'Spine': 150,
        'Arthroscopy': 60,
        'Fracture Repair': 90,
        'Hand/Wrist': 45,
        'Foot/Ankle': 60,
        'Minor': 30,
        'default': 75
    },
    'Gastroenterology': {
        'Endoscopy': 35,
        'Colonoscopy': 40,
        'default': 35
    },
    'Ophthalmology': {
        'Cataract': 25,
        'Retinal': 60,
        'default': 40
    },
    'General': {
        'Major': 75,
        'Minor': 30,
        'default': 45
    },
    'Cardiology': {
        'default': 60
    },
    'Urology': {
        'default': 50
    },
    'ENT': {
        'default': 45
    },
    'Plastic Surgery': {
        'default': 90
    },
    'Pain Management': {
        'default': 30
    },
    'Podiatry': {
        'default': 45
    },
    'default': 60
};

/**
 * Estimate duration based on category and description (fallback)
 * @param {string} description - Procedure description
 * @param {string} category - Specialty category
 * @returns {number} - Estimated duration in minutes
 */
export function estimateDurationByCategory(description, category) {
    const categoryEstimates = CATEGORY_DURATION_ESTIMATES[category] || CATEGORY_DURATION_ESTIMATES.default;

    // Try to match keywords in description
    const descLower = description.toLowerCase();

    if (category === 'Orthopedics') {
        if (descLower.includes('replacement') || descLower.includes('arthroplasty')) return 120;
        if (descLower.includes('fusion') || descLower.includes('spine')) return 150;
        if (descLower.includes('arthroscopy')) return 60;
        if (descLower.includes('orif') || descLower.includes('fracture')) return 90;
        if (descLower.includes('carpal') || descLower.includes('trigger')) return 20;
    }

    if (category === 'Gastroenterology') {
        if (descLower.includes('colonoscopy')) return 40;
        if (descLower.includes('egd') || descLower.includes('endoscopy')) return 30;
    }

    if (category === 'Ophthalmology') {
        if (descLower.includes('cataract')) return 25;
        if (descLower.includes('vitrectomy')) return 60;
    }

    return categoryEstimates.default || 60;
}
