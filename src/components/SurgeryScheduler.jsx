import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import { calculateORCost, calculateMedicareRevenue, formatCurrency, calculateLaborCost } from '../utils/hospitalUtils';
import ORBlockSchedule from './ORBlockSchedule';
import './Management.css';

// Cosmetic fee calculator based on duration
const calculateCosmeticFees = (durationMinutes, isPlastic = false) => {
    // CSC Facility Fee rates
    const facilityRates = {
        30: 750, 60: 1500, 90: 1800, 120: 2100, 150: 2500,
        180: 2900, 210: 3300, 240: 3700, 270: 4100, 300: 4500,
        330: 4900, 360: 5300, 390: 5700, 420: 6100, 480: 6500, 540: 6900
    };

    // Quantum Anesthesia rates
    const anesthesiaRates = {
        30: 600, 60: 750, 90: 900, 120: 1050, 150: 1200,
        180: 1350, 210: 1500, 240: 1650, 270: 1800, 300: 1950,
        330: 2100, 360: 2250, 390: 2400, 420: 2550, 480: 2700, 540: 2850
    };

    // Round up to nearest 30 minutes for fee lookup
    const lookupDuration = Math.ceil(durationMinutes / 30) * 30;

    return {
        facilityFee: facilityRates[lookupDuration] || 0,
        anesthesiaFee: isPlastic ? 0 : (anesthesiaRates[lookupDuration] || 0)
    };
};

const selfPayRates = [
    { name: 'Cataracts x 1', price: 400 },
    { name: 'Colonoscopy', price: 500 },
    { name: 'EGD/Colonoscopy', price: 650 },
    { name: 'Blocks and/or Ultrasound x 1', price: 500 },
    { name: 'ACL Repair', price: 3000 },
    { name: 'Total Hip', price: 3200 },
    { name: 'Total Knee', price: 3400 },
    { name: 'Total Shoulder', price: 3200 }
];

