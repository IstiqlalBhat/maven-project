'use client';

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

// Color palette for charts
const COLORS = {
    primary: '#f59e0b',
    secondary: '#3b82f6',
    tertiary: '#10b981',
    quaternary: '#8b5cf6',
    quinary: '#ef4444',
    senary: '#06b6d4',
};

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

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
    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} mph`, '']}
                    />
                    <Legend />
                    <Bar dataKey="avgVelo" name="Avg Velocity" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maxVelo" name="Max Velocity" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
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
    if (data.length === 0) return null;

    const chartTitle = title || (metric === 'velocity' ? 'Velocity: You vs MLB' : 'Spin Rate: You vs MLB');
    const userKey = metric === 'velocity' ? 'userVelo' : 'userSpin';
    const mlbKey = metric === 'velocity' ? 'mlbVelo' : 'mlbSpin';
    const unit = metric === 'velocity' ? 'mph' : 'rpm';

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{chartTitle}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [
                            metric === 'velocity' ? `${value.toFixed(1)} ${unit}` : `${Math.round(value).toLocaleString()} ${unit}`,
                            '',
                        ]}
                    />
                    <Legend />
                    <Bar dataKey={userKey} name="Your Stats" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={mlbKey} name="MLB Avg" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Pie Chart - Pitch Distribution
interface PitchDistributionData {
    name: string;
    value: number;
}

interface PitchDistributionPieProps {
    data: PitchDistributionData[];
    title?: string;
}

export function PitchDistributionPie({ data, title = 'Pitch Type Distribution' }: PitchDistributionPieProps) {
    if (data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value} pitches (${((value / total) * 100).toFixed(1)}%)`, '']}
                    />
                    <Legend />
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
    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Radar
                        name="Your Percentile"
                        dataKey="percentile"
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.5}
                        strokeWidth={2}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${Math.round(value)}th percentile`, '']}
                    />
                    <Legend />
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
    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value} pitches`, '']}
                    />
                    <Bar dataKey="count" name="Pitches" fill="url(#histogramGradient)" radius={[4, 4, 0, 0]}>
                        <defs>
                            <linearGradient id="histogramGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COLORS.secondary} />
                                <stop offset="100%" stopColor={COLORS.primary} />
                            </linearGradient>
                        </defs>
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Spin Rate Histogram
export function SpinHistogram({ data, title = 'Spin Rate Distribution' }: VelocityHistogramProps) {
    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value} pitches`, '']}
                    />
                    <Bar dataKey="count" name="Pitches" fill="url(#spinHistogramGradient)" radius={[4, 4, 0, 0]}>
                        <defs>
                            <linearGradient id="spinHistogramGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COLORS.tertiary} />
                                <stop offset="100%" stopColor={COLORS.quaternary} />
                            </linearGradient>
                        </defs>
                    </Bar>
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
    if (data.length === 0) return null;

    const chartTitle = title || (breakType === 'horizontal' ? 'Horizontal Break: You vs MLB' : 'Vertical Break: You vs MLB');
    const userKey = breakType === 'horizontal' ? 'userHBreak' : 'userVBreak';
    const mlbKey = breakType === 'horizontal' ? 'mlbHBreak' : 'mlbVBreak';

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{chartTitle}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="pitchType" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}"`, '']}
                    />
                    <Legend />
                    <Bar dataKey={userKey} name="Your Break" fill={COLORS.quaternary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={mlbKey} name="MLB Avg" fill={COLORS.senary} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
