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
