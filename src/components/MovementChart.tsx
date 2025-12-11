'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TooltipItem,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface UserPitch {
    pitchType: string;
    avgHBreak: number;
    avgVBreak: number;
}

interface MLBData {
    pitchType: string;
    avgHBreak: number;
    avgVBreak: number;
    color: string;
}

interface MovementChartProps {
    userPitches: UserPitch[];
    mlbData?: MLBData[];
    title?: string;
}

// Default MLB average movement data with vibrant gradients
const DEFAULT_MLB_DATA: MLBData[] = [
    { pitchType: 'Fastball', avgHBreak: 6.5, avgVBreak: 15.5, color: 'rgba(239, 68, 68, 0.5)' },
    { pitchType: 'Slider', avgHBreak: -2.5, avgVBreak: 2.0, color: 'rgba(59, 130, 246, 0.5)' },
    { pitchType: 'Curveball', avgHBreak: 6.0, avgVBreak: -8.5, color: 'rgba(34, 197, 94, 0.5)' },
    { pitchType: 'Changeup', avgHBreak: 9.0, avgVBreak: 6.5, color: 'rgba(168, 85, 247, 0.5)' },
    { pitchType: 'Sinker', avgHBreak: 13.5, avgVBreak: 8.0, color: 'rgba(249, 115, 22, 0.5)' },
];

const getUserPitchColor = (pitchType: string): string => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff' || type.includes('4-seam')) return 'rgba(239, 68, 68, 1)';
    if (type.includes('slider') || type === 'sl') return 'rgba(59, 130, 246, 1)';
    if (type.includes('curve') || type === 'cu') return 'rgba(34, 197, 94, 1)';
    if (type.includes('change') || type === 'ch') return 'rgba(168, 85, 247, 1)';
    if (type.includes('sinker') || type === 'si') return 'rgba(249, 115, 22, 1)';
    if (type.includes('cutter') || type === 'fc') return 'rgba(14, 165, 233, 1)';
    if (type.includes('splitter') || type === 'fs') return 'rgba(236, 72, 153, 1)';
    return 'rgba(245, 158, 11, 1)';
};

export default function MovementChart({
    userPitches,
    mlbData = DEFAULT_MLB_DATA,
    title = 'Movement Profile'
}: MovementChartProps) {
    const chartRef = useRef<ChartJS<'scatter'>>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const data = useMemo(() => {
        // Reduce visual clutter: hollow MLB circles + filled user circles with white ring
        return {
            datasets: [
                ...mlbData.map(mlb => ({
                    label: `MLB ${mlb.pitchType}`,
                    data: [{ x: mlb.avgHBreak, y: mlb.avgVBreak }],
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    borderColor: mlb.color,
                    borderWidth: 3,
                    pointRadius: 13,
                    pointHoverRadius: 16,
                    pointStyle: 'circle' as const,
                    hoverBorderWidth: 3,
                })),
                ...userPitches.map(pitch => {
                    const color = getUserPitchColor(pitch.pitchType);
                    return {
                        label: `Your ${pitch.pitchType}`,
                        data: [{ x: pitch.avgHBreak, y: pitch.avgVBreak }],
                        backgroundColor: color,
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        pointRadius: 16,
                        pointHoverRadius: 20,
                        pointStyle: 'circle' as const,
                        hoverBorderWidth: 4,
                    };
                }),
            ],
        };
    }, [mlbData, userPitches]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1200,
            easing: 'easeOutQuart' as const,
        },
        plugins: {
            legend: {
                display: false, // Hide default legend, use custom one instead
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                titleColor: '#1f2937',
                titleFont: { size: 13, weight: 600 },
                bodyColor: '#4b5563',
                bodyFont: { size: 12 },
                borderColor: 'rgba(0, 0, 0, 0.08)',
                borderWidth: 1,
                padding: 14,
                cornerRadius: 12,
                callbacks: {
                    label: (context: TooltipItem<'scatter'>) => {
                        const label = context.dataset.label || '';
                        const x = (context.parsed.x ?? 0).toFixed(1);
                        const y = (context.parsed.y ?? 0).toFixed(1);
                        return `${label} — H ${x}" / V ${y}"`;
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Horizontal Break (inches)',
                    color: '#6b7280',
                    font: { size: 12, weight: 500 },
                    padding: { top: 10 },
                },
                min: -15,
                max: 20,
                grid: {
                    color: 'rgba(0, 0, 0, 0.04)',
                    drawTicks: false,
                },
                border: {
                    color: 'rgba(0, 0, 0, 0.08)',
                    dash: [4, 4],
                },
                ticks: {
                    color: '#9ca3af',
                    font: { size: 11 },
                    padding: 8,
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Vertical Break (inches)',
                    color: '#6b7280',
                    font: { size: 12, weight: 500 },
                    padding: { bottom: 10 },
                },
                min: -15,
                max: 25,
                grid: {
                    color: 'rgba(0, 0, 0, 0.04)',
                    drawTicks: false,
                },
                border: {
                    color: 'rgba(0, 0, 0, 0.08)',
                    dash: [4, 4],
                },
                ticks: {
                    color: '#9ca3af',
                    font: { size: 11 },
                    padding: 8,
                },
            },
        },
    };

    return (
        <div className={`glass-chart p-4 lg:p-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 lg:mb-6">
                <div>
                    <h3 className="font-semibold text-gray-800 text-base lg:text-lg">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">Compare your pitch movement to MLB averages</p>
                </div>
                <div className="flex items-center gap-2 lg:gap-4 text-xs">
                    <span className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-white/60">
                        <span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full border-2 border-amber-400 bg-white" />
                        <span className="text-gray-600 font-medium">MLB</span>
                    </span>
                    <span className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/60">
                        <span className="w-2.5 lg:w-3 h-2.5 lg:h-3 rounded-full bg-amber-500 border border-white" />
                        <span className="text-gray-700 font-medium">You</span>
                    </span>
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-[260px] sm:h-[300px] lg:h-[340px] relative">
                {/* Subtle grid overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-amber-50/10 to-transparent rounded-xl pointer-events-none" />
                <Scatter ref={chartRef} data={data} options={options} />
            </div>

            {/* Quick Stats Footer */}
            {userPitches.length > 0 && (
                <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/40 flex flex-wrap gap-2 lg:gap-3 justify-center">
                    {userPitches.map((pitch) => (
                        <div
                            key={`pitch-stat-${pitch.pitchType}`}
                            className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg bg-white/40 backdrop-blur-sm"
                        >
                            <div
                                className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full"
                                style={{ backgroundColor: getUserPitchColor(pitch.pitchType) }}
                            />
                            <span className="text-[10px] lg:text-xs font-medium text-gray-700">{pitch.pitchType}</span>
                            <span className="text-[10px] lg:text-xs text-gray-500">
                                {pitch.avgHBreak.toFixed(1)}&quot; / {pitch.avgVBreak.toFixed(1)}&quot;
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
