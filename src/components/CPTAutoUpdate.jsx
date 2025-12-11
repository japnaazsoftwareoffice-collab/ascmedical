import React, { useState } from 'react';
import Papa from 'papaparse';
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

    const log = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setLogs([]);
        setReport(null);
        log(`Starting upload of ${files.length} files...`);

        let totalProcessed = 0;
        let totalUpserted = 0;
        let errors = [];

        try {
            // Sort by name to respect order (Jan -> Apr -> Jul -> Oct)
            files.sort((a, b) => a.name.localeCompare(b.name));

            const allRecordsMap = new Map();

            for (const file of files) {
                log(`📖 Reading file: ${file.name}`);

                await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            if (results.errors.length) {
                                log(`⚠️ Errors in ${file.name}: ${results.errors.length}`);
                            }

                            log(`   Found ${results.data.length} rows.`);

                            results.data.forEach(row => {
                                const dbRow = mapRowToDb(row, file.name);
                                if (dbRow) {
                                    // Merge logic: Map overwrites previous keys, implementing "Last One Wins" which is what we want for sorted files
                                    allRecordsMap.set(dbRow.code, dbRow);
                                }
                            });

                            resolve();
                        },
                        error: (err) => {
                            reject(err);
                        }
                    });
                });
            }

            const uniqueRecords = Array.from(allRecordsMap.values());
            totalProcessed = uniqueRecords.length;
            log(`🔄 Merged into ${totalProcessed} unique records.`);
            log(`💾 Syncing with Database...`);

            // Chunk upload
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < uniqueRecords.length; i += CHUNK_SIZE) {
                const chunk = uniqueRecords.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase
                    .from('cpt_codes')
                    .upsert(chunk, { onConflict: 'code' });

                if (error) throw error;
                totalUpserted += chunk.length;
                log(`   ✅ Upserted batch ${Math.ceil((i + 1) / CHUNK_SIZE)}`);
            }

            log(`✅ COMPLETE: ${totalUpserted} records updated.`);

            // Generate Report Object
            setReport({
                timestamp: new Date().toISOString(),
                files: files.map(f => f.name),
                total_records: totalUpserted,
                status: 'SUCCESS'
            });

            Swal.fire('Success!', `Processed ${files.length} files and updated ${totalUpserted} codes.`, 'success');

        } catch (error) {
            console.error(error);
            log(`❌ ERROR: ${error.message}`);
            Swal.fire('Error', error.message, 'error');
        } finally {
            setUploading(false);
        }
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

    return (
        <div className="cpt-auto-update">
            <header className="page-header">
                <h1>🔄 CPT Auto-Updater</h1>
                <p>Manage standard Medicare ASC CPT codes and payment rates.</p>
            </header>

            <div className="update-grid">
                {/* Manual Upload Section */}
                <div className="card upload-card">
                    <div className="card-header">
                        <h2>📁 Manual Seed / Upload</h2>
                        <span className="badge">Local processing</span>
                    </div>
                    <div className="card-body">
                        <p>Select one or multiple CSV files from CMS (Jan, Apr, Jul, Oct).</p>
                        <p className="hint">We automatically merge duplicates and keep the latest data.</p>

                        <div className="file-drop-area">
                            <input
                                type="file"
                                id="csvInput"
                                multiple
                                accept=".csv"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="csvInput" className="file-label">
                                {uploading ? 'Processing...' : 'Choose Files'}
                            </label>
                        </div>

                        {uploading && <div className="spinner"></div>}
                    </div>
                </div>

                {/* Automation Info Section */}
                <div className="card auto-card">
                    <div className="card-header">
                        <h2>🤖 CMS Auto-Sync</h2>
                        <span className="badge cloud">Cloud Service</span>
                    </div>
                    <div className="card-body">
                        <p>Automatically fetch latest addenda from CMS.gov.</p>
                        <div className="stat-row">
                            <span>Status:</span>
                            <span className="status-ok">Active (GitHub Actions)</span>
                        </div>
                        <div className="stat-row">
                            <span>Schedule:</span>
                            <span>Quarterly (Jan, Apr, Jul, Oct)</span>
                        </div>

                        <button className="btn-primary" onClick={handleAutoUpdate}>
                            Check for Updates Now
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
