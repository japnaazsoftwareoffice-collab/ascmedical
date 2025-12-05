import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import './HCFA1500.css';

const HCFA1500Form = ({ claim, patient, surgery, onClose }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await db.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!claim || !patient) return null;
    if (loading) {
        return (
            <div className="modal-overlay" style={{ zIndex: 9999 }}>
                <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Loading form...</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getDate()).padStart(2, '0')} ${String(date.getFullYear()).slice(-2)}`;
    };

    const formatPhone = (phone) => {
        if (!phone) return '';
        return phone.replace(/\D/g, ''); // Remove non-digits
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content" style={{ width: '9in', height: '95vh', overflow: 'auto', padding: '0' }}>
                <div className="no-print" style={{ padding: '10px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>HCFA-1500 Claim Form</h3>
                    <div>
                        <button onClick={() => window.print()} className="btn-save" style={{ marginRight: '10px' }}>
                            🖨️ Print / Save PDF
                        </button>
                        <button onClick={onClose} className="btn-cancel">Close</button>
                    </div>
                </div>

                <div className="hcfa-container">
                    {/* Header */}
                    <div className="hcfa-header">
                        <div style={{ width: '60%' }}>
                            <div className="carrier-block">
                                <div className="carrier-info">
                                    {claim.insurance_provider}<br />
                                    Payer ID: 99999<br />
                                    {/* Address would go here */}
                                </div>
                            </div>
                        </div>
                        <div style={{ width: '38%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '9px' }}>
                                <span>MEDICARE</span>
                                <span>MEDICAID</span>
                                <span>TRICARE</span>
                                <span>CHAMPVA</span>
                                <span>GROUP</span>
                                <span>FECA</span>
                                <span>OTHER</span>
                            </div>
                            <div className="box-container">
                                <div className="box w-full">
                                    <div className="hcfa-label">1a. INSURED'S ID NUMBER</div>
                                    <div className="hcfa-input">{claim.insurance_policy_number}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Patient & Insured Information */}
                    <div className="box-container">
                        <div className="box w-third">
                            <div className="hcfa-label">2. PATIENT'S NAME (Last Name, First Name, Middle Initial)</div>
                            <div className="hcfa-input">{patient.name}</div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">3. PATIENT'S BIRTH DATE</div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="hcfa-input">{formatDate(patient.dob)}</div>
                                <div className="hcfa-label" style={{ marginTop: '2px' }}>SEX: M / F</div>
                            </div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">4. INSURED'S NAME (Last Name, First Name, Middle Initial)</div>
                            <div className="hcfa-input">{claim.subscriber_name}</div>
                        </div>
                    </div>

                    <div className="box-container">
                        <div className="box w-third">
                            <div className="hcfa-label">5. PATIENT'S ADDRESS (No., Street)</div>
                            <div className="hcfa-input">{patient.address?.split(',')[0]}</div>
                            <div style={{ display: 'flex', marginTop: '2px' }}>
                                <div style={{ width: '60%' }}>
                                    <div className="hcfa-label">CITY</div>
                                    <div className="hcfa-input">{patient.address?.split(',')[1] || 'Naples'}</div>
                                </div>
                                <div style={{ width: '40%' }}>
                                    <div className="hcfa-label">STATE</div>
                                    <div className="hcfa-input">FL</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', marginTop: '2px' }}>
                                <div style={{ width: '50%' }}>
                                    <div className="hcfa-label">ZIP CODE</div>
                                    <div className="hcfa-input">34102</div>
                                </div>
                                <div style={{ width: '50%' }}>
                                    <div className="hcfa-label">TELEPHONE (Include Area Code)</div>
                                    <div className="hcfa-input">{formatPhone(patient.phone)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">6. PATIENT RELATIONSHIP TO INSURED</div>
                            <div className="hcfa-input" style={{ fontSize: '10px' }}>
                                <span style={{ marginRight: '5px' }}>{claim.subscriber_relationship === 'Self' ? '[X] Self' : '[] Self'}</span>
                                <span style={{ marginRight: '5px' }}>{claim.subscriber_relationship === 'Spouse' ? '[X] Spouse' : '[] Spouse'}</span>
                                <span>{claim.subscriber_relationship === 'Child' ? '[X] Child' : '[] Child'}</span>
                            </div>
                            <div className="hcfa-label" style={{ marginTop: '5px' }}>8. RESERVED FOR NUCC USE</div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">7. INSURED'S ADDRESS (No., Street)</div>
                            <div className="hcfa-input">SAME</div>
                            <div style={{ display: 'flex', marginTop: '15px' }}>
                                <div style={{ width: '60%' }}>
                                    <div className="hcfa-label">CITY</div>
                                </div>
                                <div style={{ width: '40%' }}>
                                    <div className="hcfa-label">STATE</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', marginTop: '2px' }}>
                                <div style={{ width: '50%' }}>
                                    <div className="hcfa-label">ZIP CODE</div>
                                </div>
                                <div style={{ width: '50%' }}>
                                    <div className="hcfa-label">TELEPHONE</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="box-container">
                        <div className="box w-third">
                            <div className="hcfa-label">9. OTHER INSURED'S NAME</div>
                            <div className="hcfa-input">{claim.secondary_insurance_provider ? 'SEE ATTACHED' : 'NONE'}</div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">10. IS PATIENT'S CONDITION RELATED TO:</div>
                            <div className="hcfa-label">a. EMPLOYMENT? (Current or Previous)  YES [ ] NO [X]</div>
                            <div className="hcfa-label">b. AUTO ACCIDENT?  YES [ ] NO [X]</div>
                            <div className="hcfa-label">c. OTHER ACCIDENT?  YES [ ] NO [X]</div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">11. INSURED'S POLICY GROUP OR FECA NUMBER</div>
                            <div className="hcfa-input">{claim.insurance_group_number}</div>
                            <div className="hcfa-label" style={{ marginTop: '5px' }}>a. INSURED'S DATE OF BIRTH</div>
                            <div className="hcfa-label">b. OTHER CLAIM ID</div>
                            <div className="hcfa-label">c. INSURANCE PLAN NAME</div>
                            <div className="hcfa-input">{claim.insurance_provider}</div>
                        </div>
                    </div>

                    <div className="box-container">
                        <div className="box w-full" style={{ padding: '5px' }}>
                            <div className="hcfa-label">12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                <span style={{ fontStyle: 'italic' }}>Signature on File</span>
                                <span>{formatDate(new Date().toISOString())}</span>
                            </div>
                        </div>
                        <div className="box w-full" style={{ padding: '5px' }}>
                            <div className="hcfa-label">13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE</div>
                            <div style={{ marginTop: '10px' }}>
                                <span style={{ fontStyle: 'italic' }}>Signature on File</span>
                            </div>
                        </div>
                    </div>

                    {/* Diagnosis & Procedures */}
                    <div className="hcfa-section-title">PHYSICIAN OR SUPPLIER INFORMATION</div>

                    <div className="box-container">
                        <div className="box w-full">
                            <div className="hcfa-label">21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                <div>A. <span className="hcfa-input">{claim.diagnosis_codes?.[0] || ''}</span></div>
                                <div>B. <span className="hcfa-input">{claim.diagnosis_codes?.[1] || ''}</span></div>
                                <div>C. <span className="hcfa-input">{claim.diagnosis_codes?.[2] || ''}</span></div>
                                <div>D. <span className="hcfa-input">{claim.diagnosis_codes?.[3] || ''}</span></div>
                            </div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">22. RESUBMISSION CODE</div>
                        </div>
                        <div className="box w-third">
                            <div className="hcfa-label">23. PRIOR AUTHORIZATION NUMBER</div>
                        </div>
                    </div>

                    {/* Service Lines */}
                    <div className="box-container" style={{ borderBottom: 'none' }}>
                        <div className="box w-full">
                            <div className="hcfa-label">24. A. DATE(S) OF SERVICE | B. PLACE | C. EMG | D. PROCEDURES, SERVICES, OR SUPPLIES | E. DIAGNOSIS POINTER | F. CHARGES | G. DAYS OR UNITS</div>
                        </div>
                    </div>

                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <div key={idx} className="box-container" style={{ height: '25px' }}>
                            <div className="box" style={{ width: '15%' }}>
                                <div className="hcfa-input">{idx === 0 ? formatDate(claim.service_date) : ''}</div>
                            </div>
                            <div className="box" style={{ width: '5%' }}>
                                <div className="hcfa-input">{idx === 0 ? (claim.place_of_service === 'Office' ? '11' : '21') : ''}</div>
                            </div>
                            <div className="box" style={{ width: '5%' }}></div>
                            <div className="box" style={{ width: '25%' }}>
                                <div className="hcfa-input">{claim.procedure_codes?.[idx] || ''}</div>
                            </div>
                            <div className="box" style={{ width: '5%' }}>
                                <div className="hcfa-input">{claim.procedure_codes?.[idx] ? 'A' : ''}</div>
                            </div>
                            <div className="box" style={{ width: '15%', textAlign: 'right' }}>
                                <div className="hcfa-input">{idx === 0 ? claim.total_charges : ''}</div>
                            </div>
                            <div className="box" style={{ width: '10%' }}>
                                <div className="hcfa-input">{idx === 0 ? '1' : ''}</div>
                            </div>
                            <div className="box" style={{ width: '20%' }}></div>
                        </div>
                    ))}

                    <div className="box-container">
                        <div className="box" style={{ width: '60%' }}>
                            <div className="hcfa-label">25. FEDERAL TAX I.D. NUMBER</div>
                            <div className="hcfa-input">{settings?.tax_id || '59-1234567'}</div>
                        </div>
                        <div className="box" style={{ width: '10%' }}>
                            <div className="hcfa-label">28. TOTAL CHARGE</div>
                            <div className="hcfa-input" style={{ textAlign: 'right' }}>${claim.total_charges}</div>
                        </div>
                        <div className="box" style={{ width: '10%' }}>
                            <div className="hcfa-label">29. AMOUNT PAID</div>
                            <div className="hcfa-input" style={{ textAlign: 'right' }}>$0.00</div>
                        </div>
                        <div className="box" style={{ width: '10%' }}>
                            <div className="hcfa-label">30. BALANCE DUE</div>
                            <div className="hcfa-input" style={{ textAlign: 'right' }}>${claim.total_charges}</div>
                        </div>
                    </div>

                    <div className="box-container" style={{ borderBottom: '1px solid #cc2229' }}>
                        <div className="box w-half">
                            <div className="hcfa-label">31. SIGNATURE OF PHYSICIAN OR SUPPLIER</div>
                            <div style={{ marginTop: '20px' }}>
                                <span className="hcfa-input">Dr. Sarah Williams</span><br />
                                <span style={{ fontSize: '9px' }}>{formatDate(new Date().toISOString())}</span>
                            </div>
                        </div>
                        <div className="box w-half">
                            <div className="hcfa-label">32. SERVICE FACILITY LOCATION INFORMATION</div>
                            <div className="hcfa-input">
                                {settings?.facility_name?.toUpperCase() || 'NAPLES SURGERY CENTER'}<br />
                                {settings?.facility_address?.toUpperCase() || '123 MEDICAL BLVD'}<br />
                                {settings?.facility_city?.toUpperCase() || 'NAPLES'}, {settings?.facility_state?.toUpperCase() || 'FL'} {settings?.facility_zip || '34102'}
                            </div>
                        </div>
                        <div className="box w-half">
                            <div className="hcfa-label">33. BILLING PROVIDER INFO & PH #</div>
                            <div className="hcfa-input">
                                {settings?.facility_name?.toUpperCase() || 'NAPLES MEDICAL GROUP'}<br />
                                {settings?.facility_phone || '(555) 123-4567'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HCFA1500Form;
