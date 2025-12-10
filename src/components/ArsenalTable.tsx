'use client';

import { Pencil, Trash2 } from 'lucide-react';

interface Pitch {
    id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
}

interface ArsenalTableProps {
    pitches: Pitch[];
    onEdit: (pitch: Pitch) => void;
    onDelete: (id: number) => void;
    isLoading?: boolean;
}

const getPitchBadgeClass = (pitchType: string) => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type === 'ff') return 'pitch-badge-ff';
    if (type.includes('slider') || type === 'sl') return 'pitch-badge-sl';
    if (type.includes('curve') || type === 'cu') return 'pitch-badge-cu';
    if (type.includes('change') || type === 'ch') return 'pitch-badge-ch';
    if (type.includes('sinker') || type === 'si') return 'pitch-badge-si';
    return 'pitch-badge-ff';
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

export default function ArsenalTable({ pitches, onEdit, onDelete, isLoading }: ArsenalTableProps) {
    if (isLoading) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (pitches.length === 0) {
        return (
            <div className="glass-card p-6 text-center">
                <div className="py-12">
                    <p className="text-gray-500 mb-2">No pitches recorded yet</p>
                    <p className="text-sm text-gray-400">Add your first pitch to start tracking your arsenal</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Pitch</th>
                        <th>Velo</th>
                        <th>Spin</th>
                        <th>H-Break</th>
                        <th>V-Break</th>
                        <th className="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pitches.map((pitch) => (
                        <tr key={pitch.id}>
                            <td className="font-medium">{formatDate(pitch.date)}</td>
                            <td>
                                <span className={`pitch-badge ${getPitchBadgeClass(pitch.pitch_type)}`}>
                                    {pitch.pitch_type}
                                </span>
                            </td>
                            <td>
                                {pitch.velocity_mph ? `${pitch.velocity_mph.toFixed(1)} mph` : '-'}
                            </td>
                            <td>
                                {pitch.spin_rate ? `${pitch.spin_rate} rpm` : '-'}
                            </td>
                            <td>
                                {pitch.horizontal_break !== null ? `${pitch.horizontal_break.toFixed(1)}"` : '-'}
                            </td>
                            <td>
                                {pitch.vertical_break !== null ? `${pitch.vertical_break.toFixed(1)}"` : '-'}
                            </td>
                            <td>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(pitch)}
                                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={16} className="text-gray-500" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onDelete(pitch.id);
                                        }}
                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
