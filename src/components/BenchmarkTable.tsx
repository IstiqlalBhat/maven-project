'use client';

interface BenchmarkPlayer {
    name: string;
    pstInss?: number;
    stats?: number;
    avgC?: number;
    lweight?: number;
    avgVelo?: number;
    avgSpin?: number;
}

interface BenchmarkTableProps {
    players: BenchmarkPlayer[];
    title?: string;
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

export default function BenchmarkTable({ players, title = 'Benchmark', isLoading }: BenchmarkTableProps) {
    if (isLoading) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (players.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
                <p className="text-sm text-gray-500 text-center py-8">
                    No benchmark data available
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">{title}</h3>
                <select className="text-xs bg-white/50 border border-gray-200 rounded-lg px-3 py-1.5">
                    <option>All Benchmark</option>
                    <option>Fastball</option>
                    <option>Slider</option>
                    <option>Curveball</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th className="text-right">Pst Inss</th>
                            <th className="text-right">Stats</th>
                            <th className="text-right">Avg. Velo</th>
                            <th className="text-right">Spin Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player, index) => (
                            <tr key={index}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(player.name)} flex items-center justify-center text-white font-medium text-xs`}>
                                            {player.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <span className="font-medium text-gray-800">{player.name}</span>
                                    </div>
                                </td>
                                <td className="text-right">{player.pstInss ?? '-'}</td>
                                <td className="text-right">{player.stats?.toLocaleString() ?? '-'}</td>
                                <td className="text-right">{player.avgVelo?.toFixed(1) ?? '-'}</td>
                                <td className="text-right">{player.avgSpin ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
