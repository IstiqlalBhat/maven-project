'use client';

import { Puzzle, Lock, Zap, BarChart3, Video, Database } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function PluginsPage() {
    const upcomingPlugins = [
        {
            name: 'Rapsodo Integration',
            description: 'Import pitch data directly from your Rapsodo device',
            icon: Database,
            color: 'from-blue-400 to-blue-600',
        },
        {
            name: 'Video Analysis',
            description: 'Sync video footage with your pitch data',
            icon: Video,
            color: 'from-purple-400 to-purple-600',
        },
        {
            name: 'Advanced Analytics',
            description: 'Unlock advanced pitch metrics and predictions',
            icon: BarChart3,
            color: 'from-green-400 to-green-600',
        },
        {
            name: 'TrackMan Connect',
            description: 'Import data from TrackMan systems',
            icon: Zap,
            color: 'from-amber-400 to-amber-600',
        },
    ];

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                            <Puzzle className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">Plugins</h1>
                    </div>
                    <p className="text-neutral-500">Extend your PitchTracker experience with integrations</p>
                </header>

                {/* Coming Soon Banner */}
                <div className="glass-card p-6 mb-8 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Lock size={24} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-800">Plugin Marketplace Coming Soon</h2>
                            <p className="text-neutral-500">We&apos;re working on bringing you powerful integrations to enhance your training.</p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Plugins Grid */}
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Upcoming Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingPlugins.map((plugin, idx) => (
                        <div key={idx} className="glass-card p-6 opacity-75">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 bg-gradient-to-br ${plugin.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <plugin.icon size={24} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-neutral-800">{plugin.name}</h4>
                                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-xs rounded-full">Coming Soon</span>
                                    </div>
                                    <p className="text-sm text-neutral-500">{plugin.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Request Plugin */}
                <div className="glass-card p-8 text-center mt-8">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">Have a Plugin Request?</h3>
                    <p className="text-neutral-500 mb-4">Let us know what integrations would help your training.</p>
                    <button className="btn-secondary">
                        Request Integration
                    </button>
                </div>
            </main>
        </div>
    );
}
