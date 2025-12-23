import React, { useState } from 'react';
import { batchFetchCPTDurations, generateDurationSQL } from '../services/cptDurationService';
import { db } from '../lib/supabase';

const CPTDurationUpdater = ({ cptCodes, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [generatedSQL, setGeneratedSQL] = useState('');
    const [error, setError] = useState(null);

    const handleStartProcess = async () => {
        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setGeneratedSQL('');

        try {
            // Filter CPT codes that don't have average_duration
            const codesToProcess = cptCodes.filter(cpt => !cpt.average_duration);

            if (codesToProcess.length === 0) {
                setError('All CPT codes already have durations!');
                setIsProcessing(false);
                return;
            }

            setTotalCount(codesToProcess.length);

            // Batch fetch durations using Gemini AI
            const durations = await batchFetchCPTDurations(
                codesToProcess,
                (prog, current, total) => {
                    setProgress(prog);
                    setCurrentCount(current);
                    setTotalCount(total);
                }
            );

            // Generate SQL
            const sql = generateDurationSQL(durations);
            setGeneratedSQL(sql);

            // Optionally auto-update database
            // await updateDurationsInDatabase(durations);

            setIsProcessing(false);
        } catch (err) {
            console.error('Error processing durations:', err);
            setError(err.message);
            setIsProcessing(false);
        }
    };

    const handleCopySQL = () => {
        navigator.clipboard.writeText(generatedSQL);
        alert('SQL copied to clipboard! Paste it into Supabase SQL Editor.');
    };

    const handleDownloadSQL = () => {
        const blob = new Blob([generatedSQL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cpt_durations_update.sql';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        }}>
            <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                color: '#fff'
            }}>
                <h2 style={{ marginTop: 0 }}>🤖 AI-Powered Duration Updater</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: '#94a3b8' }}>
                        This tool uses Gemini AI to automatically fetch realistic surgical durations
                        for all {cptCodes.length} CPT codes in your database.
                    </p>

                    <div style={{
                        background: '#0f172a',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginTop: '1rem'
                    }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Total CPT Codes:</strong> {cptCodes.length}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Missing Durations:</strong> {cptCodes.filter(c => !c.average_duration).length}
                        </div>
                        <div>
                            <strong>Estimated Time:</strong> ~{Math.ceil(cptCodes.filter(c => !c.average_duration).length / 10)} minutes
                        </div>
                    </div>
                </div>

                {!isProcessing && !generatedSQL && (
                    <button
                        onClick={handleStartProcess}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '1rem'
                        }}
                    >
                        🚀 Start AI Processing
                    </button>
                )}

                {isProcessing && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            background: '#0f172a',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                Processing: {currentCount} / {totalCount}
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#334155',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                                {progress}% complete
                            </div>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                            ⏳ Please wait... Gemini AI is analyzing surgical procedures
                        </p>
                    </div>
                )}

                {generatedSQL && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            background: '#10b981',
                            color: '#fff',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            textAlign: 'center'
                        }}>
                            ✅ Processing Complete! {currentCount} durations generated
                        </div>

                        <div style={{
                            background: '#0f172a',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            maxHeight: '200px',
                            overflow: 'auto',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace'
                        }}>
                            {generatedSQL.split('\n').slice(0, 10).join('\n')}
                            {generatedSQL.split('\n').length > 10 && '\n... (truncated)'}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handleCopySQL}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                📋 Copy SQL
                            </button>
                            <button
                                onClick={handleDownloadSQL}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                💾 Download SQL
                            </button>
                        </div>

                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                        }}>
                            <strong>Next Steps:</strong>
                            <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                                <li>Copy or download the SQL</li>
                                <li>Open Supabase SQL Editor</li>
                                <li>Paste and run the SQL</li>
                                <li>Refresh your app</li>
                            </ol>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: '#ef4444',
                        color: '#fff',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        ❌ Error: {error}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#475569',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default CPTDurationUpdater;