const SurgeryScheduler = ({ patients, surgeons, cptCodes, surgeries = [], settings, procedureGroupItems = [], onSchedule, onUpdate, onDelete, onComplete }) => {
    // Initial fees for default 60 mins
    const initialFees = calculateCosmeticFees(60);

    const [formData, setFormData] = useState({
        patientId: '',
        doctorName: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        durationMinutes: 60,
        selectedCptCodes: [],
        cosmeticFacilityFee: initialFees.facilityFee,
        cosmeticAnesthesiaFee: initialFees.anesthesiaFee,
        anesthesiaFee: 0,
        isSelfPayAnesthesia: false,
        selfPayRateName: '',
        suppliesCost: 0,
        implantsCost: 0,
        medicationsCost: 0,
        turnoverTime: 0
    });

    // Rescheduling Modal State
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({
        surgeryId: null,
        originalDate: '',
        newDate: '',
        newStartTime: '',
        reason: 'Patient request'
    });

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBodyPart, setSelectedBodyPart] = useState(''); // New state for body part filter
    const [editingSurgery, setEditingSurgery] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [orSchedule, setOrSchedule] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [expandedMonths, setExpandedMonths] = useState(new Set([new Date().toISOString().slice(0, 7)]));
    const [selectedProcedureGroup, setSelectedProcedureGroup] = useState('');

    // Extract unique procedure groups
    const uniqueProcedureGroups = useMemo(() => {
        if (!procedureGroupItems) return [];
        return [...new Set(procedureGroupItems.map(item => item.procedure_group))];
    }, [procedureGroupItems]);

    // Fetch OR Schedule for availability check
    useEffect(() => {
        const loadORSchedule = async () => {
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
                    // Mock data if no DB
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, '0');
                    const mock = [
                        { id: 1, date: `${y}-${m}-01`, room_name: 'OR 1', provider_name: 'Burmiester', start_time: '1200', end_time: '1600' },
                        { id: 2, date: `${y}-${m}-01`, room_name: 'OR 2', provider_name: 'Prysi', start_time: '0730', end_time: '1300' },
                        { id: 3, date: `${y}-${m}-02`, room_name: 'OR 1', provider_name: 'McGee', start_time: '0730', end_time: '1600' },
                        { id: 4, date: `${y}-${m}-02`, room_name: 'OR 2', provider_name: 'Naples Plastic', start_time: '0730', end_time: '1600' }
                    ];
                    setOrSchedule(mock);
                    return;
                }
                const data = await db.getORBlockSchedule();
                setOrSchedule(data || []);
            } catch (err) {
                console.error('Failed to load OR schedule for validation', err);
            }
        };
        loadORSchedule();
    }, []);

    // Helper to normalize names for comparison
    const normalizeNameParts = (name) => {
        if (!name) return [];
        return name.toLowerCase()
            .replace(/^dr\.?\s*/, '') // Remove Dr. prefix
            .replace(/[^a-z0-9\s]/g, ' ') // Replace non-alphanumeric with space
            .split(/\s+/) // Split by space
            .filter(part => part.length > 0); // Remove empty parts
    };

    // Check availability
    const availabilityStatus = useMemo(() => {
        if (!formData.doctorName || !formData.date) return null;

        const doctorNameParts = normalizeNameParts(formData.doctorName);

        // Find blocks for this doctor on this date with flexible matching
        const blocks = orSchedule.filter(block => {
            if (block.date !== formData.date) return false;

            const blockProviderParts = normalizeNameParts(block.provider_name);

            // Check if significant parts match
            const smallerSet = doctorNameParts.length < blockProviderParts.length ? doctorNameParts : blockProviderParts;
            const largerSet = doctorNameParts.length < blockProviderParts.length ? blockProviderParts : doctorNameParts;

            return smallerSet.every(part => largerSet.includes(part));
        });

        if (blocks.length > 0) {
            return { available: true, blocks };
        }
        return { available: false };
    }, [orSchedule, formData.date, formData.doctorName]);

    // Check if selected surgeon is a cosmetic surgeon
    const selectedSurgeon = useMemo(() => {
        return surgeons.find(s => s.name === formData.doctorName);
    }, [surgeons, formData.doctorName]);

    const isCosmeticSurgeon = selectedSurgeon?.is_cosmetic_surgeon || selectedSurgeon?.specialty === 'Plastic' || selectedSurgeon?.specialty === 'Plastic/Cosmetic' || selectedSurgeon?.specialty === 'Plastic / Cosmetic';

    // Group surgeons by availability on selected date
    const { availableSurgeons, otherSurgeons } = useMemo(() => {
        if (!formData.date) return { availableSurgeons: [], otherSurgeons: surgeons };

        const availableBlockProviders = orSchedule
            .filter(block => block.date === formData.date)
            .map(block => ({
                original: block.provider_name,
                parts: normalizeNameParts(block.provider_name)
            }));

        const available = surgeons.filter(s => {
            const surgeonParts = normalizeNameParts(s.name);

            return availableBlockProviders.some(p => {
                const smallerSet = surgeonParts.length < p.parts.length ? surgeonParts : p.parts;
                const largerSet = surgeonParts.length < p.parts.length ? p.parts : surgeonParts;
                return smallerSet.every(part => largerSet.includes(part));
            });
        });

        const others = surgeons.filter(s => !available.includes(s));

        return { availableSurgeons: available, otherSurgeons: others };
    }, [surgeons, orSchedule, formData.date]);

    // Extract unique categories - filtered by surgeon specialty if surgeon is selected
    const categories = useMemo(() => {
        if (!selectedSurgeon || !selectedSurgeon.specialty) {
            // If no surgeon selected, show all categories
            return [...new Set(cptCodes.map(c => c.category))];
        }
        // Filter categories to only show those matching surgeon's specialty
        const surgeonSpecialty = selectedSurgeon.specialty;
        return [...new Set(cptCodes
            .filter(c => c.category === surgeonSpecialty)
            .map(c => c.category))];
    }, [cptCodes, selectedSurgeon]);

    // Extract unique body parts from the CPT codes matching the surgeon's specialty
    const availableBodyParts = useMemo(() => {
        if (!selectedSurgeon || !selectedSurgeon.specialty) return [];
        const specialtyCodes = cptCodes.filter(c => c.category === selectedSurgeon.specialty);
        // Extract unique, non-empty body parts
        const parts = [...new Set(specialtyCodes.map(c => c.body_part).filter(Boolean))];
        return parts.sort();
    }, [cptCodes, selectedSurgeon]);

    // Filter CPT codes based on surgeon specialty AND selected body part
    const filteredCptCodes = useMemo(() => {
        if (!selectedSurgeon || !selectedSurgeon.specialty) {
            // If no surgeon selected, show all CPT codes
            return cptCodes;
        }
        // Start with specialty filter
        let codes = cptCodes.filter(c => c.category === selectedSurgeon.specialty);

        // Apply body part filter if selected
        if (selectedBodyPart) {
            codes = codes.filter(c => c.body_part === selectedBodyPart);
        }

        return codes;
    }, [cptCodes, selectedSurgeon, selectedBodyPart]);

    // Group surgeries by month
    const surgeriesByMonth = useMemo(() => {
        const grouped = {};
        surgeries.forEach(surgery => {
            const monthKey = surgery.date.slice(0, 7); // YYYY-MM
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(surgery);
        });

        // Sort surgeries within each month by date
        Object.keys(grouped).forEach(month => {
            grouped[month].sort((a, b) => new Date(a.date) - new Date(b.date));
        });

        return grouped;
    }, [surgeries]);

    const availableMonths = useMemo(() => {
        return Object.keys(surgeriesByMonth).sort().reverse(); // Most recent first
    }, [surgeriesByMonth]);

    // Helper to calculate financials for any surgery object consistently
    const calculateSurgeryFinancials = (surgery) => {
        const isCosmetic = !surgery.cpt_codes || surgery.cpt_codes.length === 0;
        let cptTotal = 0;
        let orCost = 0; // Billable Facility Fee
        let internalRoomCost = 0;
        let laborCost = 0;
        let totalValue = 0;
        let netProfit = 0;
        let anesthesiaExtra = 0;

        // 1. Calculate Supply Costs with fallback for old records
        let supplyCosts = (surgery.supplies_cost || 0) + (surgery.implants_cost || 0) + (surgery.medications_cost || 0);

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
            if (inferedGroup) {
                const groupItems = procedureGroupItems.filter(i => i.procedure_group === inferedGroup);
                supplyCosts = groupItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity_per_case || 0)), 0);
            }
        }

        const duration = parseInt(surgery.duration_minutes || 0);
        const turnover = parseInt(surgery.turnover_time || 0);

        if (isCosmetic) {
            // Parse cosmetic fees from notes
            if (surgery.notes) {
                const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([\d,.]+)/i);
                const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);
                const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                const anesthesiaAnesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                orCost = facilityFee + anesthesiaAnesthesiaFee;
                internalRoomCost = calculateORCost(duration + turnover);
                laborCost = calculateLaborCost(duration);
                totalValue = orCost + supplyCosts;
                netProfit = totalValue - (internalRoomCost + laborCost + supplyCosts);
            }
        } else {
            cptTotal = calculateMedicareRevenue(surgery.cpt_codes || [], cptCodes, settings?.apply_medicare_mppr || false);
            orCost = calculateORCost(duration);
            internalRoomCost = calculateORCost(duration + turnover);

            if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
                if (match) {
                    anesthesiaExtra = parseFloat(match[2].replace(/,/g, ''));
                }
            }
            orCost += anesthesiaExtra;
            laborCost = calculateLaborCost(duration);
            totalValue = cptTotal + orCost + supplyCosts;
            netProfit = totalValue - (internalRoomCost + laborCost + supplyCosts + anesthesiaExtra);
        }

        return { cptTotal, orCost, totalValue, netProfit, supplyCosts, internalRoomCost, laborCost, isCosmetic };
    };

    // Format month for display
    const formatMonthDisplay = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Toggle month expansion
    const toggleMonth = (monthKey) => {
        setExpandedMonths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(monthKey)) {
                newSet.delete(monthKey);
            } else {
                newSet.add(monthKey);
            }
            return newSet;
        });
    };



    const applyProcedureGroup = (groupName) => {
        setSelectedProcedureGroup(groupName);

        if (groupName) {
            const groupItems = procedureGroupItems.filter(i => i.procedure_group === groupName);
            const totalCost = groupItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity_per_case || 0)), 0);

            // Update supplies cost with group total
            setFormData(prev => ({
                ...prev,
                suppliesCost: totalCost
            }));

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Auto-applied Procedure Group: ${groupName}`,
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            setFormData(prev => ({
                ...prev,
                suppliesCost: 0
            }));
        }
    };

    const handleCptToggle = (code) => {
        // Auto-select procedure group if available
        const isSelected = formData.selectedCptCodes.includes(code);
        if (!isSelected) {
            const cpt = cptCodes.find(c => String(c.code) === String(code));
            if (cpt && cpt.procedure_group) {
                applyProcedureGroup(cpt.procedure_group);
            }
        }

        setFormData(prev => {
            const exists = prev.selectedCptCodes.includes(code);
            let newSelectedCodes;

            if (exists) {
                newSelectedCodes = prev.selectedCptCodes.filter(c => c !== code);
            } else {
                newSelectedCodes = [...prev.selectedCptCodes, code];
            }

            // Calculate auto-duration and turnover
            let totalDuration = 0;
            let totalTurnover = 0;

            newSelectedCodes.forEach(selectedCode => {
                const cpt = cptCodes.find(c => String(c.code) === String(selectedCode));
                if (cpt) {
                    totalDuration += parseInt(cpt.average_duration || 0);
                    totalTurnover += parseInt(cpt.turnover_time || 0);
                }
            });

            // Default behavior: if codes selected but 0 duration, default to 60.
            let suggestedDuration = totalDuration > 0 ? totalDuration : 60;
            if (newSelectedCodes.length > 0 && totalDuration === 0) suggestedDuration = 60;

            const newIsPlastic = selectedSurgeon?.specialty === 'Plastic' || selectedSurgeon?.specialty === 'Plastic/Cosmetic' || selectedSurgeon?.specialty === 'Plastic / Cosmetic';
            const fees = calculateCosmeticFees(suggestedDuration, newIsPlastic);

            return {
                ...prev,
                selectedCptCodes: newSelectedCodes,
                durationMinutes: suggestedDuration,
                turnoverTime: totalTurnover,
                cosmeticFacilityFee: fees.facilityFee,
                cosmeticAnesthesiaFee: fees.anesthesiaFee
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Find the surgeon object
        const surgeon = surgeons.find(s => s.name === formData.doctorName);

        // Prepare surgery data
        const surgeryData = {
            patient_id: parseInt(formData.patientId),
            surgeon_id: surgeon?.id || null,
            doctor_name: formData.doctorName,
            date: formData.date,
            start_time: formData.startTime,
            duration_minutes: formData.durationMinutes,
            turnover_time: formData.turnoverTime || 0,
            cpt_codes: isCosmeticSurgeon ? [] : formData.selectedCptCodes,
            status: 'scheduled',
            supplies_cost: formData.suppliesCost || 0,
            implants_cost: formData.implantsCost || 0,
            medications_cost: formData.medicationsCost || 0
        };

        // Add notes for cosmetic surgeries or self-pay anesthesia
        let notes = '';
        if (isCosmeticSurgeon) {
            notes = `Cosmetic Surgery - Facility Fee: $${formData.cosmeticFacilityFee.toLocaleString()}, Anesthesia: $${formData.cosmeticAnesthesiaFee.toLocaleString()}`;
        }
        if (formData.isSelfPayAnesthesia && formData.anesthesiaFee > 0) {
            const rateName = formData.selfPayRateName ? ` (${formData.selfPayRateName})` : '';
            const anesthesiaNote = `Self-Pay Anesthesia${rateName}: $${formData.anesthesiaFee.toLocaleString()}`;
            notes = notes ? `${notes}; ${anesthesiaNote}` : anesthesiaNote;
        }
        if (notes) {
            surgeryData.notes = notes;
        }

        if (editingSurgery) {
            // Update existing surgery
            await onUpdate(editingSurgery.id, {
                ...surgeryData,
                surgeon_id: surgeon?.id || null
            });

            await Swal.fire({
                title: 'Updated!',
                text: 'Surgery updated successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            setEditingSurgery(null);
            setIsFormOpen(false);
        } else {
            // Add new surgery
            await onSchedule({
                ...surgeryData,
                id: Date.now(),
                patientId: parseInt(formData.patientId),
                selectedCptCodes: isCosmeticSurgeon ? [] : formData.selectedCptCodes
            });
            await Swal.fire({
                title: 'Scheduled!',
                text: 'Surgery scheduled successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            setIsFormOpen(false);
        }

        // Reset form
        const defaultFees = calculateCosmeticFees(60);
        setFormData({
            patientId: '',
            doctorName: '',
            date: new Date().toISOString().split('T')[0],
            startTime: '',
            durationMinutes: 60,
            selectedCptCodes: [],
            cosmeticFacilityFee: defaultFees.facilityFee,
            cosmeticAnesthesiaFee: defaultFees.anesthesiaFee,
            anesthesiaFee: 0,
            isSelfPayAnesthesia: false,
            selfPayRateName: '',
            suppliesCost: 0,
            implantsCost: 0,
            medicationsCost: 0,
            turnoverTime: 0
        });
    };

    const handleEdit = (surgery) => {
        setEditingSurgery(surgery);

        // Determine procedure group from CPT codes
        let group = '';
        let groupCost = 0;
        if (surgery.cpt_codes && surgery.cpt_codes.length > 0) {
            for (const code of surgery.cpt_codes) {
                const cpt = cptCodes.find(c => String(c.code) === String(code));
                if (cpt && cpt.procedure_group) {
                    group = cpt.procedure_group;
                    // Calculate cost for this group from procedureGroupItems
                    const groupItems = procedureGroupItems.filter(i => i.procedure_group === group);
                    if (groupItems.length > 0) {
                        groupCost = groupItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity_per_case || 0)), 0);
                    }
                    break;
                }
            }
        }
        setSelectedProcedureGroup(group);

        // Calculate fees for existing surgery if it's cosmetic
        const duration = surgery.duration_minutes || 60;
        const fees = calculateCosmeticFees(duration);

        // Check for Self-Pay Anesthesia in notes
        let anesthesiaFee = 0;
        let isSelfPay = false;
        let selfPayRateName = '';

        if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
            const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
            if (match) {
                // If regex matches group 1 (name) and group 2 (price)
                if (match[1]) {
                    selfPayRateName = match[1];
                }
                anesthesiaFee = parseFloat(match[2].replace(/,/g, ''));
                isSelfPay = true;

                // Fallback attempt to find matching rate name if not parsed
                if (!selfPayRateName) {
                    const matchingRate = selfPayRates.find(r => r.price === anesthesiaFee);
                    if (matchingRate) {
                        selfPayRateName = matchingRate.name;
                    }
                }
            }
        }

        setFormData({
            patientId: surgery.patient_id || '',
            doctorName: surgery.doctor_name || '',
            date: surgery.date || '',
            startTime: surgery.start_time || '',
            durationMinutes: duration,
            selectedCptCodes: surgery.cpt_codes || [],
            cosmeticFacilityFee: fees.facilityFee,
            cosmeticAnesthesiaFee: fees.anesthesiaFee,
            anesthesiaFee: anesthesiaFee,
            isSelfPayAnesthesia: isSelfPay,
            selfPayRateName: selfPayRateName,
            suppliesCost: surgery.supplies_cost || groupCost || 0,
            implantsCost: surgery.implants_cost || 0,
            medicationsCost: surgery.medications_cost || 0,
            turnoverTime: (() => {
                let t = surgery.turnover_time || 0;
                if (t === 0 && surgery.cpt_codes && surgery.cpt_codes.length > 0) {
                    surgery.cpt_codes.forEach(code => {
                        const cpt = cptCodes.find(c => String(c.code) === String(code));
                        if (cpt) t += parseInt(cpt.turnover_time || 0);
                    });
                }
                return t;
            })()
        });

        setIsFormOpen(true);
        // Scroll to form if needed
        setTimeout(() => {
            const formElement = document.getElementById('surgery-form-section');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleCancelEdit = () => {
        setEditingSurgery(null);
        setSelectedProcedureGroup('');
        setIsFormOpen(false);
        setFormData({
            patientId: '',
            doctorName: '',
            date: new Date().toISOString().split('T')[0],
            startTime: '',
            durationMinutes: 60,
            selectedCptCodes: [],
            cosmeticFacilityFee: 0,
            cosmeticAnesthesiaFee: 0,
            anesthesiaFee: 0,
            isSelfPayAnesthesia: false,
            selfPayRateName: '',
            turnoverTime: 60
        });
    };

    const toggleForm = () => {
        if (isFormOpen) {
            handleCancelEdit();
        } else {
            setIsFormOpen(true);
        }
    };

    // Cancellation Handler
    const handleCancelSurgery = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Cancel Surgery?',
            input: 'text',
            inputLabel: 'Reason for cancellation',
            inputPlaceholder: 'e.g., Patient sick, Surgeon unavailable...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Cancel it',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write a reason!';
                }
            }
        });

        if (reason) {
            await onUpdate(id, {
                status: 'cancelled',
                notes: `Cancelled: ${reason}`
            });

            await Swal.fire({
                title: 'Cancelled!',
                text: 'Surgery has been cancelled.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    // Rescheduling Handlers
    const openRescheduleModal = (surgery) => {
        setRescheduleData({
            surgeryId: surgery.id,
            originalDate: surgery.date,
            newDate: '',
            newStartTime: '',
            reason: ''
        });
        setIsRescheduleOpen(true);
    };

    const closeRescheduleModal = () => {
        setIsRescheduleOpen(false);
        setRescheduleData({
            surgeryId: null,
            originalDate: '',
            newDate: '',
            newStartTime: '',
            reason: ''
        });
    };

    const handleRescheduleSubmit = async () => {
        if (!rescheduleData.newDate || !rescheduleData.newStartTime) {
            Swal.fire({
                title: 'Missing Info',
                text: 'Please select a new date and time.',
                icon: 'warning'
            });
            return;
        }

        const originalSurgery = surgeries.find(s => s.id === rescheduleData.surgeryId);
        if (!originalSurgery) return;

        try {
            // 1. Mark original as rescheduled
            await onUpdate(originalSurgery.id, {
                status: 'rescheduled',
                notes: `Rescheduled to ${rescheduleData.newDate}. Reason: ${rescheduleData.reason || 'None provided'}`
            });

            // 2. Create new surgery entry
            const newSurgery = {
                ...originalSurgery,
                id: Date.now(), // New ID
                date: rescheduleData.newDate,
                start_time: rescheduleData.newStartTime,
                status: 'scheduled',
                notes: `Rescheduled from ${originalSurgery.date}`
            };

            // Remove ID to force creation of new record if passed to DB add function appropriately, 
            // but onSchedule likely handles ID generation or we pass a temp one.
            // Based on App.jsx handleScheduleSurgery logic:

            // We need to map back to the format handleScheduleSurgery expects
            // It expects a flat object with doctor_name, patient_id etc.

            await onSchedule({
                patientId: originalSurgery.patient_id,
                doctorName: originalSurgery.doctor_name,
                date: rescheduleData.newDate,
                startTime: rescheduleData.newStartTime,
                durationMinutes: originalSurgery.duration_minutes,
                selectedCptCodes: originalSurgery.cpt_codes,
                notes: `Rescheduled from ${originalSurgery.date}`,
                suppliesCost: originalSurgery.supplies_cost || 0,
                implantsCost: originalSurgery.implants_cost || 0,
                medicationsCost: originalSurgery.medications_cost || 0
            });

            await Swal.fire({
                title: 'Rescheduled!',
                text: 'Surgery has been rescheduled successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            closeRescheduleModal();

        } catch (error) {
            console.error('Reschedule error:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to reschedule surgery.',
                icon: 'error'
            });
        }
    };

    // Billable Facility Fee: Based ONLY on procedure duration (what the patient/payer sees)
    const billableFacilityFee = useMemo(() => {
        return calculateORCost(formData.durationMinutes || 0);
    }, [formData.durationMinutes]);

    // Internal Facility Cost: Based on Total Room Occupancy (Duration + Turnover)
    const internalFacilityCost = useMemo(() => {
        const totalMinutes = (formData.durationMinutes || 0) + (formData.turnoverTime || 0);
        return calculateORCost(totalMinutes);
    }, [formData.durationMinutes, formData.turnoverTime]);

    // Calculate projected revenue with MPPR
    const projectedRevenue = useMemo(() => {
        if (!formData.selectedCptCodes || formData.selectedCptCodes.length === 0 || isCosmeticSurgeon) {
            return 0;
        }
        // Total Revenue = CPT Reimbursements + Billable Facility Fee + Billable Supplies (Pass-through)
        const cptRevenue = calculateMedicareRevenue(formData.selectedCptCodes, cptCodes, settings?.apply_medicare_mppr || false);
        const suppliesRevenue = (formData.suppliesCost || 0);
        return cptRevenue + billableFacilityFee + suppliesRevenue;
    }, [formData.selectedCptCodes, cptCodes, isCosmeticSurgeon, settings, billableFacilityFee, formData.suppliesCost]);

    // Calculate projected margin
    const projectedMargin = useMemo(() => {
        const suppliesCost = (formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0);
        // Estimated Labor Cost (usually tracks procedure duration)
        const estimatedLaborCost = calculateLaborCost(formData.durationMinutes);

        // Margin = Revenue - Internal Costs (Internal Room Cost + Labor + Supplies)
        // Note: We subtract internalFacilityCost (duration + turnover) because that's the real cost of the room time used.
        return projectedRevenue - internalFacilityCost - estimatedLaborCost - suppliesCost;
    }, [projectedRevenue, internalFacilityCost, formData.durationMinutes, formData.suppliesCost, formData.implantsCost, formData.medicationsCost]);

    // Determine cost tier
    const costTier = useMemo(() => {
        const minutes = formData.durationMinutes;
        if (minutes <= 60) return { name: 'Standard', color: '#059669', level: 1 };
        if (minutes <= 120) return { name: 'Tier 2 (+$300/30min)', color: '#f59e0b', level: 2 };
        return { name: 'Tier 3 (+$400/30min)', color: '#dc2626', level: 3 };
    }, [formData.durationMinutes]);

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Surgery Log & OR</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn-add"
                        onClick={() => setShowSchedule(!showSchedule)}
                        style={{ background: '#6366f1' }}
                    >
                        {showSchedule ? 'Hide Schedule' : 'View OR Schedule'}
                    </button>
                    <button className="btn-add" onClick={toggleForm}>
                        {isFormOpen ? 'Close Form' : '+ Add New Surgery'}
                    </button>
                </div>
            </div>

            {/* OR Schedule View */}
            {showSchedule && (
                <div className="content-card fade-in" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
                    <ORBlockSchedule surgeons={surgeons} embedded={true} />
                </div>
            )}

            {/* Wrapper with flex ordering */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Reschedule Modal */}
                {isRescheduleOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>Reschedule Surgery</h3>
                                <button className="btn-close" onClick={closeRescheduleModal}>&times;</button>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Original Date</label>
                                <input
                                    type="text"
                                    value={rescheduleData.originalDate}
                                    disabled
                                    className="form-input"
                                    style={{ background: '#f1f5f9', color: '#64748b' }}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>New Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={rescheduleData.newDate}
                                        onChange={e => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Start Time</label>
                                    <input
                                        type="time"
                                        className="form-input"
                                        value={rescheduleData.newStartTime}
                                        onChange={e => setRescheduleData({ ...rescheduleData, newStartTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Reason (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Patient sick, Surgeon unavailable..."
                                    value={rescheduleData.reason}
                                    onChange={e => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={closeRescheduleModal}>Cancel</button>
                                <button
                                    className="btn-save"
                                    onClick={handleRescheduleSubmit}
                                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                                >
                                    Confirm Reschedule
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Surgery Log Table - will appear second with order: 2 */}
                <div style={{ order: isFormOpen ? 2 : 1 }}>
                    <div className="content-card" style={{ marginBottom: '2rem' }}>
                        <div className="card-header">
                            <h3>Surgery Log</h3>
                            <p className="card-subtitle">Recent and upcoming scheduled surgeries organized by month.</p>
                        </div>

                        {availableMonths.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No surgeries scheduled.</p>
                            </div>
                        ) : (
                            availableMonths.map(monthKey => {
                                const monthSurgeries = surgeriesByMonth[monthKey];
                                const isExpanded = expandedMonths.has(monthKey);
                                const monthTotal = monthSurgeries.reduce((sum, surgery) => {
                                    const { totalValue } = calculateSurgeryFinancials(surgery);
                                    return sum + totalValue;
                                }, 0);

                                return (
                                    <div key={monthKey} style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                        {/* Month Header */}
                                        <div
                                            onClick={() => toggleMonth(monthKey)}
                                            style={{
                                                padding: '1.25rem 1.5rem',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    style={{
                                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.3s ease'
                                                    }}
                                                >
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                                                    {formatMonthDisplay(monthKey)}
                                                </h4>
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {monthSurgeries.length} {monthSurgeries.length === 1 ? 'Surgery' : 'Surgeries'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                                                {formatCurrency(monthTotal)}
                                            </div>
                                        </div>

                                        {/* Month Content */}
                                        {isExpanded && (
                                            <div className="table-container" style={{ borderTop: '2px solid #e2e8f0' }}>
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Time</th>
                                                            <th>Patient</th>
                                                            <th>Surgeon</th>
                                                            <th>Procedure(s)</th>
                                                            <th>Room Occupancy</th>
                                                            <th>CPT Total</th>
                                                            <th>Facility Fee</th>
                                                            <th>Total Value</th>
                                                            <th>Net Profit</th>
                                                            <th>Status</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {monthSurgeries.map(surgery => {
                                                            const { cptTotal, orCost, totalValue, netProfit, isCosmetic: isCosmeticSurgery } = calculateSurgeryFinancials(surgery);

                                                            return (
                                                                <tr key={surgery.id}>
                                                                    <td>{surgery.date}</td>
                                                                    <td>{surgery.start_time}</td>
                                                                    <td>
                                                                        {surgery.patient_name ||
                                                                            (surgery.patients ?
                                                                                (surgery.patients.name || (() => {
                                                                                    const first = surgery.patients.firstname || surgery.patients.first_name || '';
                                                                                    const last = surgery.patients.lastname || surgery.patients.last_name || '';
                                                                                    return first && last ? `${first} ${last}` : 'Unknown';
                                                                                })())
                                                                                : 'Unknown')}
                                                                    </td>
                                                                    <td>
                                                                        {surgery.doctor_name ||
                                                                            (surgery.surgeons ?
                                                                                (() => {
                                                                                    const first = surgery.surgeons.firstname || surgery.surgeons.first_name || '';
                                                                                    const last = surgery.surgeons.lastname || surgery.surgeons.last_name || '';
                                                                                    if (first && last) {
                                                                                        return `Dr. ${first} ${last}`;
                                                                                    }
                                                                                    return surgery.surgeons.name ? `Dr. ${surgery.surgeons.name}` : 'Unknown';
                                                                                })()
                                                                                : 'Unknown')}
                                                                    </td>
                                                                    <td>
                                                                        {surgery.cpt_codes && surgery.cpt_codes.length > 0 ? (
                                                                            surgery.cpt_codes.map(code => (
                                                                                <span key={code} className="badge badge-blue" style={{ marginRight: '4px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{code}</span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="badge" style={{
                                                                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                                                                color: '#78350f',
                                                                                padding: '4px 12px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.85rem',
                                                                                fontWeight: '600',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}>
                                                                                <span>✨</span>
                                                                                Cosmetic Surgery
                                                                            </span>
                                                                        )}
                                                                        {surgery.notes && surgery.notes.includes('Self-Pay Anesthesia') && (
                                                                            <div style={{ marginTop: '4px' }}>
                                                                                {(() => {
                                                                                    const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
                                                                                    if (match) {
                                                                                        const name = match[1] || 'Unknown Rate';
                                                                                        const price = match[2];
                                                                                        return (
                                                                                            <span className="badge" style={{
                                                                                                background: '#f3e8ff',
                                                                                                color: '#6b21a8',
                                                                                                padding: '2px 8px',
                                                                                                borderRadius: '4px',
                                                                                                fontSize: '0.8rem',
                                                                                                border: '1px solid #d8b4fe',
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                gap: '4px'
                                                                                            }}>
                                                                                                💉 Anesthesia: {name} (${price})
                                                                                            </span>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        {(() => {
                                                                            let turnover = parseInt(surgery.turnover_time || 0);
                                                                            // Fallback to CPT defaults if turnover is 0 (likely not saved/calculated yet)
                                                                            if (turnover === 0 && surgery.cpt_codes && surgery.cpt_codes.length > 0) {
                                                                                surgery.cpt_codes.forEach(code => {
                                                                                    const cpt = cptCodes.find(c => String(c.code) === String(code));
                                                                                    if (cpt) turnover += parseInt(cpt.turnover_time || 0);
                                                                                });
                                                                            }
                                                                            const duration = parseInt(surgery.duration_minutes || 0);
                                                                            const total = duration + turnover;

                                                                            return (
                                                                                <>
                                                                                    <div style={{ fontWeight: '500' }}>
                                                                                        {duration}m + <span style={{ color: '#f59e0b' }}>{turnover}m</span>
                                                                                        <div style={{ fontSize: '0.7em', color: '#94a3b8', lineHeight: '1' }}>(Facility Overhead)</div>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Total: {total}m</div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td style={{ fontWeight: '600', color: '#059669' }}>{formatCurrency(cptTotal)}</td>
                                                                    <td style={{ fontWeight: '600', color: '#dc2626' }}>{formatCurrency(orCost)}</td>
                                                                    <td style={{ fontWeight: '700', color: '#1e40af', fontSize: '1.05rem' }}>{formatCurrency(totalValue)}</td>
                                                                    <td style={{
                                                                        fontWeight: '700',
                                                                        color: netProfit >= 0 ? '#059669' : '#dc2626',
                                                                        fontSize: '1.05rem'
                                                                    }}>
                                                                        {formatCurrency(netProfit)}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`status-badge status-${surgery.status}`} style={{ textTransform: 'capitalize' }}>
                                                                            {surgery.status}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="actions-cell">
                                                                            <button
                                                                                className="btn-icon btn-edit"
                                                                                title="Edit"
                                                                                onClick={() => handleEdit(surgery)}
                                                                            >
                                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                                </svg>
                                                                            </button>
                                                                            {surgery.status !== 'completed' && surgery.status !== 'cancelled' && (
                                                                                <>
                                                                                    <button
                                                                                        className="btn-icon btn-reschedule"
                                                                                        title="Reschedule"
                                                                                        onClick={() => openRescheduleModal(surgery)}
                                                                                    >
                                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                                                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                                                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                                                                            <path d="M16.24 7.76l-2.12 2.12"></path> <path d="M12 12h4"></path>
                                                                                        </svg>
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn-icon btn-action-cancel"
                                                                                        title="Cancel"
                                                                                        onClick={() => handleCancelSurgery(surgery.id)}
                                                                                    >
                                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                            <circle cx="12" cy="12" r="10"></circle>
                                                                                            <line x1="15" y1="9" x2="9" y2="15"></line>
                                                                                            <line x1="9" y1="9" x2="15" y2="15"></line>
                                                                                        </svg>
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                            {surgery.status !== 'completed' && onComplete && (
                                                                                <button
                                                                                    className="btn-icon"
                                                                                    title="Complete Surgery"
                                                                                    style={{
                                                                                        background: '#059669',
                                                                                        color: 'white'
                                                                                    }}
                                                                                    onClick={() => onComplete(surgery.id)}
                                                                                >
                                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                className="btn-icon btn-delete"
                                                                                title="Delete"
                                                                                onClick={() => onDelete(surgery.id)}
                                                                            >
                                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Schedule Form - Conditionally Rendered - will appear first with order: 1 */}
                {isFormOpen && (
                    <div style={{ order: 1 }}>
                        <div id="surgery-form-section" className="content-card fade-in" style={{ marginBottom: '2rem' }}>
                            <div className="card-header">
                                <h3>{editingSurgery ? 'Edit Surgery' : 'Schedule New Surgery'}</h3>
                                <p className="card-subtitle">
                                    {editingSurgery ? 'Update the details of the scheduled surgery.' : 'Add a new surgery to the operating room schedule.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="surgery-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            required
                                            value={formData.date}
                                            onChange={(e) => {
                                                const newDate = e.target.value;
                                                let newStartTime = formData.startTime;

                                                // If doctor is already selected, check if they have a block on new date
                                                if (formData.doctorName && newDate) {
                                                    const block = orSchedule.find(b => b.date === newDate && b.provider_name === formData.doctorName);
                                                    if (block && block.start_time) {
                                                        newStartTime = block.start_time.length === 4
                                                            ? `${block.start_time.slice(0, 2)}:${block.start_time.slice(2)}`
                                                            : block.start_time;
                                                    }
                                                }
                                                setFormData({ ...formData, date: newDate, startTime: newStartTime });
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Select Patient</label>
                                        <select
                                            className="form-input"
                                            required
                                            value={formData.patientId}
                                            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                        >
                                            <option value="">-- Select Patient --</option>
                                            {patients.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Surgeon Name</label>
                                        <select
                                            className="form-input"
                                            required
                                            value={formData.doctorName}
                                            onChange={(e) => {
                                                const newDoctorName = e.target.value;
                                                let newStartTime = formData.startTime;

                                                // Auto-set start time if block exists for this surgeon on selected date
                                                if (formData.date && newDoctorName) {
                                                    const block = orSchedule.find(b => b.date === formData.date && b.provider_name === newDoctorName);
                                                    if (block && block.start_time) {
                                                        newStartTime = block.start_time.length === 4
                                                            ? `${block.start_time.slice(0, 2)}:${block.start_time.slice(2)}`
                                                            : block.start_time;
                                                    }
                                                }

                                                // Calculate fees based on new surgeon
                                                const newSurgeon = surgeons.find(s => s.name === newDoctorName);
                                                const isPlastic = newSurgeon?.specialty === 'Plastic' || newSurgeon?.specialty === 'Plastic/Cosmetic' || newSurgeon?.specialty === 'Plastic / Cosmetic';
                                                const fees = calculateCosmeticFees(formData.durationMinutes, isPlastic);

                                                setFormData({
                                                    ...formData,
                                                    doctorName: newDoctorName,
                                                    startTime: newStartTime,
                                                    cosmeticFacilityFee: fees.facilityFee,
                                                    cosmeticAnesthesiaFee: fees.anesthesiaFee
                                                });

                                                // Reset filters when doctor changes
                                                setSelectedBodyPart('');
                                            }}
                                        >
                                            <option value="">-- Select Surgeon --</option>
                                            {availableSurgeons.length > 0 && (
                                                <optgroup label={`Available on ${formData.date}`}>
                                                    {availableSurgeons.map(s => (
                                                        <option key={s.id} value={s.name}>
                                                            ✅ {s.name} - {s.specialty}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {otherSurgeons.length > 0 && (
                                                <optgroup label="Other Surgeons">
                                                    {otherSurgeons.map(s => (
                                                        <option key={s.id} value={s.name}>
                                                            {s.name} - {s.specialty}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input
                                            type="time"
                                            className="form-input"
                                            required
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Availability Alert */}
                                {availabilityStatus && (
                                    <div className={`availability-alert ${availabilityStatus.available ? 'available' : 'unavailable'}`}
                                        style={{
                                            marginBottom: '1.5rem',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            background: availabilityStatus.available ? '#f0fdf4' : '#fef2f2',
                                            border: `1px solid ${availabilityStatus.available ? '#bbf7d0' : '#fecaca'}`,
                                            color: availabilityStatus.available ? '#166534' : '#991b1b'
                                        }}>
                                        {availabilityStatus.available ? (
                                            <>
                                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                <div>
                                                    <strong>Block Available:</strong> {availabilityStatus.blocks[0].room_name} ({availabilityStatus.blocks[0].start_time.slice(0, 2)}:{availabilityStatus.blocks[0].start_time.slice(2)} - {availabilityStatus.blocks[0].end_time.slice(0, 2)}:{availabilityStatus.blocks[0].end_time.slice(2)})
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                                <div>
                                                    <strong>No Block Scheduled:</strong> This surgeon does not have a scheduled OR block on this date.
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Estimated Duration (Minutes)</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={formData.durationMinutes}
                                        onChange={(e) => {
                                            const duration = parseInt(e.target.value);
                                            const isPlastic = selectedSurgeon?.specialty === 'Plastic' || selectedSurgeon?.specialty === 'Plastic/Cosmetic' || selectedSurgeon?.specialty === 'Plastic / Cosmetic';
                                            const fees = calculateCosmeticFees(duration, isPlastic);
                                            setFormData({
                                                ...formData,
                                                durationMinutes: duration,
                                                cosmeticFacilityFee: fees.facilityFee,
                                                cosmeticAnesthesiaFee: fees.anesthesiaFee
                                            });
                                        }}
                                    >
                                        {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map(mins => {
                                            const hours = mins / 60;
                                            return (
                                                <option key={mins} value={mins}>
                                                    {hours} hour{hours !== 1 ? 's' : ''} ({mins} min)
                                                </option>
                                            );
                                        })}
                                    </select>

                                    {!isCosmeticSurgeon && (
                                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div className="cost-preview" style={{ margin: 0 }}>
                                                Est. Billable Fee: <strong title="Based on procedure duration only">{formatCurrency(billableFacilityFee)}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                Facility Overhead: <strong style={{ color: '#f59e0b' }} title="Non-billable room setup/cleanup">{formData.turnoverTime || 0} min</strong>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                Total Room Occupancy: <strong style={{ color: '#1e293b' }}>{(formData.durationMinutes || 0) + (formData.turnoverTime || 0)} min</strong>
                                            </div>
                                        </div>
                                    )}

                                    {isCosmeticSurgeon && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>CSC Facility Fee:</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0369a1' }}>
                                                        {formatCurrency(formData.cosmeticFacilityFee)}
                                                    </div>
                                                </div>
                                                {!selectedSurgeon?.specialty || (selectedSurgeon.specialty !== 'Plastic' && selectedSurgeon.specialty !== 'Plastic/Cosmetic' && selectedSurgeon.specialty !== 'Plastic / Cosmetic') ? (
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Quantum Anesthesia:</div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0369a1' }}>
                                                            {formatCurrency(formData.cosmeticAnesthesiaFee)}
                                                        </div>
                                                    </div>
                                                ) : <div></div>}
                                            </div>
                                            <div style={{ borderTop: '1px solid #bae6fd', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Cosmetic Fee:</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0c4a6e' }}>
                                                    {formatCurrency(formData.cosmeticFacilityFee + formData.cosmeticAnesthesiaFee)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!isCosmeticSurgeon && (
                                    <div className="form-group">
                                        <label>Select CPT Codes</label>

                                        {!formData.doctorName ? (
                                            <div style={{
                                                padding: '2rem',
                                                textAlign: 'center',
                                                background: '#fef3c7',
                                                borderRadius: '8px',
                                                border: '1px solid #fbbf24',
                                                color: '#92400e'
                                            }}>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                                </svg>
                                                <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                                                    Please select a surgeon first to view available CPT codes for their specialty.
                                                </p>
                                            </div>
                                        ) : selectedSurgeon && selectedSurgeon.specialty ? (
                                            <>
                                                <div style={{
                                                    padding: '0.75rem 1rem',
                                                    background: '#f0f9ff',
                                                    borderRadius: '6px',
                                                    border: '1px solid #bae6fd',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2">
                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                        <span style={{ fontSize: '0.9rem', color: '#0c4a6e' }}>
                                                            Showing <strong>{selectedSurgeon.specialty}</strong> procedures for <strong>{selectedSurgeon.name}</strong>
                                                        </span>
                                                    </div>

                                                    {/* Body Part Filter */}
                                                    {availableBodyParts.length > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0c4a6e' }}> Filter by Body Part:</label>
                                                            <select
                                                                value={selectedBodyPart}
                                                                onChange={(e) => setSelectedBodyPart(e.target.value)}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #bae6fd',
                                                                    background: 'white',
                                                                    fontSize: '0.85rem',
                                                                    color: '#0369a1',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <option value="">All Body Parts</option>
                                                                {availableBodyParts.map(part => (
                                                                    <option key={part} value={part}>{part}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>

                                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                                                    Click on procedures to add them to the surgery. You can select multiple procedures.
                                                </p>

                                                {/* Show CPT codes filtered by surgeon specialty */}
                                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                                                    {categories.length === 0 ? (
                                                        <div style={{
                                                            padding: '2rem',
                                                            textAlign: 'center',
                                                            color: '#64748b'
                                                        }}>
                                                            <p style={{ fontSize: '0.95rem', margin: 0 }}>
                                                                No CPT codes available for {selectedSurgeon.specialty} specialty.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        categories.map(category => {
                                                            const categoryCodes = filteredCptCodes.filter(c => c.category === category);
                                                            return (
                                                                <div key={category} style={{ marginBottom: '1.5rem' }}>
                                                                    <h4 style={{
                                                                        fontSize: '0.95rem',
                                                                        fontWeight: '600',
                                                                        color: '#1e293b',
                                                                        marginBottom: '0.75rem',
                                                                        padding: '0.5rem',
                                                                        background: '#f1f5f9',
                                                                        borderRadius: '6px',
                                                                        borderLeft: '4px solid #3b82f6'
                                                                    }}>
                                                                        {category}
                                                                    </h4>
                                                                    <div className="cpt-grid">
                                                                        {categoryCodes.map(cpt => (
                                                                            <div
                                                                                key={cpt.code}
                                                                                className={`cpt-card ${formData.selectedCptCodes.includes(cpt.code) ? 'selected' : ''}`}
                                                                                onClick={() => handleCptToggle(cpt.code)}
                                                                            >
                                                                                <div className="cpt-card-header">
                                                                                    <span className="cpt-code-badge">{cpt.code}</span>
                                                                                    <span className="cpt-price">{formatCurrency(cpt.reimbursement)}</span>
                                                                                </div>
                                                                                <div className="cpt-description">{cpt.description}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {formData.selectedCptCodes.length > 0 && (
                                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                        <strong>Selected Codes:</strong> {formData.selectedCptCodes.join(', ')}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{
                                                padding: '2rem',
                                                textAlign: 'center',
                                                background: '#fef2f2',
                                                borderRadius: '8px',
                                                border: '1px solid #fecaca',
                                                color: '#991b1b'
                                            }}>
                                                <p style={{ fontSize: '0.95rem', margin: 0 }}>
                                                    Selected surgeon does not have a specialty assigned. Please update surgeon information.
                                                </p>
                                            </div>
                                        )}

                                        {/* Self-Pay Anesthesia Section */}
                                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                                <input
                                                    type="checkbox"
                                                    id="selfPayAnesthesia"
                                                    checked={formData.isSelfPayAnesthesia}
                                                    onChange={(e) => setFormData({ ...formData, isSelfPayAnesthesia: e.target.checked, anesthesiaFee: e.target.checked ? formData.anesthesiaFee : 0 })}
                                                    style={{ width: '1.2rem', height: '1.2rem', marginRight: '0.5rem', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="selfPayAnesthesia" style={{ fontSize: '1rem', fontWeight: '600', cursor: 'pointer', color: '#0f172a' }}>
                                                    Include Self-Pay Anesthesia
                                                </label>
                                            </div>

                                            {formData.isSelfPayAnesthesia && (
                                                <div className="fade-in" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    <div className="form-group">
                                                        <label>Select Anesthesia Rate</label>
                                                        <select
                                                            className="form-input"
                                                            value={formData.selfPayRateName || ''}
                                                            onChange={(e) => {
                                                                const rate = selfPayRates.find(r => r.name === e.target.value);
                                                                setFormData({
                                                                    ...formData,
                                                                    anesthesiaFee: rate ? rate.price : 0,
                                                                    selfPayRateName: rate ? rate.name : ''
                                                                });
                                                            }}
                                                        >
                                                            <option value="">-- Select Procedure --</option>
                                                            {selfPayRates.map(rate => (
                                                                <option key={rate.name} value={rate.name}>
                                                                    {rate.name} - {formatCurrency(rate.price)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                                        <label>Anesthesia Fee Amount</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                style={{ paddingLeft: '24px' }}
                                                                value={formData.anesthesiaFee}
                                                                onChange={(e) => setFormData({ ...formData, anesthesiaFee: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isCosmeticSurgeon && (
                                    <div style={{ padding: '1.5rem', background: '#fef3c7', borderRadius: '8px', border: '2px solid #fbbf24', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>✨</span>
                                            <strong style={{ color: '#92400e' }}>Cosmetic Surgery</strong>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350f' }}>
                                            Fees are calculated based on procedure duration. No CPT codes required for cosmetic procedures.
                                        </p>
                                    </div>
                                )}

                                {/* Supplies Cost Tracking */}
                                {!isCosmeticSurgeon && (
                                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                                            💊 Supplies & Materials Cost
                                        </h4>

                                        {/* Procedure Group Selection */}
                                        <div className="form-group" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            <label style={{ color: '#0f172a', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Select Procedure Group (Optional)</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <select
                                                    className="form-input"
                                                    value={selectedProcedureGroup}
                                                    onChange={(e) => {
                                                        applyProcedureGroup(e.target.value);
                                                    }}
                                                >
                                                    <option value="">-- Apply Procedure Group Preset --</option>
                                                    {uniqueProcedureGroups.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>

                                                {selectedProcedureGroup && (
                                                    <div className="fade-in" style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <strong>Items in Group:</strong>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                                {procedureGroupItems.filter(i => i.procedure_group === selectedProcedureGroup).length} items
                                                            </span>
                                                        </div>
                                                        <ul style={{ margin: '0', paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem', maxHeight: '150px', overflowY: 'auto' }}>
                                                            {procedureGroupItems.filter(i => i.procedure_group === selectedProcedureGroup).map((item, idx) => (
                                                                <li key={idx} style={{ marginBottom: '4px' }}>
                                                                    <span>{item.item_name}</span>
                                                                    <span style={{ color: '#94a3b8' }}> (x{item.quantity_per_case})</span>
                                                                    <span style={{ float: 'right', color: '#0f172a', fontWeight: '500' }}>
                                                                        {formatCurrency((item.unit_price || 0) * (item.quantity_per_case || 0))}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Total Group Cost:</span>
                                                            <strong style={{ color: '#059669', fontSize: '1.1rem' }}>
                                                                {formatCurrency(
                                                                    procedureGroupItems
                                                                        .filter(i => i.procedure_group === selectedProcedureGroup)
                                                                        .reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity_per_case || 0)), 0)
                                                                )}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Surgical Supplies</label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="form-input"
                                                        style={{ paddingLeft: '24px' }}
                                                        value={formData.suppliesCost || ''}
                                                        onChange={(e) => setFormData({ ...formData, suppliesCost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                        placeholder="Sutures, gauze, etc."
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Implants & Devices</label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="form-input"
                                                        style={{ paddingLeft: '24px' }}
                                                        value={formData.implantsCost || ''}
                                                        onChange={(e) => setFormData({ ...formData, implantsCost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                        placeholder="Hip implants, IOLs, etc."
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Medications</label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="form-input"
                                                        style={{ paddingLeft: '24px' }}
                                                        value={formData.medicationsCost || ''}
                                                        onChange={(e) => setFormData({ ...formData, medicationsCost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                        placeholder="Drugs, anesthesia"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Profitability Guardrails */}
                                {!isCosmeticSurgeon && formData.selectedCptCodes.length > 0 && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: projectedMargin < 0 ? '#fee2e2' : '#f0fdf4',
                                        border: `2px solid ${projectedMargin < 0 ? '#dc2626' : '#059669'}`,
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#64748b' }}>
                                                    📊 Financial Projection
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Rev (CPT+Fee+Supplies): </span>
                                                        <span style={{ fontWeight: '600', color: '#059669', fontSize: '1.05rem' }}>
                                                            {formatCurrency(projectedRevenue)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Internal Room Cost: </span>
                                                        <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                            {formatCurrency(internalFacilityCost)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Est. Labor: </span>
                                                        <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                            {formatCurrency(calculateLaborCost(formData.durationMinutes))}
                                                        </span>
                                                    </div>
                                                    {((formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0)) > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Supplies: </span>
                                                            <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                                {formatCurrency((formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0))}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        gridColumn: '1 / -1',
                                                        borderTop: '2px solid #e2e8f0',
                                                        paddingTop: '0.75rem',
                                                        marginTop: '0.5rem'
                                                    }}>
                                                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>Total Internal Cost: </span>
                                                        <span style={{ fontWeight: '700', color: '#dc2626', fontSize: '1.2rem' }}>
                                                            {formatCurrency(
                                                                internalFacilityCost + // Facility Fee (Internal)
                                                                calculateLaborCost(formData.durationMinutes) + // Labor Cost
                                                                ((formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0)) + // Supplies
                                                                (formData.isSelfPayAnesthesia ? (formData.anesthesiaFee || 0) : 0) // Self-Pay Anesthesia
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cost Tier: </span>
                                                        <span style={{
                                                            fontWeight: '600',
                                                            color: costTier.color,
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            {costTier.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                                    Projected Margin
                                                </div>
                                                <div style={{
                                                    fontSize: '2rem',
                                                    fontWeight: '700',
                                                    color: projectedMargin < 0 ? '#dc2626' : '#059669'
                                                }}>
                                                    {formatCurrency(projectedMargin)}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                    {projectedRevenue > 0 ? ((projectedMargin / projectedRevenue) * 100).toFixed(1) : 0}% margin
                                                </div>
                                            </div>
                                        </div>

                                        {/* High Tier Cost Alert */}
                                        {projectedMargin < 0 && formData.durationMinutes > 120 && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '1rem',
                                                background: '#fef2f2',
                                                border: '2px solid #fca5a5',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                                <div>
                                                    <div style={{ color: '#991b1b', fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                                        ⚠️ High Tier Cost Alert: Projected Margin is Negative
                                                    </div>
                                                    <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>
                                                        This case is in Tier 3 (${400}/30min surcharge) with a negative margin. Consider reducing duration or reviewing CPT codes.
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tier Breach Warning */}
                                        {formData.durationMinutes > 60 && projectedMargin >= 0 && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem 1rem',
                                                background: '#fffbeb',
                                                border: '1px solid #fcd34d',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                </svg>
                                                <span style={{ color: '#92400e', fontSize: '0.9rem' }}>
                                                    Duration exceeds 60 minutes - Tier {formData.durationMinutes > 120 ? '3' : '2'} surcharge applies (${formData.durationMinutes > 120 ? '400' : '300'}/30min)
                                                </span>
                                            </div>
                                        )}

                                        {/* Positive Margin Encouragement */}
                                        {projectedMargin >= 0 && formData.durationMinutes <= 60 && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem 1rem',
                                                background: '#f0fdf4',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                <span style={{ color: '#166534', fontSize: '0.9rem', fontWeight: '500' }}>
                                                    Excellent! This case has a positive margin and stays within the standard cost tier.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}


                                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="submit" className="btn-save">
                                        {editingSurgery ? 'Update Surgery' : 'Schedule Operation'}
                                    </button>
                                    <button type="button" className="btn-cancel" onClick={handleCancelEdit}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurgeryScheduler;
