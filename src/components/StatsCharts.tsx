'use client';

import { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';

// Premium gradient color palette for charts
const COLORS = {
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    secondary: '#3b82f6',
    secondaryLight: '#60a5fa',
    tertiary: '#10b981',
    tertiaryLight: '#34d399',
    quaternary: '#8b5cf6',
    quaternaryLight: '#a78bfa',
    quinary: '#ef4444',
    quinaryLight: '#f87171',
    senary: '#06b6d4',
    senaryLight: '#22d3ee',
};

const PIE_COLORS = [
    '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
];

// Custom tooltip styles
const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
    padding: '12px 16px',
};

// Animation wrapper hook
const useChartAnimation = () => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);
    return isVisible;
};

// Velocity Bar Chart - Shows velocity by pitch type
interface VelocityBarData {
    pitchType: string;
    avgVelo: number;
    maxVelo: number;
}

interface VelocityBarChartProps {
    data: VelocityBarData[];
    title?: string;
}

export function VelocityBarChart({ data, title = 'Velocity by Pitch Type' }: VelocityBarChartProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Average and max velocity comparison</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Avg</span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Max</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250} className="lg:!h-[300px]">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="avgVeloGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.primaryLight} />
                            <stop offset="100%" stopColor={COLORS.primary} />
                        </linearGradient>
                        <linearGradient id="maxVeloGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.secondaryLight} />
                            <stop offset="100%" stopColor={COLORS.secondary} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} tickLine={false} />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        domain={[(dataMin: number) => Math.floor(dataMin - 5), (dataMax: number) => Math.ceil(dataMax + 5)]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: number) => value.toFixed(0)}
                    />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Pitch: ${label}`}
                        formatter={(value: number, _name: string, entry: any) => {
                            const key = entry?.dataKey as string;
                            const label = key === 'avgVelo' ? 'Avg Velocity' : 'Max Velocity';
                            return [`${value.toFixed(1)} mph`, label];
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="avgVelo" name="Avg Velocity" fill="url(#avgVeloGradient)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="maxVelo" name="Max Velocity" fill="url(#maxVeloGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Double Bar Chart - Compares User vs MLB stats
interface ComparisonBarData {
    pitchType: string;
    userVelo: number;
    mlbVelo: number;
    userSpin: number;
    mlbSpin: number;
}

interface ComparisonBarChartProps {
    data: ComparisonBarData[];
    metric: 'velocity' | 'spin';
    title?: string;
}

export function ComparisonBarChart({ data, metric, title }: ComparisonBarChartProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    const chartTitle = title || (metric === 'velocity' ? 'Velocity: You vs MLB' : 'Spin Rate: You vs MLB');
    const userKey = metric === 'velocity' ? 'userVelo' : 'userSpin';
    const mlbKey = metric === 'velocity' ? 'mlbVelo' : 'mlbSpin';
    const unit = metric === 'velocity' ? 'mph' : 'rpm';

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{chartTitle}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Your performance vs MLB averages</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">You</span>
                    <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">MLB</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250} className="lg:!h-[300px]">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.primaryLight} />
                            <stop offset="100%" stopColor={COLORS.primary} />
                        </linearGradient>
                        <linearGradient id="mlbGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.tertiaryLight} />
                            <stop offset="100%" stopColor={COLORS.tertiary} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Pitch: ${label}`}
                        formatter={(value: number, _name: string, entry: any) => {
                            const key = entry?.dataKey as string;
                            const label = key === userKey ? 'You' : 'MLB';
                            const formatted = metric === 'velocity'
                                ? `${value.toFixed(1)} ${unit}`
                                : `${Math.round(value).toLocaleString()} ${unit}`;
                            return [formatted, label];
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey={userKey} name="Your Stats" fill="url(#userGradient)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey={mlbKey} name="MLB Avg" fill="url(#mlbGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Pie Chart - Pitch Distribution
interface PitchDistributionData {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface PitchDistributionPieProps {
    data: PitchDistributionData[];
    title?: string;
}

export function PitchDistributionPie({ data, title = 'Pitch Type Distribution' }: PitchDistributionPieProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-4 lg:mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Breakdown of your pitch arsenal</p>
            </div>
            <ResponsiveContainer width="100%" height={280} className="lg:!h-[320px]">
                <PieChart>
                    <defs>
                        {PIE_COLORS.map((color, index) => (
                            <linearGradient key={`pieGrad-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                            // Only show label if percent > 5%
                            if ((percent ?? 0) < 0.05) return null;
                            const RADIAN = Math.PI / 180;
                            const r = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
                            const angle = midAngle ?? 0;
                            const x = (cx as number) + r * Math.cos(-angle * RADIAN);
                            const y = (cy as number) + r * Math.sin(-angle * RADIAN);
                            return (
                                <text
                                    x={x}
                                    y={y}
                                    fill="white"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    className="text-[10px] lg:text-xs font-medium"
                                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                                >
                                    {`${((percent ?? 0) * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                        outerRadius="80%"
                        innerRadius="40%"
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={2}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#pieGradient-${index % PIE_COLORS.length})`}
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Pitch: ${label}`}
                        formatter={(value: number) => [`${value} pitches (${((value / total) * 100).toFixed(1)}%)`, 'Share']}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// Spider/Radar Chart - Percentile Overview
interface PercentileRadarData {
    metric: string;
    percentile: number;
    fullMark: number;
}

interface PercentileRadarChartProps {
    data: PercentileRadarData[];
    title?: string;
}

export function PercentileRadarChart({ data, title = 'MLB Percentile Overview' }: PercentileRadarChartProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    // Calculate average percentile
    const avgPercentile = Math.round(data.reduce((sum, d) => sum + d.percentile, 0) / data.length);

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Your skills compared to MLB players</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/50 self-start sm:self-auto">
                    <span className="text-xs text-gray-600">Avg:</span>
                    <span className="text-sm font-bold text-amber-600">{avgPercentile}th</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={280} className="lg:!h-[350px]">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <defs>
                        <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.2} />
                        </linearGradient>
                    </defs>
                    <PolarGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
                    <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={false}
                        tickCount={5}
                    />
                    <Radar
                        name="Your Percentile"
                        dataKey="percentile"
                        stroke={COLORS.primary}
                        fill="url(#radarGradient)"
                        strokeWidth={3}
                        dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4, stroke: '#fff' }}
                    />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${Math.round(value)}th percentile`, '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Velocity Histogram
interface HistogramData {
    range: string;
    count: number;
}

interface VelocityHistogramProps {
    data: HistogramData[];
    title?: string;
}

export function VelocityHistogram({ data, title = 'Velocity Distribution' }: VelocityHistogramProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    const totalPitches = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">How your velocity is distributed</p>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100 self-start sm:self-auto">
                    {totalPitches} pitches
                </span>
            </div>
            <ResponsiveContainer width="100%" height={250} className="lg:!h-[300px]">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="velocityHistGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.secondaryLight} />
                            <stop offset="50%" stopColor={COLORS.secondary} />
                            <stop offset="100%" stopColor={COLORS.primary} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Range: ${label}`}
                        formatter={(value: number) => [`${value} pitches`, 'Count']}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="count" name="Pitches" fill="url(#velocityHistGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Spin Rate Histogram
export function SpinHistogram({ data, title = 'Spin Rate Distribution' }: VelocityHistogramProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    const totalPitches = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">How your spin rate is distributed</p>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-100 self-start sm:self-auto">
                    {totalPitches} pitches
                </span>
            </div>
            <ResponsiveContainer width="100%" height={250} className="lg:!h-[300px]">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="spinHistGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.tertiaryLight} />
                            <stop offset="50%" stopColor={COLORS.tertiary} />
                            <stop offset="100%" stopColor={COLORS.quaternary} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Range: ${label}`}
                        formatter={(value: number) => [`${value} pitches`, 'Count']}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="count" name="Pitches" fill="url(#spinHistGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Break Comparison Bar Chart
interface BreakComparisonData {
    pitchType: string;
    userHBreak: number;
    mlbHBreak: number;
    userVBreak: number;
    mlbVBreak: number;
}

interface BreakComparisonChartProps {
    data: BreakComparisonData[];
    breakType: 'horizontal' | 'vertical';
    title?: string;
}

export function BreakComparisonChart({ data, breakType, title }: BreakComparisonChartProps) {
    const isVisible = useChartAnimation();
    if (data.length === 0) return null;

    const chartTitle = title || (breakType === 'horizontal' ? 'H. Break: You vs MLB' : 'V. Break: You vs MLB');
    const userKey = breakType === 'horizontal' ? 'userHBreak' : 'userVBreak';
    const mlbKey = breakType === 'horizontal' ? 'mlbHBreak' : 'mlbVBreak';

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                <div>
                    <h3 className="text-base lg:text-lg font-semibold text-gray-800">{chartTitle}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Movement comparison in inches</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">You</span>
                    <span className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">MLB</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250} className="lg:!h-[300px]">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="breakUserGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.quaternaryLight} />
                            <stop offset="100%" stopColor={COLORS.quaternary} />
                        </linearGradient>
                        <linearGradient id="breakMLBGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.senaryLight} />
                            <stop offset="100%" stopColor={COLORS.senary} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => `Pitch: ${label}`}
                        formatter={(value: number, _name: string, entry: any) => {
                            const key = entry?.dataKey as string;
                            const label = key === userKey ? 'You' : 'MLB';
                            return [`${value.toFixed(1)}"`, label];
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey={userKey} name="Your Break" fill="url(#breakUserGradient)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey={mlbKey} name="MLB Avg" fill="url(#breakMLBGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
