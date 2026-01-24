import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database service functions
export const db = {
    // ==================== AUTHENTICATION ====================
    async login(email, password) {
        const { data, error } = await supabase
            .from('users')
            .select('*, surgeons(*), patients(*)')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error) throw error;
        return data;
    },

    async getUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async addUser(user) {
        const { data, error } = await supabase
            .from('users')
            .insert([user])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateUser(id, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteUser(id) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== PATIENTS ====================
    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getPatientById(id) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async addPatient(patient) {
        const { data, error } = await supabase
            .from('patients')
            .insert([patient])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePatient(id, updates) {
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePatient(id) {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== SURGEONS ====================
    async getSurgeons() {
        const { data, error } = await supabase
            .from('surgeons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getSurgeonById(id) {
        const { data, error } = await supabase
            .from('surgeons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async addSurgeon(surgeon) {
        const { data, error } = await supabase
            .from('surgeons')
            .insert([surgeon])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSurgeon(id, updates) {
        const { data, error } = await supabase
            .from('surgeons')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSurgeon(id) {
        const { error } = await supabase
            .from('surgeons')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== CPT CODES ====================
    async getCPTCodes() {
        let allCodes = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('cpt_codes')
                .select('*')
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                if (error.code === '42P01') {
                    hasMore = false;
                    return [];
                }
                throw error;
            }

            if (data && data.length > 0) {
                allCodes = [...allCodes, ...data];
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        return allCodes;
    },

    async addCPTCode(cptCode) {
        const { data, error } = await supabase
            .from('cpt_codes')
            .insert([cptCode])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCPTCode(id, updates) {
        const { data, error } = await supabase
            .from('cpt_codes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCPTCode(id) {
        const { error } = await supabase
            .from('cpt_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== CATEGORIES (Virtual) ====================
    async updateCategoryName(oldName, newName) {
        const { error } = await supabase
            .from('cpt_codes')
            .update({ category: newName })
            .eq('category', oldName);

        if (error) throw error;
    },

    async deleteCategory(categoryName) {
        if (!categoryName) throw new Error('Category name is required');

        // Move codes to 'General' instead of deleting them to prevent data loss
        const { data, error } = await supabase
            .from('cpt_codes')
            .update({ category: 'General' })
            .eq('category', categoryName)
            .select();

        if (error) throw error;
        return data;
    },

    // ==================== PROCEDURE GROUPS (Virtual) ====================
    async updateProcedureGroupName(oldName, newName) {
        const { error } = await supabase
            .from('cpt_codes')
            .update({ procedure_group: newName })
            .eq('procedure_group', oldName);

        if (error) throw error;
    },

    async deleteProcedureGroup(groupName) {
        if (!groupName) throw new Error('Group name is required');

        // Move codes to 'Other' instead of deleting them
        const { data, error } = await supabase
            .from('cpt_codes')
            .update({ procedure_group: 'Other' })
            .eq('procedure_group', groupName)
            .select();

        if (error) throw error;
        return data;
    },

    // ==================== SURGERIES ====================
    async getSurgeries() {
        const { data, error } = await supabase
            .from('surgeries')
            .select('*, patients(*), surgeons(*)')
            .order('date', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getSurgeriesByPatient(patientId) {
        const { data, error } = await supabase
            .from('surgeries')
            .select('*, patients(*), surgeons(*)')
            .eq('patient_id', patientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getSurgeriesBySurgeon(surgeonId) {
        const { data, error } = await supabase
            .from('surgeries')
            .select('*, patients(*), surgeons(*)')
            .eq('surgeon_id', surgeonId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addSurgery(surgery) {
        const { data, error } = await supabase
            .from('surgeries')
            .insert([surgery])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSurgery(id, updates) {
        const { data, error } = await supabase
            .from('surgeries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSurgery(id) {
        const { error } = await supabase
            .from('surgeries')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== BILLING ====================
    async getBilling() {
        const { data, error } = await supabase
            .from('billing')
            .select('*, patients(*), surgeries(*)')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getBillingByPatient(patientId) {
        const { data, error } = await supabase
            .from('billing')
            .select('*, patients(*), surgeries(*)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addBilling(billing) {
        const { data, error } = await supabase
            .from('billing')
            .insert([billing])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateBilling(id, updates) {
        const { data, error } = await supabase
            .from('billing')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteBilling(id) {
        const { error } = await supabase
            .from('billing')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== OR BLOCK SCHEDULE ====================
    async getORBlockSchedule() {
        const { data, error } = await supabase
            .from('or_block_schedule')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async addORBlockSchedule(schedule) {
        const { data, error } = await supabase
            .from('or_block_schedule')
            .insert([schedule])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateORBlockSchedule(id, updates) {
        const { data, error } = await supabase
            .from('or_block_schedule')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteORBlockSchedule(id) {
        const { error } = await supabase
            .from('or_block_schedule')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== INSURANCE CLAIMS ====================
    async getClaims() {
        const { data, error } = await supabase
            .from('insurance_claims')
            .select('*, patients(*), surgeries(*)')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getClaimById(id) {
        const { data, error } = await supabase
            .from('insurance_claims')
            .select('*, patients(*), surgeries(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getClaimsByPatient(patientId) {
        const { data, error } = await supabase
            .from('insurance_claims')
            .select('*, patients(*), surgeries(*)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addClaim(claim) {
        const { data, error } = await supabase
            .from('insurance_claims')
            .insert([claim])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateClaim(id, updates) {
        const { data, error } = await supabase
            .from('insurance_claims')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteClaim(id) {
        const { error } = await supabase
            .from('insurance_claims')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== REAL-TIME SUBSCRIPTIONS ====================
    subscribeToPatients(callback) {
        return supabase
            .channel('patients-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, callback)
            .subscribe();
    },

    subscribeToSurgeons(callback) {
        return supabase
            .channel('surgeons-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'surgeons' }, callback)
            .subscribe();
    },

    subscribeToCPTCodes(callback) {
        return supabase
            .channel('cpt-codes-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cpt_codes' }, callback)
            .subscribe();
    },

    subscribeToSurgeries(callback) {
        return supabase
            .channel('surgeries-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'surgeries' }, callback)
            .subscribe();
    },

    subscribeToBilling(callback) {
        return supabase
            .channel('billing-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, callback)
            .subscribe();
    },

    // ==================== STAFF ====================
    async getStaff() {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getStaffById(id) {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async addStaff(staffMember) {
        const { data, error } = await supabase
            .from('staff')
            .insert([staffMember])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateStaff(id, updates) {
        const { data, error } = await supabase
            .from('staff')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteStaff(id) {
        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    subscribeToStaff(callback) {
        return supabase
            .channel('staff-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, callback)
            .subscribe();
    },


    // ==================== SETTINGS ====================
    async getSettings() {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1);

        // Don't throw error if no rows found, just return null
        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') return null;
            console.error('Error fetching settings:', error);
            throw error;
        }

        return data && data.length > 0 ? data[0] : null;
    },

    async updateSettings(updates) {
        // Get the first (and only) settings record
        const { data: existing } = await supabase
            .from('settings')
            .select('id')
            .limit(1)
            .single();

        if (existing) {
            const { data, error } = await supabase
                .from('settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert if no settings exist
            const { data, error } = await supabase
                .from('settings')
                .insert([updates])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ==================== ROLES & PERMISSIONS ====================
    async getPermissions() {
        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async getRolePermissions(role) {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('permission_id, permissions(name)')
            .eq('role', role);

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    async updateRolePermissions(role, permissionIds) {
        // 1. Delete all existing permissions for this role
        const { error: deleteError } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role', role);

        if (deleteError) throw deleteError;

        if (permissionIds.length === 0) return [];

        // 2. Insert new permissions
        const records = permissionIds.map(id => ({
            role: role,
            permission_id: id
        }));

        const { data, error: insertError } = await supabase
            .from('role_permissions')
            .insert(records)
            .select();

        if (insertError) throw insertError;
        return data;
    },

    // ==================== SUPPLIES ====================
    async getSupplies() {
        const { data, error } = await supabase
            .from('supplies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Handle table missing or other fetch errors gracefully for non-critical tables
            console.warn('Error fetching supplies:', error);
            return [];
        }
        return data || [];
    },

    async addSupply(supply) {
        const { data, error } = await supabase
            .from('supplies')
            .insert([supply])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSupply(id, updates) {
        const { data, error } = await supabase
            .from('supplies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSupply(id) {
        const { error } = await supabase
            .from('supplies')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ==================== PROCEDURE GROUP ITEMS ====================
    async getProcedureGroupItems() {
        // Try fetching with robust error handling
        const { data, error } = await supabase
            .from('procedure_group_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Error fetching procedure_group_items:', error);
            // Even if this fails, we return empty array so app doesn't crash.
            // But if the user says DB has data, and this fails, it might be due to RLS policies
            // or schema mismatch. However, for "missing table" (42P01) this is the correct fix.
            if (error.code === '42P01') return [];
            // If it's a different error (like 400 Bad Request or 500), we probably still want to fallback
            // rather than crash the whole dashboard manifest logic.
            return [];
        }
        return data || [];
    },

    async addProcedureGroupItem(item) {
        const { data, error } = await supabase
            .from('procedure_group_items')
            .insert([item])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateProcedureGroupItem(id, updates) {
        const { data, error } = await supabase
            .from('procedure_group_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProcedureGroupItem(id) {
        const { error } = await supabase
            .from('procedure_group_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
