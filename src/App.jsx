import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientManagement from './components/PatientManagement';
import SurgeryScheduler from './components/SurgeryScheduler';
import CPTManager from './components/CPTManager';
import SurgeonManagement from './components/SurgeonManagement';
import ORUtilization from './components/ORUtilization';
import SurgeonSchedule from './components/SurgeonSchedule';
import SurgeonPatients from './components/SurgeonPatients';
import PatientInfo from './components/PatientInfo';
import PatientSurgeries from './components/PatientSurgeries';
import PatientBilling from './components/PatientBilling';
import ORBlockSchedule from './components/ORBlockSchedule';
import UserManagement from './components/UserManagement';
import ClaimsManagement from './components/ClaimsManagement';
import Settings from './components/Settings';
import CPTAutoUpdate from './components/CPTAutoUpdate';
import SurgeonScorecard from './components/SurgeonScorecard';
import Swal from 'sweetalert2';
import { db } from './lib/supabase';
import { calculateORCost, calculateMedicareRevenue, calculateLaborCost } from './utils/hospitalUtils';
import './App.css';
import Chatbot from './components/Chatbot';

function App() {
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage if available
    const savedUser = localStorage.getItem('hospital_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [view, setView] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [cptCodes, setCptCodes] = useState([]);
  const [users, setUsers] = useState([]);
  const [billing, setBilling] = useState([]);
  const [claims, setClaims] = useState([]);
  const [orBlockSchedule, setOrBlockSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('hospital_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hospital_user');
    }
  }, [user]);

  // Load all data when user logs in
  useEffect(() => {
    if (user) {
      loadAllData();
      // Set default view based on role
      if (user.role === 'admin') {
        setView('dashboard');
      } else if (user.role === 'surgeon') {
        setView('my-schedule');
      } else if (user.role === 'patient') {
        setView('my-info');
      }
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if database is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database configured - use mock data
        console.log('No database configured. Using mock data.');
        const { INITIAL_PATIENTS, INITIAL_SURGEONS, CPT_CODES } = await import('./data/mockData');

        // Transform surgeons to add 'name' property
        const surgeonsWithNames = (INITIAL_SURGEONS || []).map(surgeon => ({
          ...surgeon,
          name: surgeon.name || `${surgeon.firstname || surgeon.first_name || ''} ${surgeon.lastname || surgeon.last_name || ''}`.trim()
        }));

        setPatients(INITIAL_PATIENTS || []);
        setSurgeons(surgeonsWithNames);
        setCptCodes(CPT_CODES || []);
        setSurgeries([]);
        setBilling([]);
        setLoading(false);
        return;
      }

      // Database is configured - fetch from Supabase
      const [patientsData, surgeonsData, cptCodesData, surgeriesData, billingData, usersData, claimsData, orBlockScheduleData] = await Promise.all([
        db.getPatients(),
        db.getSurgeons(),
        db.getCPTCodes(),
        db.getSurgeries(),
        user.role === 'patient' ? db.getBillingByPatient(user.patient_id) : db.getBilling(),
        user.role === 'admin' ? db.getUsers() : Promise.resolve([]),
        db.getClaims ? db.getClaims() : Promise.resolve([]),
        db.getORBlockSchedule ? db.getORBlockSchedule() : Promise.resolve([])
      ]);

      // Transform surgeons to add 'name' property
      const surgeonsWithNames = (surgeonsData || []).map(surgeon => ({
        ...surgeon,
        name: surgeon.name || `${surgeon.firstname || surgeon.first_name || ''} ${surgeon.lastname || surgeon.last_name || ''}`.trim()
      }));

      setPatients(patientsData);
      setSurgeons(surgeonsWithNames);
      setCptCodes(cptCodesData);
      setSurgeries(surgeriesData);
      setBilling(billingData);
      setUsers(usersData);
      setClaims(claimsData || []);
      setOrBlockSchedule(orBlockScheduleData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      // Fallback to mock data on error
      console.log('Database error. Falling back to mock data.');
      const { INITIAL_PATIENTS, INITIAL_SURGEONS, CPT_CODES } = await import('./data/mockData');

      // Transform surgeons to add 'name' property
      const surgeonsWithNames = (INITIAL_SURGEONS || []).map(surgeon => ({
        ...surgeon,
        name: surgeon.name || `${surgeon.firstname || surgeon.first_name || ''} ${surgeon.lastname || surgeon.last_name || ''}`.trim()
      }));

      setPatients(INITIAL_PATIENTS || []);
      setSurgeons(surgeonsWithNames);
      setCptCodes(CPT_CODES || []);
      setSurgeries([]);
      setBilling([]);
      setError(null); // Clear error since we're using fallback
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // If no database, use mock login
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // Mock login logic
        const mockUsers = {
          'admin@hospital.com': { email, role: 'admin', full_name: 'Admin User', id: 1 },
          'surgeon@hospital.com': { email, role: 'surgeon', full_name: 'Dr. Sarah Williams', id: 2, surgeon_id: 1 },
          'patient@hospital.com': { email, role: 'patient', full_name: 'John Doe', id: 3, patient_id: 1 }
        };

        const userData = mockUsers[email];
        if (userData && password) {
          setUser(userData);
          return;
        }
        throw new Error('Invalid credentials');
      }

      // Try database login
      const userData = await db.login(email, password);
      setUser(userData);
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
    setPatients([]);
    setSurgeries([]);
    setSurgeons([]);
    setCptCodes([]);
    setBilling([]);
    setClaims([]);
  };

  const handleAddPatient = async (newPatient) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const patientWithId = { ...newPatient, id: Date.now() };
        setPatients([patientWithId, ...patients]);
        return patientWithId;
      }

      const addedPatient = await db.addPatient(newPatient);
      setPatients([addedPatient, ...patients]);
      return addedPatient;
    } catch (err) {
      console.error('Error adding patient:', err);
      // Fallback to local state
      const patientWithId = { ...newPatient, id: Date.now() };
      setPatients([patientWithId, ...patients]);
      return patientWithId;
    }
  };

  const handleUpdatePatient = async (updatedPatient) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
        return;
      }

      await db.updatePatient(updatedPatient.id, updatedPatient);
      setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    } catch (err) {
      console.error('Error updating patient:', err);
      // Fallback
      setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    }
  };

  const handleDeletePatient = async (id) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setPatients(patients.filter(p => p.id !== id));
        return;
      }

      await db.deletePatient(id);
      setPatients(patients.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting patient:', err);
      // Fallback
      setPatients(patients.filter(p => p.id !== id));
    }
  };

  const handleScheduleSurgery = async (newSurgery) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Find surgeon_id from surgeon name
      // Handle both snake_case (from SurgeryScheduler) and camelCase
      const doctorName = newSurgery.doctor_name || newSurgery.doctorName;
      const surgeon = surgeons.find(s => s.name === doctorName);

      const surgeryData = {
        patient_id: newSurgery.patient_id || newSurgery.patientId,
        surgeon_id: surgeon?.id || null,
        doctor_name: doctorName,
        date: newSurgery.date,
        start_time: newSurgery.start_time || newSurgery.startTime,
        duration_minutes: newSurgery.duration_minutes || newSurgery.durationMinutes,
        cpt_codes: newSurgery.cpt_codes || newSurgery.selectedCptCodes,
        notes: newSurgery.notes,
        status: 'scheduled',
        supplies_cost: newSurgery.supplies_cost || newSurgery.suppliesCost || 0,
        implants_cost: newSurgery.implants_cost || newSurgery.implantsCost || 0,
        medications_cost: newSurgery.medications_cost || newSurgery.medicationsCost || 0
      };

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const surgeryWithId = { ...surgeryData, id: Date.now() };
        setSurgeries([surgeryWithId, ...surgeries]);
        // setView('dashboard'); // Keep user on scheduler
        return surgeryWithId;
      }

      const addedSurgery = await db.addSurgery(surgeryData);

      // Attach patient and surgeon details for local state to avoid "Unknown"
      const patientDetails = patients.find(p => p.id === parseInt(surgeryData.patient_id));
      const surgeonDetails = surgeons.find(s => s.id === (surgeon?.id || null));

      const surgeryWithDetails = {
        ...addedSurgery,
        patients: patientDetails,
        surgeons: surgeonDetails
      };

      setSurgeries([surgeryWithDetails, ...surgeries]);
      // setView('dashboard'); // Keep user on scheduler
      return addedSurgery;
    } catch (err) {
      console.error('Error scheduling surgery:', err);
      // Fallback to local state
      const patientDetails = patients.find(p => p.id === parseInt(newSurgery.patientId || newSurgery.patient_id));

      const surgeryData = {
        id: Date.now(),
        patient_id: parseInt(newSurgery.patientId || newSurgery.patient_id),
        surgeon_id: null,
        doctor_name: newSurgery.doctor_name || newSurgery.doctorName,
        date: newSurgery.date,
        start_time: newSurgery.start_time || newSurgery.startTime,
        duration_minutes: newSurgery.duration_minutes || newSurgery.durationMinutes,
        cpt_codes: newSurgery.cpt_codes || newSurgery.selectedCptCodes,
        notes: newSurgery.notes,
        status: 'scheduled',
        supplies_cost: newSurgery.supplies_cost || newSurgery.suppliesCost || 0,
        implants_cost: newSurgery.implants_cost || newSurgery.implantsCost || 0,
        medications_cost: newSurgery.medications_cost || newSurgery.medicationsCost || 0,
        patients: patientDetails // Attach for display
      };
      setSurgeries([surgeryData, ...surgeries]);
      // setView('dashboard'); // Keep user on scheduler
      return surgeryData;
    }
  };

  const handleAddSurgeon = async (newSurgeon) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const surgeonWithId = {
          ...newSurgeon,
          id: Date.now(),
          name: newSurgeon.name || `${newSurgeon.firstname || newSurgeon.first_name || ''} ${newSurgeon.lastname || newSurgeon.last_name || ''}`.trim()
        };
        setSurgeons([surgeonWithId, ...surgeons]);
        return surgeonWithId;
      }

      const addedSurgeon = await db.addSurgeon(newSurgeon);
      const surgeonWithName = {
        ...addedSurgeon,
        name: addedSurgeon.name || `${addedSurgeon.firstname || addedSurgeon.first_name || ''} ${addedSurgeon.lastname || addedSurgeon.last_name || ''}`.trim()
      };
      setSurgeons([surgeonWithName, ...surgeons]);
      return surgeonWithName;
    } catch (err) {
      console.error('Error adding surgeon:', err);
      // Fallback to local state
      const surgeonWithId = {
        ...newSurgeon,
        id: Date.now(),
        name: newSurgeon.name || `${newSurgeon.firstname || newSurgeon.first_name || ''} ${newSurgeon.lastname || newSurgeon.last_name || ''}`.trim()
      };
      setSurgeons([surgeonWithId, ...surgeons]);
      return surgeonWithId;
    }
  };

  const handleUpdateSurgeon = async (updatedSurgeon) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const surgeonWithName = {
        ...updatedSurgeon,
        name: updatedSurgeon.name || `${updatedSurgeon.firstname || updatedSurgeon.first_name || ''} ${updatedSurgeon.lastname || updatedSurgeon.last_name || ''}`.trim()
      };

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setSurgeons(surgeons.map(s => s.id === surgeonWithName.id ? surgeonWithName : s));
        return;
      }

      await db.updateSurgeon(surgeonWithName.id, surgeonWithName);
      setSurgeons(surgeons.map(s => s.id === surgeonWithName.id ? surgeonWithName : s));
    } catch (err) {
      console.error('Error updating surgeon:', err);
      // Fallback
      setSurgeons(surgeons.map(s => s.id === updatedSurgeon.id ? updatedSurgeon : s));
    }
  };

  const handleDeleteSurgeon = async (id) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setSurgeons(surgeons.filter(s => s.id !== id));
        return;
      }

      await db.deleteSurgeon(id);
      setSurgeons(surgeons.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting surgeon:', err);
      // Fallback
      setSurgeons(surgeons.filter(s => s.id !== id));
    }
  };

  const handleUpdateSurgery = async (id, updates) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        setSurgeries(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        return;
      }

      await db.updateSurgery(id, updates);
      await loadAllData(); // Reload surgeries from database
    } catch (error) {
      console.error('Error updating surgery:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update surgery',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  const handleDeleteSurgery = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Surgery?',
      text: 'Are you sure you want to delete this surgery?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await db.deleteSurgery(id);
        setSurgeries(prev => prev.filter(s => s.id !== id));
        await Swal.fire({
          title: 'Deleted!',
          text: 'Surgery has been deleted',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting surgery:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete surgery',
          icon: 'error',
          confirmButtonColor: '#3b82f6'
        });
      }
    }
  };

  const handleAddCPT = async (newCPT) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const cptWithId = { ...newCPT, id: Date.now() };
        setCptCodes([cptWithId, ...cptCodes]);
        return cptWithId;
      }

      const addedCPT = await db.addCPTCode(newCPT);
      setCptCodes([addedCPT, ...cptCodes]);
      return addedCPT;
    } catch (err) {
      console.error('Error adding CPT code:', err);
      // Fallback to local state
      const cptWithId = { ...newCPT, id: Date.now() };
      setCptCodes([cptWithId, ...cptCodes]);
      return cptWithId;
    }
  };

  const handleUpdateCPT = async (id, updates) => {
    try {
      await db.updateCPTCode(id, updates);
      await loadAllData(); // Reload CPT codes from database
    } catch (error) {
      console.error('Error updating CPT code:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update CPT code',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  const handleDeleteCPT = async (id) => {
    try {
      await db.deleteCPTCode(id);
      setCptCodes(prev => prev.filter(c => c.id !== id));
      await Swal.fire({
        title: 'Deleted!',
        text: 'CPT code has been deleted',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting CPT code:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete CPT code',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  // User Management Handlers
  const handleAddUser = async (newUser) => {
    try {
      const addedUser = await db.addUser(newUser);
      setUsers([addedUser, ...users]);
      return addedUser;
    } catch (err) {
      console.error('Error adding user:', err);
      throw err;
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      await db.updateUser(updatedUser.id, updatedUser);
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await db.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  // Claims Management Handlers
  const handleAddClaim = async (newClaim) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const claimWithId = { ...newClaim, id: Date.now() };
        setClaims([claimWithId, ...claims]);
        return claimWithId;
      }

      const addedClaim = await db.addClaim(newClaim);
      setClaims([addedClaim, ...claims]);
      return addedClaim;
    } catch (err) {
      console.error('Error adding claim:', err);
      // Fallback to local state
      const claimWithId = { ...newClaim, id: Date.now() };
      setClaims([claimWithId, ...claims]);
      return claimWithId;
    }
  };

  const handleUpdateClaim = async (updatedClaim) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
        return;
      }

      await db.updateClaim(updatedClaim.id, updatedClaim);
      setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
    } catch (err) {
      console.error('Error updating claim:', err);
      // Fallback
      setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
    }
  };

  const handleDeleteClaim = async (id) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setClaims(claims.filter(c => c.id !== id));
        return;
      }

      await db.deleteClaim(id);
      setClaims(claims.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting claim:', err);
      // Fallback
      setClaims(claims.filter(c => c.id !== id));
    }
  };

  // Complete Surgery with Financial Snapshot
  const handleCompleteSurgery = async (surgeryId) => {
    const surgery = surgeries.find(s => s.id === surgeryId);
    if (!surgery) return;

    try {
      // Calculate OR cost
      const actualRoomCost = calculateORCost(surgery.duration_minutes || 0);

      // Calculate labor cost - use ACTUAL anesthesia costs from notes
      let actualLaborCost = 0;
      let laborCostSource = 'Estimated';

      if (surgery.notes) {
        // Check for Self-Pay Anesthesia (e.g., "Self-Pay Anesthesia (Total Hip): $3,200")
        const selfPayMatch = surgery.notes.match(/Self-Pay Anesthesia(?:\s*\([^)]+\))?\s*:\s*\$?\s*([0-9,]+)/i);
        if (selfPayMatch) {
          actualLaborCost = parseFloat(selfPayMatch[1].replace(/,/g, ''));
          laborCostSource = 'Self-Pay Anesthesia';
        }

        // Check for Cosmetic Surgery with Quantum Anesthesia
        const cosmeticAnesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([0-9,]+)/i);
        if (cosmeticAnesthesiaMatch && surgery.notes.includes('Cosmetic Surgery')) {
          actualLaborCost = parseFloat(cosmeticAnesthesiaMatch[1].replace(/,/g, ''));
          laborCostSource = 'Quantum Anesthesia';
        }
      }

      // If no actual anesthesia cost found, use calculated estimate
      if (actualLaborCost === 0) {
        actualLaborCost = calculateLaborCost(surgery.duration_minutes || 0);
        laborCostSource = 'Calculated Estimate';
      }

      // Calculate expected reimbursement
      let expectedReimbursement = 0;
      let reimbursementSource = '';

      // Check if it's a cosmetic surgery
      const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

      if (isCosmeticSurgery && surgery.notes) {
        // Parse cosmetic fees from notes
        const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([0-9,]+)/i);
        const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([0-9,]+)/i);
        const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
        const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
        expectedReimbursement = facilityFee + anesthesiaFee;
        reimbursementSource = 'CSC Facility + Quantum Anesthesia';
      } else if (surgery.cpt_codes && surgery.cpt_codes.length > 0) {
        // Regular surgery with CPT codes - use MPPR
        expectedReimbursement = calculateMedicareRevenue(surgery.cpt_codes, cptCodes);
        reimbursementSource = 'Medicare MPPR';
      }

      // Get supplies costs (if entered)
      const suppliesCost = surgery.supplies_cost || 0;
      const implantsCost = surgery.implants_cost || 0;
      const medicationsCost = surgery.medications_cost || 0;
      const totalSuppliesCost = suppliesCost + implantsCost + medicationsCost;

      // Calculate net margin
      const netMargin = expectedReimbursement - actualRoomCost - actualLaborCost - totalSuppliesCost;

      // Update surgery with financial snapshot
      const updates = {
        status: 'completed',
        actual_room_cost: actualRoomCost,
        actual_labor_cost: actualLaborCost,
        expected_reimbursement: expectedReimbursement,
        financial_snapshot_date: new Date().toISOString(),
        calculation_version: 'v1.1'
      };

      await handleUpdateSurgery(surgeryId, updates);

      // Show financial summary
      await Swal.fire({
        title: 'Surgery Completed!',
        html: `
          <div style="text-align: left; margin-top: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #1e293b;">Financial Summary</h4>
            <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Expected Revenue:</span>
                <strong style="color: #059669;">$${expectedReimbursement.toLocaleString()}</strong>
              </div>
              ${reimbursementSource ? `
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: -0.25rem; padding-left: 0.5rem;">
                  ✓ ${reimbursementSource}
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">OR Cost:</span>
                <strong style="color: #dc2626;">-$${actualRoomCost.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Labor Cost:</span>
                <strong style="color: #dc2626;">-$${actualLaborCost.toLocaleString()}</strong>
              </div>
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: -0.25rem; padding-left: 0.5rem;">
                ✓ ${laborCostSource}
              </div>
              ${totalSuppliesCost > 0 ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Supplies Cost:</span>
                  <strong style="color: #dc2626;">-$${totalSuppliesCost.toLocaleString()}</strong>
                </div>
              ` : ''}
              <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                <span style="color: #1e293b; font-weight: 600;">Net Margin:</span>
                <strong style="color: ${netMargin >= 0 ? '#059669' : '#dc2626'};">$${netMargin.toLocaleString()}</strong>
              </div>
              <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #64748b;">
                Margin: ${expectedReimbursement > 0 ? ((netMargin / expectedReimbursement) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'View Surgeon Scorecard',
        showCancelButton: true,
        cancelButtonText: 'Close'
      }).then((result) => {
        if (result.isConfirmed) {
          setView('scorecard');
        }
      });

    } catch (error) {
      console.error('Error completing surgery:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to complete surgery',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  // Show login screen if not logged in
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading hospital data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <h2>⚠️ Connection Error</h2>
          <p>{error}</p>
          <button onClick={loadAllData} className="btn-submit">
            Retry Connection
          </button>
          <div className="error-help">
            <p>Make sure you've:</p>
            <ul>
              <li>Created a Supabase project</li>
              <li>Added credentials to .env file</li>
              <li>Run the SQL schema</li>
              <li>Restarted the dev server</li>
            </ul>
            <p>See <strong>SUPABASE_SETUP.md</strong> for help</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current patient data for patient role
  const currentPatient = user.role === 'patient' ? patients.find(p => p.id === user.patient_id) : null;
  const currentSurgeon = user.role === 'surgeon' ? surgeons.find(s => s.id === user.surgeon_id) : null;
  const patientSurgeries = user.role === 'patient' ? surgeries.filter(s => s.patient_id === user.patient_id) : surgeries;

  // Render content based on user role
  const renderContent = () => {
    // Admin views
    if (user.role === 'admin') {
      if (view === 'dashboard') return <Dashboard surgeries={surgeries} cptCodes={cptCodes} />;
      if (view === 'register') return (
        <PatientManagement
          patients={patients}
          onAdd={handleAddPatient}
          onUpdate={handleUpdatePatient}
          onDelete={handleDeletePatient}
        />
      );
      if (view === 'scheduler') return <SurgeryScheduler patients={patients} surgeons={surgeons} cptCodes={cptCodes} surgeries={surgeries} onSchedule={handleScheduleSurgery} onUpdate={handleUpdateSurgery} onDelete={handleDeleteSurgery} onComplete={handleCompleteSurgery} />;
      if (view === 'surgeons') return (
        <SurgeonManagement
          surgeons={surgeons}
          onAdd={handleAddSurgeon}
          onUpdate={handleUpdateSurgeon}
          onDelete={handleDeleteSurgeon}
        />
      );
      if (view === 'analysis') return <ORUtilization surgeries={surgeries} cptCodes={cptCodes} />;
      if (view === 'scorecard') return <SurgeonScorecard surgeries={surgeries} surgeons={surgeons} cptCodes={cptCodes} />;
      if (view === 'or-schedule') return <ORBlockSchedule surgeons={surgeons} />;
      if (view === 'users') return (
        <UserManagement
          users={users}
          patients={patients}
          surgeons={surgeons}
          onAdd={handleAddUser}
          onUpdate={handleUpdateUser}
          onDelete={handleDeleteUser}
        />
      );
      if (view === 'cpt') return (
        <CPTManager
          cptCodes={cptCodes}
          onAddCPT={handleAddCPT}
          onUpdateCPT={handleUpdateCPT}
          onDeleteCPT={handleDeleteCPT}
          onRefreshCPTCodes={loadAllData}
        />
      );
      if (view === 'claims') return (
        <ClaimsManagement
          claims={claims}
          patients={patients}
          surgeries={surgeries}
          billing={billing}
          cptCodes={cptCodes}
          onAdd={handleAddClaim}
          onUpdate={handleUpdateClaim}
          onDelete={handleDeleteClaim}
          onAddBilling={async (bill) => {
            const addedBill = await db.addBilling(bill);
            setBilling([addedBill, ...billing]);
            return addedBill;
          }}
        />
      );
      if (view === 'settings') return <Settings />;
      if (view === 'auto-cpt') return <CPTAutoUpdate />;
    }

    // Surgeon views
    if (user.role === 'surgeon') {
      if (view === 'my-schedule') return <SurgeonSchedule surgeries={surgeries} surgeon={currentSurgeon} patients={patients} cptCodes={cptCodes} />;
      if (view === 'patients') return <SurgeonPatients patients={patients} surgeries={surgeries} surgeon={currentSurgeon} />;
      if (view === 'scheduler') return <SurgeryScheduler patients={patients} surgeons={surgeons} cptCodes={cptCodes} onSchedule={handleScheduleSurgery} />;
    }

    // Patient views
    if (user.role === 'patient') {
      if (view === 'my-info') return <PatientInfo patient={currentPatient} />;
      if (view === 'my-surgeries') return <PatientSurgeries surgeries={patientSurgeries} cptCodes={cptCodes} />;
      if (view === 'my-bills') return <PatientBilling billing={billing} surgeries={patientSurgeries} />;
    }

    return <div className="placeholder-view">Page Not Found</div>;
  };

  return (
    <div className="app">
      <Sidebar currentView={view} onViewChange={setView} user={user} onLogout={handleLogout} />
      <main className="main-content">
        {renderContent()}
      </main>
      <Chatbot
        surgeons={surgeons}
        cptCodes={cptCodes}
        surgeries={surgeries}
        patients={patients}
        orBlockSchedule={orBlockSchedule}
      />
    </div>
  );
}

export default App;
