'use client';

import { useState } from 'react';
import { useIngestion } from '@/context/IngestionContext';
import { useAdminAuth } from '@/app/admin/page';

interface PreviewResult {
    estimatedRows: number;
    totalDays: number;
    sampled: boolean;
    dateRange: { startDate: string; endDate: string };
}

export default function DataIngestion() {
    const [startDate, setStartDate] = useState('2024-04-01');
    const [endDate, setEndDate] = useState('2024-10-01');
    const [previewing, setPreviewing] = useState(false);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [previewError, setPreviewError] = useState('');
    // Default to append mode (adds data without wiping existing data)
    const [replaceAll, setReplaceAll] = useState(false);
    const { state: ingestionState, startIngestion, updateIngestion, completeIngestion, failIngestion } = useIngestion();
    const { token, logout } = useAdminAuth();

    const handlePreview = async () => {
        setPreviewing(true);
        setPreview(null);
        setPreviewError('');

        try {
            const res = await fetch('/api/seed/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ startDate, endDate })
            });

            const data = await res.json();

            // Handle auth errors
            if (res.status === 401) {
                logout();
                return;
            }

            if (!res.ok) throw new Error(data.error || 'Preview failed');

            setPreview(data.preview);
        } catch (err: any) {
            setPreviewError(err.message);
        } finally {
            setPreviewing(false);
        }
    };

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        setPreview(null); // Clear preview when starting ingestion
        const controller = startIngestion(`Fetching data from ${startDate} to ${endDate}...`);

        try {
            updateIngestion('Connecting to Baseball Savant API...');

            const res = await fetch('/api/seed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    // append=true adds data without wiping existing data
                    // force=true replaces ALL data (truncates first)
                    append: !replaceAll,
                    force: replaceAll
                }),
                signal: controller.signal, // Use abort signal
            });

            const data = await res.json();

            // Handle auth errors
            if (res.status === 401) {
                logout();
                failIngestion('Session expired. Please log in again.');
                return;
            }

            if (!res.ok) throw new Error(data.error || 'Ingestion failed');

            completeIngestion({
                inserted: data.result?.inserted || 0,
                skipped: data.result?.skipped || 0,
            });
        } catch (err: any) {
            // Don't show error if it was an abort
            if (err.name === 'AbortError') {
                return; // Silently exit, state already updated by cancelIngestion
            }
            failIngestion(err.message);
        }
    };

    // Clear preview when dates change
    const handleStartDateChange = (value: string) => {
        setStartDate(value);
        setPreview(null);
        setPreviewError('');
    };

    const handleEndDateChange = (value: string) => {
        setEndDate(value);
        setPreview(null);
        setPreviewError('');
    };

    return (
        <div className="glass-card p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Ingest Data</h2>
            </div>

            <form onSubmit={handleIngest} className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => { setStartDate('2024-04-01'); setEndDate('2024-05-01'); setPreview(null); }}
                        className="btn-ghost text-xs"
                    >
                        April 2024
                    </button>
                    <button
                        type="button"
                        onClick={() => { setStartDate('2024-04-01'); setEndDate('2024-10-01'); setPreview(null); }}
                        className="btn-ghost text-xs"
                    >
                        Full Season
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const today = new Date();
                            const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                            setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                            setEndDate(new Date().toISOString().split('T')[0]);
                            setPreview(null);
                        }}
                        className="btn-ghost text-xs"
                    >
                        Last 30 Days
                    </button>
                </div>

                {/* Ingestion Mode Toggle */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={replaceAll}
                            onChange={(e) => setReplaceAll(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1">
                            <span className={`text-sm font-medium ${replaceAll ? 'text-red-700' : 'text-gray-700'}`}>
                                {replaceAll ? 'Replace All Data' : 'Append Mode (Recommended)'}
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {replaceAll
                                    ? '⚠️ WARNING: This will DELETE all existing MLB data before importing!'
                                    : 'Adds new data for the selected date range without deleting existing data.'}
                            </p>
                        </div>
                    </label>
                </div>


                {preview && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                        <div className="flex items-center gap-2 text-blue-700 font-semibold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Preview Results
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Estimated Rows:</span>
                                <span className="ml-2 font-bold text-blue-900">
                                    ~{preview.estimatedRows.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Days:</span>
                                <span className="ml-2 font-bold text-blue-900">{preview.totalDays}</span>
                            </div>
                        </div>
                        {preview.sampled && (
                            <p className="text-xs text-blue-600 italic">
                                * Estimate based on 3-day sample. Actual count may vary.
                            </p>
                        )}
                    </div>
                )}

                {previewError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {previewError}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={previewing || ingestionState.isIngesting}
                        className={`btn-secondary flex-1 flex items-center justify-center gap-2 ${(previewing || ingestionState.isIngesting) ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {previewing && <div className="loading-spinner w-4 h-4" />}
                        {previewing ? 'Checking...' : 'Preview'}
                    </button>
                    <button
                        type="submit"
                        disabled={ingestionState.isIngesting}
                        className={`btn-primary flex-1 flex items-center justify-center gap-2 ${ingestionState.isIngesting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {ingestionState.isIngesting && <div className="loading-spinner w-4 h-4" />}
                        {ingestionState.isIngesting ? 'Processing...' : 'Start Ingestion'}
                    </button>
                </div>
            </form>
        </div>
    );
}
