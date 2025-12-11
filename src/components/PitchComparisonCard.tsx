'use client';

import { useEffect, useState } from 'react';

interface MetricData {
    value: number;
    percentile: number;
    mlbAvg: number;
    mlbMax?: number;
    unit: string;
}

interface PitchComparisonCardProps {
    pitchType: string;
    velocity: MetricData;
    spinRate: MetricData;
    horizontalBreak: MetricData;
    verticalBreak: MetricData;
    pitchCount?: number;
    isSelected?: boolean;
    onClick?: () => void;
}

// Circular progress component
function CircularGauge({
    percentile,
    value,
    unit,
    label,
    mlbAvg,
    size = 80,
    delay = 0
}: {
    percentile: number;
    value: number;
    unit: string;
    label: string;
    mlbAvg: number;
    size?: number;
    delay?: number;
}) {
    const [animatedPercentile, setAnimatedPercentile] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedPercentile(percentile), 100 + delay);
        return () => clearTimeout(timer);
    }, [percentile, delay]);

    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedPercentile / 100) * circumference;

    const getGaugeColor = (p: number) => {
        if (p >= 80) return { stroke: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: 'text-violet-600' };
        if (p >= 60) return { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: 'text-emerald-600' };
        if (p >= 40) return { stroke: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: 'text-amber-600' };
        return { stroke: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: 'text-red-500' };
    };

    const colors = getGaugeColor(percentile);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background circle */}
                <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(0,0,0,0.06)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Animated progress arc */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                        style={{
                            filter: `drop-shadow(0 0 4px ${colors.stroke}40)`
                        }}
                    />
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-bold ${colors.text}`}>
                        {animatedPercentile}
                    </span>
                    <span className="text-[9px] text-gray-400 -mt-0.5">%ile</span>
                </div>
            </div>
            {/* Label and value below gauge */}
            <div className="mt-2 text-center">
                <div className="text-xs font-medium text-gray-700">{label}</div>
                <div className="text-sm font-semibold text-gray-900">
                    {typeof value === 'number' ? (unit === 'rpm' ? Math.round(value).toLocaleString() : value.toFixed(1)) : value}
                    <span className="text-xs text-gray-400 ml-0.5">{unit}</span>
                </div>
                <div className="text-[10px] text-gray-400">
                    MLB: {unit === 'rpm' ? Math.round(mlbAvg).toLocaleString() : mlbAvg.toFixed(1)}{unit}
                </div>
            </div>
        </div>
    );
}

// Get pitch type color
function getPitchTypeColor(pitchType: string): { bg: string; border: string; text: string; accent: string } {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff' || type.includes('4-seam')) {
        return { bg: 'from-red-50 to-orange-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-500' };
    }
    if (type.includes('sinker') || type === 'si') {
        return { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500' };
    }
    if (type.includes('slider') || type === 'sl') {
        return { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500' };
    }
    if (type.includes('curve') || type === 'cu') {
        return { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', accent: 'bg-green-500' };
    }
    if (type.includes('change') || type === 'ch') {
        return { bg: 'from-purple-50 to-violet-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'bg-purple-500' };
    }
    if (type.includes('cutter') || type === 'fc') {
        return { bg: 'from-cyan-50 to-sky-50', border: 'border-cyan-200', text: 'text-cyan-700', accent: 'bg-cyan-500' };
    }
    if (type.includes('splitter') || type === 'fs') {
        return { bg: 'from-pink-50 to-rose-50', border: 'border-pink-200', text: 'text-pink-700', accent: 'bg-pink-500' };
    }
    return { bg: 'from-gray-50 to-slate-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' };
}

// Get overall grade
function getOverallGrade(percentiles: number[]): { grade: string; color: string; description: string } {
    const avg = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
    if (avg >= 80) return { grade: 'A+', color: 'from-violet-500 to-purple-600', description: 'Elite' };
    if (avg >= 70) return { grade: 'A', color: 'from-blue-500 to-indigo-600', description: 'Excellent' };
    if (avg >= 60) return { grade: 'B+', color: 'from-emerald-500 to-teal-600', description: 'Above Avg' };
    if (avg >= 50) return { grade: 'B', color: 'from-green-500 to-emerald-600', description: 'Average' };
    if (avg >= 40) return { grade: 'C', color: 'from-amber-500 to-orange-600', description: 'Developing' };
    return { grade: 'D', color: 'from-red-400 to-orange-500', description: 'Needs Work' };
}

export default function PitchComparisonCard({
    pitchType,
    velocity,
    spinRate,
    horizontalBreak,
    verticalBreak,
    pitchCount,
    isSelected = false,
    onClick
}: PitchComparisonCardProps) {
    const colors = getPitchTypeColor(pitchType);
    const grade = getOverallGrade([
        velocity.percentile,
        spinRate.percentile,
        horizontalBreak.percentile,
        verticalBreak.percentile
    ]);

    return (
        <div
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-2xl border-2 transition-all duration-300
                bg-gradient-to-br ${colors.bg} ${colors.border}
                ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}
                ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2 shadow-lg' : 'shadow-sm'}
            `}
        >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors.accent}`} />
                    <h3 className={`font-bold text-lg ${colors.text}`}>{pitchType}</h3>
                    {pitchCount && (
                        <span className="text-xs text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">
                            {pitchCount} pitches
                        </span>
                    )}
                </div>
                {/* Overall Grade Badge */}
                <div className={`
                    px-3 py-1.5 rounded-xl bg-gradient-to-r ${grade.color}
                    text-white font-bold text-sm shadow-md
                    flex items-center gap-1.5
                `}>
                    <span className="text-lg leading-none">{grade.grade}</span>
                    <span className="text-[10px] opacity-80 font-medium">{grade.description}</span>
                </div>
            </div>

            {/* Gauges Grid */}
            <div className="px-4 pb-5">
                <div className="grid grid-cols-4 gap-2">
                    <CircularGauge
                        percentile={velocity.percentile}
                        value={velocity.value}
                        unit="mph"
                        label="Velocity"
                        mlbAvg={velocity.mlbAvg}
                        delay={0}
                    />
                    <CircularGauge
                        percentile={spinRate.percentile}
                        value={spinRate.value}
                        unit="rpm"
                        label="Spin"
                        mlbAvg={spinRate.mlbAvg}
                        delay={100}
                    />
                    <CircularGauge
                        percentile={horizontalBreak.percentile}
                        value={horizontalBreak.value}
                        unit='"'
                        label="H-Break"
                        mlbAvg={horizontalBreak.mlbAvg}
                        delay={200}
                    />
                    <CircularGauge
                        percentile={verticalBreak.percentile}
                        value={verticalBreak.value}
                        unit='"'
                        label="V-Break"
                        mlbAvg={verticalBreak.mlbAvg}
                        delay={300}
                    />
                </div>
            </div>

            {/* Decorative element */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        </div>
    );
}

// Grid wrapper component for displaying multiple pitch cards
export function PitchComparisonGrid({
    comparisons,
    title = 'Your Pitches vs MLB'
}: {
    comparisons: Array<{
        pitchType: string;
        userStats: {
            avgVelo: number;
            avgSpin: number;
            avgHBreak: number;
            avgVBreak: number;
            pitchCount?: number;
        };
        mlbStats: {
            avgVelo: number;
            avgSpin: number;
            avgHBreak: number;
            avgVBreak: number;
            maxVelo?: number;
            maxSpin?: number;
        };
        percentiles: {
            velocity: number;
            spinRate: number;
            horizontalBreak: number;
            verticalBreak: number;
        };
    }>;
    title?: string;
}) {
    if (comparisons.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {comparisons.map((comparison) => (
                    <PitchComparisonCard
                        key={`pitch-card-${comparison.pitchType}`}
                        pitchType={comparison.pitchType}
                        pitchCount={comparison.userStats.pitchCount}
                        velocity={{
                            value: comparison.userStats.avgVelo,
                            percentile: comparison.percentiles.velocity,
                            mlbAvg: comparison.mlbStats.avgVelo,
                            mlbMax: comparison.mlbStats.maxVelo,
                            unit: 'mph'
                        }}
                        spinRate={{
                            value: comparison.userStats.avgSpin,
                            percentile: comparison.percentiles.spinRate,
                            mlbAvg: comparison.mlbStats.avgSpin,
                            mlbMax: comparison.mlbStats.maxSpin,
                            unit: 'rpm'
                        }}
                        horizontalBreak={{
                            value: comparison.userStats.avgHBreak,
                            percentile: comparison.percentiles.horizontalBreak,
                            mlbAvg: comparison.mlbStats.avgHBreak,
                            unit: '"'
                        }}
                        verticalBreak={{
                            value: comparison.userStats.avgVBreak,
                            percentile: comparison.percentiles.verticalBreak,
                            mlbAvg: comparison.mlbStats.avgVBreak,
                            unit: '"'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
