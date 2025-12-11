'use client';

import { useEffect, useState } from 'react';
import { Zap, RotateCcw, ArrowRightLeft, ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PitchTypeStats {
    type: string;
    count: number;
    avgVelo: number;
    maxVelo: number;
    avgSpin: number;
    maxSpin: number;
    avgHBreak?: number;
    avgVBreak?: number;
    comparison?: {
        percentiles: {
            velocity: number;
            spinRate: number;
            horizontalBreak: number;
            verticalBreak: number;
        };
        mlbStats: {
            avgVelo: number;
            avgSpin: number;
            avgHBreak: number;
            avgVBreak: number;
        };
    };
}

interface ArsenalOverviewProps {
    pitchTypes: PitchTypeStats[];
    totalPitches: number;
}

// Mini sparkline bar component
function MetricBar({
    value,
    maxValue,
    color,
    showGlow = false
}: {
    value: number;
    maxValue: number;
    color: string;
    showGlow?: boolean;
}) {
    const [width, setWidth] = useState(0);
    const percentage = Math.min((value / maxValue) * 100, 100);

    useEffect(() => {
        const timer = setTimeout(() => setWidth(percentage), 50);
        return () => clearTimeout(timer);
    }, [percentage]);

    return (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                style={{
                    width: `${width}%`,
                    boxShadow: showGlow ? '0 0 8px currentColor' : 'none'
                }}
            />
        </div>
    );
}

// Percentile indicator dot
function PercentileDot({ percentile, size = 'sm' }: { percentile: number; size?: 'sm' | 'md' }) {
    const getColor = (p: number) => {
        if (p >= 80) return 'bg-violet-500';
        if (p >= 60) return 'bg-emerald-500';
        if (p >= 40) return 'bg-amber-500';
        return 'bg-red-400';
    };

    const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

    return (
        <div className={`${sizeClass} rounded-full ${getColor(percentile)}`} title={`${percentile}th percentile`} />
    );
}

// Trend indicator
function TrendIndicator({ userValue, mlbValue }: { userValue: number; mlbValue: number }) {
    const diff = ((userValue - mlbValue) / mlbValue) * 100;

    if (Math.abs(diff) < 2) {
        return <Minus size={12} className="text-gray-400" />;
    }
    if (diff > 0) {
        return <TrendingUp size={12} className="text-emerald-500" />;
    }
    return <TrendingDown size={12} className="text-red-400" />;
}

// Get pitch type styling
function getPitchStyle(type: string) {
    const t = type.toLowerCase();
    if (t.includes('fastball') || t === 'ff') return { color: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    if (t.includes('sinker') || t === 'si') return { color: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    if (t.includes('slider') || t === 'sl') return { color: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    if (t.includes('curve') || t === 'cu') return { color: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    if (t.includes('change') || t === 'ch') return { color: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
    if (t.includes('cutter') || t === 'fc') return { color: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' };
    if (t.includes('splitter') || t === 'fs') return { color: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' };
    return { color: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
}

// Single pitch type row
function PitchTypeRow({ stat, maxVelo, maxSpin }: { stat: PitchTypeStats; maxVelo: number; maxSpin: number }) {
    const style = getPitchStyle(stat.type);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className={`rounded-xl border ${style.border} bg-white/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-md`}
        >
            {/* Main Row */}
            <div
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {/* Pitch Type Badge */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <div className={`w-3 h-3 rounded-full ${style.color}`} />
                        <span className={`font-semibold ${style.text}`}>{stat.type}</span>
                    </div>

                    {/* Count Badge */}
                    <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
                        {stat.count}
                    </div>

                    {/* Metrics Grid */}
                    <div className="flex-1 grid grid-cols-4 gap-4">
                        {/* Velocity */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <Zap size={10} className="text-red-400" />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Velo</span>
                                </div>
                                {stat.comparison && (
                                    <PercentileDot percentile={stat.comparison.percentiles.velocity} />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-800">{stat.avgVelo.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400">mph</span>
                            </div>
                            <MetricBar value={stat.avgVelo} maxValue={maxVelo} color="bg-gradient-to-r from-red-400 to-orange-400" />
                        </div>

                        {/* Spin */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <RotateCcw size={10} className="text-blue-400" />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Spin</span>
                                </div>
                                {stat.comparison && (
                                    <PercentileDot percentile={stat.comparison.percentiles.spinRate} />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-800">{Math.round(stat.avgSpin).toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400">rpm</span>
                            </div>
                            <MetricBar value={stat.avgSpin} maxValue={maxSpin} color="bg-gradient-to-r from-blue-400 to-indigo-400" />
                        </div>

                        {/* H-Break */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <ArrowRightLeft size={10} className="text-green-400" />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">H-Brk</span>
                                </div>
                                {stat.comparison && (
                                    <PercentileDot percentile={stat.comparison.percentiles.horizontalBreak} />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-800">{(stat.avgHBreak ?? 0).toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400">&quot;</span>
                            </div>
                            <MetricBar value={Math.abs(stat.avgHBreak ?? 0)} maxValue={20} color="bg-gradient-to-r from-green-400 to-emerald-400" />
                        </div>

                        {/* V-Break */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <ArrowUpDown size={10} className="text-purple-400" />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">V-Brk</span>
                                </div>
                                {stat.comparison && (
                                    <PercentileDot percentile={stat.comparison.percentiles.verticalBreak} />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-800">{(stat.avgVBreak ?? 0).toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400">&quot;</span>
                            </div>
                            <MetricBar value={Math.abs(stat.avgVBreak ?? 0)} maxValue={20} color="bg-gradient-to-r from-purple-400 to-violet-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && stat.comparison && (
                <div className={`px-4 pb-4 pt-2 border-t ${style.border} bg-gray-50/50`}>
                    <div className="flex items-start gap-4">
                        {/* Spacer to align with metrics grid above */}
                        <div className="min-w-[120px]" />
                        <div className="px-2 py-0.5 invisible text-xs">00</div>

                        {/* Details grid aligned with metrics */}
                        <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
                            {/* Velocity Detail */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>Max</span>
                                    <span className="font-medium text-gray-700">{stat.maxVelo.toFixed(1)} mph</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>MLB Avg</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{stat.comparison.mlbStats.avgVelo.toFixed(1)}</span>
                                        <TrendIndicator userValue={stat.avgVelo} mlbValue={stat.comparison.mlbStats.avgVelo} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Percentile</span>
                                    <span className={`font-bold ${stat.comparison.percentiles.velocity >= 60 ? 'text-emerald-600' : stat.comparison.percentiles.velocity >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {stat.comparison.percentiles.velocity}th
                                    </span>
                                </div>
                            </div>

                            {/* Spin Detail */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>Max</span>
                                    <span className="font-medium text-gray-700">{Math.round(stat.maxSpin).toLocaleString()} rpm</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>MLB Avg</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{Math.round(stat.comparison.mlbStats.avgSpin).toLocaleString()}</span>
                                        <TrendIndicator userValue={stat.avgSpin} mlbValue={stat.comparison.mlbStats.avgSpin} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Percentile</span>
                                    <span className={`font-bold ${stat.comparison.percentiles.spinRate >= 60 ? 'text-emerald-600' : stat.comparison.percentiles.spinRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {stat.comparison.percentiles.spinRate}th
                                    </span>
                                </div>
                            </div>

                            {/* H-Break Detail */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>MLB Avg</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{stat.comparison.mlbStats.avgHBreak.toFixed(1)}&quot;</span>
                                        <TrendIndicator userValue={Math.abs(stat.avgHBreak ?? 0)} mlbValue={Math.abs(stat.comparison.mlbStats.avgHBreak)} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Percentile</span>
                                    <span className={`font-bold ${stat.comparison.percentiles.horizontalBreak >= 60 ? 'text-emerald-600' : stat.comparison.percentiles.horizontalBreak >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {stat.comparison.percentiles.horizontalBreak}th
                                    </span>
                                </div>
                            </div>

                            {/* V-Break Detail */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span>MLB Avg</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{stat.comparison.mlbStats.avgVBreak.toFixed(1)}&quot;</span>
                                        <TrendIndicator userValue={Math.abs(stat.avgVBreak ?? 0)} mlbValue={Math.abs(stat.comparison.mlbStats.avgVBreak)} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Percentile</span>
                                    <span className={`font-bold ${stat.comparison.percentiles.verticalBreak >= 60 ? 'text-emerald-600' : stat.comparison.percentiles.verticalBreak >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {stat.comparison.percentiles.verticalBreak}th
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Legend component
function Legend() {
    return (
        <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Percentile:</span>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span>80+</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>60-79</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>40-59</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>&lt;40</span>
            </div>
        </div>
    );
}

export default function ArsenalOverview({ pitchTypes, totalPitches }: ArsenalOverviewProps) {
    // Calculate max values for relative bar scaling
    const maxVelo = Math.max(...pitchTypes.map(p => p.maxVelo), 100);
    const maxSpin = Math.max(...pitchTypes.map(p => p.maxSpin), 3000);

    if (pitchTypes.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <p className="text-gray-500">No pitches recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Arsenal Overview</h2>
                    <p className="text-xs text-gray-500">{totalPitches} total pitches across {pitchTypes.length} pitch types</p>
                </div>
                <Legend />
            </div>

            {/* Pitch Type Rows */}
            <div className="space-y-3">
                {pitchTypes.map((stat) => (
                    <PitchTypeRow
                        key={`arsenal-${stat.type}`}
                        stat={stat}
                        maxVelo={maxVelo}
                        maxSpin={maxSpin}
                    />
                ))}
            </div>

            {/* Tip */}
            <p className="text-xs text-gray-400 text-center">Click on a pitch type to see detailed comparison</p>
        </div>
    );
}
