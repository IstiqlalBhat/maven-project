'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Edit2, Save, X, Calendar, Activity, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { authGet, authPut } from '@/lib/auth-fetch';

interface Pitcher {
    id: number;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
}

interface PitchStats {
    totalPitches: number;
    pitchTypes: string[];
    avgVelocity: number;
    avgSpin: number;
    firstPitchDate: string | null;
    lastPitchDate: string | null;
}

// Format date to a readable string with time
const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return dateStr;
    }
};

export default function PitcherPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [stats, setStats] = useState<PitchStats | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Pitcher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch pitcher info (user guard for data fetching)
    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        authGet(`/api/pitchers/${pitcherId}`)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404 || res.status === 403) {
                        router.push('/');
                    }
                    setIsLoading(false);
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) {
                    setPitcher(data);
                    setEditForm(data);
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [pitcherId, router, user]);

    // Fetch pitch stats
    useEffect(() => {
        if (!user) return;
        authGet(`/api/pitches?pitcher_id=${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const pitches = data;
                    const avgVelo = pitches.filter((p: { velocity_mph: number | null }) => p.velocity_mph).reduce((sum: number, p: { velocity_mph: number | null }) => sum + (p.velocity_mph || 0), 0) / pitches.filter((p: { velocity_mph: number | null }) => p.velocity_mph).length || 0;
                    const avgSpin = pitches.filter((p: { spin_rate: number | null }) => p.spin_rate).reduce((sum: number, p: { spin_rate: number | null }) => sum + (p.spin_rate || 0), 0) / pitches.filter((p: { spin_rate: number | null }) => p.spin_rate).length || 0;
                    // Use created_at for real timestamps with time
                    const timestamps = pitches.filter((p: { created_at: string | null }) => p.created_at).map((p: { created_at: string | null }) => p.created_at).sort();

                    setStats({
                        totalPitches: pitches.length,
                        pitchTypes: [...new Set(pitches.map((p: { pitch_type: string }) => p.pitch_type))] as string[],
                        avgVelocity: avgVelo,
                        avgSpin: avgSpin,
                        firstPitchDate: timestamps[0] || null,
                        lastPitchDate: timestamps[timestamps.length - 1] || null,
                    });
                } else {
                    setStats({
                        totalPitches: 0,
                        pitchTypes: [],
                        avgVelocity: 0,
                        avgSpin: 0,
                        firstPitchDate: null,
                        lastPitchDate: null,
                    });
                }
            })
            .catch(() => { });
    }, [pitcherId, user]);

    const handleSave = async () => {
        if (!editForm) return;
        setIsSaving(true);

        try {
            const res = await authPut(`/api/pitchers/${pitcherId}`, editForm);

            if (res.ok) {
                const updated = await res.json();
                setPitcher(updated);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating pitcher:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm(pitcher);
        setIsEditing(false);
    };

    // Show loading while checking auth
    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar pitcherId={pitcherId} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                            <User className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">Pitcher Profile</h1>
                    </div>
                    <p className="text-neutral-500">Manage your pitcher information</p>
                </header>

                <div className="grid grid-cols-12 gap-6">
                    {/* Profile Card */}
                    <div className="col-span-12 lg:col-span-8">
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {pitcher?.name.charAt(0)}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm?.name || ''}
                                                onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                className="text-2xl font-bold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1"
                                            />
                                        ) : (
                                            <h2 className="text-2xl font-bold text-neutral-800">{pitcher?.name}</h2>
                                        )}
                                        <p className="text-neutral-500">Pitcher ID: #{pitcherId}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleCancel}
                                                className="p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                                            >
                                                <X size={20} className="text-neutral-500" />
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="p-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                            >
                                                <Save size={20} className="text-white" />
                                                {isSaving && <div className="loading-spinner w-4 h-4 border-2" />}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                                        >
                                            <Edit2 size={20} className="text-amber-600" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-neutral-50 p-4 rounded-xl">
                                    <p className="text-sm text-neutral-500 mb-1">Age</p>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editForm?.age || ''}
                                            onChange={e => setEditForm(prev => prev ? { ...prev, age: parseInt(e.target.value) || null } : null)}
                                            className="w-full font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-lg px-3 py-1"
                                        />
                                    ) : (
                                        <p className="font-semibold text-neutral-800">{pitcher?.age || 'Not set'}</p>
                                    )}
                                </div>
                                <div className="bg-neutral-50 p-4 rounded-xl">
                                    <p className="text-sm text-neutral-500 mb-1">Throws</p>
                                    {isEditing ? (
                                        <select
                                            value={editForm?.throws || ''}
                                            onChange={e => setEditForm(prev => prev ? { ...prev, throws: e.target.value as 'L' | 'R' | null } : null)}
                                            className="w-full font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-lg px-3 py-1"
                                        >
                                            <option value="">Select</option>
                                            <option value="L">Left</option>
                                            <option value="R">Right</option>
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-neutral-800">
                                            {pitcher?.throws === 'L' ? 'Left' : pitcher?.throws === 'R' ? 'Right' : 'Not set'}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-neutral-50 p-4 rounded-xl">
                                    <p className="text-sm text-neutral-500 mb-1">Level</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm?.level || ''}
                                            onChange={e => setEditForm(prev => prev ? { ...prev, level: e.target.value || null } : null)}
                                            className="w-full font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-lg px-3 py-1"
                                            placeholder="e.g. High School, College, Pro"
                                        />
                                    ) : (
                                        <p className="font-semibold text-neutral-800">{pitcher?.level || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-amber-500" />
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Total Pitches</span>
                                    <span className="font-semibold text-neutral-800">{stats?.totalPitches || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Pitch Types</span>
                                    <span className="font-semibold text-neutral-800">{stats?.pitchTypes.length || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Avg. Velocity</span>
                                    <span className="font-semibold text-neutral-800">
                                        {stats?.avgVelocity ? `${stats.avgVelocity.toFixed(1)} mph` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Avg. Spin</span>
                                    <span className="font-semibold text-neutral-800">
                                        {stats?.avgSpin ? `${Math.round(stats.avgSpin).toLocaleString()} rpm` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-amber-500" />
                                Activity
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">First Pitch</span>
                                    <span className="font-semibold text-neutral-800">
                                        {formatDate(stats?.firstPitchDate || null)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Last Pitch</span>
                                    <span className="font-semibold text-neutral-800">
                                        {formatDate(stats?.lastPitchDate || null)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Arsenal Preview */}
                        {stats && stats.pitchTypes.length > 0 && (
                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-neutral-800 mb-4">Arsenal</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stats.pitchTypes.map((type, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
