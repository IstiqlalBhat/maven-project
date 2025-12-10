'use client';

import { useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
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

// Default MLB average movement data
const DEFAULT_MLB_DATA: MLBData[] = [
    { pitchType: 'Fastball', avgHBreak: 6.5, avgVBreak: 15.5, color: 'rgba(239, 68, 68, 0.4)' },
    { pitchType: 'Slider', avgHBreak: -2.5, avgVBreak: 2.0, color: 'rgba(59, 130, 246, 0.4)' },
    { pitchType: 'Curveball', avgHBreak: 6.0, avgVBreak: -8.5, color: 'rgba(34, 197, 94, 0.4)' },
    { pitchType: 'Changeup', avgHBreak: 9.0, avgVBreak: 6.5, color: 'rgba(168, 85, 247, 0.4)' },
    { pitchType: 'Sinker', avgHBreak: 13.5, avgVBreak: 8.0, color: 'rgba(249, 115, 22, 0.4)' },
];

const getUserPitchColor = (pitchType: string): string => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff') return 'rgba(239, 68, 68, 1)';
    if (type.includes('slider') || type === 'sl') return 'rgba(59, 130, 246, 1)';
    if (type.includes('curve') || type === 'cu') return 'rgba(34, 197, 94, 1)';
    if (type.includes('change') || type === 'ch') return 'rgba(168, 85, 247, 1)';
    if (type.includes('sinker') || type === 'si') return 'rgba(249, 115, 22, 1)';
    return 'rgba(245, 158, 11, 1)';
};

export default function MovementChart({
    userPitches,
    mlbData = DEFAULT_MLB_DATA,
    title = 'Movement Profile'
}: MovementChartProps) {
    const chartRef = useRef<ChartJS<'scatter'>>(null);

    const data = {
        datasets: [
            // MLB averages as hollow circles
            ...mlbData.map(mlb => ({
                label: `MLB ${mlb.pitchType}`,
                data: [{ x: mlb.avgHBreak, y: mlb.avgVBreak }],
                backgroundColor: mlb.color,
                borderColor: mlb.color.replace('0.4', '0.7'),
                borderWidth: 2,
                pointRadius: 12,
                pointStyle: 'circle' as const,
            })),
            // User pitches as filled stars
            ...userPitches.map(pitch => ({
                label: `Your ${pitch.pitchType}`,
                data: [{ x: pitch.avgHBreak, y: pitch.avgVBreak }],
                backgroundColor: getUserPitchColor(pitch.pitchType),
                borderColor: '#ffffff',
                borderWidth: 2,
                pointRadius: 14,
                pointStyle: 'star' as const,
            })),
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 11,
                    },
                    color: '#6b7280',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context: { dataset: { label: string }; parsed: { x: number; y: number } }) => {
                        const label = context.dataset.label || '';
                        const x = context.parsed.x.toFixed(1);
                        const y = context.parsed.y.toFixed(1);
                        return `${label}: H ${x}", V ${y}"`;
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Horizontal Break (inches)',
                    color: '#9ca3af',
                    font: { size: 12 },
                },
                min: -15,
                max: 20,
                grid: { color: 'rgba(0, 0, 0, 0.04)' },
                border: { color: '#e5e7eb' },
                ticks: { color: '#9ca3af' },
            },
            y: {
                title: {
                    display: true,
                    text: 'Vertical Break (inches)',
                    color: '#9ca3af',
                    font: { size: 12 },
                },
                min: -15,
                max: 25,
                grid: { color: 'rgba(0, 0, 0, 0.04)' },
                border: { color: '#e5e7eb' },
                ticks: { color: '#9ca3af' },
            },
        },
    };

    return (
        <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">{title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-400 opacity-50" />
                        MLB Avg
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        You
                    </span>
                </div>
            </div>
            <div className="h-[300px]">
                <Scatter ref={chartRef} data={data} options={options} />
            </div>
        </div>
    );
}
