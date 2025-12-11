'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import MovementChart from '@/components/MovementChart';
import RecentPitches from '@/components/RecentPitches';
import SimilarPros from '@/components/SimilarPros';
import AIChat from '@/components/AIChat';
import BenchmarkTable from '@/components/BenchmarkTable';
import PitchForm, { PitchData } from '@/components/PitchForm';
import ArsenalTable from '@/components/ArsenalTable';
import PercentileBar from '@/components/PercentileBar';
import { authGet, authPost, authPut, authDelete } from '@/lib/auth-fetch';

interface Pitcher {
    id: number;
    name: string;
    age: number | null;
    throws: 'L' | 'R' | null;
    level: string | null;
}

interface Pitch {
    id: number;
    pitcher_id: number;
    pitch_type: string;
    velocity_mph: number | null;
    spin_rate: number | null;
    horizontal_break: number | null;
    vertical_break: number | null;
    date: string | null;
    notes: string | null;
}

interface Comparison {
    pitchType: string;
    pitchTypeName: string;
    userStats: {
        avgVelo: number;
        avgSpin: number;
        avgHBreak: number;
        avgVBreak: number;
        pitchCount: number;
    };
    mlbStats: {
        avgVelo: number;
        avgSpin: number;
        avgHBreak: number;
        avgVBreak: number;
        maxVelo: number;
        maxSpin: number;
    };
    percentiles: {
        velocity: number;
        spinRate: number;
        horizontalBreak: number;
        verticalBreak: number;
    };
}

interface SimilarPitcher {
    name: string;
    similarity: number;
    avgVelo: number;
    avgSpin: number;
}

interface DevelopmentPlan {
    playerName: string;
    level: string;
    strengths: string[];
    developmentPriorities: Array<{
        area: string;
        priority: 'High' | 'Medium' | 'Low';
        current: string;
        target: string;
        actionItems: string[];
        timeline: string;
    }>;
    realisticPath: string;
    nextSteps: string[];
    similarPitchers: string[];
}

