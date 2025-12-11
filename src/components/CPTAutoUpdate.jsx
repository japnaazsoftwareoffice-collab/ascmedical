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

    const log = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleProcessFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setLogs([]);
        setReport(null);
        setMergedMasterData(null);
        log(`Starting processing of ${files.length} files...`);

        try {
            // Sort by name to respect order (Jan -> Apr -> Jul -> Oct)
            files.sort((a, b) => a.name.localeCompare(b.name));

            const allRecordsMap = new Map();

            for (const file of files) {
                log(`📖 Reading file: ${file.name}`);
                let rawData = [];

                if (file.name.endsWith('.csv')) {
                    await new Promise((resolve, reject) => {
                        Papa.parse(file, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results) => {
                                if (results.errors.length) log(`⚠️ Errors in ${file.name}: ${results.errors.length}`);
                                rawData = results.data;
                                resolve();
                            },
                            error: reject
                        });
                    });
                } else if (file.name.match(/\.xlsx?$/)) {
                    await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            try {
                                const bstr = evt.target.result;
                                const wb = XLSX.read(bstr, { type: 'binary' });
                                const wsname = wb.SheetNames[0];
                                const ws = wb.Sheets[wsname];
                                rawData = XLSX.utils.sheet_to_json(ws);
                                resolve();
                            } catch (err) { reject(err); }
                        };
                        reader.onerror = reject;
                        reader.readAsBinaryString(file);
                    });
                } else {
                    log(`⚠️ Skipping unsupported file: ${file.name}`);
                    continue;
                }

                log(`   Found ${rawData.length} rows.`);
                rawData.forEach(row => {
                    const dbRow = mapRowToDb(row, file.name);
                    if (dbRow) {
                        // "Last One Wins" merge strategy
                        allRecordsMap.set(dbRow.code, dbRow);
                    }
                });
            }

            const uniqueRecords = Array.from(allRecordsMap.values());
            log(`✅ Merging Complete. ${uniqueRecords.length} unique CPT codes ready.`);

            setMergedMasterData(uniqueRecords);
            Swal.fire('Ready', `Merged ${uniqueRecords.length} codes! You can now Download the Master CSV or Upload to Database.`, 'success');

        } catch (error) {
            console.error(error);
            log(`❌ ERROR: ${error.message}`);
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
            'Short Descriptor': record.short_descriptor,
            'Long Descriptor': record.long_descriptor,
            'Payment Rate': record.reimbursement,
            'Payment Indicator': record.payment_indicator,
            'Effective Date': record.effective_date,
            'Version Year': record.version_year,
            'Category': record.category,
            'Original File': record.original_filename
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `GENERATED_MASTER_CPT_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        log('🎉 Master CSV downloaded.');
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
                                accept=".csv, .xlsx, .xls"
                                onChange={handleProcessFiles}
                                disabled={uploading}
                            />
                            <label htmlFor="csvInput" className="file-label">
                                {uploading ? 'Processing...' : 'Choose Files'}
                            </label>
                        </div>

                        {mergedMasterData && (
                            <div className="merge-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                <div className="alert-box success" style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px' }}>
                                    ✅ merged {mergedMasterData.length} records from uploaded files.
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-secondary" onClick={handleDownloadMergedCSV}>
                                        ⬇️ Download Master File
                                    </button>
                                    <button className="btn-primary" onClick={handleCommitToDb}>
                                        ☁️ Upload to Database
                                    </button>
                                </div>
                            </div>
                        )}

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
