import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase';
import './CPTAutoUpdate.css';

/**
 * Normalizes CPT data keys to snake_case
 */
const toSnakeCase = (str) => {
    return str
        .replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
};

const mapRowToDb = (row, fileName) => {
    const cleanRow = {};
    Object.keys(row).forEach(key => {
        cleanRow[toSnakeCase(key)] = row[key];
    });

    // Flexible key mapping
    const code = cleanRow['hcpcs_code'] || cleanRow['cpt_code'] || cleanRow['code'];
    if (!code) return null;

    let reimbursement = 0;
    const rawRate = cleanRow['payment_rate'] || cleanRow['asc_payment_rate'] || '0';
    if (typeof rawRate === 'string') {
        reimbursement = parseFloat(rawRate.replace(/[$,]/g, ''));
    } else {
        reimbursement = parseFloat(rawRate);
    }
    if (isNaN(reimbursement)) reimbursement = 0;

    const description = cleanRow['short_descriptor'] || cleanRow['description'] || '';
    const longDescriptor = cleanRow['long_descriptor'] || '';

    // Attempt to extract year from filename
    let versionYear = null;
    const yearMatch = fileName.match(/20\d{2}/);
    if (yearMatch) versionYear = yearMatch[0];

    // Attempt to parse effective date
    let effectiveDate = null;
    if (cleanRow['effective_date']) {
        try {
            const d = new Date(cleanRow['effective_date']);
            if (!isNaN(d.getTime())) effectiveDate = d.toISOString();
        } catch (e) { }
    }

    return {
        code,
        description: description || longDescriptor || 'No Description',
        long_descriptor: longDescriptor,
        short_descriptor: description,
        reimbursement,
        payment_indicator: cleanRow['payment_indicator'] || cleanRow['pi'],
        original_filename: fileName,
        category: 'General',
        version_year: versionYear,
        effective_date: effectiveDate,
        last_updated_from_source: new Date().toISOString(),
        details: cleanRow // Store full original data
    };
};

