'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart2, Target, Activity, PieChart, Radar, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import ArsenalOverview from '@/components/ArsenalOverview';
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
        const veloData = typePitches.filter(p => p.velocity_mph);
        const spinData = typePitches.filter(p => p.spin_rate);
        const hBreakData = typePitches.filter(p => p.horizontal_break != null);
        const vBreakData = typePitches.filter(p => p.vertical_break != null);

        return {
            type,
            count: typePitches.length,
            avgVelo: veloData.length > 0 ? veloData.reduce((sum, p) => sum + (p.velocity_mph || 0), 0) / veloData.length : 0,
            avgSpin: spinData.length > 0 ? spinData.reduce((sum, p) => sum + (p.spin_rate || 0), 0) / spinData.length : 0,
            maxVelo: veloData.length > 0 ? Math.max(...veloData.map(p => p.velocity_mph || 0)) : 0,
            maxSpin: spinData.length > 0 ? Math.max(...spinData.map(p => p.spin_rate || 0)) : 0,
            avgHBreak: hBreakData.length > 0 ? hBreakData.reduce((sum, p) => sum + (p.horizontal_break || 0), 0) / hBreakData.length : 0,
            avgVBreak: vBreakData.length > 0 ? vBreakData.reduce((sum, p) => sum + (p.vertical_break || 0), 0) / vBreakData.length : 0,
            comparison: comparison ? {
                percentiles: comparison.percentiles,
                mlbStats: comparison.mlbStats
            } : undefined,
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
        <div className="min-h-screen flex flex-col lg:flex-row">
            <Sidebar pitcherId={pitcherId} />

            <main className="flex-1 main-content">
                {/* Header */}
                <header className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                            <BarChart2 className="text-white" size={18} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold text-neutral-800">Statistics</h1>
                    </div>
                    <p className="text-sm lg:text-base text-neutral-500">Detailed stats for {pitcher?.name}</p>
                </header>

                {/* Tabs - Scrollable on mobile */}
                <div className="flex gap-2 mb-4 lg:mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3 lg:px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap text-sm lg:text-base ${activeTab === 'overview'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <Activity size={16} className="lg:w-[18px] lg:h-[18px]" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`px-3 lg:px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap text-sm lg:text-base ${activeTab === 'charts'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <PieChart size={16} className="lg:w-[18px] lg:h-[18px]" />
                        Charts
                    </button>
                    <button
                        onClick={() => setActiveTab('comparison')}
                        className={`px-3 lg:px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap text-sm lg:text-base ${activeTab === 'comparison'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                    >
                        <Radar size={16} className="lg:w-[18px] lg:h-[18px]" />
                        <span className="hidden sm:inline">MLB </span>Comparison
                    </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
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
                    <div className="glass-card p-4 lg:p-6 mb-6 lg:mb-8">
                        <ArsenalOverview
                            pitchTypes={pitchTypeStats}
                            totalPitches={pitches.length}
                        />
                    </div>
                )}

                {activeTab === 'charts' && (
                    <div className="space-y-4 lg:space-y-6">
                        {pitches.length === 0 ? (
                            <div className="glass-card p-8 lg:p-12 text-center">
                                <BarChart2 size={40} className="mx-auto text-neutral-300 mb-4 lg:w-12 lg:h-12" />
                                <h3 className="text-base lg:text-lg font-semibold text-neutral-800 mb-2">No Data Available</h3>
                                <p className="text-sm lg:text-base text-neutral-500">Add some pitches to see your charts.</p>
                            </div>
                        ) : (
                            <>
                                {/* Row 1: Velocity Bar Chart + Pie Chart */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                                    <VelocityBarChart data={velocityBarData} />
                                    <PitchDistributionPie data={pitchDistributionData} />
                                </div>

                                {/* Row 2: Histograms */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
                    <div className="space-y-4 lg:space-y-6">
                        {comparisons.length === 0 ? (
                            <div className="glass-card p-8 lg:p-12 text-center">
                                <Target size={40} className="mx-auto text-neutral-300 mb-4 lg:w-12 lg:h-12" />
                                <h3 className="text-base lg:text-lg font-semibold text-neutral-800 mb-2">No Comparisons Available</h3>
                                <p className="text-sm lg:text-base text-neutral-500">Add some pitches to compare against MLB averages.</p>
                            </div>
                        ) : (
                            <>
                                {/* Double Bar Charts: User vs MLB */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                                    <ComparisonBarChart data={comparisonVeloData} metric="velocity" />
                                    <ComparisonBarChart data={comparisonVeloData} metric="spin" />
                                </div>

                                {/* Break Comparison Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                                    <BreakComparisonChart data={breakComparisonData} breakType="horizontal" />
                                    <BreakComparisonChart data={breakComparisonData} breakType="vertical" />
                                </div>

                                {/* MLB Comparison Summary Table */}
                                <div className="glass-card p-4 lg:p-6">
                                    <h2 className="text-base lg:text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                        <Target size={18} className="text-amber-500 lg:w-5 lg:h-5" />
                                        MLB Comparison Summary
                                    </h2>

                                    {/* Mobile Card View */}
                                    <div className="lg:hidden space-y-4">
                                        {comparisons.map((c, idx) => (
                                            <div key={idx} className="glass-panel-sm p-4 space-y-3">
                                                <div className="font-semibold text-neutral-800">{c.pitchType}</div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <div className="text-neutral-500 text-xs">Your Velocity</div>
                                                        <div className="font-medium">{c.userStats.avgVelo.toFixed(1)} mph</div>
                                                        <div className="text-neutral-400 text-xs">MLB: {c.mlbStats.avgVelo.toFixed(1)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-neutral-500 text-xs">Your Spin</div>
                                                        <div className="font-medium">{Math.round(c.userStats.avgSpin).toLocaleString()} rpm</div>
                                                        <div className="text-neutral-400 text-xs">MLB: {Math.round(c.mlbStats.avgSpin).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${c.percentiles.velocity >= 75 ? 'bg-green-100 text-green-700' :
                                                        c.percentiles.velocity >= 50 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        Velo: {Math.round(c.percentiles.velocity)}%ile
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${c.percentiles.spinRate >= 75 ? 'bg-green-100 text-green-700' :
                                                        c.percentiles.spinRate >= 50 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        Spin: {Math.round(c.percentiles.spinRate)}%ile
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden lg:block overflow-x-auto">
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
