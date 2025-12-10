'use client';

interface SimilarPitcher {
    name: string;
    similarity: number;
    avgVelo: number;
    avgSpin: number;
}

interface SimilarProsProps {
    pitchers: SimilarPitcher[];
    isLoading?: boolean;
}

const getAvatarColor = (name: string) => {
    const colors = [
        'from-red-400 to-red-600',
        'from-blue-400 to-blue-600',
        'from-green-400 to-green-600',
        'from-purple-400 to-purple-600',
        'from-amber-400 to-amber-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

const getSimilarityColor = (similarity: number) => {
    if (similarity >= 85) return 'from-green-400 to-green-500';
    if (similarity >= 70) return 'from-amber-400 to-amber-500';
    return 'from-yellow-400 to-yellow-500';
};

export default function SimilarPros({ pitchers, isLoading }: SimilarProsProps) {
    if (isLoading) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Similar Pros</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (pitchers.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Similar Pros</h3>
                <p className="text-sm text-gray-500 text-center py-8">
                    Add pitches to find similar MLB pitchers
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Similar Pros</h3>
            <p className="text-xs text-gray-500 mb-4">
                MLB pitchers with similar pitch profiles to yours
            </p>

            <div className="space-y-4">
                {pitchers.map((pitcher, index) => (
                    <div key={index} className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColor(pitcher.name)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {pitcher.name.split(' ').map(n => n[0]).join('')}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{pitcher.name}</p>
                            <p className="text-xs text-gray-500">
                                {pitcher.avgVelo.toFixed(1)} mph • {pitcher.avgSpin} rpm
                            </p>
                        </div>

                        {/* Similarity Bar */}
                        <div className="w-20">
                            <div className="similarity-bar">
                                <div
                                    className={`similarity-fill bg-gradient-to-r ${getSimilarityColor(pitcher.similarity)}`}
                                    style={{ width: `${pitcher.similarity}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 text-right mt-1">{pitcher.similarity}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
