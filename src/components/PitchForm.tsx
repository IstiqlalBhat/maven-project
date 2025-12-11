'use client';

import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { authPost } from '@/lib/auth-fetch';

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

interface CSVRow {
    pitch_type?: string;
    pitchType?: string;
    velocity_mph?: string;
    velocity?: string;
    spin_rate?: string;
    spinRate?: string;
    horizontal_break?: string;
    hBreak?: string;
    vertical_break?: string;
    vBreak?: string;
    date?: string;
    notes?: string;
    [key: string]: string | undefined;
}

export default function PitchForm({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    pitcherId
}: PitchFormProps) {
    const [isBatchMode, setIsBatchMode] = useState(false);

    // Single Entry State
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

    // Batch Entry State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [rawCsvData, setRawCsvData] = useState<CSVRow[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [showColumnMapping, setShowColumnMapping] = useState(false);
    const [parsedPitches, setParsedPitches] = useState<PitchData[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    // Duplicate batch detection state
    const [duplicateBatchDetected, setDuplicateBatchDetected] = useState(false);
    const [duplicateMessage, setDuplicateMessage] = useState<string>('');
    const [forceUpload, setForceUpload] = useState(false);

    // Standard field mappings
    const FIELD_MAPPINGS: Record<string, string[]> = {
        'pitch_type': ['pitch_type', 'pitchType', 'type', 'pitch', 'pitchname'],
        'velocity_mph': ['velocity_mph', 'velocity', 'velo', 'speed', 'relspeed'],
        'spin_rate': ['spin_rate', 'spinRate', 'spin', 'rpm', 'spinrate'],
        'horizontal_break': ['horizontal_break', 'hBreak', 'h_break', 'horizontal', 'horzbreak'],
        'vertical_break': ['vertical_break', 'vBreak', 'v_break', 'vertical', 'inducedvertbreak'],
        'date': ['date', 'game_date', 'date_recorded', 'gamedate'],
        'notes': ['notes', 'comments', 'description', 'note']
    };

    // Helpers
    const getTodayDate = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return getTodayDate();
        if (dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        return dateString;
    };

    // Auto-detect column mapping
    const autoDetectMapping = (headers: string[]): Record<string, string> => {
        const mapping: Record<string, string> = {};

        for (const [standardField, aliases] of Object.entries(FIELD_MAPPINGS)) {
            for (const header of headers) {
                const normalizedHeader = header.toLowerCase().trim();
                if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
                    mapping[standardField] = header;
                    break;
                }
            }
        }

        return mapping;
    };

    // Map row data using column mapping
    const mapRowData = (row: CSVRow, mapping: Record<string, string>): Partial<PitchData> => {
        const rawPitchType = row[mapping['pitch_type'] || ''] || '';

        return {
            pitch_type: rawPitchType.trim(),
            velocity_mph: row[mapping['velocity_mph'] || ''] ? parseFloat(row[mapping['velocity_mph'] || ''] || '0') : null,
            spin_rate: row[mapping['spin_rate'] || ''] ? parseInt(row[mapping['spin_rate'] || ''] || '0') : null,
            horizontal_break: row[mapping['horizontal_break'] || ''] ? parseFloat(row[mapping['horizontal_break'] || ''] || '0') : null,
            vertical_break: row[mapping['vertical_break'] || ''] ? parseFloat(row[mapping['vertical_break'] || ''] || '0') : null,
            date: row[mapping['date'] || ''] ? formatDateForInput(row[mapping['date'] || '']) : getTodayDate(),
            notes: row[mapping['notes'] || ''] || ''
        };
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: formatDateForInput(initialData.date),
            });
            setIsBatchMode(false);
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
        // Reset batch state when opening fresh
        if (!isOpen) {
            setCsvFile(null);
            setRawCsvData([]);
            setCsvHeaders([]);
            setColumnMapping({});
            setShowColumnMapping(false);
            setParsedPitches([]);
            setParseErrors([]);
            setUploadSuccess(null);
            setIsUploading(false);
            setDuplicateBatchDetected(false);
            setDuplicateMessage('');
            setForceUpload(false);
        }
        // We disable exhaustive-deps here because we strictly want this to run only when these specific props change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, pitcherId, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (field: keyof PitchData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- Batch Upload Logic ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCsvFile(file);
            parseCSV(file);
        }
    };

    const parseCSV = (file: File) => {
        setIsUploading(true);
        setParseErrors([]);
        setUploadSuccess(null);
        setShowColumnMapping(false);

        Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: 'greedy',
            complete: (results) => {
                const errors: string[] = [];

                if (results.errors.length > 0) {
                    results.errors.forEach(err => errors.push(`Parse error on line ${err.row}: ${err.message}`));
                }

                // Store raw data and headers
                setRawCsvData(results.data);
                const headers = results.meta.fields || [];
                setCsvHeaders(headers);

                // Auto-detect column mapping
                const detectedMapping = autoDetectMapping(headers);
                setColumnMapping(detectedMapping);

                // Check if we have the required field (pitch_type)
                if (!detectedMapping['pitch_type']) {
                    errors.push('Could not detect pitch_type column. Please use column mapping.');
                    setShowColumnMapping(true);
                    setParseErrors(errors);
                    setIsUploading(false);
                    return;
                }

                // Try to process with detected mapping
                processDataWithMapping(results.data, detectedMapping);

                if (errors.length > 0) {
                    setParseErrors(prev => [...prev, ...errors]);
                }
                setIsUploading(false);
            },
            error: (error) => {
                setParseErrors([`CSV parsing failed: ${error.message}`]);
                setIsUploading(false);
            }
        });
    };

    const processDataWithMapping = (data: CSVRow[], mapping: Record<string, string>) => {
        const pitches: PitchData[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
            try {
                const mappedData = mapRowData(row, mapping);

                const pitch: PitchData = {
                    pitcher_id: pitcherId,
                    pitch_type: mappedData.pitch_type || '',
                    velocity_mph: mappedData.velocity_mph || null,
                    spin_rate: mappedData.spin_rate || null,
                    horizontal_break: mappedData.horizontal_break || null,
                    vertical_break: mappedData.vertical_break || null,
                    date: mappedData.date || getTodayDate(),
                    notes: mappedData.notes || ''
                };

                // Validate pitch type
                if (!pitch.pitch_type || !PITCH_TYPES.some(pt => pt.value === pitch.pitch_type)) {
                    errors.push(`Row ${index + 1}: Invalid or missing pitch_type "${pitch.pitch_type}"`);
                } else {
                    pitches.push(pitch);
                }
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _ = err;
                errors.push(`Row ${index + 1}: Failed to parse data`);
            }
        });

        setParsedPitches(pitches);
        if (errors.length > 0) {
            setParseErrors(prev => [...prev, ...errors]);
        }
    };

    const handleMappingChange = (standardField: string, csvColumn: string) => {
        const newMapping = { ...columnMapping, [standardField]: csvColumn };
        setColumnMapping(newMapping);

        // Re-process data with new mapping
        if (rawCsvData.length > 0) {
            setParseErrors([]);
            processDataWithMapping(rawCsvData, newMapping);
        }
    };

    const handleApplyMapping = () => {
        setShowColumnMapping(false);
        setParseErrors([]);
        processDataWithMapping(rawCsvData, columnMapping);
    };

    const handleBatchUpload = async (force: boolean = false) => {
        if (parsedPitches.length === 0) return;

        setIsUploading(true);
        setParseErrors([]);

        try {
            // If force upload after duplicate warning, we still upload (the API will insert anyway on second call)
            // But actually we need to handle this differently - let's just proceed with the upload
            // If it's a duplicate batch and user wants to force, we send skipDuplicates=false to actually insert
            const res = await authPost('/api/pitches/batch', {
                pitcher_id: pitcherId,
                pitches: parsedPitches,
                // If user confirmed force upload, we don't set skipDuplicates (API will insert)
                // On first attempt, skipDuplicates is false, so API returns duplicate warning
                skipDuplicates: false
            });

            const data = await res.json();

            if (!res.ok) {
                // Handle duplicate batch detection response
                if (data.code === 'DUPLICATE_BATCH') {
                    if (force) {
                        // User confirmed they want to upload anyway - do a force upload
                        await forceUploadBatch();
                    } else {
                        setDuplicateBatchDetected(true);
                        setDuplicateMessage(data.message);
                        setParseErrors([]);
                    }
                } else {
                    setParseErrors([data.error || 'Upload failed', ...(data.details || [])]);
                }
            } else {
                setUploadSuccess(`Successfully uploaded ${data.count} pitches!`);
                setDuplicateBatchDetected(false);
                // Close after a brief delay and trigger refresh via window event
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('pitches-updated'));
                    onClose();
                }, 1500);
            }
        } catch (error) {
            setParseErrors(['Network error occurred during upload.']);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    // Force upload bypasses duplicate check by inserting directly
    const forceUploadBatch = async () => {
        setIsUploading(true);
        try {
            // We use checkOnly=false and the API will insert since we're making a fresh call
            // Actually, we need a way to force insert. Let's add a forceInsert flag
            const res = await authPost('/api/pitches/batch', {
                pitcher_id: pitcherId,
                pitches: parsedPitches,
                forceInsert: true
            });

            const data = await res.json();

            if (!res.ok) {
                setParseErrors([data.error || 'Upload failed', ...(data.details || [])]);
            } else {
                setUploadSuccess(`Successfully uploaded ${data.count} pitches!`);
                setDuplicateBatchDetected(false);
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('pitches-updated'));
                    onClose();
                }, 1500);
            }
        } catch (error) {
            setParseErrors(['Network error occurred during upload.']);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span>{initialData ? 'Edit Pitch' : 'Add New Pitch'}</span>
                        {!initialData && (
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setIsBatchMode(false)}
                                    className={`px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-all ${!isBatchMode ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Single
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsBatchMode(true)}
                                    className={`px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-all ${isBatchMode ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Batch
                                </button>
                            </div>
                        )}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {!isBatchMode ? (
                    // --- Single Entry Form ---
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
                ) : (
                    // --- Batch Upload UI ---
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                            <h4 className="font-semibold mb-1 flex items-center gap-2">
                                <FileText size={16} /> CSV Format Guide
                            </h4>
                            <p className="opacity-90">
                                Upload a CSV file with headers: <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">pitch_type</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">velocity_mph</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">spin_rate</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">date</code>
                            </p>
                        </div>

                        {!csvFile ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Click to upload CSV</p>
                                        <p className="text-xs">or drag and drop file here</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 truncate max-w-[200px]">{csvFile.name}</p>
                                            <p className="text-xs text-gray-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCsvFile(null);
                                            setParsedPitches([]);
                                            setParseErrors([]);
                                            setUploadSuccess(null);
                                            setDuplicateBatchDetected(false);
                                            setDuplicateMessage('');
                                            setForceUpload(false);
                                        }}
                                        className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Column Mapping UI */}
                                {showColumnMapping && csvHeaders.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                                                <FileText size={16} /> Column Mapping
                                            </h4>
                                            <button
                                                onClick={() => setShowColumnMapping(false)}
                                                className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded text-amber-800 transition-colors"
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <p className="text-sm text-amber-800 mb-4 opacity-90">
                                            Map your CSV columns to the required pitch data fields:
                                        </p>
                                        <div className="space-y-3">
                                            {Object.keys(FIELD_MAPPINGS).map(standardField => (
                                                <div key={standardField} className="flex items-center gap-3">
                                                    <label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">
                                                        {standardField.replace(/_/g, ' ')}
                                                        {standardField === 'pitch_type' && <span className="text-red-500 ml-1">*</span>}
                                                    </label>
                                                    <select
                                                        value={columnMapping[standardField] || ''}
                                                        onChange={(e) => handleMappingChange(standardField, e.target.value)}
                                                        className="input-field text-sm flex-1"
                                                    >
                                                        <option value="">-- Not mapped --</option>
                                                        {csvHeaders.map(header => (
                                                            <option key={header} value={header}>{header}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={handleApplyMapping}
                                                disabled={!columnMapping['pitch_type']}
                                                className="btn-primary text-sm py-2 flex-1"
                                            >
                                                Apply Mapping
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const autoMapping = autoDetectMapping(csvHeaders);
                                                    setColumnMapping(autoMapping);
                                                    processDataWithMapping(rawCsvData, autoMapping);
                                                }}
                                                className="btn-secondary text-sm py-2"
                                            >
                                                Auto-detect
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Show column mapping button if there are errors or missing mappings */}
                                {csvHeaders.length > 0 && !showColumnMapping && (
                                    <button
                                        onClick={() => setShowColumnMapping(true)}
                                        className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FileText size={16} />
                                        Customize Column Mapping
                                    </button>
                                )}

                                {parseErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800 max-h-40 overflow-y-auto">
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <AlertCircle size={16} /> Validation Errors
                                        </h4>
                                        <ul className="list-disc list-inside space-y-1 opacity-90">
                                            {parseErrors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {parsedPitches.length > 0 && parseErrors.length === 0 && !duplicateBatchDetected && (
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <CheckCircle size={16} /> Ready to Upload
                                        </h4>
                                        <p className="mt-1 opacity-90">
                                            Found <b>{parsedPitches.length}</b> valid pitches.
                                        </p>
                                    </div>
                                )}

                                {/* Duplicate Batch Warning */}
                                {duplicateBatchDetected && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <AlertTriangle size={16} /> Duplicate Batch Detected
                                        </h4>
                                        <p className="opacity-90 mb-3">
                                            {duplicateMessage || 'This batch of pitches appears to have already been uploaded.'}
                                        </p>
                                        <p className="text-xs text-amber-700 mb-3">
                                            If you meant to upload these pitches again (e.g., from a different session), you can force the upload below.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => forceUploadBatch()}
                                                disabled={isUploading}
                                                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                {isUploading ? 'Uploading...' : 'Upload Anyway'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDuplicateBatchDetected(false);
                                                    setCsvFile(null);
                                                    setParsedPitches([]);
                                                }}
                                                disabled={isUploading}
                                                className="flex-1 py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {uploadSuccess && (
                                    <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-sm text-green-800 font-medium flex items-center gap-2">
                                        <CheckCircle size={16} /> {uploadSuccess}
                                    </div>
                                )}

                                {/* Only show main buttons if not in duplicate warning state */}
                                {!duplicateBatchDetected && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="btn-secondary flex-1"
                                            disabled={isUploading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBatchUpload()}
                                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                                            disabled={
                                                parsedPitches.length === 0 ||
                                                parseErrors.length > 0 ||
                                                isUploading ||
                                                !!uploadSuccess
                                            }
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Upload {parsedPitches.length > 0 ? `(${parsedPitches.length})` : ''}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
