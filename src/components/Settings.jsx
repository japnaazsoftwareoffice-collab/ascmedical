import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import './Management.css';

const Settings = () => {
    const [settings, setSettings] = useState({
        facility_name: '',
        facility_address: '',
        facility_city: '',
        facility_state: '',
        facility_zip: '',
        facility_phone: '',
        tax_id: '',
        npi: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await db.getSettings();
            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            Swal.fire('Error', 'Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            await db.updateSettings(settings);

            Swal.fire({
                icon: 'success',
                title: 'Settings Saved',
                text: 'Facility settings have been updated successfully',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            Swal.fire('Error', 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="management-container fade-in">
                <div className="management-header">
                    <h2 className="management-title">⚙️ Facility Settings</h2>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner"></div>
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">⚙️ Facility Settings</h2>
                <button
                    type="button"
                    className="btn-add"
                    onClick={handleSave}
                    disabled={saving}
                >
                    <span>{saving ? '💾' : '💾'}</span> {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {/* HCFA Preview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #e0e7ff' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 25 - Federal Tax ID</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{settings.tax_id || 'Not Set'}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #dbeafe' }}>
                    <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 32 - Service Facility</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{settings.facility_name || 'Not Set'}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {settings.facility_address && `${settings.facility_address}, `}
                        {settings.facility_city && `${settings.facility_city}, `}
                        {settings.facility_state} {settings.facility_zip}
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #d1fae5' }}>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 33 - Billing Provider</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{settings.facility_name || 'Not Set'}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{settings.facility_phone || 'No phone'}</div>
                </div>
            </div>

            <div className="table-container">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        {/* Facility Name - Full Width */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Facility Name *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="facility_name"
                                value={settings.facility_name}
                                onChange={handleChange}
                                required
                                placeholder="e.g., Naples Surgery Center"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Street Address - Full Width */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Street Address *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="facility_address"
                                value={settings.facility_address}
                                onChange={handleChange}
                                required
                                placeholder="e.g., 123 Medical Blvd"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* City */}
                        <div className="form-group">
                            <label>City *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="facility_city"
                                value={settings.facility_city}
                                onChange={handleChange}
                                required
                                placeholder="e.g., Naples"
                            />
                        </div>

                        {/* State */}
                        <div className="form-group">
                            <label>State *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="facility_state"
                                value={settings.facility_state}
                                onChange={handleChange}
                                required
                                maxLength={2}
                                placeholder="FL"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* ZIP */}
                        <div className="form-group">
                            <label>ZIP Code *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="facility_zip"
                                value={settings.facility_zip}
                                onChange={handleChange}
                                required
                                placeholder="34102"
                            />
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input
                                className="form-input"
                                type="tel"
                                name="facility_phone"
                                value={settings.facility_phone}
                                onChange={handleChange}
                                required
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Tax ID */}
                        <div className="form-group">
                            <label>Federal Tax ID (EIN) *</label>
                            <input
                                className="form-input"
                                type="text"
                                name="tax_id"
                                value={settings.tax_id}
                                onChange={handleChange}
                                required
                                placeholder="59-1234567"
                            />
                        </div>

                        {/* NPI */}
                        <div className="form-group">
                            <label>NPI Number</label>
                            <input
                                className="form-input"
                                type="text"
                                name="npi"
                                value={settings.npi}
                                onChange={handleChange}
                                placeholder="1234567890"
                            />
                        </div>
                    </div>

                    {/* Info Box */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '12px',
                        border: '2px solid #bae6fd',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                    }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</span>
                        <div>
                            <strong style={{ color: '#0c4a6e', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>
                                HCFA-1500 Form Integration
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0369a1', lineHeight: '1.6' }}>
                                These settings automatically populate your HCFA-1500 claim forms. The preview cards above show exactly how your information will appear on printed forms. Ensure all details are accurate before generating claims.
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
