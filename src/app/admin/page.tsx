'use client';

import { useState } from 'react';
import DataStats from '@/components/Admin/DataStats';
import DataIngestion from '@/components/Admin/DataIngestion';
import IngestionStatus from '@/components/Admin/IngestionStatus';
import AdminLogin from '@/components/Admin/AdminLogin';
import { IngestionProvider } from '@/context/IngestionContext';

// Create a context to share the admin token with child components
import { createContext, useContext } from 'react';

interface AdminAuthContextType {
    token: string | null;
    logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType>({
    token: null,
    logout: () => { },
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export default function AdminPage() {
    const [adminToken, setAdminToken] = useState<string | null>(null);

    const handleLogin = (token: string) => {
        setAdminToken(token);
        // Store token in sessionStorage for persistence during session
        sessionStorage.setItem('admin_token', token);
    };

    const handleLogout = () => {
        setAdminToken(null);
        sessionStorage.removeItem('admin_token');
    };

    // Check for existing session on mount
    if (!adminToken && typeof window !== 'undefined') {
        const storedToken = sessionStorage.getItem('admin_token');
        if (storedToken) {
            setAdminToken(storedToken);
        }
    }

    if (!adminToken) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    return (
        <AdminAuthContext.Provider value={{ token: adminToken, logout: handleLogout }}>
            <IngestionProvider>
                <div className="min-h-screen p-8 pt-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                            <div className="space-y-2">
                                <div className="flex gap-3 mb-2">
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="inline-flex items-center text-sm text-gray-600 hover:text-amber-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to App
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        onClick={handleLogout}
                                        className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                                <h1 className="text-4xl font-bold gradient-text">
                                    System Administration
                                </h1>
                                <p className="text-gray-600 max-w-2xl">
                                    Manage your MLB data ingestion pipeline and monitor database health statistics.
                                </p>
                            </div>
                        </div>

                        {/* Ingestion Status Banner */}
                        <IngestionStatus />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Stats & Info */}
                            <div className="lg:col-span-8 space-y-8">
                                <DataStats />

                                <div className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-4 text-amber-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="text-lg font-semibold text-gray-800">Data Pipeline Information</h3>
                                    </div>
                                    <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
                                        <p>
                                            The ingestion pipeline fetches data directly from <span className="text-gray-800 font-medium">Baseball Savant's Statcast Search API</span>.
                                            To handle large datasets without hitting API limits, requests are automatically split into 3-day chunks.
                                        </p>
                                        <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                            <div className="shrink-0 pt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            </div>
                                            <p>
                                                <strong className="text-gray-800">Recommendation:</strong> For best stability, ingest data in 1-month to 3-month segments rather than full years at once.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Actions */}
                            <div className="lg:col-span-4">
                                <DataIngestion />
                            </div>
                        </div>
                    </div>
                </div>
            </IngestionProvider>
        </AdminAuthContext.Provider>
    );
}
