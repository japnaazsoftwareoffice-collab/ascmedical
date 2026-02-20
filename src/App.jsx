import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientManagement from './components/PatientManagement';
import SurgeryScheduler from './components/SurgeryScheduler';
import CPTManager from './components/CPTManager';
import SurgeonManagement from './components/SurgeonManagement';
import ORUtilization from './components/ORUtilization';
import SurgerySchedule from './components/SurgerySchedule';
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
import StaffManagement from './components/StaffManagement';
import RolePermissionManagement from './components/RolePermissionManagement';
import SupplyManager from './components/SupplyManager';

import ManagerDashboard from './components/ManagerDashboard';
import CancellationRescheduling from './components/CancellationRescheduling';
import InstructionPanel from './components/InstructionPanel';

import Swal from 'sweetalert2';
import { db } from './lib/supabase';
import { calculateORCost, calculateMedicareRevenue, calculateLaborCost, getSurgeryMetrics } from './utils/hospitalUtils';
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
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [procedureGroupItems, setProcedureGroupItems] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllCPTs, setShowAllCPTs] = useState(false); // Global toggle for CPT visibility

  // Filter CPT codes based on active status unless showAllCPTs is true
  const filteredCptCodes = showAllCPTs ? cptCodes : cptCodes.filter(c => c.is_active !== false);

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
      } else if (user.role === 'manager') {
        setView('manager-dashboard');
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
        const { INITIAL_PATIENTS, INITIAL_SURGEONS, CPT_CODES, INITIAL_PROCEDURE_GROUP_ITEMS } = await import('./data/mockData');

        // Transform surgeons to add 'name' property
        const surgeonsWithNames = (INITIAL_SURGEONS || []).map(surgeon => ({
          ...surgeon,
          name: surgeon.name || `${surgeon.firstname || surgeon.first_name || ''} ${surgeon.lastname || surgeon.last_name || ''}`.trim()
        }));

        setPatients(INITIAL_PATIENTS || []);
        setSurgeons(surgeonsWithNames);
        setCptCodes(CPT_CODES || []);
        setProcedureGroupItems(INITIAL_PROCEDURE_GROUP_ITEMS || []);
        setSurgeries([]);
        setBilling([]);
        setLoading(false);
        return;
      }

      // Helper for safe data fetching
      const safeFetch = async (promise, fallbackValue = []) => {
        try {
          return await promise;
        } catch (e) {
          console.warn('Data fetch failed for a resource, using fallback:', e);
          return fallbackValue;
        }
      };

      // Database is configured - fetch from Supabase
      // We fetch everything in parallel, but handle errors individually so one failure doesn't break everything
      const [
        patientsData,
        surgeonsData,
        cptCodesData,
        surgeriesData,
        billingData,
        usersData,
        claimsData,
        orBlockScheduleData,
        settingsData,
        staffData,
        permsData,
        suppliesData,
        procedureGroupItemsData
      ] = await Promise.all([
        safeFetch(db.getPatients()),
        safeFetch(db.getSurgeons()),
        safeFetch(db.getCPTCodes()),
        safeFetch(db.getSurgeries()),
        safeFetch(user.role === 'patient' ? db.getBillingByPatient(user.patient_id) : db.getBilling()),
        safeFetch(user.role === 'admin' ? db.getUsers() : Promise.resolve([])),
        safeFetch(db.getClaims ? db.getClaims() : Promise.resolve([])),
        safeFetch(db.getORBlockSchedule ? db.getORBlockSchedule() : Promise.resolve([])),
        safeFetch(db.getSettings ? db.getSettings() : Promise.resolve(null), null),
        safeFetch(db.getStaff ? db.getStaff() : Promise.resolve([])),
        safeFetch(user ? db.getRolePermissions(user.role) : Promise.resolve([])),
        Promise.resolve([]), // db.getSupplies skipped
        safeFetch(db.getProcedureGroupItems())
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
      setStaff(staffData || []);
      setSettings(settingsData);
      setSupplies(suppliesData || []);
      setProcedureGroupItems(procedureGroupItemsData || []);

      if (user && permsData) {
        // Use permissions from role_permissions table for all roles
        setUserPermissions(permsData.map(rp => rp.permissions?.name).filter(Boolean));
      }
    } catch (err) {
      console.error('Critical Error loading data:', err);
      // Fallback to mock data on error
      console.log('Database error. Falling back to mock data.');
      const { INITIAL_PATIENTS, INITIAL_SURGEONS, CPT_CODES, INITIAL_PROCEDURE_GROUP_ITEMS } = await import('./data/mockData');

      // Transform surgeons to add 'name' property
      const surgeonsWithNames = (INITIAL_SURGEONS || []).map(surgeon => ({
        ...surgeon,
        name: surgeon.name || `${surgeon.firstname || surgeon.first_name || ''} ${surgeon.lastname || surgeon.last_name || ''}`.trim()
      }));

      setPatients(INITIAL_PATIENTS || []);
      setSurgeons(surgeonsWithNames);
      setCptCodes(CPT_CODES || []);
      setProcedureGroupItems(INITIAL_PROCEDURE_GROUP_ITEMS || []);
      setSurgeries([]);
      setBilling([]);
      // Don't set error here, just rely on fallback
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

      // Sanitize fields: Convert empty strings to null for database compatibility
      const sanitized = { ...newPatient };
      ['dob', 'insurance_effective_date', 'insurance_expiration_date'].forEach(f => {
        if (sanitized[f] === '') sanitized[f] = null;
      });
      ['copay_amount', 'deductible_amount'].forEach(f => {
        if (sanitized[f] === '' || sanitized[f] === undefined) {
          sanitized[f] = null;
        } else {
          sanitized[f] = parseFloat(sanitized[f]);
        }
      });

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        const patientWithId = { ...sanitized, id: Date.now() };
        setPatients([patientWithId, ...patients]);
        return patientWithId;
      }

      const addedPatient = await db.addPatient(sanitized);
      setPatients([addedPatient, ...patients]);
      return addedPatient;
    } catch (err) {
      console.error('Error adding patient:', err);
      await Swal.fire({
        title: 'Cloud Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Data was NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleUpdatePatient = async (updatedPatient) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Sanitize fields: Convert empty strings to null for database compatibility
      const sanitized = { ...updatedPatient };
      ['dob', 'insurance_effective_date', 'insurance_expiration_date'].forEach(f => {
        if (sanitized[f] === '') sanitized[f] = null;
      });
      ['copay_amount', 'deductible_amount'].forEach(f => {
        if (sanitized[f] === '' || sanitized[f] === undefined) {
          sanitized[f] = null;
        } else {
          sanitized[f] = parseFloat(sanitized[f]);
        }
      });

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setPatients(patients.map(p => p.id === sanitized.id ? sanitized : p));
        return;
      }

      await db.updatePatient(sanitized.id, sanitized);
      setPatients(patients.map(p => p.id === sanitized.id ? sanitized : p));
    } catch (err) {
      console.error('Error updating patient:', err);
      await Swal.fire({
        title: 'Update Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
      await Swal.fire({
        title: 'Delete Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Patient was NOT deleted.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
        patient_id: parseInt(newSurgery.patient_id || newSurgery.patientId),
        surgeon_id: surgeon?.id || null,
        doctor_name: doctorName || 'Unknown Doctor',
        date: newSurgery.date,
        start_time: newSurgery.start_time || newSurgery.startTime,
        duration_minutes: parseInt(newSurgery.duration_minutes || newSurgery.durationMinutes || 0),
        turnover_time: parseInt(newSurgery.turnover_time || newSurgery.turnoverTime || 0),
        cpt_codes: newSurgery.cpt_codes || newSurgery.selectedCptCodes || [],
        notes: newSurgery.notes || '',
        supplies_cost: parseFloat(newSurgery.supplies_cost || newSurgery.suppliesCost || 0),
        implants_cost: parseFloat(newSurgery.implants_cost || newSurgery.implantsCost || 0),
        medications_cost: parseFloat(newSurgery.medications_cost || newSurgery.medicationsCost || 0),
        status: 'scheduled'
      };

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        // No database - use local state only
        const surgeryWithId = { ...surgeryData, id: Date.now() };
        setSurgeries([surgeryWithId, ...surgeries]);
        return surgeryWithId;
      }

      const addedSurgery = await db.addSurgery(surgeryData);

      // Attach patient and surgeon details for local state to avoid "Unknown"
      const patientIdInt = parseInt(surgeryData.patient_id);
      const patientDetails = patients.find(p => p.id === patientIdInt);
      const surgeonDetails = surgeons.find(s => s.id === (surgeon?.id || null));

      const surgeryWithDetails = {
        ...addedSurgery,
        patients: patientDetails,
        surgeons: surgeonDetails,
        // Ensure UI-friendly property names are also present
        patient_id: patientIdInt,
        duration_minutes: surgeryData.duration_minutes
      };

      setSurgeries([surgeryWithDetails, ...surgeries]);
      return addedSurgery;
    } catch (err) {
      console.error('Error scheduling surgery:', err);

      // Alert the user about the real error for debugging
      await Swal.fire({
        title: 'Cloud Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Maintenance might be in progress. Your data will NOT be saved to the database.`,
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });

      // Throw error so UI can handle it (keep modal open)
      throw err;
    }
  };

  const handleAddSurgeon = async (newSurgeon) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
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
      await Swal.fire({
        title: 'Surgeon Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
      await Swal.fire({
        title: 'Surgeon Update Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
      await Swal.fire({
        title: 'Delete Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Surgeon was NOT removed.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleUpdateSurgery = async (id, updates) => {
    try {
      // Auto-recalculate financials if editing a completed surgery
      const currentSurgery = surgeries.find(s => s.id === id);
      const isCompleted = updates.status === 'completed' || (currentSurgery && currentSurgery.status === 'completed');

      if (currentSurgery && isCompleted) {
        // Prepare a merged surgery object for metrics calculation
        const mergedSurgery = {
          ...currentSurgery,
          ...updates,
          // Ensure CPT codes are in the correct field
          cpt_codes: updates.cpt_codes || updates.selectedCptCodes || currentSurgery.cpt_codes || []
        };

        const metrics = getSurgeryMetrics(mergedSurgery, cptCodes, settings, procedureGroupItems);

        // Update the fields for the database
        updates.actual_room_cost = metrics.internalRoomCost;
        updates.actual_labor_cost = metrics.laborCost;

        // Only override reimbursement if not explicitly provided
        if (!updates.expected_reimbursement) {
          // Note: for non-cosmetic, expected_reimbursement = cptRevenue
          // for cosmetic, it's the total fee mapped to reimbursement
          updates.expected_reimbursement = metrics.isCosmetic ? metrics.facilityRevenue : metrics.cptRevenue;
        }
      }

      await db.updateSurgery(id, updates);
      await loadAllData(); // Reload surgeries from database
    } catch (error) {
      console.error('Error updating surgery:', error);
      await Swal.fire({
        title: 'Update Failed',
        text: `Error: ${error.message || 'Failed to update surgery'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw error;
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
        const cptWithId = { ...newCPT, id: Date.now() };
        setCptCodes([cptWithId, ...cptCodes]);
        return cptWithId;
      }

      const addedCPT = await db.addCPTCode(newCPT);
      setCptCodes([addedCPT, ...cptCodes]);
      return addedCPT;
    } catch (err) {
      console.error('Error adding CPT code:', err);
      await Swal.fire({
        title: 'CPT Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. CPT code was NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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

  // Supply Management Handlers
  const handleAddSupply = async (newSupply) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        const supplyWithId = { ...newSupply, id: Date.now() };
        setSupplies([supplyWithId, ...supplies]);
        return supplyWithId;
      }

      const addedSupply = await db.addSupply(newSupply);
      setSupplies([addedSupply, ...supplies]);
      return addedSupply;
    } catch (err) {
      console.error('Error adding supply:', err);
      await Swal.fire({
        title: 'Supply Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleUpdateSupply = async (id, updates) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setSupplies(supplies.map(s => s.id === id ? { ...s, ...updates } : s));
        return;
      }

      await db.updateSupply(id, updates);
      setSupplies(supplies.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (error) {
      console.error('Error updating supply:', error);
      await Swal.fire({
        title: 'Update Failed',
        text: `Error: ${error.message || 'Failed to update supply'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw error;
    }
  };

  const handleDeleteSupply = async (id) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setSupplies(supplies.filter(s => s.id !== id));
        return;
      }

      await db.deleteSupply(id);
      setSupplies(supplies.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting supply:', error);
      await Swal.fire({
        title: 'Delete Failed',
        text: `Error: ${error.message || 'Failed to delete supply item'}.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw error;
    }
  };

  // Procedure Group Items Handlers
  const handleAddProcedureGroupItem = async (newItem) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        const itemWithId = { ...newItem, id: Date.now() };
        setProcedureGroupItems([itemWithId, ...procedureGroupItems]);
        return itemWithId;
      }
      const addedItem = await db.addProcedureGroupItem(newItem);
      setProcedureGroupItems([addedItem, ...procedureGroupItems]);
      return addedItem;
    } catch (err) {
      console.error('Error adding procedure group item:', err);
      await Swal.fire({
        title: 'Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Item was NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleUpdateProcedureGroupItem = async (id, updates) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setProcedureGroupItems(procedureGroupItems.map(i => i.id === id ? { ...i, ...updates } : i));
        return;
      }
      await db.updateProcedureGroupItem(id, updates);
      setProcedureGroupItems(procedureGroupItems.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch (err) {
      console.error('Error updating procedure group item:', err);
      await Swal.fire({
        title: 'Update Failed',
        text: `Error: ${err.message || 'Failed to update item'}.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleDeleteProcedureGroupItem = async (id) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        setProcedureGroupItems(procedureGroupItems.filter(i => i.id !== id));
        return;
      }
      await db.deleteProcedureGroupItem(id);
      setProcedureGroupItems(procedureGroupItems.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting procedure group item:', err);
      Swal.fire({ title: 'Error!', text: 'Failed to delete item', icon: 'error' });
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
        const claimWithId = { ...newClaim, id: Date.now() };
        setClaims([claimWithId, ...claims]);
        return claimWithId;
      }

      const addedClaim = await db.addClaim(newClaim);
      setClaims([addedClaim, ...claims]);
      return addedClaim;
    } catch (err) {
      console.error('Error adding claim:', err);
      await Swal.fire({
        title: 'Claim Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Claim was NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
      await Swal.fire({
        title: 'Claim Update Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Changes were NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
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
      await Swal.fire({
        title: 'Delete Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Claim was NOT deleted.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  // Staff Management Handlers
  const handleAddStaff = async (newStaffMember) => {
    try {
      const addedStaff = await db.addStaff(newStaffMember);
      setStaff([addedStaff, ...staff]);
      return addedStaff;
    } catch (err) {
      console.error('Error adding staff:', err);
      await Swal.fire({
        title: 'Staff Member Save Failed',
        text: `Error: ${err.message || 'Unknown database error'}. Data was NOT saved.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleUpdateStaff = async (updatedStaff) => {
    try {
      await db.updateStaff(updatedStaff.id, updatedStaff);
      setStaff(staff.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    } catch (err) {
      console.error('Error updating staff:', err);
      await Swal.fire({
        title: 'Staff Update Failed',
        text: `Error: ${err.message || 'Failed to update staff member'}.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      await db.deleteStaff(id);
      setStaff(staff.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting staff:', err);
      await Swal.fire({
        title: 'Delete Failed',
        text: `Error: ${err.message || 'Failed to delete staff member'}.`,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      throw err;
    }
  };

  // Complete Surgery with Financial Snapshot
  const handleCompleteSurgery = async (surgeryId) => {
    let surgery = surgeries.find(s => s.id === surgeryId);
    if (!surgery) return;

    // Prompt for actual values to ensure accurate financial reporting
    const { value: formValues } = await Swal.fire({
      title: 'Finalize Surgery Case',
      html: `
            <div style="text-align: left;">
                <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem;">Please confirm the actual case details for accurate financial reporting.</p>
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:600; font-size: 0.9rem; margin-bottom:0.25rem; color: #1e293b;">Actual Duration (Minutes)</label>
                    <input id="swal-duration" type="number" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" value="${surgery.duration_minutes || 0}">
                </div>
                <div style="margin-bottom: 0;">
                    <label style="display:block; font-weight:600; font-size: 0.9rem; margin-bottom:0.25rem; color: #1e293b;">Total Supplies Cost ($)</label>
                    <input id="swal-supplies" type="number" step="0.01" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box;" value="${surgery.supplies_cost || 0}">
                </div>
            </div>
        `,
      showCancelButton: true,
      confirmButtonText: 'Calculate & Complete',
      confirmButtonColor: '#3b82f6',
      preConfirm: () => {
        return {
          duration: document.getElementById('swal-duration').value,
          supplies: document.getElementById('swal-supplies').value
        };
      }
    });

    if (!formValues) return;

    // Update surgery object with confirmed values for calculation
    surgery = {
      ...surgery,
      duration_minutes: parseInt(formValues.duration) || 0,
      supplies_cost: parseFloat(formValues.supplies) || 0
    };

    try {
      // Calculate costs based on finalized duration
      const duration = parseInt(surgery.duration_minutes || 0);
      const turnover = parseInt(surgery.turnover_time || 0);

      // Calculate Labor Cost - use ACTUAL anesthesia costs from notes if available
      let actualLaborCost = 0;
      let laborCostSource = 'Estimated';

      if (surgery.notes) {
        // Check for Self-Pay Anesthesia
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
        actualLaborCost = calculateLaborCost(duration + turnover);
        laborCostSource = 'Calculated Estimate';
      }

      // 1. Calculate INTERNAL Room Cost (Hospital cost for duration + turnover)
      const internalRoomCost = calculateORCost(duration + turnover);

      // 2. Calculate BILLABLE Facility Fee (Patient pays for duration only)
      const billableFacilityFee = calculateORCost(duration);

      // 3. Get total supplies costs
      const suppliesCost = parseFloat(surgery.supplies_cost || 0);
      const implantsCost = parseFloat(surgery.implants_cost || 0);
      const medicationsCost = parseFloat(surgery.medications_cost || 0);
      const totalSuppliesCost = suppliesCost + implantsCost + medicationsCost;

      // 4. Calculate expected reimbursement (Revenue)
      let expectedReimbursement = 0;
      let reimbursementSource = '';

      const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

      if (isCosmeticSurgery && surgery.notes) {
        // Parse cosmetic fees from notes
        const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([0-9,.]+)/i);
        const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([0-9,.]+)/i);
        const cscFacilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
        const cscAnesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;

        // Revenue = Cosmetic Fees + Supplies
        expectedReimbursement = cscFacilityFee + cscAnesthesiaFee + totalSuppliesCost;
        reimbursementSource = 'CSC Fees + Supplies';
      } else if (surgery.cpt_codes && surgery.cpt_codes.length > 0) {
        // Regular surgery: Revenue = CPT + Facility Fee + Supplies + Anesthesia Extra
        const cptRevenue = calculateMedicareRevenue(surgery.cpt_codes, cptCodes, settings?.apply_medicare_mppr || false);

        let anesthesiaExtra = 0;
        if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
          const match = surgery.notes.match(/Self-Pay Anesthesia(?: \(([^)]+)\))?:?\s*\$?\s*([\d,]+)/i);
          if (match) anesthesiaExtra = parseFloat(match[2].replace(/,/g, ''));
        }

        // Total Revenue matching the "Rev (CPT+Fee+Supplies)" logic
        expectedReimbursement = cptRevenue + billableFacilityFee + totalSuppliesCost + anesthesiaExtra;
        reimbursementSource = 'CPT + Facility + Supplies';
      }

      // 5. Calculate Net Margin (Revenue - Total Internal Costs)
      // Internal costs = Internal Room Cost + Labor Cost + Supplies Cost
      const totalInternalCosts = internalRoomCost + actualLaborCost + totalSuppliesCost;
      const netMargin = expectedReimbursement - totalInternalCosts;

      // Update local storage/state surgery reference for the summary display
      const actualRoomCost = internalRoomCost; // For display compatibility with existing UI

      // Update surgery with financial snapshot
      const updates = {
        status: 'completed',
        duration_minutes: surgery.duration_minutes,
        supplies_cost: suppliesCost,
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
                <span style="color: #64748b;">Total Revenue:</span>
                <strong style="color: #059669;">$${expectedReimbursement.toLocaleString()}</strong>
              </div>
              ${reimbursementSource ? `
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: -0.25rem; padding-left: 0.5rem;">
                  ✓ ${reimbursementSource}
                </div>
              ` : ''}
              <hr style="margin: 0.25rem 0; border: none; border-top: 1px dotted #e2e8f0;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Internal Room Cost:</span>
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

  const renderContent = () => {
    const hasPerm = (perm) => userPermissions.includes(perm);

    // 1. Permission-based rendering (Unified for Admin & Manager)
    if (view === 'dashboard' && hasPerm('view_financial_dashboard')) return <Dashboard surgeries={surgeries} cptCodes={filteredCptCodes} settings={settings} procedureGroupItems={procedureGroupItems} />;

    // Manager Dashboard - Check permission
    if (view === 'manager-dashboard' && (user.role === 'manager' || hasPerm('view_manager_dashboard'))) {
      return (
        <ManagerDashboard
          surgeries={surgeries}
          patients={patients}
          surgeons={surgeons}
          staff={staff}
          orBlockSchedule={orBlockSchedule}
          billing={billing}
          claims={claims}
          onAddSurgeon={handleAddSurgeon}
          onUpdateSurgeon={handleUpdateSurgeon}
          onDeleteSurgeon={handleDeleteSurgeon}
          onAddStaff={handleAddStaff}
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
        />
      );
    }

    if (view === 'register' && hasPerm('manage_patients')) {
      return (
        <PatientManagement
          patients={patients}
          onAdd={handleAddPatient}
          onUpdate={handleUpdatePatient}
          onDelete={handleDeletePatient}
        />
      );
    }

    if (view === 'claims' && hasPerm('view_claims')) {
      return (
        <ClaimsManagement
          claims={claims}
          patients={patients}
          surgeries={surgeries}
          billing={billing}
          cptCodes={filteredCptCodes}
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
    }

    if (view === 'scheduler' && hasPerm('manage_surgeries')) {
      return <SurgeryScheduler patients={patients} surgeons={surgeons} cptCodes={filteredCptCodes} surgeries={surgeries} settings={settings} procedureGroupItems={procedureGroupItems} onSchedule={handleScheduleSurgery} onUpdate={handleUpdateSurgery} onDelete={handleDeleteSurgery} onComplete={handleCompleteSurgery} />;
    }

    if (view === 'cancellation-rescheduling' && hasPerm('manage_surgeries')) {
      return <CancellationRescheduling surgeries={surgeries} surgeons={surgeons} patients={patients} />;
    }

    if (view === 'or-schedule' && hasPerm('view_or_blocks')) return <ORBlockSchedule surgeons={surgeons} />;

    if (view === 'surgery-schedule-sidebar' && hasPerm('view_surgery_schedule')) {
      return <SurgerySchedule surgeries={surgeries} />;
    }

    if (view === 'surgeons' && hasPerm('manage_surgeons')) {
      return <SurgeonManagement surgeons={surgeons} onAdd={handleAddSurgeon} onUpdate={handleUpdateSurgeon} onDelete={handleDeleteSurgeon} />;
    }

    if (view === 'staff' && hasPerm('manage_staff')) {
      return <StaffManagement staff={staff} onAdd={handleAddStaff} onUpdate={handleUpdateStaff} onDelete={handleDeleteStaff} />;
    }

    if (view === 'users' && hasPerm('manage_users')) {
      return <UserManagement users={users} patients={patients} surgeons={surgeons} onAdd={handleAddUser} onUpdate={handleUpdateUser} onDelete={handleDeleteUser} />;
    }

    if (view === 'roles-permissions' && hasPerm('manage_permissions')) return <RolePermissionManagement />;

    if (view === 'analysis' && hasPerm('view_analytics')) return <ORUtilization surgeries={surgeries} cptCodes={filteredCptCodes} settings={settings} />;

    if (view === 'scorecard' && hasPerm('view_scorecards')) return <SurgeonScorecard surgeries={surgeries} surgeons={surgeons} cptCodes={filteredCptCodes} settings={settings} />;

    if (view === 'cpt' && hasPerm('manage_cpt_codes')) {
      return <CPTManager cptCodes={cptCodes} showAllCPTs={showAllCPTs} setShowAllCPTs={setShowAllCPTs} onAddCPT={handleAddCPT} onUpdateCPT={handleUpdateCPT} onDeleteCPT={handleDeleteCPT} onRefreshCPTCodes={loadAllData} />;
    }

    if (view === 'supply-manager' && hasPerm('manage_supplies')) {
      return (
        <SupplyManager
          supplies={supplies}
          procedureGroupItems={procedureGroupItems}
          onAddSupply={handleAddSupply}
          onUpdateSupply={handleUpdateSupply}
          onDeleteSupply={handleDeleteSupply}
          onRefreshSupplies={loadAllData}
          onAddProcedureGroupItem={handleAddProcedureGroupItem}
          onUpdateProcedureGroupItem={handleUpdateProcedureGroupItem}
          onDeleteProcedureGroupItem={handleDeleteProcedureGroupItem}
        />
      );
    }

    if (view === 'auto-cpt' && hasPerm('use_auto_updater')) return <CPTAutoUpdate />;

    if (view === 'instruction-panel' && hasPerm('manage_chatbot')) return <InstructionPanel />;

    if (view === 'settings' && hasPerm('manage_settings')) return <Settings />;

    // 2. Role-specific views (Surgeon/Patient)
    // Surgeon
    if (user.role === 'surgeon') {
      if (view === 'my-schedule') return <SurgeonSchedule surgeries={surgeries} surgeon={currentSurgeon} patients={patients} cptCodes={filteredCptCodes} />;
      if (view === 'patients') return <SurgeonPatients patients={patients} surgeries={surgeries} surgeon={currentSurgeon} />;
      if (view === 'scheduler') return <SurgeryScheduler patients={patients} surgeons={surgeons} cptCodes={filteredCptCodes} onSchedule={handleScheduleSurgery} />;
    }

    // Patient
    if (user.role === 'patient') {
      if (view === 'my-info') return <PatientInfo patient={currentPatient} />;
      if (view === 'my-surgeries') return <PatientSurgeries surgeries={patientSurgeries} cptCodes={filteredCptCodes} />;
      if (view === 'my-bills') return <PatientBilling billing={billing} surgeries={patientSurgeries} />;
    }

    // 3. Manager Landing View (Fallback if no permission matches or on default view)
    if (user.role === 'manager' && (view === 'dashboard' || view === 'scheduler')) {
      return (
        <div className="placeholder-view" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>📋 Welcome to Case Manager Portal</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            Please select a module from the sidebar on the left to begin your workflow.
          </p>
        </div>
      );
    }

    return <div className="placeholder-view">Page Not Found</div>;
  };

  return (
    <div className="app">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        user={user}
        onLogout={handleLogout}
        permissions={userPermissions}
      />
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
