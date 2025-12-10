'use client';

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
    const getPercentileColor = (p: number) => {
        if (p >= 80) return 'percentile-elite';
        if (p >= 60) return 'percentile-good';
        if (p >= 40) return 'percentile-mid';
        return 'percentile-low';
    };

    const isElite = percentile >= 90;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <span className="font-medium text-gray-700">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                        {typeof value === 'number' ? value.toFixed(1) : value} {unit}
                    </span>
                    {isElite && <span className="text-lg">🔥</span>}
                </div>
            </div>

            <div className="percentile-bar">
                <div
                    className={`percentile-fill ${getPercentileColor(percentile)}`}
                    style={{ width: `${percentile}%` }}
                />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
                <span className="font-medium">{percentile}th percentile</span>
                {mlbAvg && (
                    <span>
                        MLB Avg: {mlbAvg.toFixed(1)} {unit}
                        {mlbMax && `, Max: ${mlbMax.toFixed(1)} ${unit}`}
                    </span>
                )}
            </div>
        </div>
    );
}
