'use client';

import { useState, useMemo } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Cell,
    Legend,
} from 'recharts';

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

// Pitch type color palette
const PITCH_COLORS: Record<string, { primary: string; light: string; bg: string }> = {
    'fastball': { primary: '#ef4444', light: '#fca5a5', bg: 'bg-red-50' },
    '4-seam': { primary: '#ef4444', light: '#fca5a5', bg: 'bg-red-50' },
    'ff': { primary: '#ef4444', light: '#fca5a5', bg: 'bg-red-50' },
    'sinker': { primary: '#f97316', light: '#fdba74', bg: 'bg-orange-50' },
    'si': { primary: '#f97316', light: '#fdba74', bg: 'bg-orange-50' },
    'slider': { primary: '#3b82f6', light: '#93c5fd', bg: 'bg-blue-50' },
    'sl': { primary: '#3b82f6', light: '#93c5fd', bg: 'bg-blue-50' },
    'curveball': { primary: '#22c55e', light: '#86efac', bg: 'bg-green-50' },
    'curve': { primary: '#22c55e', light: '#86efac', bg: 'bg-green-50' },
    'cu': { primary: '#22c55e', light: '#86efac', bg: 'bg-green-50' },
    'changeup': { primary: '#a855f7', light: '#d8b4fe', bg: 'bg-purple-50' },
    'change': { primary: '#a855f7', light: '#d8b4fe', bg: 'bg-purple-50' },
    'ch': { primary: '#a855f7', light: '#d8b4fe', bg: 'bg-purple-50' },
    'cutter': { primary: '#06b6d4', light: '#67e8f9', bg: 'bg-cyan-50' },
    'fc': { primary: '#06b6d4', light: '#67e8f9', bg: 'bg-cyan-50' },
    'splitter': { primary: '#ec4899', light: '#f9a8d4', bg: 'bg-pink-50' },
    'fs': { primary: '#ec4899', light: '#f9a8d4', bg: 'bg-pink-50' },
};

function getPitchColor(pitchType: string): { primary: string; light: string; bg: string } {
    const type = pitchType.toLowerCase();
    for (const [key, colors] of Object.entries(PITCH_COLORS)) {
        if (type.includes(key)) return colors;
    }
    return { primary: '#6b7280', light: '#d1d5db', bg: 'bg-gray-50' };
}

function getGradeFromPercentile(percentile: number): { grade: string; color: string; bgColor: string } {
    if (percentile >= 90) return { grade: 'A+', color: 'text-violet-600', bgColor: 'bg-violet-100' };
    if (percentile >= 80) return { grade: 'A', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentile >= 70) return { grade: 'B+', color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
    if (percentile >= 60) return { grade: 'B', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentile >= 50) return { grade: 'C+', color: 'text-amber-600', bgColor: 'bg-amber-100' };
    if (percentile >= 40) return { grade: 'C', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-100' };
}

// Custom tooltip
const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    padding: '10px 14px',
};

// Pitch selector pill
function PitchTypePill({
    pitchType,
    count,
    avgPercentile,
    isSelected,
    onClick,
}: {
    pitchType: string;
    count: number;
    avgPercentile: number;
    isSelected: boolean;
    onClick: () => void;
}) {
    const colors = getPitchColor(pitchType);
    const grade = getGradeFromPercentile(avgPercentile);

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border-2
                ${isSelected
                    ? 'bg-white shadow-lg scale-105'
                    : 'bg-white/60 hover:bg-white/80 hover:shadow-md border-transparent'
                }
            `}
            style={{
                borderColor: isSelected ? colors.primary : undefined,
                boxShadow: isSelected ? `0 0 0 2px ${colors.primary}20` : undefined,
            }}
        >
            <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.primary }}
            />
            <span className="font-medium text-gray-800 text-sm">{pitchType}</span>
            <span className="text-xs text-gray-400">{count}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${grade.bgColor} ${grade.color}`}>
                {grade.grade}
            </span>
        </button>
    );
}

