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
export const calculateORCost = (durationMinutes) => {
    if (!durationMinutes || durationMinutes <= 0) return 0;

    // Base rate: $1500 for the first hour (0-60 mins)
    let cost = 1500;

    if (durationMinutes <= 60) {
        return cost;
    }

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

// Format currency
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};
