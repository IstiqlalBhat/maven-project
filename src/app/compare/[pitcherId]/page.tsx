'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GitCompare, Target, Award, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { PitchComparisonGrid } from '@/components/PitchComparisonCard';
import SimilarPros from '@/components/SimilarPros';
import { useAuth } from '@/context/AuthContext';
import { authGet } from '@/lib/auth-fetch';

interface Pitcher {
    id: number;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
}

interface Comparison {
    pitchType: string;
    pitchTypeName: string;
    userStats: {
        avgVelo: number;
        avgSpin: number;
        avgHBreak: number;
        avgVBreak: number;
        pitchCount: number;
    };
    mlbStats: {
        avgVelo: number;
        avgSpin: number;
        avgHBreak: number;
        avgVBreak: number;
        maxVelo: number;
        maxSpin: number;
    };
    percentiles: {
        velocity: number;
        spinRate: number;
        horizontalBreak: number;
        verticalBreak: number;
    };
}

interface SimilarPitcher {
    name: string;
    similarity: number;
    avgVelo: number;
    avgSpin: number;
}

export default function ComparePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [comparisons, setComparisons] = useState<Comparison[]>([]);
    const [similarPitchers, setSimilarPitchers] = useState<SimilarPitcher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch pitcher info (user guard for data fetching)
    useEffect(() => {
        if (!user) return;
        authGet(`/api/pitchers/${pitcherId}`)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404 || res.status === 403) {
                        router.push('/');
                    }
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) setPitcher(data);
            })
            .catch(() => { });
    }, [pitcherId, router, user]);

    // Fetch comparisons
    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        Promise.all([
            authGet(`/api/compare/${pitcherId}`).then(res => res.json()),
            authGet(`/api/similar/${pitcherId}`).then(res => res.json())
        ])
            .then(([compareData, similarData]) => {
                setComparisons(compareData.comparisons || []);
                setSimilarPitchers(similarData.overall || []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [pitcherId, user]);

    // Calculate overall percentile
    const overallPercentile = comparisons.length > 0
        ? Math.round(comparisons.reduce((sum, c) => sum + c.percentiles.velocity + c.percentiles.spinRate, 0) / (comparisons.length * 2))
        : 0;

    // Show loading while checking auth
    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (isLoading && !pitcher) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar pitcherId={pitcherId} />

            <main className="main-content">
                {/* Header */}
                <header className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2.5 lg:gap-3 mb-1.5 lg:mb-2">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <GitCompare className="text-white" size={18} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold text-neutral-800">MLB Comparison</h1>
                    </div>
                    <p className="text-sm lg:text-base text-neutral-500">Compare {pitcher?.name}&apos;s pitches against MLB averages</p>
                </header>

                {comparisons.length === 0 ? (
                    <div className="glass-card p-8 lg:p-12 text-center">
                        <Target size={40} className="mx-auto text-neutral-300 mb-4 lg:w-12 lg:h-12" />
                        <h3 className="text-base lg:text-lg font-semibold text-neutral-800 mb-2">No Pitches to Compare</h3>
                        <p className="text-sm lg:text-base text-neutral-500 mb-4">Add some pitches to your arsenal to see how you compare to MLB pitchers.</p>
                        <button
                            onClick={() => router.push(`/dashboard/${pitcherId}`)}
                            className="btn-primary"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6">
                        {/* Left Column - Pitch Comparison Cards */}
                        <div className="lg:col-span-8 space-y-4 lg:space-y-6 order-2 lg:order-1">
                            {/* Overall Rating */}
                            <div className="glass-card p-4 lg:p-6">
                                <div className="flex items-center justify-between mb-4 lg:mb-6">
                                    <h2 className="text-base lg:text-lg font-semibold text-neutral-800 flex items-center gap-2">
                                        <Award size={18} className="text-amber-500 lg:w-5 lg:h-5" />
                                        <span className="hidden sm:inline">Overall MLB Percentile</span>
                                        <span className="sm:hidden">MLB Percentile</span>
                                    </h2>
                                    <div className={`text-2xl lg:text-4xl font-bold ${overallPercentile >= 75 ? 'text-green-500' :
                                        overallPercentile >= 50 ? 'text-amber-500' :
                                            'text-red-500'
                                        }`}>
                                        {overallPercentile}%
                                    </div>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-3 lg:h-4">
                                    <div
                                        className={`h-3 lg:h-4 rounded-full transition-all duration-500 ${overallPercentile >= 75 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                            overallPercentile >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                                'bg-gradient-to-r from-red-400 to-red-500'
                                            }`}
                                        style={{ width: `${overallPercentile}%` }}
                                    />
                                </div>
                                <p className="text-xs lg:text-sm text-neutral-500 mt-2">
                                    Based on velocity and spin rate across all pitch types
                                </p>
                            </div>

                            {/* Pitch Comparison Cards */}
                            <PitchComparisonGrid comparisons={comparisons} />
                        </div>

                        {/* Right Column - Similar Pitchers */}
                        <div className="lg:col-span-4 order-1 lg:order-2">
                            <SimilarPros pitchers={similarPitchers} isLoading={isLoading} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
