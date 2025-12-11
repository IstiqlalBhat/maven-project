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
        <div className="min-h-screen">
            <Sidebar />

            <main className="main-content">
                {/* Header */}
                <header className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2.5 lg:gap-3 mb-1.5 lg:mb-2">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <Puzzle className="text-white" size={18} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold text-neutral-800">Plugins</h1>
                    </div>
                    <p className="text-sm lg:text-base text-neutral-500">Extend your PitchTracker experience with integrations</p>
                </header>

                {/* Coming Soon Banner */}
                <div className="glass-card p-4 lg:p-6 mb-6 lg:mb-8 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-start sm:items-center gap-3 lg:gap-4">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Lock size={20} className="text-amber-600 lg:w-6 lg:h-6" />
                        </div>
                        <div>
                            <h2 className="text-base lg:text-lg font-semibold text-neutral-800">Plugin Marketplace Coming Soon</h2>
                            <p className="text-xs lg:text-sm text-neutral-500">We&apos;re working on bringing you powerful integrations to enhance your training.</p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Plugins Grid */}
                <h3 className="text-base lg:text-lg font-semibold text-neutral-800 mb-3 lg:mb-4">Upcoming Integrations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-6">
                    {upcomingPlugins.map((plugin, idx) => (
                        <div key={idx} className="glass-card p-4 lg:p-6 opacity-75">
                            <div className="flex items-start gap-3 lg:gap-4">
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${plugin.color} rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <plugin.icon size={20} className="text-white lg:w-6 lg:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-neutral-800 text-sm lg:text-base">{plugin.name}</h4>
                                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] lg:text-xs rounded-full whitespace-nowrap">Coming Soon</span>
                                    </div>
                                    <p className="text-xs lg:text-sm text-neutral-500">{plugin.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Request Plugin */}
                <div className="glass-card p-6 lg:p-8 text-center mt-6 lg:mt-8">
                    <h3 className="text-base lg:text-lg font-semibold text-neutral-800 mb-2">Have a Plugin Request?</h3>
                    <p className="text-xs lg:text-sm text-neutral-500 mb-4">Let us know what integrations would help your training.</p>
                    <button className="btn-secondary text-sm lg:text-base">
                        Request Integration
                    </button>
                </div>
            </main>
        </div>
    );
}