const CPTAutoUpdate = () => {
    const [uploading, setUploading] = useState(false);
    const [report, setReport] = useState(null);
    const [logs, setLogs] = useState([]);
    const [mergedMasterData, setMergedMasterData] = useState(null);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const [processedFiles, setProcessedFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]); // NEW: Store raw files

    const log = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Step 1: User selects files
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            setMergedMasterData(null);
            setProcessedFiles([]);
            setLogs([]); // Clear logs on new selection
            setHasDownloaded(false); // Reset download status
        }
    };

    // REDEFINITION OF HANDLER TO SUPPORT HISTORY TRACKING
    const handleMergeFiles = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setLogs([]);
        setReport(null);
        setMergedMasterData(null);
        setProcessedFiles([]);

        log(`🚀 Starting analysis of ${selectedFiles.length} files...`);

        try {
            // Smart Sort by Year/Quarter
            const getQuarterWeight = (name) => {
                const n = name.toLowerCase();
                if (n.includes('jan')) return 1;
                if (n.includes('apr')) return 2;
                if (n.includes('jul')) return 3;
                if (n.includes('oct')) return 4;
                return 0;
            };
            const sortedFiles = [...selectedFiles].sort((a, b) => {
                const wA = getQuarterWeight(a.name);
                const wB = getQuarterWeight(b.name);
                if (wA !== 0 && wB !== 0) return wA - wB;
                return a.name.localeCompare(b.name);
            });

            const allHistory = []; // Stores { code, year, desc, ...fullRow }
            const currentBatchFiles = [];
            const allYears = new Set();

            for (const file of sortedFiles) {
                log(`📖 Reading file: ${file.name}`);

                // Extract Year from Filename (or default to current)
                let fileYear = new Date().getFullYear();
                const yearMatch = file.name.match(/20\d{2}/);
                if (yearMatch) fileYear = parseInt(yearMatch[0]);
                allYears.add(fileYear);

                let aoa = [];
                // READ FILE (CSV or XLSX)
                if (file.name.endsWith('.csv')) {
                    await new Promise((resolve, reject) => {
                        Papa.parse(file, { skipEmptyLines: true, complete: (res) => { aoa = res.data; resolve(); }, error: reject });
                    });
                } else {
                    await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            const wb = XLSX.read(evt.target.result, { type: 'binary' });
                            aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
                            resolve();
                        };
                        reader.readAsBinaryString(file);
                    });
                }

                // DYNAMIC HEADER DETECTION
                // DYNAMIC HEADER DETECTION
                let headerIdx = -1;
                let colIdx = { code: -1, desc: -1, payment: -1, indicator: -1, longDesc: -1, discounting: -1 };

                for (let i = 0; i < Math.min(aoa.length, 25); i++) {
                    const rowStr = (aoa[i] || []).join(' ').toLowerCase();

                    // HEURISTIC: Skip "Copyright" rows. Look for multiple key terms.
                    // Must have "short descriptor" OR ("payment" AND "rate") OR ("hcpcs" AND "code")
                    if (
                        (rowStr.includes('short descriptor') || rowStr.includes('short desc')) &&
                        (rowStr.includes('payment') || rowStr.includes('code') || rowStr.includes('rate'))
                    ) {
                        headerIdx = i;
                        const row = (aoa[i] || []).map(c => String(c).toLowerCase().trim());

                        // CODE
                        colIdx.code = row.findIndex(c => (c.includes('hcpcs') || c.includes('cpt') || c.includes('code')) && !c.includes('desc'));

                        // DESCRIPTION
                        colIdx.desc = row.findIndex(c => c.includes('short descriptor') || c.includes('short desc'));
                        if (colIdx.desc === -1) colIdx.desc = row.findIndex(c => (c.includes('description') || c.includes('desc')) && !c.includes('long') && !c.includes('code'));

                        colIdx.longDesc = row.findIndex(c => c.includes('long descriptor') || c.includes('long desc'));

                        // PAYMENT
                        colIdx.payment = row.findIndex(c => (c.includes('payment') && c.includes('rate')) || (c.includes('allowed') && c.includes('amount')));
                        if (colIdx.payment === -1) colIdx.payment = row.findIndex(c => c === 'rate' || (c.includes('rate') && !c.includes('wage') && !c.includes('weight')));

                        // INDICATOR
                        colIdx.indicator = row.findIndex(c => c.includes('payment indicator') || c.includes('pi') || c.includes('indicator'));

                        // DISCOUNTING
                        colIdx.discounting = row.findIndex(c => c.includes('multiple procedure') || c.includes('discounting'));

                        // LOGGING
                        log(`   🎯 Headers found on row ${i + 1}.`);
                        break;
                    }
                }

                if (headerIdx === -1) {
                    log(`⚠️ No header found in ${file.name}. Skipping.`);
                    continue;
                }

                let validCount = 0;
                for (let r = headerIdx + 1; r < aoa.length; r++) {
                    const row = aoa[r];
                    if (!row || row.length === 0) continue;

                    const val = (i) => (i > -1 && row[i] !== undefined) ? String(row[i]).trim() : '';
                    const code = val(colIdx.code);

                    if (code && code.length >= 3 && code.length <= 7) {
                        const desc = val(colIdx.desc);
                        const longDesc = val(colIdx.longDesc);

                        allHistory.push({
                            code,
                            year: fileYear,
                            short_descriptor: desc,
                            long_descriptor: longDesc || desc, // Fallback
                            reimbursement: parseFloat(val(colIdx.payment).replace(/[$,]/g, '')) || 0,
                            payment_indicator: val(colIdx.indicator),
                            discounting: val(colIdx.discounting),
                            original_filename: file.name
                        });
                        validCount++;
                    }
                }
                currentBatchFiles.push({ name: file.name, validRows: validCount });
            }

            // --- PHASE 2: CALCULATE STATUS ---
            const maxYear = Math.max(...Array.from(allYears));
            const groups = {};
            allHistory.forEach(item => {
                if (!groups[item.code]) groups[item.code] = [];
                groups[item.code].push(item);
            });

            const uniqueRecords = [];

            Object.keys(groups).sort().forEach(code => {
                const history = groups[code].sort((a, b) => a.year - b.year);
                const first = history[0];
                const last = history[history.length - 1]; // Latest Version

                let status = 'Unchanged';
                const createdYear = first.year;
                const latestYear = last.year;

                if (latestYear < maxYear) {
                    status = 'Deleted';
                } else if (createdYear === latestYear && createdYear === maxYear) {
                    // Appeared for the first time in the latest year file
                    // BUT wait, if we only have 1 year of files, everything is "Added"?
                    // Assuming "Added" if it wasn't in previous years.
                    // If we have multiple years uploaded, and this code only appears in the latest year, it's Added.
                    if (allYears.size > 1) status = 'Added';
                    else status = 'Active'; // Only 1 file uploaded
                } else {
                    // It exists in multiple years or older years. 
                    // Check logic: 
                    // If it is present in maxYear, it is NOT deleted.

                    // Check Modification
                    const descriptions = new Set(history.map(h => h.short_descriptor));
                    if (descriptions.size > 1) status = 'Modified';
                    else status = 'Unchanged';
                }

                uniqueRecords.push({
                    ...last, // Keep latest data
                    status: status,
                    effective_date: new Date(last.year, 0, 1).toISOString(),
                    version_year: last.year
                });
            });

            log(`✅ Analysis Complete. Generated ${uniqueRecords.length} Master Records.`);
            setProcessedFiles(currentBatchFiles);
            setMergedMasterData(uniqueRecords);
            Swal.fire('Success', `Processed ${uniqueRecords.length} codes with Status Analysis.`, 'success');

        } catch (error) {
            console.error(error);
            log(`❌ CRITICAL ERROR: ${error.message}`);
            Swal.fire('Error', error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleCommitToDb = async () => {
        if (!mergedMasterData) return;
        setUploading(true);
        log(`💾 Syncing ${mergedMasterData.length} records with Database...`);

        let totalUpserted = 0;
        try {
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < mergedMasterData.length; i += CHUNK_SIZE) {
                const chunk = mergedMasterData.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase
                    .from('cpt_codes')
                    .upsert(chunk, { onConflict: 'code' });

                if (error) throw error;
                totalUpserted += chunk.length;
                log(`   ✅ Upserted batch ${Math.ceil((i + 1) / CHUNK_SIZE)}`);
            }

            log(`✅ COMPLETE: ${totalUpserted} records saved to DB.`);

            setReport({
                timestamp: new Date().toISOString(),
                files: ['Merged Master Batch'],
                total_records: totalUpserted,
                status: 'SUCCESS'
            });

            Swal.fire('Success', 'Database updated successfully!', 'success');
            setMergedMasterData(null); // Reset after success
            setHasDownloaded(false);
        } catch (error) {
            log(`❌ DB ERROR: ${error.message}`);
            Swal.fire('Database Error', error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadMergedCSV = () => {
        if (!mergedMasterData) return;
        log('📥 Generating Master CSV from merged data...');

        const csvData = mergedMasterData.map(record => ({
            'CPT/HCPCS Code': record.code,
            'Year': record.version_year, // NEW
            'Status': record.status,     // NEW
            'Short Descriptor': record.short_descriptor,
            'Long Descriptor': record.long_descriptor,
            'Payment Rate': record.reimbursement,
            'Payment Indicator': record.payment_indicator,
            'Multiple Procedure Discounting': record.discounting, // ADDED
            'Effective Date': record.effective_date,
            'Category': record.category,
            'Original File': record.original_filename
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `CPT_MASTER_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        log('🎉 Master CSV downloaded.');
        setHasDownloaded(true);
        Swal.fire('Downloaded', 'Review the file. If everything looks correct, click "Upload to Database".', 'success');
    };

    const handleAutoUpdate = async () => {
        // Since we cannot run Node.js code here, we explain the options
        Swal.fire({
            title: 'Cloud Auto-Update',
            html: `
            <p>To run the automated scraper that connects to CMS.gov, you have two options:</p>
            <br/>
            <ul style="text-align:left">
                <li><b>Production:</b> This process runs automatically every quarter via GitHub Actions.</li>
                <li><b>Local:</b> Run <code>npm start -- update</code> in the <i>services/cpt-seeder</i> directory.</li>
            </ul>
            <br/>
            <p>This browser client cannot directly scrape CMS because of security restrictions (CORS).</p>
            `,
            icon: 'info',
            confirmButtonText: 'Got it'
        });
    };

    const downloadReport = () => {
        if (!report) return;
        const content = `
# CPT Import Report
Date: ${new Date(report.timestamp).toLocaleString()}
Status: ${report.status}
Files:
${report.files.map(f => `- ${f}`).join('\n')}

Total Records Upserted: ${report.total_records}

---
Generated by ASC Manager
        `;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-report-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDownloadMasterCSV = async () => {
        try {
            log('📥 Fetching all CPT codes for Master CSV export...');

            const { data, error } = await supabase
                .from('cpt_codes')
                .select('*')
                .order('code', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                Swal.fire('Info', 'No CPT codes found in database to export.', 'info');
                return;
            }

            log(`✅ Retrieved ${data.length} records. Generating CSV...`);

            const csvData = data.map(record => ({
                'CPT/HCPCS Code': record.code,
                'Short Descriptor': record.short_descriptor || record.description || '',
                'Long Descriptor': record.long_descriptor || '',
                'Payment Rate': record.reimbursement,
                'Payment Indicator': record.payment_indicator || '',
                'Effective Date': record.effective_date || '',
                'Version Year': record.version_year || '',
                'Category': record.category || 'General',
                'Last Updated': record.last_updated_from_source || ''
            }));

            const csv = Papa.unparse(csvData);

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ASC_MASTER_CPT_LIST_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            log('🎉 Master CSV downloaded successfully.');
            Swal.fire('Success', 'Master CSV downloaded successfully!', 'success');

        } catch (error) {
            console.error('Export Error:', error);
            log(`❌ Export Error: ${error.message}`);
            Swal.fire('Export Failed', error.message, 'error');
        }
    };

    return (
        <div className="cpt-auto-update">
            <header className="page-header">
                <h1>⚙️ CPT Data Manager</h1>
                <p>Merge, De-duplicate, and Upload CMS Payment Rates (CSV/Excel).</p>
            </header>

            <div className="update-grid">
                {/* Manual Upload Section */}
                <div className="card upload-card">
                    <div className="card-header">
                        <h2>📁 File Processor</h2>
                        <span className="badge">Supports: CSV, XLSX, XLS</span>
                    </div>
                    <div className="card-body">
                        <div className="step-guide" style={{ marginBottom: '1.5rem', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>How to use:</h4>
                            <ol style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
                                <li>Download quarterly update files (Jan, Apr, Jul, Oct) from CMS.gov.</li>
                                <li>Select <b>all files at once</b> below.</li>
                                <li>We automatically merge them and keep the latest versions.</li>
                                <li>Review result and <b>Upload</b> to Supabase.</li>
                            </ol>
                        </div>

                        <div className="file-drop-area">
                            <input
                                type="file"
                                id="csvInput"
                                multiple
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileSelect}
                                disabled={uploading}
                            />
                            <label htmlFor="csvInput" className="file-label">
                                {uploading ? 'Processing...' : '📂 Step 1: Select CMS Files'}
                            </label>
                        </div>

                        {/* Step 2: Review Selected & Merge */}
                        {selectedFiles.length > 0 && !mergedMasterData && (
                            <div className="selection-review" style={{ marginTop: '1.5rem' }}>
                                <div className="selected-list" style={{ marginBottom: '1rem', background: '#f1f3f5', padding: '10px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.95rem' }}>Selected Files ({selectedFiles.length}):</h4>
                                    <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.9rem', color: '#555' }}>
                                        {selectedFiles.map((f, i) => <li key={i}>{f.name} ({Math.round(f.size / 1024)} KB)</li>)}
                                    </ul>
                                </div>

                                <button className="btn-primary"
                                    onClick={handleMergeFiles}
                                    disabled={uploading}
                                    style={{ width: '100%', padding: '12px', fontSize: '1.1rem', background: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                    {uploading ? <span className="spinner-sm"></span> : '⚡ Step 2: Merge Files'}
                                </button>
                            </div>
                        )}

                        {/* Step 3: Action Area (Results) */}
                        <div className="merge-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                            {!mergedMasterData && selectedFiles.length === 0 ? (
                                <div className="placeholder-actions" style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                                    <p>⬇️ Merge and Upload options will appear here.</p>
                                </div>
                            ) : mergedMasterData ? (
                                <>
                                    {processedFiles.length > 0 && (
                                        <div className="file-summary" style={{ marginBottom: '1rem', background: '#fff3cd', padding: '10px', borderRadius: '6px', border: '1px solid #ffeeba' }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#856404' }}>📦 Files Included in Merge:</h4>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {processedFiles.map((f, i) => (
                                                    <li key={i} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fae39d', padding: '6px 0' }}>
                                                        <span>📄 {f.name}</span>
                                                        <span style={{ fontWeight: 'bold', color: '#555' }}>{f.validRows} valid codes</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="alert-box success" style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>✅</span>
                                        <div>
                                            <strong>Merge Complete!</strong><br />
                                            Found {mergedMasterData.length} unique CPT codes.
                                        </div>
                                    </div>
                                    <div className="action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                            className="btn-primary"
                                            onClick={handleDownloadMergedCSV}
                                            style={{ background: '#007bff', flex: 1 }}
                                        >
                                            ⬇️ Download Master CSV
                                        </button>

                                        <button
                                            className="btn-primary"
                                            onClick={handleCommitToDb}
                                            style={{ background: '#28a745', flex: 1 }}
                                        >
                                            ☁️ Upload to Database
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {uploading && <div className="spinner"></div>}
                    </div>
                </div>

                {/* Master Export Section */}
                <div className="card export-card">
                    <div className="card-header">
                        <h2>📤 Master Data Export</h2>
                        <span className="badge success">Download</span>
                    </div>
                    <div className="card-body">
                        <p>Download a complete Master CSV with all current CPT codes.</p>
                        <p className="hint">Consolidated data from all updates.</p>

                        <button className="btn-primary" style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }} onClick={handleDownloadMasterCSV}>
                            ⬇️ Download Master CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs & Report Section */}
            <div className="logs-section">
                <div className="card">
                    <div className="card-header">
                        <h3>📜 Activity Log</h3>
                        {report && (
                            <button className="btn-secondary btn-sm" onClick={downloadReport}>
                                ⬇️ Download Report
                            </button>
                        )}
                    </div>
                    <div className="log-window">
                        {logs.length === 0 ? (
                            <span className="placeholder">Activity logs will appear here...</span>
                        ) : (
                            logs.map((L, i) => <div key={i} className="log-line">{L}</div>)
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CPTAutoUpdate;
