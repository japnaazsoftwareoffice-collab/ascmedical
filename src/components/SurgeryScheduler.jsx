import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import { calculateORCost, formatCurrency } from '../utils/hospitalUtils';
import ORBlockSchedule from './ORBlockSchedule';
import './Management.css';

// Cosmetic fee calculator based on duration
const calculateCosmeticFees = (durationMinutes) => {
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

    return {
        facilityFee: facilityRates[durationMinutes] || 0,
        anesthesiaFee: anesthesiaRates[durationMinutes] || 0
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

const SurgeryScheduler = ({ patients, surgeons, cptCodes, surgeries = [], onSchedule, onUpdate, onDelete }) => {
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
        selfPayRateName: ''
    });

    const [selectedCategory, setSelectedCategory] = useState('');
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

    // Extract unique categories
    const categories = useMemo(() => {
        return [...new Set(cptCodes.map(c => c.category))];
    }, [cptCodes]);

    // Filter CPT codes based on selected category
    const filteredCptCodes = useMemo(() => {
        if (!selectedCategory) return [];
        return cptCodes.filter(c => c.category === selectedCategory);
    }, [cptCodes, selectedCategory]);

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
            status: 'scheduled'
        };

        // Add notes for cosmetic surgeries or self-pay anesthesia
        let notes = '';
        if (isCosmeticSurgeon) {
            notes = `Cosmetic Surgery - Facility Fee: $${formData.cosmeticFacilityFee.toLocaleString()}, Anesthesia: $${formData.cosmeticAnesthesiaFee.toLocaleString()}`;
        }
        if (formData.isSelfPayAnesthesia && formData.anesthesiaFee > 0) {
            const anesthesiaNote = `Self-Pay Anesthesia: $${formData.anesthesiaFee.toLocaleString()}`;
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
            selfPayRateName: ''
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
            const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\\d,]+)/);
            if (match) {
                anesthesiaFee = parseFloat(match[1].replace(/,/g, ''));
                isSelfPay = true;

                // Attempt to find matching rate name
                const matchingRate = selfPayRates.find(r => r.price === anesthesiaFee);
                if (matchingRate) {
                    selfPayRateName = matchingRate.name;
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

            {/* Surgery Log Table */}
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
                                    const facilityMatch = surgery.notes.match(/Facility Fee: \$([\\d,]+)/);
                                    const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\\d,]+)/);
                                    const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                                    const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                                    totalValue = facilityFee + anesthesiaFee;
                                }
                            } else {
                                const cptTotal = surgery.cpt_codes?.reduce((cptSum, code) => {
                                    const cptCode = cptCodes.find(c => c.code === code);
                                    return cptSum + (cptCode?.reimbursement || 0);
                                }, 0) || 0;

                                let orCost = calculateORCost(surgery.duration_minutes || 0);

                                if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                                    const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\\d,]+)/);
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
                                                            const facilityMatch = surgery.notes.match(/Facility Fee: \$([\\d,]+)/);
                                                            const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\\d,]+)/);
                                                            const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                                                            const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
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
                                                            const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\\d,]+)/);
                                                            if (match) {
                                                                orCost += parseFloat(match[1].replace(/,/g, ''));
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

            {/* Schedule Form - Conditionally Rendered */}
            {isFormOpen && (
                <div id="surgery-form-section" className="content-card fade-in">
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
                                        setFormData({ ...formData, doctorName: newDoctorName, startTime: newStartTime });
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
                                    const fees = calculateCosmeticFees(duration);
                                    setFormData({
                                        ...formData,
                                        durationMinutes: duration,
                                        cosmeticFacilityFee: fees.facilityFee,
                                        cosmeticAnesthesiaFee: fees.anesthesiaFee
                                    });
                                }}
                            >
                                <option value={30}>0.5 hour (30 min)</option>
                                <option value={60}>1.0 hour (60 min)</option>
                                <option value={90}>1.5 hours (90 min)</option>
                                <option value={120}>2.0 hours (120 min)</option>
                                <option value={150}>2.5 hours (150 min)</option>
                                <option value={180}>3.0 hours (180 min)</option>
                                <option value={210}>3.5 hours (210 min)</option>
                                <option value={240}>4.0 hours (240 min)</option>
                                <option value={270}>4.5 hours (270 min)</option>
                                <option value={300}>5.0 hours (300 min)</option>
                                <option value={330}>5.5 hours (330 min)</option>
                                <option value={360}>6.0 hours (360 min)</option>
                                <option value={390}>6.5 hours (390 min)</option>
                                <option value={420}>7.0 hours (420 min)</option>
                                <option value={480}>7.5 hours (480 min)</option>
                                <option value={540}>8.0 hours (540 min)</option>
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
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Quantum Anesthesia:</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0369a1' }}>
                                                {formatCurrency(formData.cosmeticAnesthesiaFee)}
                                            </div>
                                        </div>
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
                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                                    Click on procedures to add them to the surgery. You can select from multiple categories.
                                </p>

                                {/* Show all categories with their CPT codes */}
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                                    {categories.map(category => {
                                        const categoryCodes = cptCodes.filter(c => c.category === category);
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
                                    })}
                                </div>

                                {formData.selectedCptCodes.length > 0 && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                        <strong>Selected Codes:</strong> {formData.selectedCptCodes.join(', ')}
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
            )}
        </div>
    );
};

export default SurgeryScheduler;
