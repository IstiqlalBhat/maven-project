'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart2,
    User,
    Users,
    Puzzle,
    GitCompare,
    Settings,
    Menu,
    LogOut,
    LogIn,
    X,
    Home,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
    pitcherId?: number;
}

export default function Sidebar({ pitcherId }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, signOut } = useAuth();

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    const navItems = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Dashboard', icon: LayoutDashboard, path: pitcherId ? `/dashboard/${pitcherId}` : '/' },
        { name: 'Stats', icon: BarChart2, path: pitcherId ? `/stats/${pitcherId}` : '/' },
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
        setMobileOpen(false);
    };

    const handleNavClick = (path: string) => {
        router.push(path);
        setMobileOpen(false);
    };

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 z-40 flex items-center justify-between px-4 safe-area-top">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-xs">⚾</span>
                    </div>
                    <span className="font-bold text-gray-800 text-sm">PitchTracker</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2.5 hover:bg-amber-100 active:bg-amber-200 rounded-lg transition-colors touch-manipulation"
                    aria-label="Open menu"
                >
                    <Menu size={22} className="text-gray-700" />
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar - Desktop: always visible, Mobile: slide-in drawer */}
            <aside className={`
                sidebar fixed top-0 h-screen flex flex-col z-50
                transition-all duration-300 ease-in-out
                ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
                ${mobileOpen ? 'left-0 w-[280px]' : '-left-[280px] lg:left-0'}
            `}>
                {/* Logo Area */}
                <div className={`p-4 flex items-center ${collapsed && !mobileOpen ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-white font-bold text-lg">⚾</span>
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <span className="font-bold text-lg text-gray-800 whitespace-nowrap">PitchTracker</span>
                    )}
                    {/* Mobile close button */}
                    {mobileOpen && (
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="ml-auto p-2 hover:bg-amber-100 active:bg-amber-200 rounded-lg transition-colors lg:hidden touch-manipulation"
                            aria-label="Close menu"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item.path)}
                            className={`nav-item w-full ${isActive(item.path) ? 'active' : ''} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                            title={collapsed && !mobileOpen ? item.name : undefined}
                        >
                            <item.icon size={20} className="flex-shrink-0" />
                            {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                        </button>
                    ))}
                </nav>

                {/* Settings & Auth */}
                <div className="px-3 pb-4 space-y-1">
                    <button
                        onClick={() => handleNavClick('/admin')}
                        className={`nav-item w-full ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                        title={collapsed && !mobileOpen ? 'Ingest Data (Admin)' : undefined}
                    >
                        <Settings size={20} className="flex-shrink-0" />
                        {(!collapsed || mobileOpen) && <span>Ingest Data (Admin)</span>}
                    </button>

                    <button
                        onClick={handleAuthAction}
                        className={`nav-item w-full text-red-500 hover:bg-red-50 ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                        title={collapsed && !mobileOpen ? (user ? 'Sign Out' : 'Sign In') : undefined}
                    >
                        {user ? <LogOut size={20} className="flex-shrink-0" /> : <LogIn size={20} className="flex-shrink-0" />}
                        {(!collapsed || mobileOpen) && <span>{user ? 'Sign Out' : 'Sign In'}</span>}
                    </button>
                </div>

                {/* Desktop Collapse Toggle - Fixed position at bottom */}
                <div className="hidden lg:block border-t border-gray-200/50 p-3">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`w-full p-2 hover:bg-amber-100 rounded-lg transition-colors flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {!collapsed && <span className="text-xs text-gray-500">Collapse</span>}
                        {collapsed ? <ChevronRight size={18} className="text-gray-500" /> : <ChevronLeft size={18} className="text-gray-500" />}
                    </button>
                </div>
            </aside>
        </>
    );
}
