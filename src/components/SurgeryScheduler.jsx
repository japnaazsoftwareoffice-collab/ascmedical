import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import { calculateORCost, calculateMedicareRevenue, formatCurrency } from '../utils/hospitalUtils';
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

const SurgeryScheduler = ({ patients, surgeons, cptCodes, surgeries = [], onSchedule, onUpdate, onDelete, onComplete }) => {
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
        medicationsCost: 0
    });

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBodyPart, setSelectedBodyPart] = useState(''); // New state for body part filter
    const [editingSurgery, setEditingSurgery] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [orSchedule, setOrSchedule] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [expandedMonths, setExpandedMonths] = useState(new Set([new Date().toISOString().slice(0, 7)]));

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

    // Get sorted list of months
    const availableMonths = useMemo(() => {
        return Object.keys(surgeriesByMonth).sort().reverse(); // Most recent first
    }, [surgeriesByMonth]);

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

    const handleCptToggle = (code) => {
        setFormData(prev => {
            const exists = prev.selectedCptCodes.includes(code);
            if (exists) {
                return { ...prev, selectedCptCodes: prev.selectedCptCodes.filter(c => c !== code) };
            } else {
                return { ...prev, selectedCptCodes: [...prev.selectedCptCodes, code] };
            }
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
            medicationsCost: 0
        });
    };

    const handleEdit = (surgery) => {
        setEditingSurgery(surgery);

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
            selfPayRateName: selfPayRateName
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
            selfPayRateName: ''
        });
    };

    const toggleForm = () => {
        if (isFormOpen) {
            handleCancelEdit();
        } else {
            setIsFormOpen(true);
        }
    };

    const estimatedCost = calculateORCost(formData.durationMinutes);

    // Calculate projected revenue with MPPR
    const projectedRevenue = useMemo(() => {
        if (!formData.selectedCptCodes || formData.selectedCptCodes.length === 0 || isCosmeticSurgeon) {
            return 0;
        }
        return calculateMedicareRevenue(formData.selectedCptCodes, cptCodes);
    }, [formData.selectedCptCodes, cptCodes, isCosmeticSurgeon]);

    // Calculate projected margin
    const projectedMargin = useMemo(() => {
        const orCost = estimatedCost;
        const suppliesCost = (formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0);
        // Estimate labor cost at 30% of OR cost as a rough estimate
        const estimatedLaborCost = orCost * 0.3;
        return projectedRevenue - orCost - estimatedLaborCost - suppliesCost;
    }, [projectedRevenue, estimatedCost, formData.suppliesCost, formData.implantsCost, formData.medicationsCost]);

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
                                    const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;
                                    let totalValue = 0;

                                    if (isCosmeticSurgery) {
                                        if (surgery.notes) {
                                            const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([\d,.]+)/i);
                                            const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);
                                            const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                                            const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                                            totalValue = facilityFee + anesthesiaFee;
                                        }
                                    } else {
                                        const cptTotal = surgery.cpt_codes?.reduce((cptSum, code) => {
                                            const cptCode = cptCodes.find(c => c.code === code);
                                            return cptSum + (cptCode?.reimbursement || 0);
                                        }, 0) || 0;

                                        let orCost = calculateORCost(surgery.duration_minutes || 0);

                                        if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                                            const match = surgery.notes.match(/Self-Pay Anesthesia:?\s*\$?\s*([\d,]+)/i);
                                            if (match) {
                                                orCost += parseFloat(match[1].replace(/,/g, ''));
                                            }
                                        }

                                        totalValue = cptTotal + orCost;
                                    }

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
                                                            <th>CPT Total</th>
                                                            <th>OR Cost</th>
                                                            <th>Total Value</th>
                                                            <th>Status</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {monthSurgeries.map(surgery => {
                                                            // Check if this is a cosmetic surgery (no CPT codes)
                                                            const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

                                                            let cptTotal = 0;
                                                            let orCost = 0;
                                                            let totalValue = 0;

                                                            if (isCosmeticSurgery) {
                                                                // Parse cosmetic fees from notes
                                                                if (surgery.notes) {
                                                                    const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([\d,.]+)/i);
                                                                    const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);
                                                                    const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                                                                    const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                                                                    cptTotal = 0; // No CPT codes for cosmetic surgeries
                                                                    orCost = facilityFee + anesthesiaFee; // Show cosmetic fees as OR Cost
                                                                    totalValue = orCost;
                                                                }
                                                            } else {
                                                                // Calculate CPT codes total for regular surgeries
                                                                cptTotal = surgery.cpt_codes?.reduce((sum, code) => {
                                                                    const cptCode = cptCodes.find(c => c.code === code);
                                                                    return sum + (cptCode?.reimbursement || 0);
                                                                }, 0) || 0;

                                                                // Calculate OR cost
                                                                orCost = calculateORCost(surgery.duration_minutes || 0);

                                                                // Check for Self-Pay Anesthesia in notes
                                                                if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                                                                    const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
                                                                    if (match) {
                                                                        orCost += parseFloat(match[2].replace(/,/g, ''));
                                                                    }
                                                                }

                                                                // Calculate total value
                                                                totalValue = cptTotal + orCost;
                                                            }

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
                                                                    <td style={{ fontWeight: '600', color: '#059669' }}>{formatCurrency(cptTotal)}</td>
                                                                    <td style={{ fontWeight: '600', color: '#dc2626' }}>{formatCurrency(orCost)}</td>
                                                                    <td style={{ fontWeight: '700', color: '#1e40af', fontSize: '1.05rem' }}>{formatCurrency(totalValue)}</td>
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
                                        <div className="cost-preview">
                                            Est. OR Cost: <strong>{formatCurrency(estimatedCost)}</strong>
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
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Revenue (MPPR): </span>
                                                        <span style={{ fontWeight: '600', color: '#059669', fontSize: '1.05rem' }}>
                                                            {formatCurrency(projectedRevenue)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>OR Cost: </span>
                                                        <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                            {formatCurrency(estimatedCost)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Est. Labor: </span>
                                                        <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                            {formatCurrency(estimatedCost * 0.3)}
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
