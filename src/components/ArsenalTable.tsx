'use client';

import { Pencil, Trash2, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';

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
    onBatchDelete?: (ids: number[]) => void;
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

const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function ArsenalTable({ pitches, onEdit, onDelete, onBatchDelete, isLoading }: ArsenalTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSelectAll = () => {
        if (selectedIds.size === pitches.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pitches.map(p => p.id)));
        }
    };

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0 || !onBatchDelete) return;

        if (!confirm(`Delete ${selectedIds.size} selected pitch${selectedIds.size > 1 ? 'es' : ''}?`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await onBatchDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        } finally {
            setIsDeleting(false);
        }
    };

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
            <div className="glass-card p-4 lg:p-6 text-center">
                <div className="py-8 lg:py-12">
                    <p className="text-gray-500 mb-2">No pitches recorded yet</p>
                    <p className="text-sm text-gray-400">Add your first pitch to start tracking your arsenal</p>
                </div>
            </div>
        );
    }

    const allSelected = selectedIds.size === pitches.length && pitches.length > 0;
    const someSelected = selectedIds.size > 0;

    return (
        <div className="glass-card overflow-hidden">
            {/* Selection header */}
            {someSelected && onBatchDelete && (
                <div className="px-3 lg:px-4 py-2 lg:py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
                    <span className="text-xs lg:text-sm font-medium text-gray-700">
                        {selectedIds.size} selected
                    </span>
                    <button
                        onClick={handleBatchDelete}
                        disabled={isDeleting}
                        className="px-3 py-1.5 lg:px-4 lg:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm font-medium flex items-center gap-1.5"
                    >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="w-12">
                                <button
                                    onClick={toggleSelectAll}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title={allSelected ? 'Deselect all' : 'Select all'}
                                >
                                    {allSelected ? (
                                        <CheckSquare size={18} className="text-amber-600" />
                                    ) : (
                                        <Square size={18} className="text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th>Date</th>
                            <th>Pitch</th>
                            <th>Velo</th>
                            <th>Spin</th>
                            <th>H-Break</th>
                            <th>V-Break</th>
                            <th>Notes</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pitches.map((pitch) => (
                            <tr key={pitch.id} className={selectedIds.has(pitch.id) ? 'bg-amber-50' : ''}>
                                <td>
                                    <button
                                        onClick={() => toggleSelect(pitch.id)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        {selectedIds.has(pitch.id) ? (
                                            <CheckSquare size={18} className="text-amber-600" />
                                        ) : (
                                            <Square size={18} className="text-gray-400" />
                                        )}
                                    </button>
                                </td>
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
                                <td className="max-w-xs truncate text-sm text-gray-600">
                                    {pitch.notes || '-'}
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
                {/* Select All for mobile */}
                <div className="px-3 py-2 flex items-center gap-2 bg-gray-50/50">
                    <button
                        onClick={toggleSelectAll}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                        {allSelected ? (
                            <CheckSquare size={18} className="text-amber-600" />
                        ) : (
                            <Square size={18} className="text-gray-400" />
                        )}
                    </button>
                    <span className="text-xs text-gray-500">Select all</span>
                </div>

                {pitches.map((pitch) => (
                    <div
                        key={pitch.id}
                        className={`p-3 ${selectedIds.has(pitch.id) ? 'bg-amber-50' : ''}`}
                    >
                        <div className="flex items-start gap-2">
                            {/* Checkbox */}
                            <button
                                onClick={() => toggleSelect(pitch.id)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors mt-0.5 flex-shrink-0"
                            >
                                {selectedIds.has(pitch.id) ? (
                                    <CheckSquare size={18} className="text-amber-600" />
                                ) : (
                                    <Square size={18} className="text-gray-400" />
                                )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`pitch-badge ${getPitchBadgeClass(pitch.pitch_type)}`}>
                                            {pitch.pitch_type}
                                        </span>
                                        <span className="text-xs text-gray-500">{formatDateShort(pitch.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onEdit(pitch)}
                                            className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={14} className="text-gray-500" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onDelete(pitch.id);
                                            }}
                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Velo:</span>
                                        <span className="font-medium text-gray-700">
                                            {pitch.velocity_mph ? `${pitch.velocity_mph.toFixed(1)} mph` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Spin:</span>
                                        <span className="font-medium text-gray-700">
                                            {pitch.spin_rate ? `${pitch.spin_rate}` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">H-Break:</span>
                                        <span className="font-medium text-gray-700">
                                            {pitch.horizontal_break !== null ? `${pitch.horizontal_break.toFixed(1)}"` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">V-Break:</span>
                                        <span className="font-medium text-gray-700">
                                            {pitch.vertical_break !== null ? `${pitch.vertical_break.toFixed(1)}"` : '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                {pitch.notes && (
                                    <p className="mt-2 text-xs text-gray-500 truncate">
                                        {pitch.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