// Helper function to get pitch type colors
const getPitchColor = (pitchType: string): string => {
    const type = pitchType.toLowerCase();
    if (type.includes('fastball') || type.includes('4-seam')) return 'rgba(239, 68, 68, 0.4)';
    if (type.includes('slider')) return 'rgba(59, 130, 246, 0.4)';
    if (type.includes('curve')) return 'rgba(34, 197, 94, 0.4)';
    if (type.includes('change')) return 'rgba(168, 85, 247, 0.4)';
    if (type.includes('sinker')) return 'rgba(249, 115, 22, 0.4)';
    if (type.includes('cutter')) return 'rgba(14, 165, 233, 0.4)';
    if (type.includes('splitter')) return 'rgba(236, 72, 153, 0.4)';
    return 'rgba(245, 158, 11, 0.4)';
};

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [comparisons, setComparisons] = useState<Comparison[]>([]);
    const [similarPitchers, setSimilarPitchers] = useState<SimilarPitcher[]>([]);

    const [isLoadingPitcher, setIsLoadingPitcher] = useState(true);
    const [isLoadingPitches, setIsLoadingPitches] = useState(true);
    const [isLoadingComparisons, setIsLoadingComparisons] = useState(false);

    const [showPitchForm, setShowPitchForm] = useState(false);
    const [editingPitch, setEditingPitch] = useState<PitchData | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'arsenal'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);

    // Fetch pitcher info (user guard prevents race condition)
    useEffect(() => {
        if (!user) return;
        authGet(`/api/pitchers/${pitcherId}`)
            .then(res => {
                if (!res.ok) {
                    // Only redirect on 404 (not found) or 403 (forbidden)
                    if (res.status === 404 || res.status === 403) {
                        router.push('/');
                    }
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) {
                    setPitcher(data);
                }
                setIsLoadingPitcher(false);
            })
            .catch(() => setIsLoadingPitcher(false));
    }, [pitcherId, router, user]);

    // Fetch pitches
    const fetchPitches = useCallback(() => {
        setIsLoadingPitches(true);
        authGet(`/api/pitches?pitcher_id=${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                setPitches(Array.isArray(data) ? data : []);
                setIsLoadingPitches(false);
            })
            .catch(() => setIsLoadingPitches(false));
    }, [pitcherId]);

    useEffect(() => {
        fetchPitches();
    }, [fetchPitches]);

    // Listen for batch upload completion to refresh pitches
    useEffect(() => {
        const handlePitchesUpdated = () => fetchPitches();
        window.addEventListener('pitches-updated', handlePitchesUpdated);
        return () => window.removeEventListener('pitches-updated', handlePitchesUpdated);
    }, [fetchPitches]);

    // Fetch comparisons when pitches change
    useEffect(() => {
        if (pitches.length > 0) {
            setIsLoadingComparisons(true);
            authGet(`/api/compare/${pitcherId}`)
                .then(res => res.json())
                .then(data => {
                    setComparisons(data.comparisons || []);
                    setIsLoadingComparisons(false);
                })
                .catch(() => setIsLoadingComparisons(false));

            authGet(`/api/similar/${pitcherId}`)
                .then(res => res.json())
                .then(data => {
                    setSimilarPitchers(data.overall || []);
                })
                .catch(() => { });
        }
    }, [pitcherId, pitches.length]);

    // Handle pitch submission
    const handlePitchSubmit = async (pitch: PitchData) => {
        try {
            if (pitch.id) {
                await authPut(`/api/pitches/${pitch.id}`, pitch);
            } else {
                await authPost('/api/pitches', pitch);
            }
            fetchPitches();
            setShowPitchForm(false);
            setEditingPitch(null);
        } catch (error) {
            console.error('Error saving pitch:', error);
        }
    };

    // Handle pitch delete
    const handleDeletePitch = async (id: number) => {
        try {
            const res = await authDelete(`/api/pitches/${id}`);
            if (res.ok) {
                fetchPitches();
            }
        } catch (error) {
            console.error('Error deleting pitch:', error);
        }
    };

    // Handle batch delete
    const handleBatchDelete = async (ids: number[]) => {
        try {
            const res = await authPost('/api/pitches/batch-delete', { pitch_ids: ids });
            if (res.ok) {
                fetchPitches();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete pitches');
            }
        } catch (error) {
            console.error('Error batch deleting pitches:', error);
            alert('Failed to delete pitches');
        }
    };

    // Calculate stats
    const avgVelocity = pitches.length > 0
        ? pitches.filter(p => p.velocity_mph).reduce((sum, p) => sum + (p.velocity_mph || 0), 0) / pitches.filter(p => p.velocity_mph).length
        : 0;

    const avgSpin = pitches.length > 0
        ? pitches.filter(p => p.spin_rate).reduce((sum, p) => sum + (p.spin_rate || 0), 0) / pitches.filter(p => p.spin_rate).length
        : 0;

    const pitchTypes = [...new Set(pitches.map(p => p.pitch_type))].length;

    // Prepare movement chart data
    const userPitchMovement = comparisons.map(c => ({
        pitchType: c.pitchTypeName,
        avgHBreak: c.userStats.avgHBreak,
        avgVBreak: c.userStats.avgVBreak,
    }));

    // Prepare MLB movement data from actual comparisons
    const mlbPitchMovement = comparisons.map(c => ({
        pitchType: c.pitchTypeName,
        avgHBreak: c.mlbStats.avgHBreak,
        avgVBreak: c.mlbStats.avgVBreak,
        color: getPitchColor(c.pitchTypeName),
    }));

    const searchResults = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return [];
        return pitches
            .filter(p => p.pitch_type.toLowerCase().includes(term))
            .slice(0, 5);
    }, [pitches, searchTerm]);

    // Show loading while checking auth
    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (isLoadingPitcher) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner-lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Sidebar */}
            <Sidebar pitcherId={pitcherId} />

            {/* Main Content */}
            <main className="flex-1 main-content">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Dashboard</h1>
                        <p className="text-sm lg:text-base text-gray-500">Welcome back, {pitcher?.name}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm w-full sm:w-52 transition-all duration-200 shadow-sm hover:border-amber-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300 focus:bg-white"
                            />
                            {searchTerm && (
                                <div className="absolute mt-2 w-full bg-white border border-amber-100 rounded-xl shadow-lg z-20 overflow-hidden">
                                    {searchResults.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                                    ) : (
                                        searchResults.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    router.push(`/dashboard/${pitcherId}`);
                                                    setSearchTerm('');
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm text-gray-700 flex justify-between"
                                            >
                                                <span>{p.pitch_type}</span>
                                                <span className="text-gray-400">{p.velocity_mph ? `${p.velocity_mph.toFixed(1)} mph` : ''}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications((v) => !v)}
                                className="p-2 bg-white/80 border border-gray-200 rounded-xl hover:bg-white shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 active:scale-95"
                            >
                                <Bell size={20} className="text-gray-500" />
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-amber-100 rounded-xl shadow-lg z-20">
                                    <div className="px-4 py-3 border-b border-amber-50">
                                        <p className="text-sm font-semibold text-gray-800">Notifications</p>
                                        <p className="text-xs text-gray-500">No new alerts</p>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-gray-500">
                                        Tip: Record pitches to see alerts here.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                            {pitcher?.name.charAt(0)}
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 lg:mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'dashboard'
                            ? 'bg-amber-700 text-white shadow-lg border border-amber-600/30'
                            : 'bg-white/70 text-gray-700 hover:bg-white/90 border border-white/50'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('arsenal')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'arsenal'
                            ? 'bg-amber-700 text-white shadow-lg border border-amber-600/30'
                            : 'bg-white/70 text-gray-700 hover:bg-white/90 border border-white/50'
                            }`}
                    >
                        My Arsenal
                    </button>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-8 space-y-4 lg:space-y-6 order-2 lg:order-1">
                            {/* Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                                <StatsCard
                                    title="Avg. Velocity"
                                    value={avgVelocity ? avgVelocity.toFixed(1) : '-'}
                                    subtitle="mph"
                                />
                                <StatsCard
                                    title="Avg. Spin"
                                    value={avgSpin ? Math.round(avgSpin).toLocaleString() : '-'}
                                    subtitle="rpm"
                                    color="blue"
                                />
                                <StatsCard
                                    title="Pitch Types"
                                    value={pitchTypes || '-'}
                                    subtitle="in arsenal"
                                    color="green"
                                />
                                <StatsCard
                                    title="Total Pitches"
                                    value={pitches.length}
                                    subtitle="recorded"
                                    color="red"
                                />
                            </div>

                            {/* Movement Chart */}
                            {comparisons.length > 0 ? (
                                <MovementChart
                                    userPitches={userPitchMovement}
                                    mlbData={mlbPitchMovement}
                                    title="Movement Profile vs MLB"
                                />
                            ) : pitches.length > 0 ? (
                                <div className="glass-card p-6">
                                    <div className="flex justify-center items-center h-[300px] text-gray-500">
                                        <div className="text-center">
                                            <div className="loading-spinner mb-3" />
                                            <p>Loading MLB comparison data...</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-card p-6">
                                    <h3 className="font-semibold text-gray-800 mb-4">Movement Profile</h3>
                                    <div className="flex justify-center items-center h-[300px] text-gray-500">
                                        <div className="text-center">
                                            <p className="mb-2">No pitch data yet</p>
                                            <p className="text-sm">Add pitches to see your movement profile</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Percentiles */}
                            {comparisons.length > 0 && (
                                <div className="glass-card p-6">
                                    <h3 className="font-semibold text-gray-800 mb-4">Your Pitches vs MLB</h3>
                                    <div className="space-y-6">
                                        {comparisons.map((comparison, idx) => (
                                            <div key={idx} className="space-y-4">
                                                <h4 className="font-medium text-gray-700">{comparison.pitchType}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <PercentileBar
                                                        label="Velocity"
                                                        value={comparison.userStats.avgVelo}
                                                        percentile={comparison.percentiles.velocity}
                                                        unit="mph"
                                                        mlbAvg={comparison.mlbStats.avgVelo}
                                                        mlbMax={comparison.mlbStats.maxVelo}
                                                    />
                                                    <PercentileBar
                                                        label="Spin Rate"
                                                        value={comparison.userStats.avgSpin}
                                                        percentile={comparison.percentiles.spinRate}
                                                        unit="rpm"
                                                        mlbAvg={comparison.mlbStats.avgSpin}
                                                    />
                                                    <PercentileBar
                                                        label="Horizontal Break"
                                                        value={comparison.userStats.avgHBreak}
                                                        percentile={comparison.percentiles.horizontalBreak}
                                                        unit='"'
                                                        mlbAvg={comparison.mlbStats.avgHBreak}
                                                    />
                                                    <PercentileBar
                                                        label="Vertical Break"
                                                        value={comparison.userStats.avgVBreak}
                                                        percentile={comparison.percentiles.verticalBreak}
                                                        unit='"'
                                                        mlbAvg={comparison.mlbStats.avgVBreak}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Benchmark Table */}
                            <BenchmarkTable
                                players={similarPitchers.map(p => ({
                                    name: p.name,
                                    avgVelo: p.avgVelo,
                                    avgSpin: p.avgSpin,
                                    pstInss: 100,
                                    stats: Math.round(p.similarity * 45),
                                }))}
                                isLoading={isLoadingComparisons}
                            />
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-4 space-y-4 lg:space-y-6 order-1 lg:order-2">
                            {/* Add Pitch Button */}
                            <button
                                onClick={() => {
                                    setEditingPitch(null);
                                    setShowPitchForm(true);
                                }}
                                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3 lg:py-4 shadow-lg shadow-amber-400/30 hover:shadow-amber-400/40 transition-all duration-200"
                            >
                                <Plus size={20} />
                                Add New Pitch
                            </button>

                            {/* Recent Pitches - Hidden on mobile for less clutter, shown in sidebar area */}
                            <div className="hidden sm:block">
                                <RecentPitches pitches={pitches} isLoading={isLoadingPitches} />
                            </div>

                            {/* Similar Pros */}
                            <SimilarPros pitchers={similarPitchers} isLoading={isLoadingComparisons} />

                            {/* AI Chat */}
                            <AIChat
                                pitcher={pitcher ? {
                                    id: pitcher.id,
                                    name: pitcher.name,
                                    level: pitcher.level || undefined
                                } : undefined}
                            />
                        </div>
                    </div>
                ) : (
                    /* Arsenal Tab */
                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h2 className="text-lg lg:text-xl font-bold text-gray-800">My Arsenal</h2>
                            <button
                                onClick={() => {
                                    setEditingPitch(null);
                                    setShowPitchForm(true);
                                }}
                                className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                <Plus size={18} />
                                Add Pitch
                            </button>
                        </div>

                        <ArsenalTable
                            pitches={pitches}
                            onEdit={(pitch) => {
                                setEditingPitch({
                                    id: pitch.id,
                                    pitcher_id: pitcherId,
                                    pitch_type: pitch.pitch_type,
                                    velocity_mph: pitch.velocity_mph,
                                    spin_rate: pitch.spin_rate,
                                    horizontal_break: pitch.horizontal_break,
                                    vertical_break: pitch.vertical_break,
                                    date: pitch.date || '',
                                    notes: pitch.notes || '',
                                });
                                setShowPitchForm(true);
                            }}
                            onDelete={handleDeletePitch}
                            onBatchDelete={handleBatchDelete}
                            isLoading={isLoadingPitches}
                        />

                        {/* Quick Stats */}
                        {pitches.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                                <StatsCard
                                    title="Avg. Velocity"
                                    value={avgVelocity ? avgVelocity.toFixed(1) : '-'}
                                    subtitle="mph"
                                />
                                <StatsCard
                                    title="Avg. Spin"
                                    value={avgSpin ? Math.round(avgSpin).toLocaleString() : '-'}
                                    subtitle="rpm"
                                    color="blue"
                                />
                                <StatsCard
                                    title="Pitch Types"
                                    value={pitchTypes || '-'}
                                    subtitle="in arsenal"
                                    color="green"
                                />
                                <StatsCard
                                    title="Total Pitches"
                                    value={pitches.length}
                                    subtitle="recorded"
                                    color="red"
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Pitch Form Modal */}
            <PitchForm
                isOpen={showPitchForm}
                onClose={() => {
                    setShowPitchForm(false);
                    setEditingPitch(null);
                }}
                onSubmit={handlePitchSubmit}
                initialData={editingPitch}
                pitcherId={pitcherId}
            />
        </div>
    );
}
