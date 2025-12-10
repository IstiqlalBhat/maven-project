'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PitchFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pitch: PitchData) => void;
    initialData?: PitchData | null;
    pitcherId: number;
}

export interface PitchData {
    id?: number;
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string;
    notes: string;
}

const PITCH_TYPES = [
    { value: 'Fastball', label: '4-Seam Fastball' },
    { value: 'Sinker', label: 'Sinker (2-Seam)' },
    { value: 'Slider', label: 'Slider' },
    { value: 'Curveball', label: 'Curveball' },
    { value: 'Changeup', label: 'Changeup' },
    { value: 'Cutter', label: 'Cutter' },
    { value: 'Splitter', label: 'Splitter' },
];

export default function PitchForm({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    pitcherId
}: PitchFormProps) {
    const [formData, setFormData] = useState<PitchData>({
        pitcher_id: pitcherId,
        pitch_type: 'Fastball',
        velocity_mph: null,
        spin_rate: null,
        horizontal_break: null,
        vertical_break: null,
        date: '',
        notes: '',
    });

    const getTodayDate = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return getTodayDate();
        if (dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        return dateString;
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: formatDateForInput(initialData.date),
            });
        } else {
            setFormData({
                pitcher_id: pitcherId,
                pitch_type: 'Fastball',
                velocity_mph: null,
                spin_rate: null,
                horizontal_break: null,
                vertical_break: null,
                date: getTodayDate(),
                notes: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, pitcherId, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (field: keyof PitchData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? 'Edit Pitch' : 'Add New Pitch'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Pitch Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pitch Type
                        </label>
                        <select
                            value={formData.pitch_type}
                            onChange={(e) => handleChange('pitch_type', e.target.value)}
                            className="input-field"
                            required
                        >
                            {PITCH_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Velocity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Velocity (mph)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="40"
                            max="110"
                            value={formData.velocity_mph ?? ''}
                            onChange={(e) => handleChange('velocity_mph', e.target.value ? parseFloat(e.target.value) : null)}
                            className="input-field"
                            placeholder="e.g., 88.5"
                        />
                    </div>

                    {/* Spin Rate */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Spin Rate (rpm) <span className="text-gray-400 text-xs">optional</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="4000"
                            value={formData.spin_rate ?? ''}
                            onChange={(e) => handleChange('spin_rate', e.target.value ? parseInt(e.target.value) : null)}
                            className="input-field"
                            placeholder="e.g., 2200"
                        />
                    </div>

                    {/* Movement */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                H-Break (in) <span className="text-gray-400 text-xs">optional</span>
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="-20"
                                max="20"
                                value={formData.horizontal_break ?? ''}
                                onChange={(e) => handleChange('horizontal_break', e.target.value ? parseFloat(e.target.value) : null)}
                                className="input-field"
                                placeholder="e.g., 8"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                V-Break (in) <span className="text-gray-400 text-xs">optional</span>
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="-20"
                                max="25"
                                value={formData.vertical_break ?? ''}
                                onChange={(e) => handleChange('vertical_break', e.target.value ? parseFloat(e.target.value) : null)}
                                className="input-field"
                                placeholder="e.g., 14"
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes <span className="text-gray-400 text-xs">optional</span>
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="input-field"
                            rows={3}
                            placeholder="e.g., Bullpen session, felt good..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            {initialData ? 'Update Pitch' : 'Add Pitch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
