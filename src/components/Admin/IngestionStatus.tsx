'use client';

import { useIngestion, formatElapsedTime } from '@/context/IngestionContext';

export default function IngestionStatus() {
    const { state, resetIngestion } = useIngestion();

    if (state.status === 'idle') return null;

    return (
        <div
            className={`mb-6 rounded-2xl border overflow-hidden transition-all duration-500 ${state.status === 'ingesting'
                    ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg shadow-blue-500/10'
                    : state.status === 'success'
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-lg shadow-emerald-500/10'
                        : state.status === 'cancelled'
                            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-lg shadow-amber-500/10'
                            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 shadow-lg shadow-red-500/10'
                }`}
        >
            <div className="p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        {state.status === 'ingesting' ? (
                            <div className="relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                {/* Animated ping effect */}
                                <div className="absolute inset-0 animate-ping rounded-xl bg-blue-400 opacity-20" />
                            </div>
                        ) : state.status === 'success' ? (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : state.status === 'cancelled' ? (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}

                        {/* Status Text */}
                        <div>
                            <h3 className={`font-bold text-lg ${state.status === 'ingesting' ? 'text-blue-900' :
                                    state.status === 'success' ? 'text-emerald-900' :
                                        state.status === 'cancelled' ? 'text-amber-900' : 'text-red-900'
                                }`}>
                                {state.status === 'ingesting' ? 'Data Ingestion in Progress' :
                                    state.status === 'success' ? 'Ingestion Complete' :
                                        state.status === 'cancelled' ? 'Ingestion Cancelled' : 'Ingestion Failed'}
                            </h3>
                            <p className={`text-sm ${state.status === 'ingesting' ? 'text-blue-600' :
                                    state.status === 'success' ? 'text-emerald-600' :
                                        state.status === 'cancelled' ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                {state.message}
                            </p>
                        </div>
                    </div>

                    {/* Right side: Timer or Dismiss */}
                    <div className="flex items-center gap-4">
                        {state.status === 'ingesting' ? (
                            <div className="flex items-center gap-3">
                                {/* Elapsed Time */}
                                <div className="px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200 shadow-sm">
                                    <div className="text-xs text-blue-500 font-medium uppercase tracking-wider">Elapsed</div>
                                    <div className="text-xl font-mono font-bold text-blue-900">
                                        {formatElapsedTime(state.elapsedTime)}
                                    </div>
                                </div>
                                {/* Loading Spinner */}
                                <div className="flex items-center justify-center">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={resetIngestion}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${state.status === 'success'
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : state.status === 'cancelled'
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>

                {/* Results Row (for success) */}
                {state.status === 'success' && state.result && (
                    <div className="mt-4 pt-4 border-t border-emerald-200 flex gap-6">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="text-sm text-gray-600">Inserted:</span>
                            <span className="font-bold text-emerald-700">{state.result.inserted.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                            </svg>
                            <span className="text-sm text-gray-600">Skipped:</span>
                            <span className="font-bold text-gray-700">{state.result.skipped.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-600">Duration:</span>
                            <span className="font-bold text-blue-700">{formatElapsedTime(state.elapsedTime)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Animated Progress Bar (only during ingestion) */}
            {state.status === 'ingesting' && (
                <div className="h-1.5 bg-blue-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-progress-bar" />
                </div>
            )}
        </div>
    );
}
