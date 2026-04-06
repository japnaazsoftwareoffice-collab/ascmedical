import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import { calculateORCost, calculateMedicareRevenue, formatCurrency, calculateLaborCost, getSurgeryMetrics, calculateCosmeticFees, normalizeDate, formatDateLocal } from '../utils/hospitalUtils';
import ORBlockSchedule from './ORBlockSchedule';
import './Management.css';

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
        turnoverTime: 0,
        actualStartTime: '',
        actualEndTime: '',
        actualDurationMinutes: 0,
        applyFixedCosmeticFee: false,
        writeOff: 0,
        isProbono: false
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
    const [selectedMonth, setSelectedMonth] = useState(formatDateLocal(new Date()).slice(0, 7)); // YYYY-MM format
    const [expandedMonths, setExpandedMonths] = useState(new Set([formatDateLocal(new Date()).slice(0, 7)]));
    const [selectedProcedureGroup, setSelectedProcedureGroup] = useState('');
    const [cptSearchQuery, setCptSearchQuery] = useState('');
    const [includeLaborSupplies, setIncludeLaborSupplies] = useState(false);

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
                        { id: 2, date: `${y}-${m}-01`, room_name: 'OR 1', provider_name: 'Prysi', start_time: '0730', end_time: '1300' },
                        { id: 3, date: `${y}-${m}-02`, room_name: 'OR 1', provider_name: 'McGee', start_time: '0730', end_time: '1600' },
                        { id: 4, date: `${y}-${m}-02`, room_name: 'OR 1', provider_name: 'Naples Plastic', start_time: '0730', end_time: '1600' }
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

    const isCosmeticSurgeon = selectedSurgeon?.is_cosmetic_surgeon ||
        selectedSurgeon?.specialty?.toLowerCase().includes('plastic') ||
        selectedSurgeon?.specialty?.toLowerCase().includes('cosmetic');


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
        let codesToConsider = cptCodes;
        const surgeonSpecialty = selectedSurgeon?.specialty;
        const search = cptSearchQuery.toLowerCase().trim();

        if (search) {
            // When searching, show all categories that contain matching codes
            codesToConsider = cptCodes.filter(c =>
                (c.code && String(c.code).toLowerCase().includes(search)) ||
                (c.description && c.description.toLowerCase().includes(search))
            );
        } else if (surgeonSpecialty) {
            // Default: show only categories matching surgeon specialty
            codesToConsider = cptCodes.filter(c => c.category === surgeonSpecialty);
        }

        // Always include categories of already selected codes so they don't disappear from UI
        const selected = cptCodes.filter(c => formData.selectedCptCodes.includes(c.code));

        const cats = new Set([...codesToConsider, ...selected].map(c => c.category).filter(Boolean));
        const sortedCats = [...cats].sort();

        // If we have selected codes, prepend a virtual category for visibility
        if (formData.selectedCptCodes.length > 0) {
            return ['Current Selections', ...sortedCats];
        }

        return sortedCats;
    }, [cptCodes, selectedSurgeon, cptSearchQuery, formData.selectedCptCodes]);

    const uniqueSelectedCodes = useMemo(() => {
        const unique = [...new Set(formData.selectedCptCodes)];
        return unique.map(code => cptCodes.find(c => String(c.code) === String(code))).filter(Boolean);
    }, [formData.selectedCptCodes, cptCodes]);

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
        const surgeonSpecialty = selectedSurgeon?.specialty;
        const search = cptSearchQuery.toLowerCase().trim();

        // 1. Initial set: filter by specialty if no search is active
        let codes = cptCodes;
        if (search) {
            // If searching, show all matches regardless of specialty
            codes = cptCodes.filter(c =>
                (c.code && String(c.code).toLowerCase().includes(search)) ||
                (c.description && c.description.toLowerCase().includes(search))
            );
        } else if (surgeonSpecialty) {
            // Default view: filter by surgeon's specialty
            codes = codes.filter(c => c.category === surgeonSpecialty);
        }

        // 2. Always include already selected codes so they stay visible
        const selectedIds = new Set(formData.selectedCptCodes);
        const selectedCodes = cptCodes.filter(c => selectedIds.has(c.code));

        // Combine and de-duplicate
        const combined = [...new Map([...codes, ...selectedCodes].map(c => [c.code, c])).values()];

        // 3. Apply body part filter if one is selected
        if (selectedBodyPart) {
            return combined.filter(c => c.body_part === selectedBodyPart || selectedIds.has(c.code));
        }

        return combined;
    }, [cptCodes, selectedSurgeon, selectedBodyPart, cptSearchQuery, formData.selectedCptCodes]);

    // Group surgeries by month
    const surgeriesByMonth = useMemo(() => {
        const grouped = {};
        surgeries.forEach(surgery => {
            const monthKey = normalizeDate(surgery.date).slice(0, 7); // YYYY-MM
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
    // Unified metrics calculation for consistent financial reporting
    const calculateSurgeryFinancials = (surgery) => {
        const metrics = getSurgeryMetrics(surgery, cptCodes, settings, procedureGroupItems);

        // Adjust metrics based on display preferences, but keep full transparency for Pro-Bono cases
        if (!includeLaborSupplies && !metrics.isProbono) {
            // Remove labor/supplies and facility cost from profit calculation
            metrics.netProfit = metrics.netProfit + metrics.laborCost + metrics.supplyCosts + metrics.internalRoomCost;
            // Subtract supply revenue to show only Room + CPT
            metrics.netProfit = metrics.netProfit - metrics.supplyCosts;
            // For insurance views, display 0 for hidden costs
            metrics.totalRevenue = Math.max(0, metrics.totalRevenue - metrics.supplyCosts);
            metrics.laborCost = 0;
            metrics.supplyCosts = 0;
            metrics.internalRoomCost = 0;
        } else if (metrics.isProbono) {
            // Pro-Bono always shows 0 revenue
            metrics.totalRevenue = 0;
        }

        return {
            cptTotal: metrics.cptRevenue,
            orCost: metrics.facilityRevenue,
            totalValue: metrics.totalRevenue,
            netProfit: metrics.netProfit,
            supplyCosts: metrics.supplyCosts,
            internalRoomCost: metrics.internalRoomCost,
            laborCost: metrics.laborCost,
            isCosmetic: metrics.isCosmetic,
            isProbono: metrics.isProbono
        };
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
            // Always add the code to allow duplicates
            const newSelectedCodes = [...prev.selectedCptCodes, code];

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

            const fees = calculateCosmeticFees(suggestedDuration);

            return {
                ...prev,
                selectedCptCodes: newSelectedCodes,
                durationMinutes: suggestedDuration,
                turnoverTime: totalTurnover,
                cosmeticFacilityFee: fees.facilityFee,
                cosmeticAnesthesiaFee: fees.anesthesiaFee
            };
        });

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Added Code: ${code}`,
            showConfirmButton: false,
            timer: 1000
        });
    };

    const handleRemoveCptInstance = (index) => {
        setFormData(prev => {
            const newSelectedCodes = [...prev.selectedCptCodes];
            newSelectedCodes.splice(index, 1);

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

            const fees = calculateCosmeticFees(suggestedDuration);

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
            cpt_codes: formData.selectedCptCodes,
            status: editingSurgery ? editingSurgery.status : 'scheduled',
            supplies_cost: formData.suppliesCost || 0,
            implants_cost: formData.implantsCost || 0,
            medications_cost: formData.medicationsCost || 0,
            actual_start_time: formData.startTime || null,
            actual_end_time: formData.actualEndTime || null,
            actual_duration_minutes: formData.actualDurationMinutes || null,
            is_probono: formData.isProbono
        };

        // Note generation logic for fixed fee vs CPT
        let notes = '';
        if (formData.applyFixedCosmeticFee) {
            notes = `Fixed Facility Fee Case - Facility: $${formData.cosmeticFacilityFee.toLocaleString()}, Anesthesia: $${formData.cosmeticAnesthesiaFee.toLocaleString()}`;
        }

        if (formData.isSelfPayAnesthesia && formData.anesthesiaFee > 0) {
            const rateName = formData.selfPayRateName ? ` (${formData.selfPayRateName})` : '';
            const anesthesiaNote = `Self-Pay Anesthesia${rateName}: $${formData.anesthesiaFee.toLocaleString()}`;
            notes = notes ? `${notes}; ${anesthesiaNote}` : anesthesiaNote;
        }
        surgeryData.notes = notes || null; // Force null if empty to clear DB field

        surgeryData.write_off = formData.writeOff || 0;

        try {
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
                    selectedCptCodes: formData.selectedCptCodes
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

            // Only reset form on success
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
                turnoverTime: 0,
                isProbono: false
            });
        } catch (error) {
            // Error is already handled by Swal in handleScheduleSurgery (App.jsx)
            console.error('Submission failed:', error);
        }
    };

    const handleEdit = (surgery) => {
        const formatTimeForInput = (time) => { if (!time) return ''; const t = String(time); if (t.includes(':')) { const parts = t.split(':'); return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0'); } if (t.length === 4 && !isNaN(t)) { return t.slice(0, 2) + ':' + t.slice(2); } return t; };
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
            startTime: formatTimeForInput(surgery.start_time),
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
            })(),
            actualStartTime: formatTimeForInput(surgery.actual_start_time),
            actualEndTime: formatTimeForInput(surgery.actual_end_time),
            actualDurationMinutes: surgery.actual_duration_minutes || 0,
            applyFixedCosmeticFee: false, // Per request: always off by default when starting edit
            writeOff: surgery.write_off || 0,
            isProbono: surgery.is_probono || false
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
            turnoverTime: 60,
            applyFixedCosmeticFee: false,
            writeOff: 0,
            isProbono: false
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

    // Calculate current form metrics for display
    const formMetrics = useMemo(() => {
        // Construct a dummy surgery object from form data for consistent metrics calculation
        // Build notes for dummy surgery to trigger correct logic in getSurgeryMetrics
        let dummyNotes = '';
        if (formData.applyFixedCosmeticFee) {
            dummyNotes = 'Fixed Facility Fee Case ';
            dummyNotes += `Facility Fee: $${formData.cosmeticFacilityFee}, Anesthesia: $${formData.cosmeticAnesthesiaFee}`;
        }
        if (formData.isSelfPayAnesthesia) {
            dummyNotes += `; Self-Pay Anesthesia: $${formData.anesthesiaFee}`;
        }
        const dummySurgery = {
            duration_minutes: formData.durationMinutes,
            turnover_time: formData.turnoverTime,
            cpt_codes: formData.selectedCptCodes,
            supplies_cost: formData.suppliesCost,
            implants_cost: formData.implantsCost,
            medications_cost: formData.medicationsCost,
            actual_duration_minutes: formData.actualDurationMinutes,
            notes: dummyNotes,
            write_off: formData.writeOff,
            is_probono: formData.isProbono
        };

        const metrics = getSurgeryMetrics(dummySurgery, cptCodes, settings, procedureGroupItems);

        // If user wants to exclude Labor & Supplies from the calculation (Insurance View)
        // BUT for Pro-Bono always show full internal costs for transparency
        if (!includeLaborSupplies && !metrics.isProbono) {
            // 1. Remove labor/supplies and facility cost from the cost side of profit
            metrics.netProfit = metrics.netProfit + metrics.laborCost + metrics.supplyCosts + metrics.internalRoomCost;

            // 2. Remove supplies from the revenue side (user wants room + cpt only)
            metrics.netProfit = metrics.netProfit - metrics.supplyCosts;
            metrics.totalRevenue = Math.max(0, metrics.totalRevenue - metrics.supplyCosts);

            // 3. Zero out the displayed costs
            metrics.laborCost = 0;
            metrics.supplyCosts = 0;
            metrics.internalRoomCost = 0;
        } else if (metrics.isProbono) {
            // Pro-Bono always shows 0 revenue
            metrics.totalRevenue = 0;
        }

        return metrics;
    }, [formData, isCosmeticSurgeon, cptCodes, settings, procedureGroupItems, includeLaborSupplies]);

    const projectedRevenue = formMetrics.totalRevenue;
    const projectedMargin = formMetrics.netProfit;
    const internalFacilityCost = formMetrics.internalRoomCost;
    const billableFacilityFee = formMetrics.facilityRevenue;

    const effectiveDuration = formData.actualDurationMinutes || formData.durationMinutes;

    // Determine cost tier
    const costTier = useMemo(() => {
        const minutes = effectiveDuration;
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
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Surgery Log</h3>
                                <p className="card-subtitle">Recent and upcoming scheduled surgeries organized by month.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <input
                                    type="checkbox"
                                    id="global-toggle-costs"
                                    checked={includeLaborSupplies}
                                    onChange={(e) => setIncludeLaborSupplies(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="global-toggle-costs" style={{ fontSize: '0.9rem', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>
                                    Include Labor/Supplies in Calculations
                                </label>
                            </div>
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
                                                                        {(surgery.is_probono || surgery.isProbono) && (
                                                                            <div style={{ marginTop: '4px' }}>
                                                                                <span className="badge" style={{
                                                                                    background: '#fdf2f8',
                                                                                    color: '#9d174d',
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '0.8rem',
                                                                                    border: '1px solid #f9a8d4',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    fontWeight: '700'
                                                                                }}>
                                                                                    💗 Pro-Bono Case
                                                                                </span>
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
                                                                    <td style={{ fontWeight: '600', color: isCosmeticSurgery ? '#cbd5e1' : '#059669' }}>{isCosmeticSurgery ? '---' : formatCurrency(cptTotal)}</td>
                                                                    <td style={{ fontWeight: '600', color: !isCosmeticSurgery ? '#cbd5e1' : '#059669' }}>{!isCosmeticSurgery ? '---' : formatCurrency(orCost)}</td>
                                                                    <td style={{ fontWeight: '700', color: '#1e40af', fontSize: '1.05rem' }}>{formatCurrency(totalValue)}</td>
                                                                    <td style={{
                                                                        fontWeight: '700',
                                                                        color: netProfit >= 0 ? '#059669' : '#dc2626',
                                                                        fontSize: '1.05rem'
                                                                    }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                                            {formatCurrency(netProfit)}
                                                                            {(surgery.is_probono || surgery.isProbono) && (
                                                                                <span style={{
                                                                                    fontSize: '0.65rem',
                                                                                    background: '#fff1f2',
                                                                                    color: '#e11d48',
                                                                                    padding: '1px 6px',
                                                                                    borderRadius: '4px',
                                                                                    marginTop: '2px',
                                                                                    border: '1px solid #fb7185',
                                                                                    fontWeight: '600'
                                                                                }}>
                                                                                    💗 Charity Loss
                                                                                </span>
                                                                            )}
                                                                            {isCosmeticSurgery && (
                                                                                <span style={{
                                                                                    fontSize: '0.65rem',
                                                                                    background: '#ecfdf5',
                                                                                    color: '#047857',
                                                                                    padding: '1px 6px',
                                                                                    borderRadius: '4px',
                                                                                    marginTop: '2px',
                                                                                    border: '1px solid #10b981',
                                                                                    fontWeight: '600'
                                                                                }}>
                                                                                    ✨ Fixed Profit
                                                                                </span>
                                                                            )}
                                                                        </div>
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
                                                const fees = calculateCosmeticFees(formData.durationMinutes);

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
                                            const fees = calculateCosmeticFees(duration);
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

                                    {/* Actual Timing Section - for logging completed cases or manual overrides */}
                                    <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem' }}>Actual Case Timing</h4>
                                            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fcd34d' }}>Manual Log</span>
                                        </div>

                                        <div className="form-row" style={{ marginBottom: 0 }}>
                                            <div className="form-group">
                                                <label style={{ color: '#92400e' }}>Actual End</label>
                                                <input
                                                    type="time"
                                                    className="form-input"
                                                    value={formData.actualEndTime}
                                                    onChange={(e) => {
                                                        const start = formData.startTime;
                                                        const end = e.target.value;
                                                        let duration = formData.actualDurationMinutes;
                                                        if (start && end) {
                                                            const [sH, sM] = start.split(':').map(Number);
                                                            const [eH, eM] = end.split(':').map(Number);
                                                            duration = (eH * 60 + eM) - (sH * 60 + sM);
                                                            if (duration < 0) duration += 1440;
                                                        }
                                                        setFormData({ ...formData, actualEndTime: end, actualDurationMinutes: duration });
                                                    }}
                                                    style={{ borderColor: '#fcd34d' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ color: '#92400e' }}>Actual Minutes</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder="Auto-calculated"
                                                    value={formData.actualDurationMinutes || ''}
                                                    onChange={(e) => setFormData({ ...formData, actualDurationMinutes: parseInt(e.target.value) || 0 })}
                                                    style={{ borderColor: '#fcd34d' }}
                                                />
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                            * Tracking actual times provides more accurate OR utilization and surgeon efficiency ratings.
                                        </p>
                                    </div>


                                </div>

                                {/* Always show CPT Selection - enabled for Cosmetic/Plastics as well now */}
                                {true && (
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
                                                            {cptSearchQuery ? (
                                                                <>Searching for <strong>"{cptSearchQuery}"</strong> across all categories</>
                                                            ) : (
                                                                <>Showing <strong>{selectedSurgeon.specialty}</strong> procedures for <strong>{selectedSurgeon.name}</strong></>
                                                            )}
                                                        </span>
                                                    </div>

                                                    {/* CPT Search Input */}
                                                    <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Search by code or description (e.g. 19301)..."
                                                            value={cptSearchQuery}
                                                            onChange={(e) => setCptSearchQuery(e.target.value)}
                                                            className="form-input"
                                                            style={{
                                                                paddingLeft: '2.5rem',
                                                                height: '38px',
                                                                fontSize: '0.9rem',
                                                                marginBottom: 0,
                                                                borderColor: cptSearchQuery ? '#3b82f6' : '#bae6fd'
                                                            }}
                                                        />
                                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="11" cy="11" r="8"></circle>
                                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                            </svg>
                                                        </span>
                                                        {cptSearchQuery && (
                                                            <button
                                                                onClick={() => setCptSearchQuery('')}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '12px',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#94a3b8',
                                                                    cursor: 'pointer',
                                                                    padding: '4px'
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                </svg>
                                                            </button>
                                                        )}
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
                                                             let categoryCodes;
                                                             let categoryLabel = category;
                                                             let isPriority = false;

                                                             if (category === 'Current Selections') {
                                                                 categoryCodes = uniqueSelectedCodes;
                                                                 categoryLabel = 'Active Procedures';
                                                                 isPriority = true;
                                                             } else {
                                                                 // Filter out already shown procedures from their base categories to prioritize top-view
                                                                 categoryCodes = filteredCptCodes.filter(c => 
                                                                     c.category === category && 
                                                                     !formData.selectedCptCodes.includes(c.code)
                                                                 );
                                                             }

                                                             // Hide regular category if all its codes are selected (moved to top)
                                                             if (!isPriority && categoryCodes.length === 0) return null;
                                                            return (
                                                                <div key={categoryLabel} style={{ marginBottom: '1.5rem' }}>
                                                                    <h4 style={{
                                                                         fontSize: '0.95rem',
                                                                         fontWeight: '600',
                                                                         color: isPriority ? '#0ea5e9' : '#1e293b',
                                                                         marginBottom: '0.75rem',
                                                                         padding: '0.5rem',
                                                                         background: isPriority ? '#f0f9ff' : '#f1f5f9',
                                                                         borderRadius: '6px',
                                                                         borderLeft: `4px solid ${isPriority ? '#0ea5e9' : '#3b82f6'}`
                                                                     }}>
                                                                         {categoryLabel}
                                                                    </h4>
                                                                    <div className="cpt-grid">
                                                                        {categoryCodes.map(cpt => {
                                                                             const selectionCount = formData.selectedCptCodes.filter(c => String(c) === String(cpt.code)).length;
                                                                             return (
                                                                                 <div
                                                                                     key={cpt.code}
                                                                                     className={'cpt-card ' + (selectionCount > 0 ? 'selected' : '')}
                                                                                     onClick={() => handleCptToggle(cpt.code)}
                                                                                     style={{ position: 'relative' }}
                                                                                 >
                                                                                     {selectionCount > 0 && (
                                                                                         <div className="cpt-badge-count" style={{
                                                                                             position: 'absolute',
                                                                                             top: '-8px',
                                                                                             right: '-8px',
                                                                                             background: '#3b82f6',
                                                                                             color: 'white',
                                                                                             borderRadius: '50%',
                                                                                             width: '24px',
                                                                                             height: '24px',
                                                                                             display: 'flex',
                                                                                             alignItems: 'center',
                                                                                             justifyContent: 'center',
                                                                                             fontSize: '0.8rem',
                                                                                             fontWeight: 'bold',
                                                                                             boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                             zIndex: 2,
                                                                                             border: '2px solid white'
                                                                                         }}>
                                                                                             {selectionCount}
                                                                                         </div>
                                                                                     )}
                                                                                     <div className="cpt-card-header">
                                                                                         <span className="cpt-code-badge">{cpt.code}</span>
                                                                                         <span className="cpt-price">{formatCurrency(cpt.gross_charge || cpt.reimbursement)}</span>
                                                                                     </div>
                                                                                     <div className="cpt-description">{cpt.description}</div>
                                                                                 </div>
                                                                             );
                                                                         })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {formData.selectedCptCodes.length > 0 && (
                                                     <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                                         <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                 <path d="M9 11l3 3L22 4"></path>
                                                                 <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                                             </svg>
                                                             Selected Procedures ({formData.selectedCptCodes.length}):
                                                         </div>
                                                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                             {formData.selectedCptCodes.map((code, index) => {
                                                                 const cpt = cptCodes.find(c => String(c.code) === String(code));
                                                                 return (
                                                                     <div key={code + '-' + index} style={{
                                                                         background: 'white',
                                                                         border: '1px solid #bbf7d0',
                                                                         padding: '6px 10px',
                                                                         borderRadius: '8px',
                                                                         fontSize: '0.85rem',
                                                                         display: 'flex',
                                                                         alignItems: 'center',
                                                                         gap: '8px',
                                                                         boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                                         transition: 'all 0.2s ease'
                                                                     }}>
                                                                         <span style={{ fontWeight: '700', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{code}</span>
                                                                         <span style={{ color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cpt ? cpt.description : ''}>
                                                                             {cpt ? cpt.description : 'Procedure'}
                                                                         </span>
                                                                         <button
                                                                             type="button"
                                                                             onClick={(e) => {
                                                                                 e.stopPropagation();
                                                                                 handleRemoveCptInstance(index);
                                                                             }}
                                                                             style={{
                                                                                 border: 'none',
                                                                                 background: '#fee2e2',
                                                                                 color: '#ef4444',
                                                                                 cursor: 'pointer',
                                                                                 padding: '4px',
                                                                                 display: 'flex',
                                                                                 alignItems: 'center',
                                                                                 borderRadius: '4px',
                                                                                 marginLeft: '4px'
                                                                             }}
                                                                             title="Remove"
                                                                         >
                                                                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                                 <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                                 <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                             </svg>
                                                                         </button>
                                                                     </div>
                                                                 );
                                                             })}
                                                         </div>
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

                                {/* Explicit Fixed Fee Toggle */}
                                 {isCosmeticSurgeon && (
                                <div style={{
                                    marginTop: '1.5rem',
                                    padding: '1.25rem',
                                    background: formData.applyFixedCosmeticFee ? '#fff7ed' : '#f8fafc',
                                    borderRadius: '12px',
                                    border: `2px solid ${formData.applyFixedCosmeticFee ? '#fb923c' : '#e2e8f0'}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            id="applyFixedFee"
                                            checked={formData.applyFixedCosmeticFee}
                                            onChange={(e) => setFormData({ ...formData, applyFixedCosmeticFee: e.target.checked })}
                                            style={{ width: '1.3rem', height: '1.3rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="applyFixedFee" style={{ fontSize: '1.05rem', fontWeight: '700', cursor: 'pointer', color: '#9a3412' }}>
                                            Apply Fixed Facility Fee (Cosmetic/Plastics)
                                        </label>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.85rem', color: '#b45309' }}>
                                        When enabled, the surgery will be billed as a flat-rate cosmetic case based on duration, ignoring CPT reimbursements for facility revenue.
                                    </p>

                                    {formData.applyFixedCosmeticFee && (
                                        <div className="fade-in" style={{
                                            marginTop: '1rem',
                                            marginLeft: '2rem',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '1rem'
                                        }}>
                                            <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#9a3412', textTransform: 'uppercase', fontWeight: '700' }}>Est. Facility Fee</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ea580c' }}>{formatCurrency(formData.cosmeticFacilityFee)}</div>
                                            </div>
                                            <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#9a3412', textTransform: 'uppercase', fontWeight: '700' }}>Est. Anesthesia</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ea580c' }}>{formatCurrency(formData.cosmeticAnesthesiaFee)}</div>
                                            </div>
                                        </div>
                                    )}
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

                                {/* Universal Financial Adjustments */}
                                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed #cbd5e1' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📉 Financial Adjustments
                                    </h4>
                                    <div className="form-row">
                                        <div className="form-group" style={{ maxWidth: '300px' }}>
                                            <label style={{ fontWeight: '700', color: '#64748b' }}>Write-Off / Discount</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="form-input"
                                                    style={{
                                                        paddingLeft: '24px',
                                                        background: formData.writeOff > 0 ? '#fff1f2' : 'white',
                                                        borderColor: formData.writeOff > 0 ? '#f43f5e' : '#e2e8f0',
                                                        fontWeight: formData.writeOff > 0 ? '700' : '400'
                                                    }}
                                                    value={formData.writeOff || ''}
                                                    onChange={(e) => setFormData({ ...formData, writeOff: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                    placeholder="Charity, adjustments, etc."
                                                />
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                                Amount will be subtracted from total revenue.
                                            </p>
                                        </div>

                                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                background: formData.isProbono ? '#fdf2f8' : '#f8fafc',
                                                padding: '10px 15px',
                                                borderRadius: '10px',
                                                border: `2px solid ${formData.isProbono ? '#db2777' : '#e2e8f0'}`,
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer'
                                            }} onClick={() => setFormData({ ...formData, isProbono: !formData.isProbono })}>
                                                <input
                                                    type="checkbox"
                                                    id="isProbono"
                                                    checked={formData.isProbono}
                                                    onChange={(e) => setFormData({ ...formData, isProbono: e.target.checked })}
                                                    style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <label htmlFor="isProbono" style={{ fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', color: formData.isProbono ? '#9d174d' : '#475569', marginBottom: 0 }}>
                                                    Pro-Bono / Charity Case (Zero Revenue)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Profitability Guardrails */}
                                {(formData.selectedCptCodes.length > 0 || formData.applyFixedCosmeticFee || formData.isProbono) && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: formData.isProbono ? '#fdf2f8' : (formData.applyFixedCosmeticFee ? '#eff6ff' : (projectedMargin < 0 ? '#fee2e2' : '#f0fdf4')),
                                        border: `2px solid ${formData.isProbono ? '#db2777' : (formData.applyFixedCosmeticFee ? '#3b82f6' : (projectedMargin < 0 ? '#dc2626' : '#059669'))}`,
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: formData.isProbono ? '#9d174d' : (formData.applyFixedCosmeticFee ? '#1e40af' : '#64748b'), fontWeight: '700' }}>
                                                        {formData.isProbono ? '💗 Pro-Bono Case Summary' : (formData.applyFixedCosmeticFee ? '💰 Cosmetic Fee Breakdown' : '📊 Financial Projection')}
                                                    </h4>
                                                    {!formData.applyFixedCosmeticFee && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="checkbox"
                                                                id="toggle-costs"
                                                                checked={includeLaborSupplies}
                                                                onChange={(e) => setIncludeLaborSupplies(e.target.checked)}
                                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                            <label htmlFor="toggle-costs" style={{ fontSize: '0.85rem', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}>
                                                                Include Labor/Supplies
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                                                    {formData.applyFixedCosmeticFee ? (
                                                        <>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>CSC Faculty Fee:</span>
                                                                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.2rem' }}>
                                                                    {formatCurrency(formData.cosmeticFacilityFee || 0)}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>Anesthesia Fee:</span>
                                                                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.2rem' }}>
                                                                    + {formatCurrency(formData.cosmeticAnesthesiaFee || 0)}
                                                                </span>
                                                            </div>
                                                            {((formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0)) > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>Supplies:</span>
                                                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.2rem' }}>
                                                                        + {formatCurrency(formMetrics.supplyCosts)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {formData.writeOff > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.85rem', color: '#f43f5e', marginBottom: '2px' }}>Write-Off / Disc:</span>
                                                                    <span style={{ fontWeight: '700', color: '#e11d48', fontSize: '1.2rem' }}>
                                                                        - {formatCurrency(formData.writeOff)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Rev (CPT+Fee{includeLaborSupplies ? '+Supplies' : ''}): </span>
                                                                <span style={{ fontWeight: '600', color: '#059669', fontSize: '1.05rem' }}>
                                                                    {formatCurrency(projectedRevenue)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{formData.actualDurationMinutes > 0 ? 'Actual' : 'Est.'} Room Cost: </span>
                                                                <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                                    {formatCurrency(internalFacilityCost)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{formData.actualDurationMinutes > 0 ? 'Actual' : 'Est.'} Labor: </span>
                                                                <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                                    {formatCurrency(formMetrics.laborCost)}
                                                                </span>
                                                            </div>
                                                            {formData.writeOff > 0 && (
                                                                <div>
                                                                    <span style={{ fontSize: '0.85rem', color: '#f43f5e' }}>Write-Off / Disc: </span>
                                                                    <span style={{ fontWeight: '600', color: '#e11d48', fontSize: '1.05rem' }}>
                                                                        - {formatCurrency(formData.writeOff)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {((formData.suppliesCost || 0) + (formData.implantsCost || 0) + (formData.medicationsCost || 0)) > 0 && (
                                                                <div>
                                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Supplies: </span>
                                                                    <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '1.05rem' }}>
                                                                        {formatCurrency(formMetrics.supplyCosts)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    <div style={{
                                                        gridColumn: '1 / -1',
                                                        borderTop: `2px solid ${formData.applyFixedCosmeticFee ? '#bfdbfe' : '#e2e8f0'}`,
                                                        paddingTop: '1rem',
                                                        marginTop: '0.5rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div>
                                                            <span style={{ fontSize: '1rem', color: formData.applyFixedCosmeticFee ? '#1e40af' : '#1e293b', fontWeight: '700' }}>
                                                                {formData.applyFixedCosmeticFee ? 'Total Fees Paid by User:' : `${formData.actualDurationMinutes > 0 ? 'Actual' : 'Total'} Internal Cost: `}
                                                            </span>
                                                            <span style={{ fontWeight: '800', color: formData.applyFixedCosmeticFee ? '#1d4ed8' : '#dc2626', fontSize: '1.5rem', marginLeft: '0.75rem' }}>
                                                                {formatCurrency(
                                                                    formData.applyFixedCosmeticFee ?
                                                                        (projectedRevenue) :
                                                                        (formMetrics.internalRoomCost +
                                                                            formMetrics.laborCost +
                                                                            formMetrics.supplyCosts +
                                                                            (formMetrics.anesthesiaRevenue || 0))
                                                                )}
                                                            </span>
                                                        </div>
                                                        {!formData.applyFixedCosmeticFee && (
                                                            <div>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cost Tier: </span>
                                                                <span style={{ fontWeight: '600', color: costTier.color, fontSize: '0.9rem' }}>
                                                                    {costTier.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {!formData.applyFixedCosmeticFee && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                                        {formData.actualDurationMinutes > 0 ? 'Actual Margin' : 'Projected Margin'}
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
                                            )}
                                        </div>

                                        {/* High Tier Cost Alert */}
                                        {projectedMargin < 0 && effectiveDuration > 120 && (
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
                                                        ⚠️ High Tier Cost Alert: {formData.actualDurationMinutes > 0 ? 'Actual' : 'Projected'} Margin is Negative
                                                    </div>
                                                    <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>
                                                        This case is in Tier 3 (${400}/30min surcharge) with a negative margin. Consider reducing duration or reviewing CPT codes.
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tier Breach Warning */}
                                        {effectiveDuration > 60 && projectedMargin >= 0 && (
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
                                                    Duration exceeds 60 minutes - Tier {effectiveDuration > 120 ? '3' : '2'} surcharge applies (${effectiveDuration > 120 ? '400' : '300'}/30min)
                                                </span>
                                            </div>
                                        )}

                                        {/* Positive Margin Encouragement */}
                                        {projectedMargin >= 0 && effectiveDuration <= 60 && (
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
