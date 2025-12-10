'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart2,
    User,
    Target,
    Users,
    Puzzle,
    GitCompare,
    Settings,
    Menu,
    LogOut,
    LogIn
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
    pitcherId?: number;
}

export default function Sidebar({ pitcherId }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const { user, signOut } = useAuth();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: pitcherId ? `/dashboard/${pitcherId}` : '/' },
        { name: 'Stats', icon: BarChart2, path: pitcherId ? `/stats/${pitcherId}` : '/' },
        { name: 'Pitcher', icon: User, path: pitcherId ? `/pitcher/${pitcherId}` : '/create-profile' },
        { name: 'Benchmark', icon: Target, path: pitcherId ? `/compare/${pitcherId}` : '/' },
        { name: 'Teams', icon: Users, path: '/teams' },
        { name: 'Plugins', icon: Puzzle, path: '/plugins' },
        { name: 'Compare', icon: GitCompare, path: pitcherId ? `/compare/${pitcherId}` : '/' },
    ];

    const isActive = (path: string) => pathname === path;

    const handleAuthAction = async () => {
        if (user) {
            await signOut();
            router.push('/login');
        } else {
            router.push('/login');
        }
    };

    return (
        <aside className={`sidebar fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">⚾</span>
                </div>
                {!collapsed && (
                    <span className="font-bold text-lg text-gray-800">PitchTracker</span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto p-2 hover:bg-amber-100 rounded-lg transition-colors"
                >
                    <Menu size={18} className="text-gray-500" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => router.push(item.path)}
                        className={`nav-item w-full ${isActive(item.path) ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        {!collapsed && <span>{item.name}</span>}
                    </button>
                ))}
            </nav>

            {/* Settings & Auth */}
            <div className="px-4 pb-6 space-y-1">
                <button
                    onClick={() => router.push('/admin')}
                    className="nav-item w-full"
                >
                    <Settings size={20} />
                    {!collapsed && <span>Settings</span>}
                </button>

                <button
                    onClick={handleAuthAction}
                    className="nav-item w-full text-red-500 hover:bg-red-50"
                >
                    {user ? <LogOut size={20} /> : <LogIn size={20} />}
                    {!collapsed && <span>{user ? 'Sign Out' : 'Sign In'}</span>}
                </button>
            </div>
        </aside>
    );
}
