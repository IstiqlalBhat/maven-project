'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GitCompare, TrendingUp, Target, Award } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PercentileBar from '@/components/PercentileBar';
import SimilarPros from '@/components/SimilarPros';

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
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [comparisons, setComparisons] = useState<Comparison[]>([]);
    const [similarPitchers, setSimilarPitchers] = useState<SimilarPitcher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPitchType, setSelectedPitchType] = useState<string | null>(null);

    // Fetch pitcher info
    useEffect(() => {
        fetch(`/api/pitchers/${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    router.push('/');
                    return;
                }
                setPitcher(data);
            })
            .catch(() => router.push('/'));
    }, [pitcherId, router]);

    // Fetch comparisons
    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            fetch(`/api/compare/${pitcherId}`).then(res => res.json()),
            fetch(`/api/similar/${pitcherId}`).then(res => res.json())
        ])
            .then(([compareData, similarData]) => {
                setComparisons(compareData.comparisons || []);
                setSimilarPitchers(similarData.overall || []);
                if (compareData.comparisons?.length > 0) {
                    setSelectedPitchType(compareData.comparisons[0].pitchType);
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [pitcherId]);

    const selectedComparison = comparisons.find(c => c.pitchType === selectedPitchType);

    // Calculate overall percentile
    const overallPercentile = comparisons.length > 0
        ? Math.round(comparisons.reduce((sum, c) => sum + c.percentiles.velocity + c.percentiles.spinRate, 0) / (comparisons.length * 2))
        : 0;

    if (isLoading && !pitcher) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar pitcherId={pitcherId} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                            <GitCompare className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">MLB Comparison</h1>
                    </div>
                    <p className="text-neutral-500">Compare {pitcher?.name}&apos;s pitches against MLB averages</p>
                </header>

                {comparisons.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Target size={48} className="mx-auto text-neutral-300 mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Pitches to Compare</h3>
                        <p className="text-neutral-500 mb-4">Add some pitches to your arsenal to see how you compare to MLB pitchers.</p>
                        <button
                            onClick={() => router.push(`/dashboard/${pitcherId}`)}
                            className="btn-primary"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Column - Detailed Comparison */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            {/* Overall Rating */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                                        <Award size={20} className="text-amber-500" />
                                        Overall MLB Percentile
                                    </h2>
                                    <div className={`text-4xl font-bold ${overallPercentile >= 75 ? 'text-green-500' :
                                        overallPercentile >= 50 ? 'text-amber-500' :
                                            'text-red-500'
                                        }`}>
                                        {overallPercentile}%
                                    </div>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-4">
                                    <div
                                        className={`h-4 rounded-full transition-all duration-500 ${overallPercentile >= 75 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                            overallPercentile >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                                'bg-gradient-to-r from-red-400 to-red-500'
                                            }`}
                                        style={{ width: `${overallPercentile}%` }}
                                    />
                                </div>
                                <p className="text-sm text-neutral-500 mt-2">
                                    Based on velocity and spin rate across all pitch types
                                </p>
                            </div>

                            {/* Pitch Type Selector */}
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-semibold text-neutral-800 mb-4">Select Pitch Type</h2>
                                <div className="flex flex-wrap gap-2">
                                    {comparisons.map((c, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedPitchType(c.pitchType)}
                                            className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedPitchType === c.pitchType
                                                ? 'bg-amber-500 text-white shadow-md'
                                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                }`}
                                        >
                                            {c.pitchType}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Comparison */}
                            {selectedComparison && (
                                <div className="glass-card p-6">
                                    <h2 className="text-lg font-semibold text-neutral-800 mb-6 flex items-center gap-2">
                                        <TrendingUp size={20} className="text-amber-500" />
                                        {selectedComparison.pitchType} vs MLB
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <PercentileBar
                                            label="Velocity"
                                            value={selectedComparison.userStats.avgVelo}
                                            percentile={selectedComparison.percentiles.velocity}
                                            unit="mph"
                                            mlbAvg={selectedComparison.mlbStats.avgVelo}
                                            mlbMax={selectedComparison.mlbStats.maxVelo}
                                        />
                                        <PercentileBar
                                            label="Spin Rate"
                                            value={selectedComparison.userStats.avgSpin}
                                            percentile={selectedComparison.percentiles.spinRate}
                                            unit="rpm"
                                            mlbAvg={selectedComparison.mlbStats.avgSpin}
                                            mlbMax={selectedComparison.mlbStats.maxSpin}
                                        />
                                        <PercentileBar
                                            label="Horizontal Break"
                                            value={selectedComparison.userStats.avgHBreak}
                                            percentile={selectedComparison.percentiles.horizontalBreak}
                                            unit='"'
                                            mlbAvg={selectedComparison.mlbStats.avgHBreak}
                                        />
                                        <PercentileBar
                                            label="Vertical Break"
                                            value={selectedComparison.userStats.avgVBreak}
                                            percentile={selectedComparison.percentiles.verticalBreak}
                                            unit='"'
                                            mlbAvg={selectedComparison.mlbStats.avgVBreak}
                                        />
                                    </div>

                                    {/* Stats Table */}
                                    <div className="mt-6 overflow-x-auto">
                                        <table className="data-table w-full">
                                            <thead>
                                                <tr>
                                                    <th className="text-left">Metric</th>
                                                    <th className="text-right">Your Avg</th>
                                                    <th className="text-right">MLB Avg</th>
                                                    <th className="text-right">MLB Max</th>
                                                    <th className="text-right">Percentile</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Velocity</td>
                                                    <td className="text-right font-medium">{selectedComparison.userStats.avgVelo.toFixed(1)} mph</td>
                                                    <td className="text-right text-neutral-500">{selectedComparison.mlbStats.avgVelo.toFixed(1)} mph</td>
                                                    <td className="text-right text-neutral-500">{selectedComparison.mlbStats.maxVelo.toFixed(1)} mph</td>
                                                    <td className="text-right">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedComparison.percentiles.velocity >= 75 ? 'bg-green-100 text-green-700' :
                                                            selectedComparison.percentiles.velocity >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round(selectedComparison.percentiles.velocity)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Spin Rate</td>
                                                    <td className="text-right font-medium">{Math.round(selectedComparison.userStats.avgSpin).toLocaleString()} rpm</td>
                                                    <td className="text-right text-neutral-500">{Math.round(selectedComparison.mlbStats.avgSpin).toLocaleString()} rpm</td>
                                                    <td className="text-right text-neutral-500">{Math.round(selectedComparison.mlbStats.maxSpin).toLocaleString()} rpm</td>
                                                    <td className="text-right">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedComparison.percentiles.spinRate >= 75 ? 'bg-green-100 text-green-700' :
                                                            selectedComparison.percentiles.spinRate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round(selectedComparison.percentiles.spinRate)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Horizontal Break</td>
                                                    <td className="text-right font-medium">{selectedComparison.userStats.avgHBreak.toFixed(1)}&quot;</td>
                                                    <td className="text-right text-neutral-500">{selectedComparison.mlbStats.avgHBreak.toFixed(1)}&quot;</td>
                                                    <td className="text-right text-neutral-500">-</td>
                                                    <td className="text-right">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedComparison.percentiles.horizontalBreak >= 75 ? 'bg-green-100 text-green-700' :
                                                            selectedComparison.percentiles.horizontalBreak >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round(selectedComparison.percentiles.horizontalBreak)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Vertical Break</td>
                                                    <td className="text-right font-medium">{selectedComparison.userStats.avgVBreak.toFixed(1)}&quot;</td>
                                                    <td className="text-right text-neutral-500">{selectedComparison.mlbStats.avgVBreak.toFixed(1)}&quot;</td>
                                                    <td className="text-right text-neutral-500">-</td>
                                                    <td className="text-right">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedComparison.percentiles.verticalBreak >= 75 ? 'bg-green-100 text-green-700' :
                                                            selectedComparison.percentiles.verticalBreak >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round(selectedComparison.percentiles.verticalBreak)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Similar Pitchers */}
                        <div className="col-span-12 lg:col-span-4">
                            <SimilarPros pitchers={similarPitchers} isLoading={isLoading} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
