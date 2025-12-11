'use client';

import { Users, Plus, Lock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function TeamsPage() {
    return (
        <div className="min-h-screen">
            <Sidebar />

            <main className="main-content">
                {/* Header */}
                <header className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2.5 lg:gap-3 mb-1.5 lg:mb-2">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <Users className="text-white" size={18} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold text-neutral-800">Teams</h1>
                    </div>
                    <p className="text-sm lg:text-base text-neutral-500">Manage your teams and coaching staff</p>
                </header>

                {/* Coming Soon Card */}
                <div className="glass-card p-6 sm:p-8 lg:p-12 text-center max-w-2xl mx-auto">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                        <Lock size={24} className="text-indigo-500 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 lg:mb-4">Coming Soon</h2>
                    <p className="text-sm lg:text-base text-neutral-500 mb-6 lg:mb-8 max-w-md mx-auto">
                        Team management features are currently in development. Soon you&apos;ll be able to:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-left max-w-lg mx-auto mb-6 lg:mb-8">
                        <div className="flex items-start gap-3 p-3 lg:p-4 bg-neutral-50 rounded-lg lg:rounded-xl">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-800 text-sm lg:text-base">Create Teams</h4>
                                <p className="text-xs lg:text-sm text-neutral-500">Organize pitchers into teams</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 lg:p-4 bg-neutral-50 rounded-lg lg:rounded-xl">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Plus size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-800 text-sm lg:text-base">Invite Members</h4>
                                <p className="text-xs lg:text-sm text-neutral-500">Add coaches and staff</p>
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary opacity-50 cursor-not-allowed text-sm lg:text-base" disabled>
                        <Plus size={16} className="inline mr-2 lg:w-[18px] lg:h-[18px]" />
                        Create Team
                    </button>
                </div>
            </main>
        </div>
    );
}
