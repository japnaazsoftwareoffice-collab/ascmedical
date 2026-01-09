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
        npi: '',
        apply_medicare_mppr: false,
        ai_allowed_email: '' // Restrict usage to this email
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
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            // Create a copy of settings and remove the 'id' field
            // because 'id' is a generated identity column and cannot be updated
            const { id, ...settingsToUpdate } = settings;

            await db.updateSettings(settingsToUpdate);

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
            <div className="management-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 className="management-title">⚙️ Facility Settings</h2>
                    <p className="card-subtitle" style={{ marginTop: '0.5rem' }}>
                        Manage facility details, billing identifiers, and financial configurations
                    </p>
                </div>
                <button
                    type="button"
                    className="btn-add"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                        minWidth: '180px'
                    }}
                >
                    <span>{saving ? '⏳' : '💾'}</span>
                    {saving ? 'Saving Changes...' : 'Save Settings'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Preview Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="section-header" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: '700' }}>HCFA Preview</h3>
                        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Live preview of claim form box data</p>
                    </div>

                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }}></div>
                        <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 25 - Federal Tax ID</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{settings.tax_id || 'Not Set'}</div>
                    </div>

                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#0ea5e9' }}></div>
                        <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 32 - Service Facility</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>{settings.facility_name || 'Not Set'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
                            {settings.facility_address && <div>{settings.facility_address}</div>}
                            {(settings.facility_city || settings.facility_state || settings.facility_zip) && (
                                <div>{settings.facility_city}, {settings.facility_state} {settings.facility_zip}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }}></div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Box 33 - Billing Provider</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>{settings.facility_name || 'Not Set'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>📞</span> {settings.facility_phone || 'No phone'}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '16px',
                        border: '1px solid #bae6fd',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>💡</span>
                        <div>
                            <strong style={{ color: '#0c4a6e', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                Auto-Synced Data
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#0369a1', lineHeight: '1.5' }}>
                                These settings populate your HCFA-1500 forms. Verify accuracy before generating claims.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Form */}
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Section 1: Facility Details */}
                    <div className="content-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px', color: '#2563eb' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M17 21v-8H7v8" /></svg>
                            </div>
                            <h3 style={{ fontSize: '1.125rem', color: '#1e293b', margin: 0 }}>Facility Details</h3>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Facility Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="facility_name"
                                    value={settings.facility_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Naples Surgery Center"
                                    style={{ height: '48px', fontSize: '1rem' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Street Address <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="facility_address"
                                    value={settings.facility_address}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., 123 Medical Blvd"
                                    style={{ height: '48px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>City <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        name="facility_city"
                                        value={settings.facility_city}
                                        onChange={handleChange}
                                        required
                                        placeholder="Naples"
                                        style={{ height: '48px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>State <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        name="facility_state"
                                        value={settings.facility_state}
                                        onChange={handleChange}
                                        required
                                        maxLength={2}
                                        placeholder="FL"
                                        style={{ textTransform: 'uppercase', textAlign: 'center', height: '48px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>ZIP <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        name="facility_zip"
                                        value={settings.facility_zip}
                                        onChange={handleChange}
                                        required
                                        placeholder="34102"
                                        style={{ height: '48px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="form-input"
                                    type="tel"
                                    name="facility_phone"
                                    value={settings.facility_phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="(555) 123-4567"
                                    style={{ height: '48px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Billing Identifiers */}
                    <div className="content-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '8px', color: '#16a34a' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
                            </div>
                            <h3 style={{ fontSize: '1.125rem', color: '#1e293b', margin: 0 }}>Billing Identifiers</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Federal Tax ID (EIN) <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="tax_id"
                                    value={settings.tax_id}
                                    onChange={handleChange}
                                    required
                                    placeholder="59-1234567"
                                    style={{ height: '48px', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>NPI Number</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="npi"
                                    value={settings.npi}
                                    onChange={handleChange}
                                    placeholder="1234567890"
                                    style={{ height: '48px', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: AI Configuration */}
                    <div className="content-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ background: '#faf5ff', padding: '0.5rem', borderRadius: '8px', color: '#9333ea' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                            </div>
                            <h3 style={{ fontSize: '1.125rem', color: '#1e293b', margin: 0 }}>AI Configuration</h3>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Gemini API Key</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type="password"
                                    name="gemini_api_key"
                                    value={settings.gemini_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="AI..."
                                    style={{ height: '48px', fontFamily: 'monospace', letterSpacing: '0.05em', paddingRight: '120px' }}
                                    autoComplete="new-password"
                                />
                                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                                    Encrypted
                                </div>
                            </div>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                Provide your Google Gemini API Key to enable the ASC Assistant chatbot. this key will be stored securely in your database.
                            </p>
                            <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
                                <span style={{ fontSize: '1rem' }}>🛡️</span>
                                <strong>Rate Limit Active:</strong> 5 requests / minute
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                            <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Restricted Access (Optional)</label>
                            <input
                                className="form-input"
                                type="email"
                                name="ai_allowed_email"
                                value={settings.ai_allowed_email || ''}
                                onChange={handleChange}
                                placeholder="Enter specific user email (e.g., admin@hospital.com)"
                                style={{ height: '48px' }}
                            />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                If entered, <strong>ONLY</strong> this user will be able to use the AI features. Leave empty to allow all registered users.
                            </p>
                        </div>
                    </div>

                    {/* Section 4: Financial Logic */}
                    <div className="content-card" style={{ padding: '2rem', border: '2px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ background: '#fff7ed', padding: '0.5rem', borderRadius: '8px', color: '#ea580c' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h3 style={{ fontSize: '1.125rem', color: '#1e293b', margin: 0 }}>Financial Configurations</h3>
                        </div>

                        <label style={{ display: 'flex', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '12px', transition: 'background 0.2s', background: settings.apply_medicare_mppr ? '#fffbeb' : 'transparent', border: settings.apply_medicare_mppr ? '1px solid #fcd34d' : '1px solid transparent' }}>
                            <div style={{ position: 'relative', width: '48px', height: '28px', flexShrink: 0 }}>
                                <input
                                    type="checkbox"
                                    name="apply_medicare_mppr"
                                    checked={settings.apply_medicare_mppr || false}
                                    onChange={handleChange}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: settings.apply_medicare_mppr ? '#10b981' : '#cbd5e1',
                                    borderRadius: '34px',
                                    transition: '0.3s'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '20px',
                                    width: '20px',
                                    left: settings.apply_medicare_mppr ? '24px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    transition: '0.3s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}></div>
                            </div>
                            <div>
                                <strong style={{ fontSize: '1rem', color: '#1e293b', display: 'block', marginBottom: '0.25rem' }}>
                                    Apply Medicare MPPR Rule
                                </strong>
                                <div style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                                    Automatically reduce reimbursement by 50% for secondary procedures on the same claim.
                                </div>
                                {settings.apply_medicare_mppr && (
                                    <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fffbeb', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'inline-block' }}>
                                        ✅ MPPR Active: Secondary procedures will be billed at 50%.
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Settings;
