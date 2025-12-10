'use client';

import { Users, Plus, Lock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function TeamsPage() {
    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Users className="text-white" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">Teams</h1>
                    </div>
                    <p className="text-neutral-500">Manage your teams and coaching staff</p>
                </header>

                {/* Coming Soon Card */}
                <div className="glass-card p-12 text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} className="text-indigo-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-800 mb-4">Coming Soon</h2>
                    <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                        Team management features are currently in development. Soon you&apos;ll be able to:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-8">
                        <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-800">Create Teams</h4>
                                <p className="text-sm text-neutral-500">Organize pitchers into teams</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Plus size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-800">Invite Members</h4>
                                <p className="text-sm text-neutral-500">Add coaches and staff</p>
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary opacity-50 cursor-not-allowed" disabled>
                        <Plus size={18} className="inline mr-2" />
                        Create Team
                    </button>
                </div>
            </main>
        </div>
    );
}
