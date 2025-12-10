'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search, Bell } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import MovementChart from '@/components/MovementChart';
import RecentPitches from '@/components/RecentPitches';
import SimilarPros from '@/components/SimilarPros';
import AIInsight from '@/components/AIInsight';
import BenchmarkTable from '@/components/BenchmarkTable';
import PitchForm, { PitchData } from '@/components/PitchForm';
import ArsenalTable from '@/components/ArsenalTable';
import PercentileBar from '@/components/PercentileBar';

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

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const pitcherId = parseInt(params.pitcherId as string);

    const [pitcher, setPitcher] = useState<Pitcher | null>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [comparisons, setComparisons] = useState<Comparison[]>([]);
    const [similarPitchers, setSimilarPitchers] = useState<SimilarPitcher[]>([]);
    const [developmentPlan, setDevelopmentPlan] = useState<DevelopmentPlan | null>(null);

    const [isLoadingPitcher, setIsLoadingPitcher] = useState(true);
    const [isLoadingPitches, setIsLoadingPitches] = useState(true);
    const [isLoadingComparisons, setIsLoadingComparisons] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const [showPitchForm, setShowPitchForm] = useState(false);
    const [editingPitch, setEditingPitch] = useState<PitchData | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'arsenal'>('dashboard');

    // Fetch pitcher info
    useEffect(() => {
        fetch(`/api/pitchers/${pitcherId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    router.push('/');
                    return;
                }
                setPitcher(data);
                setIsLoadingPitcher(false);
            })
            .catch(() => router.push('/'));
    }, [pitcherId, router]);

    // Fetch pitches
    const fetchPitches = useCallback(() => {
        setIsLoadingPitches(true);
        fetch(`/api/pitches?pitcher_id=${pitcherId}`)
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

    // Fetch comparisons when pitches change
    useEffect(() => {
        if (pitches.length > 0) {
            setIsLoadingComparisons(true);
            fetch(`/api/compare/${pitcherId}`)
                .then(res => res.json())
                .then(data => {
                    setComparisons(data.comparisons || []);
                    setIsLoadingComparisons(false);
                })
                .catch(() => setIsLoadingComparisons(false));

            fetch(`/api/similar/${pitcherId}`)
                .then(res => res.json())
                .then(data => {
                    setSimilarPitchers(data.overall || []);
                })
                .catch(() => { });
        }
    }, [pitcherId, pitches.length]);

    // Generate AI plan
    const generateAIPlan = async () => {
        setIsLoadingAI(true);
        try {
            const res = await fetch(`/api/ai-plan/${pitcherId}`);
            const data = await res.json();
            if (!data.error) {
                setDevelopmentPlan(data);
            }
        } catch (error) {
            console.error('Error generating AI plan:', error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    // Handle pitch submission
    const handlePitchSubmit = async (pitch: PitchData) => {
        try {
            if (pitch.id) {
                await fetch(`/api/pitches/${pitch.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pitch),
                });
            } else {
                await fetch('/api/pitches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pitch),
                });
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
            const res = await fetch(`/api/pitches/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchPitches();
            }
        } catch (error) {
            console.error('Error deleting pitch:', error);
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
        pitchType: c.pitchType,
        avgHBreak: c.userStats.avgHBreak,
        avgVBreak: c.userStats.avgVBreak,
    }));

    if (isLoadingPitcher) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner-lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <Sidebar pitcherId={pitcherId} />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                        <p className="text-gray-500">Welcome back, {pitcher?.name}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 bg-white/70 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="p-2 bg-white/70 border border-gray-200 rounded-xl hover:bg-white transition-colors">
                            <Bell size={20} className="text-gray-500" />
                        </button>

                        {/* Profile */}
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {pitcher?.name.charAt(0)}
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'dashboard'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-gray-600 hover:bg-white/80'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('arsenal')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'arsenal'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 text-gray-600 hover:bg-white/80'
                            }`}
                    >
                        My Arsenal
                    </button>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Column */}
                        <div className="col-span-12 lg:col-span-8 space-y-6">
                            {/* Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <MovementChart userPitches={userPitchMovement} />

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
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            {/* Add Pitch Button */}
                            <button
                                onClick={() => {
                                    setEditingPitch(null);
                                    setShowPitchForm(true);
                                }}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                Add New Pitch
                            </button>

                            {/* Recent Pitches */}
                            <RecentPitches pitches={pitches} isLoading={isLoadingPitches} />

                            {/* Similar Pros */}
                            <SimilarPros pitchers={similarPitchers} isLoading={isLoadingComparisons} />

                            {/* AI Insight */}
                            <AIInsight
                                plan={developmentPlan}
                                isLoading={isLoadingAI}
                                onGenerate={generateAIPlan}
                            />
                        </div>
                    </div>
                ) : (
                    /* Arsenal Tab */
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">My Arsenal</h2>
                            <button
                                onClick={() => {
                                    setEditingPitch(null);
                                    setShowPitchForm(true);
                                }}
                                className="btn-primary flex items-center gap-2"
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
                            isLoading={isLoadingPitches}
                        />

                        {/* Quick Stats */}
                        {pitches.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
