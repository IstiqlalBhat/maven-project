'use client';

import { useState, useEffect } from 'react';
import { useIngestion } from '@/context/IngestionContext';
import { useAdminAuth } from '@/app/admin/page';

interface Stats {
    totalPitches: number;
    uniquePitchers: number;
    pitchTypeCounts: Record<string, number>;
    dateRange: { min: string; max: string };
}

export default function DataStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clearing, setClearing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { state: ingestionState, cancelIngestion, resetIngestion } = useIngestion();
    const { token, logout } = useAdminAuth();

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/seed', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle auth errors
            if (res.status === 401) {
                logout();
                setError('Session expired. Please log in again.');
                return;
            }

            const data = await res.json();
            if (data.stats) {
                setStats(data.stats);
            } else {
                setStats(null);
            }
        } catch (err) {
            setError('Failed to fetch stats');
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const clearData = async () => {
        // Cancel any running ingestion first
        if (ingestionState.isIngesting) {
            cancelIngestion();
        }

        setClearing(true);
        try {
            const res = await fetch('/api/seed', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle auth errors
            if (res.status === 401) {
                logout();
                setError('Session expired. Please log in again.');
                return;
            }

            const data = await res.json();
            if (data.deleted) {
                setStats(null);
                resetIngestion(); // Reset the ingestion status UI
            }
        } catch (err) {
            setError('Failed to clear data');
        } finally {
            setClearing(false);
            setShowConfirm(false);
            fetchStats(); // Refresh stats
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Auto-refresh stats when ingestion completes
    useEffect(() => {
        if (ingestionState.status === 'success') {
            fetchStats();
        }
    }, [ingestionState.status]);

    const Skeleton = () => (
        <div className="space-y-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-32" />
        </div>
    );

    if (error) return <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full transition-colors ${ingestionState.isIngesting ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                    {ingestionState.isIngesting ? 'Updating...' : 'Live Database Stats'}
                </h2>
                <div className="flex items-center gap-2">
                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={!stats || stats.totalPitches === 0}
                            className="btn-danger flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear Data
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                            <span className="text-sm text-red-700">
                                {ingestionState.isIngesting ? 'Stop ingestion & delete all data?' : 'Delete all data?'}
                            </span>
                            <button
                                onClick={clearData}
                                disabled={clearing}
                                className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {clearing ? 'Deleting...' : 'Yes'}
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300"
                            >
                                No
                            </button>
                        </div>
                    )}
                    <button
                        onClick={fetchStats}
                        className="btn-secondary flex items-center gap-2 text-sm"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    {loading || !stats ? <Skeleton /> : (
                        <>
                            <div className="stat-label text-blue-600 mb-1">Total Pitches</div>
                            <div className="stat-value">{stats.totalPitches.toLocaleString()}</div>
                        </>
                    )}
                </div>

                <div className="glass-card p-5">
                    {loading || !stats ? <Skeleton /> : (
                        <>
                            <div className="stat-label text-purple-600 mb-1">Unique Pitchers</div>
                            <div className="stat-value">{stats.uniquePitchers.toLocaleString()}</div>
                        </>
                    )}
                </div>

                <div className="glass-card p-5 col-span-2">
                    {loading || !stats ? <Skeleton /> : (
                        <>
                            <div className="stat-label text-emerald-600 mb-1">Coverage Period</div>
                            <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {stats.dateRange.min ? (
                                    <>
                                        <span>{new Date(stats.dateRange.min).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span className="text-gray-400">→</span>
                                        <span>{new Date(stats.dateRange.max).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </>
                                ) : 'No Data Loaded'}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
