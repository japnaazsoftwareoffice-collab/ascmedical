// Utility function to format surgeon name as "Dr. LastName FirstName"
export const formatSurgeonName = (surgeon) => {
    if (!surgeon) return 'Unknown';

    // Handle both new format (firstname, lastname) and old format (name)
    if (surgeon.firstname && surgeon.lastname) {
        return `Dr. ${surgeon.lastname} ${surgeon.firstname}`;
    } else if (surgeon.first_name && surgeon.last_name) {
        return `Dr. ${surgeon.last_name} ${surgeon.first_name}`;
    } else if (surgeon.name) {
        // Fallback for old format - try to parse
        const nameParts = surgeon.name.replace(/^Dr\.?\s*/i, '').trim().split(' ');
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            return `Dr. ${lastName} ${firstName}`;
        }
        return surgeon.name.startsWith('Dr.') ? surgeon.name : `Dr. ${surgeon.name}`;
    }

    return 'Unknown';
};

// Calculate OR cost based on duration
// Calculate OR cost based on duration
export const calculateORCost = (durationMinutes) => {
    if (!durationMinutes || durationMinutes <= 0) return 0;

    let cost = 0;

    if (durationMinutes <= 60) {
        // Proportional rate for first hour: $1500 / 60 min = $25 per minute
        // 15 min = $375
        // 30 min = $750
        // 45 min = $1125
        // 60 min = $1500
        return durationMinutes * 25;
    }

    // Base rate for first full hour
    cost = 1500;

    // Remaining minutes after first hour
    let remainingMinutes = durationMinutes - 60;

    // Next 60 minutes (up to 2 hours total): $300 for each additional 30 minutes
    // This means 61-90 mins = +$300, 91-120 mins = +$600
    const secondHourMinutes = Math.min(remainingMinutes, 60);
    const secondHourBlocks = Math.ceil(secondHourMinutes / 30);
    cost += secondHourBlocks * 300;

    remainingMinutes -= secondHourMinutes;

    if (remainingMinutes > 0) {
        // After 2 hours: $400 for each additional 30 minutes
        const additionalBlocks = Math.ceil(remainingMinutes / 30);
        cost += additionalBlocks * 400;
    }

    return cost;
};

// Calculate Medicare revenue with MPPR (Multiple Procedure Payment Reduction)
// Pays 100% for highest-value code, 50% for all subsequent codes
export const calculateMedicareRevenue = (cptCodesArray, cptDatabase, applyMPPR = false) => {
    if (!cptCodesArray || cptCodesArray.length === 0) return 0;

    // Get full CPT code objects with reimbursement values
    const cptObjects = cptCodesArray
        .map(code => cptDatabase.find(c => c.code === code))
        .filter(Boolean); // Remove any not found

    if (cptObjects.length === 0) return 0;

    // If MPPR is disabled, return simple sum
    if (!applyMPPR) {
        return cptObjects.reduce((sum, cpt) => sum + (cpt.reimbursement || 0), 0);
    }

    // Sort by reimbursement value (highest first) for MPPR
    const sortedCpts = [...cptObjects].sort((a, b) =>
        (b.reimbursement || 0) - (a.reimbursement || 0)
    );

    // Calculate total with MPPR
    let totalRevenue = 0;

    sortedCpts.forEach((cpt, index) => {
        if (index === 0) {
            // First (highest value) code gets 100%
            totalRevenue += cpt.reimbursement || 0;
        } else {
            // All subsequent codes get 50%
            totalRevenue += (cpt.reimbursement || 0) * 0.5;
        }
    });

    return totalRevenue;
};

// Calculate labor cost based on duration and complexity
// Calculate labor cost based on duration (Standard: 30% of OR Cost)
export const calculateLaborCost = (durationMinutes) => {
    if (!durationMinutes || durationMinutes <= 0) return 0;

    // Get OR Cost
    const orCost = calculateORCost(durationMinutes);

    // Return 30% of OR Cost
    return orCost * 0.3;
};

// Format currency
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};
// Calculate all metrics for a surgery consistently across the app
export const getSurgeryMetrics = (surgery, cptCodes, settings = {}, procedureGroupItems = []) => {
    const isCosmetic = !surgery.cpt_codes || surgery.cpt_codes.length === 0;
    let cptTotal = 0;
    let orCost = 0; // Billable Facility Fee
    let internalRoomCost = 0;
    let laborCost = 0;
    let totalValue = 0;
    let netProfit = 0;
    let anesthesiaExtra = 0;

    // 1. Calculate Supply Costs with fallback for old records
    let supplyCosts = (parseFloat(surgery.supplies_cost) || 0) +
        (parseFloat(surgery.implants_cost) || 0) +
        (parseFloat(surgery.medications_cost) || 0);

    // Fallback: If no supplies cost but CPT codes exist, try to infer from procedure group
    if (supplyCosts === 0 && !isCosmetic && surgery.cpt_codes && surgery.cpt_codes.length > 0) {
        let inferedGroup = '';
        for (const code of surgery.cpt_codes) {
            const cpt = cptCodes.find(c => String(c.code) === String(code));
            if (cpt && cpt.procedure_group) {
                inferedGroup = cpt.procedure_group;
                break;
            }
        }
        if (inferedGroup && procedureGroupItems.length > 0) {
            const groupItems = procedureGroupItems.filter(i => i.procedure_group === inferedGroup);
            supplyCosts = groupItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity_per_case || 0)), 0);
        }
    }

    const duration = parseInt(surgery.duration_minutes || surgery.durationMinutes || 0);
    const turnover = parseInt(surgery.turnover_time || surgery.turnoverTime || 0);

    if (isCosmetic) {
        // Parse cosmetic fees from notes
        if (surgery.notes) {
            const facilityMatch = surgery.notes.match(/(?:Facility |Cosmetic )?Fee:?\s*\$?\s*([\d,.]+)/i);
            const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);
            const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
            const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;

            orCost = facilityFee + anesthesiaFee;
            internalRoomCost = calculateORCost(duration + turnover);
            laborCost = calculateLaborCost(duration + turnover);
            totalValue = orCost + supplyCosts;
            netProfit = totalValue - (internalRoomCost + laborCost + supplyCosts);
        }
    } else {
        cptTotal = calculateMedicareRevenue(surgery.cpt_codes || surgery.cptCodes || [], cptCodes, settings?.apply_medicare_mppr || false);
        orCost = calculateORCost(duration); // Billable duration only
        internalRoomCost = calculateORCost(duration + turnover); // Full room usage cost

        if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
            const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
            if (match) {
                anesthesiaExtra = parseFloat(match[2].replace(/,/g, ''));
            }
        }
        orCost += anesthesiaExtra;
        laborCost = calculateLaborCost(duration + turnover);
        totalValue = cptTotal + orCost + supplyCosts;
        netProfit = totalValue - (internalRoomCost + laborCost + supplyCosts + anesthesiaExtra);
    }

    return {
        cptRevenue: cptTotal,
        facilityRevenue: orCost,
        totalRevenue: totalValue,
        netProfit,
        supplyCosts,
        internalRoomCost,
        laborCost,
        isCosmetic
    };
};