// Radar chart for a single pitch type
function PitchRadarChart({ comparison, color }: { comparison: Comparison; color: string }) {
    const radarData = [
        { metric: 'Velocity', value: comparison.percentiles.velocity, fullMark: 100 },
        { metric: 'Spin', value: comparison.percentiles.spinRate, fullMark: 100 },
        { metric: 'H-Break', value: comparison.percentiles.horizontalBreak, fullMark: 100 },
        { metric: 'V-Break', value: comparison.percentiles.verticalBreak, fullMark: 100 },
    ];

    return (
        <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <defs>
                    <linearGradient id={`radarFill-${comparison.pitchType}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    tickCount={5}
                    axisLine={false}
                />
                <Radar
                    name="Percentile"
                    dataKey="value"
                    stroke={color}
                    fill={`url(#radarFill-${comparison.pitchType})`}
                    strokeWidth={2}
                    dot={{ fill: color, r: 4, strokeWidth: 2, stroke: '#fff' }}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${Math.round(value)}th percentile`, '']}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
}

// Compact stat box
function StatBox({
    label,
    userValue,
    mlbValue,
    percentile,
    unit,
    color,
}: {
    label: string;
    userValue: number;
    mlbValue: number;
    percentile: number;
    unit: string;
    color: string;
}) {
    const diff = userValue - mlbValue;
    const isPositive = diff >= 0;
    const grade = getGradeFromPercentile(percentile);

    return (
        <div className="bg-white/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${grade.bgColor} ${grade.color}`}>
                    {percentile}%ile
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold" style={{ color }}>
                    {unit === 'rpm' ? Math.round(userValue).toLocaleString() : userValue.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">{unit}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-400">vs MLB {unit === 'rpm' ? Math.round(mlbValue).toLocaleString() : mlbValue.toFixed(1)}</span>
                <span className={isPositive ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {isPositive ? '+' : ''}{unit === 'rpm' ? Math.round(diff) : diff.toFixed(1)}
                </span>
            </div>
            {/* Mini progress bar */}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percentile, 100)}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

// Multi-pitch comparison bar chart
function AllPitchesChart({ comparisons }: { comparisons: Comparison[] }) {
    const chartData = comparisons.map(c => ({
        pitch: c.pitchType,
        velocity: c.percentiles.velocity,
        spin: c.percentiles.spinRate,
        hBreak: c.percentiles.horizontalBreak,
        vBreak: c.percentiles.verticalBreak,
        avg: Math.round(
            (c.percentiles.velocity + c.percentiles.spinRate +
             c.percentiles.horizontalBreak + c.percentiles.verticalBreak) / 4
        ),
        color: getPitchColor(c.pitchType).primary,
    }));

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                    dataKey="pitch"
                    type="category"
                    tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}th percentile`, 'Overall']}
                    labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]} barSize={24}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// Stacked percentile comparison
function PercentileStackChart({ comparisons }: { comparisons: Comparison[] }) {
    const metrics = ['Velocity', 'Spin', 'H-Break', 'V-Break'];
    const chartData = metrics.map(metric => {
        const dataPoint: Record<string, string | number> = { metric };
        comparisons.forEach(c => {
            const key = metric === 'Velocity' ? 'velocity' :
                       metric === 'Spin' ? 'spinRate' :
                       metric === 'H-Break' ? 'horizontalBreak' : 'verticalBreak';
            dataPoint[c.pitchType] = c.percentiles[key as keyof typeof c.percentiles];
        });
        return dataPoint;
    });

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}th`, '']} />
                <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
                {comparisons.map((c, i) => (
                    <Bar
                        key={c.pitchType}
                        dataKey={c.pitchType}
                        fill={getPitchColor(c.pitchType).primary}
                        radius={[4, 4, 0, 0]}
                        barSize={comparisons.length > 3 ? 20 : 28}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

// Main component
export default function PitchStatsVisualization({
    comparisons,
    title = 'Your Pitches vs MLB',
}: {
    comparisons: Comparison[];
    title?: string;
}) {
    const [selectedPitchIdx, setSelectedPitchIdx] = useState(0);
    const [viewMode, setViewMode] = useState<'individual' | 'compare'>('individual');

    const selectedComparison = comparisons[selectedPitchIdx];

    // Calculate average percentile for each pitch
    const pitchStats = useMemo(() => {
        return comparisons.map(c => ({
            pitchType: c.pitchType,
            count: c.userStats.pitchCount,
            avgPercentile: Math.round(
                (c.percentiles.velocity + c.percentiles.spinRate +
                 c.percentiles.horizontalBreak + c.percentiles.verticalBreak) / 4
            ),
        }));
    }, [comparisons]);

    // Overall average
    const overallAvg = useMemo(() => {
        if (pitchStats.length === 0) return 0;
        return Math.round(pitchStats.reduce((sum, p) => sum + p.avgPercentile, 0) / pitchStats.length);
    }, [pitchStats]);

    const overallGrade = getGradeFromPercentile(overallAvg);

    if (comparisons.length === 0) return null;

    const selectedColor = getPitchColor(selectedComparison.pitchType).primary;

    return (
        <div className="glass-card p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800 text-base sm:text-lg">{title}</h3>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${overallGrade.bgColor} ${overallGrade.color}`}>
                        {overallGrade.grade} ({overallAvg}th)
                    </div>
                </div>
                {/* View toggle */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                        onClick={() => setViewMode('individual')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'individual'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Individual
                    </button>
                    <button
                        onClick={() => setViewMode('compare')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'compare'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Compare All
                    </button>
                </div>
            </div>

            {viewMode === 'individual' ? (
                <>
                    {/* Pitch type selector */}
                    <div className="flex flex-wrap gap-2">
                        {pitchStats.map((pitch, idx) => (
                            <PitchTypePill
                                key={pitch.pitchType}
                                pitchType={pitch.pitchType}
                                count={pitch.count}
                                avgPercentile={pitch.avgPercentile}
                                isSelected={idx === selectedPitchIdx}
                                onClick={() => setSelectedPitchIdx(idx)}
                            />
                        ))}
                    </div>

                    {/* Main visualization area */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Radar chart */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4">
                            <PitchRadarChart comparison={selectedComparison} color={selectedColor} />
                        </div>

                        {/* Stat boxes grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatBox
                                label="Velocity"
                                userValue={selectedComparison.userStats.avgVelo}
                                mlbValue={selectedComparison.mlbStats.avgVelo}
                                percentile={selectedComparison.percentiles.velocity}
                                unit="mph"
                                color={selectedColor}
                            />
                            <StatBox
                                label="Spin Rate"
                                userValue={selectedComparison.userStats.avgSpin}
                                mlbValue={selectedComparison.mlbStats.avgSpin}
                                percentile={selectedComparison.percentiles.spinRate}
                                unit="rpm"
                                color={selectedColor}
                            />
                            <StatBox
                                label="H-Break"
                                userValue={selectedComparison.userStats.avgHBreak}
                                mlbValue={selectedComparison.mlbStats.avgHBreak}
                                percentile={selectedComparison.percentiles.horizontalBreak}
                                unit='"'
                                color={selectedColor}
                            />
                            <StatBox
                                label="V-Break"
                                userValue={selectedComparison.userStats.avgVBreak}
                                mlbValue={selectedComparison.mlbStats.avgVBreak}
                                percentile={selectedComparison.percentiles.verticalBreak}
                                unit='"'
                                color={selectedColor}
                            />
                        </div>
                    </div>
                </>
            ) : (
                /* Compare all pitches view */
                <div className="space-y-4">
                    {/* Overall pitch ranking */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">Overall Pitch Ranking</h4>
                        <AllPitchesChart comparisons={comparisons} />
                    </div>

                    {/* Metric comparison */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">Metric Breakdown by Pitch</h4>
                        <PercentileStackChart comparisons={comparisons} />
                    </div>
                </div>
            )}
        </div>
    );
}
