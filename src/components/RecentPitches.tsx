'use client';

interface RecentPitch {
    id: number;
    pitch_type: string;
    velocity_mph: number | null;
    date: string | null;
}

interface RecentPitchesProps {
    pitches: RecentPitch[];
    isLoading?: boolean;
}

const getPitchIcon = (pitchType: string) => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff') return '🔥';
    if (type.includes('slider') || type === 'sl') return '💨';
    if (type.includes('curve') || type === 'cu') return '🌀';
    if (type.includes('change') || type === 'ch') return '🎯';
    if (type.includes('sinker') || type === 'si') return '⬇️';
    return '⚾';
};

const getPitchColor = (pitchType: string) => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff') return 'from-red-400 to-red-500';
    if (type.includes('slider') || type === 'sl') return 'from-blue-400 to-blue-500';
    if (type.includes('curve') || type === 'cu') return 'from-green-400 to-green-500';
    if (type.includes('change') || type === 'ch') return 'from-purple-400 to-purple-500';
    if (type.includes('sinker') || type === 'si') return 'from-orange-400 to-orange-500';
    return 'from-amber-400 to-amber-500';
};

export default function RecentPitches({ pitches, isLoading }: RecentPitchesProps) {
    if (isLoading) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Pitches</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (pitches.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Pitches</h3>
                <p className="text-sm text-gray-500 text-center py-4">
                    No recent pitches
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Pitches</h3>
            <div className="space-y-3">
                {pitches.slice(0, 4).map((pitch) => (
                    <div key={pitch.id} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPitchColor(pitch.pitch_type)} flex items-center justify-center text-lg shadow-sm`}>
                            {getPitchIcon(pitch.pitch_type)}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{pitch.pitch_type}</p>
                            <p className="text-xs text-gray-500">
                                {pitch.date ? new Date(pitch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-800">
                                {pitch.velocity_mph?.toFixed(1) || '-'}
                            </p>
                            <p className="text-xs text-gray-400">mph</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
