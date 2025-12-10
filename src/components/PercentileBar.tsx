'use client';

import { useEffect, useState } from 'react';

interface PercentileBarProps {
    label: string;
    value: number;
    percentile: number;
    unit?: string;
    mlbAvg?: number;
    mlbMax?: number;
}

export default function PercentileBar({
    label,
    value,
    percentile,
    unit = '',
    mlbAvg,
    mlbMax,
}: PercentileBarProps) {
    const [animatedPercentile, setAnimatedPercentile] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedPercentile(percentile), 100);
        return () => clearTimeout(timer);
    }, [percentile]);

    const getPercentileColor = (p: number) => {
        if (p >= 80) return 'percentile-elite';
        if (p >= 60) return 'percentile-good';
        if (p >= 40) return 'percentile-mid';
        return 'percentile-low';
    };

    const getPercentileBadge = (p: number) => {
        if (p >= 90) return { text: 'Elite', bg: 'bg-gradient-to-r from-violet-500 to-purple-500', glow: true };
        if (p >= 80) return { text: 'Excellent', bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', glow: false };
        if (p >= 60) return { text: 'Good', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', glow: false };
        if (p >= 40) return { text: 'Average', bg: 'bg-gradient-to-r from-amber-500 to-orange-500', glow: false };
        return { text: 'Developing', bg: 'bg-gradient-to-r from-red-400 to-orange-400', glow: false };
    };

    const isElite = percentile >= 90;
    const badge = getPercentileBadge(percentile);

    return (
        <div className="glass-panel-sm p-4 space-y-3 transition-all duration-300 hover:shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-semibold text-gray-800 text-sm">{label}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-bold text-gray-900">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                        </span>
                        <span className="text-gray-500 text-sm">{unit}</span>
                        {isElite && (
                            <span className="text-lg animate-pulse" title="Elite Performance">🔥</span>
                        )}
                    </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${badge.bg} ${badge.glow ? 'shadow-lg shadow-purple-300/50' : ''}`}>
                    {badge.text}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
                <div className="percentile-bar">
                    <div
                        className={`percentile-fill ${getPercentileColor(percentile)}`}
                        style={{ width: `${animatedPercentile}%` }}
                    />
                </div>
                {/* Percentile marker */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md border-2 border-gray-300 transition-all duration-700"
                    style={{ left: `calc(${animatedPercentile}% - 6px)` }}
                />
            </div>

            {/* Footer Stats */}
            <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-full">
                        {percentile}th
                    </span>
                    <span className="text-gray-500">percentile</span>
                </div>
                {mlbAvg && (
                    <div className="flex items-center gap-1 text-gray-500">
                        <span className="text-gray-400">MLB:</span>
                        <span className="font-medium text-gray-600">{mlbAvg.toFixed(1)}{unit}</span>
                        {mlbMax && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="font-medium text-emerald-600">{mlbMax.toFixed(1)}{unit}</span>
                                <span className="text-gray-400 text-[10px]">max</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
