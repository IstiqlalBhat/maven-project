'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart2, Target, Activity, PieChart, Radar, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import PercentileBar from '@/components/PercentileBar';
import {
    VelocityBarChart,
    ComparisonBarChart,
    PitchDistributionPie,
    PercentileRadarChart,
    VelocityHistogram,
    SpinHistogram,
    BreakComparisonChart,
} from '@/components/StatsCharts';
import { useAuth } from '@/context/AuthContext';
import { authGet } from '@/lib/auth-fetch';

interface Pitcher {
    id: number;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
}

interface Pitch {
    id: number;
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
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

export default function StatsPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [comparisons, setComparisons] = useState<Comparison[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'comparison'>('overview');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch pitcher info
    useEffect(() => {
        if (!user) return;
        authGet(`/api/pitchers/${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    router.push('/');
                    return;
                }
                setPitcher(data);
            })
            .catch(() => router.push('/'));
    }, [pitcherId, router, user]);

    // Fetch pitches
    const fetchPitches = useCallback(() => {
        if (!user) return;
        setIsLoading(true);
        authGet(`/api/pitches?pitcher_id=${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                setPitches(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [pitcherId, user]);

    useEffect(() => {
        fetchPitches();
    }, [fetchPitches]);

    // Fetch comparisons
    useEffect(() => {
        if (pitches.length > 0 && user) {
            authGet(`/api/compare/${pitcherId}`)
                .then(res => res.json())
                .then(data => {
                    setComparisons(data.comparisons || []);
                })
                .catch(() => { });
        }
    }, [pitcherId, pitches.length, user]);

    // Calculate basic stats
    const avgVelocity = pitches.length > 0
        ? pitches.filter(p => p.velocity_mph).reduce((sum, p) => sum + (p.velocity_mph || 0), 0) / pitches.filter(p => p.velocity_mph).length
        : 0;

    const avgSpin = pitches.length > 0
        ? pitches.filter(p => p.spin_rate).reduce((sum, p) => sum + (p.spin_rate || 0), 0) / pitches.filter(p => p.spin_rate).length
        : 0;

    const maxVelocity = pitches.length > 0
        ? Math.max(...pitches.filter(p => p.velocity_mph).map(p => p.velocity_mph || 0))
        : 0;

    const maxSpin = pitches.length > 0
        ? Math.max(...pitches.filter(p => p.spin_rate).map(p => p.spin_rate || 0))
        : 0;

    const pitchTypes = [...new Set(pitches.map(p => p.pitch_type))];

    // Prepare chart data with useMemo for performance
    const velocityBarData = useMemo(() => {
        return pitchTypes.map(type => {
            const typePitches = pitches.filter(p => p.pitch_type === type);
            const veloData = typePitches.filter(p => p.velocity_mph);
            return {
                pitchType: type,
                avgVelo: veloData.length > 0
                    ? veloData.reduce((sum, p) => sum + (p.velocity_mph || 0), 0) / veloData.length
                    : 0,
                maxVelo: veloData.length > 0
                    ? Math.max(...veloData.map(p => p.velocity_mph || 0))
                    : 0,
            };
        });
    }, [pitches, pitchTypes]);

    const pitchDistributionData = useMemo(() => {
        return pitchTypes.map(type => ({
            name: type,
            value: pitches.filter(p => p.pitch_type === type).length,
        }));
    }, [pitches, pitchTypes]);

    const comparisonVeloData = useMemo(() => {
        return comparisons.map(c => ({
            pitchType: c.pitchType,
            userVelo: c.userStats.avgVelo,
            mlbVelo: c.mlbStats.avgVelo,
            userSpin: c.userStats.avgSpin,
            mlbSpin: c.mlbStats.avgSpin,
        }));
    }, [comparisons]);

    const breakComparisonData = useMemo(() => {
        return comparisons.map(c => ({
            pitchType: c.pitchType,
            userHBreak: c.userStats.avgHBreak,
            mlbHBreak: c.mlbStats.avgHBreak,
            userVBreak: c.userStats.avgVBreak,
            mlbVBreak: c.mlbStats.avgVBreak,
        }));
    }, [comparisons]);

    const radarData = useMemo(() => {
        if (comparisons.length === 0) return [];

        // Average percentiles across all pitch types
        const avgPercentiles = {
            velocity: comparisons.reduce((sum, c) => sum + c.percentiles.velocity, 0) / comparisons.length,
            spinRate: comparisons.reduce((sum, c) => sum + c.percentiles.spinRate, 0) / comparisons.length,
            hBreak: comparisons.reduce((sum, c) => sum + c.percentiles.horizontalBreak, 0) / comparisons.length,
            vBreak: comparisons.reduce((sum, c) => sum + c.percentiles.verticalBreak, 0) / comparisons.length,
        };

        return [
            { metric: 'Velocity', percentile: avgPercentiles.velocity, fullMark: 100 },
            { metric: 'Spin Rate', percentile: avgPercentiles.spinRate, fullMark: 100 },
            { metric: 'H. Break', percentile: avgPercentiles.hBreak, fullMark: 100 },
            { metric: 'V. Break', percentile: avgPercentiles.vBreak, fullMark: 100 },
        ];
    }, [comparisons]);

    // Generate velocity histogram data
    const velocityHistogramData = useMemo(() => {
        const veloData = pitches.filter(p => p.velocity_mph).map(p => p.velocity_mph!);
        if (veloData.length === 0) return [];

        const min = Math.floor(Math.min(...veloData));
        const max = Math.ceil(Math.max(...veloData));
        const binSize = 2; // 2 mph bins

        const bins: { range: string; count: number }[] = [];
        for (let i = min; i < max; i += binSize) {
            const count = veloData.filter(v => v >= i && v < i + binSize).length;
            bins.push({
                range: `${i}-${i + binSize}`,
                count,
            });
        }
        return bins;
    }, [pitches]);

    // Generate spin histogram data
    const spinHistogramData = useMemo(() => {
        const spinData = pitches.filter(p => p.spin_rate).map(p => p.spin_rate!);
        if (spinData.length === 0) return [];

        const min = Math.floor(Math.min(...spinData) / 100) * 100;
        const max = Math.ceil(Math.max(...spinData) / 100) * 100;
        const binSize = 200; // 200 rpm bins

        const bins: { range: string; count: number }[] = [];
        for (let i = min; i < max; i += binSize) {
            const count = spinData.filter(s => s >= i && s < i + binSize).length;
            bins.push({
                range: `${i}-${i + binSize}`,
                count,
            });
        }
        return bins;
    }, [pitches]);

    // Group pitches by type for detailed breakdown
    const pitchTypeStats = pitchTypes.map(type => {
        const typePitches = pitches.filter(p => p.pitch_type === type);
        const comparison = comparisons.find(c => c.pitchType === type);
        return {
            type,
            count: typePitches.length,
            avgVelo: typePitches.filter(p => p.velocity_mph).reduce((sum, p) => sum + (p.velocity_mph || 0), 0) / typePitches.filter(p => p.velocity_mph).length || 0,
            avgSpin: typePitches.filter(p => p.spin_rate).reduce((sum, p) => sum + (p.spin_rate || 0), 0) / typePitches.filter(p => p.spin_rate).length || 0,
            maxVelo: Math.max(...typePitches.filter(p => p.velocity_mph).map(p => p.velocity_mph || 0), 0),
            maxSpin: Math.max(...typePitches.filter(p => p.spin_rate).map(p => p.spin_rate || 0), 0),
            comparison,
        };
    });

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
        <div className="min-h-screen flex">
            <Sidebar pitcherId={pitcherId} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                            <BarChart2 className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">Statistics</h1>
                    </div>
                    <p className="text-neutral-500">Detailed stats for {pitcher?.name}</p>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'overview'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <Activity size={18} />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'charts'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <PieChart size={18} />
                        Charts
                    </button>
                    <button
                        onClick={() => setActiveTab('comparison')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'comparison'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <Radar size={18} />
                        MLB Comparison
                    </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatsCard
                        title="Avg. Velocity"
                        value={avgVelocity ? avgVelocity.toFixed(1) : '-'}
                        subtitle="mph"
                    />
                    <StatsCard
                        title="Max Velocity"
                        value={maxVelocity ? maxVelocity.toFixed(1) : '-'}
                        subtitle="mph"
                        color="red"
                    />
                    <StatsCard
                        title="Avg. Spin"
                        value={avgSpin ? Math.round(avgSpin).toLocaleString() : '-'}
                        subtitle="rpm"
                        color="blue"
                    />
                    <StatsCard
                        title="Max Spin"
                        value={maxSpin ? Math.round(maxSpin).toLocaleString() : '-'}
                        subtitle="rpm"
                        color="green"
                    />
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* Pitch Type Breakdown */}
                        <div className="glass-card p-6 mb-8">
                            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-amber-500" />
                                Pitch Type Breakdown
                            </h2>

                            {pitchTypeStats.length === 0 ? (
                                <p className="text-neutral-500 text-center py-8">No pitches recorded yet.</p>
                            ) : (
                                <div className="space-y-6">
                                    {pitchTypeStats.map((stat, idx) => (
                                        <div key={idx} className="border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-medium text-neutral-800">{stat.type}</h3>
                                                <span className="text-sm text-neutral-500">{stat.count} pitches</span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div className="bg-neutral-50 p-3 rounded-lg">
                                                    <p className="text-xs text-neutral-500 mb-1">Avg Velocity</p>
                                                    <p className="font-semibold text-neutral-800">{stat.avgVelo.toFixed(1)} mph</p>
                                                </div>
                                                <div className="bg-neutral-50 p-3 rounded-lg">
                                                    <p className="text-xs text-neutral-500 mb-1">Max Velocity</p>
                                                    <p className="font-semibold text-neutral-800">{stat.maxVelo.toFixed(1)} mph</p>
                                                </div>
                                                <div className="bg-neutral-50 p-3 rounded-lg">
                                                    <p className="text-xs text-neutral-500 mb-1">Avg Spin</p>
                                                    <p className="font-semibold text-neutral-800">{Math.round(stat.avgSpin).toLocaleString()} rpm</p>
                                                </div>
                                                <div className="bg-neutral-50 p-3 rounded-lg">
                                                    <p className="text-xs text-neutral-500 mb-1">Max Spin</p>
                                                    <p className="font-semibold text-neutral-800">{Math.round(stat.maxSpin).toLocaleString()} rpm</p>
                                                </div>
                                            </div>

                                            {stat.comparison && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <PercentileBar
                                                        label="Velocity vs MLB"
                                                        value={stat.avgVelo}
                                                        percentile={stat.comparison.percentiles.velocity}
                                                        unit="mph"
                                                        mlbAvg={stat.comparison.mlbStats.avgVelo}
                                                    />
                                                    <PercentileBar
                                                        label="Spin Rate vs MLB"
                                                        value={stat.avgSpin}
                                                        percentile={stat.comparison.percentiles.spinRate}
                                                        unit="rpm"
                                                        mlbAvg={stat.comparison.mlbStats.avgSpin}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'charts' && (
                    <div className="space-y-6">
                        {pitches.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <BarChart2 size={48} className="mx-auto text-neutral-300 mb-4" />
                                <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Data Available</h3>
                                <p className="text-neutral-500">Add some pitches to see your charts.</p>
                            </div>
                        ) : (
                            <>
                                {/* Row 1: Velocity Bar Chart + Pie Chart */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <VelocityBarChart data={velocityBarData} />
                                    <PitchDistributionPie data={pitchDistributionData} />
                                </div>

                                {/* Row 2: Histograms */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <VelocityHistogram data={velocityHistogramData} />
                                    <SpinHistogram data={spinHistogramData} />
                                </div>

                                {/* Row 3: Spider Chart (full width) */}
                                {radarData.length > 0 && (
                                    <PercentileRadarChart data={radarData} />
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'comparison' && (
                    <div className="space-y-6">
                        {comparisons.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <Target size={48} className="mx-auto text-neutral-300 mb-4" />
                                <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Comparisons Available</h3>
                                <p className="text-neutral-500">Add some pitches to compare against MLB averages.</p>
                            </div>
                        ) : (
                            <>
                                {/* Double Bar Charts: User vs MLB */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ComparisonBarChart data={comparisonVeloData} metric="velocity" />
                                    <ComparisonBarChart data={comparisonVeloData} metric="spin" />
                                </div>

                                {/* Break Comparison Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <BreakComparisonChart data={breakComparisonData} breakType="horizontal" />
                                    <BreakComparisonChart data={breakComparisonData} breakType="vertical" />
                                </div>

                                {/* MLB Comparison Summary Table */}
                                <div className="glass-card p-6">
                                    <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                        <Target size={20} className="text-amber-500" />
                                        MLB Comparison Summary
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <table className="data-table w-full">
                                            <thead>
                                                <tr>
                                                    <th className="text-left">Pitch Type</th>
                                                    <th className="text-right">Your Velo</th>
                                                    <th className="text-right">MLB Avg</th>
                                                    <th className="text-right">Your Spin</th>
                                                    <th className="text-right">MLB Avg</th>
                                                    <th className="text-right">Velo %ile</th>
                                                    <th className="text-right">Spin %ile</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comparisons.map((c, idx) => (
                                                    <tr key={idx}>
                                                        <td className="font-medium">{c.pitchType}</td>
                                                        <td className="text-right">{c.userStats.avgVelo.toFixed(1)}</td>
                                                        <td className="text-right text-neutral-500">{c.mlbStats.avgVelo.toFixed(1)}</td>
                                                        <td className="text-right">{Math.round(c.userStats.avgSpin).toLocaleString()}</td>
                                                        <td className="text-right text-neutral-500">{Math.round(c.mlbStats.avgSpin).toLocaleString()}</td>
                                                        <td className="text-right">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.percentiles.velocity >= 75 ? 'bg-green-100 text-green-700' :
                                                                c.percentiles.velocity >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {Math.round(c.percentiles.velocity)}%
                                                            </span>
                                                        </td>
                                                        <td className="text-right">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.percentiles.spinRate >= 75 ? 'bg-green-100 text-green-700' :
                                                                c.percentiles.spinRate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {Math.round(c.percentiles.spinRate)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
