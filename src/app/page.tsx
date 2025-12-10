'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, BarChart2, Target, Brain, LogIn, UserPlus, Loader2, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { authGet, authDelete } from '@/lib/auth-fetch';

interface Pitcher {
  id: number;
  name: string;
  level: string;
  throws: string;
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [isLoadingPitchers, setIsLoadingPitchers] = useState(true);

  useEffect(() => {
    if (user) {
      authGet('/api/pitchers')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPitchers(data);
          }
          setIsLoadingPitchers(false);
        })
        .catch(() => setIsLoadingPitchers(false));
    }
  }, [user]);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeletePitcher = async (e: React.MouseEvent, pitcherId: number, pitcherName: string) => {
    e.stopPropagation(); // Prevent navigation to dashboard

    if (!confirm(`Are you sure you want to delete ${pitcherName}? This will also delete all their pitches and cannot be undone.`)) {
      return;
    }

    setDeletingId(pitcherId);
    try {
      const response = await authDelete(`/api/pitchers/${pitcherId}`);

      if (response.ok) {
        setPitchers(prev => prev.filter(p => p.id !== pitcherId));
      } else {
        alert('Failed to delete pitcher. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting pitcher:', error);
      alert('Failed to delete pitcher. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Unauthenticated View - Marketing Landing
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Background decorative elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="text-center max-w-4xl mx-auto stagger-children">
            {/* Logo */}
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
              <span className="text-5xl">⚾</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 tracking-tight">
              Master Your <span className="gradient-text">Arsenal</span>
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              The professional grade pitch tracking platform. Analyze stats, compare against MLB benchmarks, and get AI-driven coaching insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105 flex items-center gap-2 group"
              >
                <UserPlus size={20} />
                Get Started
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login"
                className="px-8 py-4 glass-card hover:bg-white/80 text-gray-700 font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <LogIn size={20} />
                Sign In
              </Link>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full stagger-children">
            <div className="glass-card p-6">
              <BarChart2 className="text-amber-600 mb-4" size={32} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Track velocity, spin rate, and break with professional precision.</p>
            </div>
            <div className="glass-card p-6">
              <Target className="text-amber-600 mb-4" size={32} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">MLB Benchmarks</h3>
              <p className="text-gray-600">Compare your metrics against league averages and top performers.</p>
            </div>
            <div className="glass-card p-6">
              <Brain className="text-amber-600 mb-4" size={32} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Coaching</h3>
              <p className="text-gray-600">Receive personalized development plans powered by AI.</p>
            </div>
          </div>
        </div>

        <footer className="text-center py-6 text-sm text-gray-400">
          Built for Maven Labs • Powered by MLB Statcast Data
        </footer>
      </div>
    );
  }

  // Authenticated View - Dashboard Home
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with user info and sign out */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">⚾</span>
          </div>
          <span className="font-bold text-gray-800">Maven Arsenal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-3xl mx-auto stagger-children">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl">⚾</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 mb-8">
            Manage your pitchers and analyze performance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/create-profile')}
              className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              New Pitcher Profile
            </button>
          </div>
        </div>

        {/* Existing Pitchers */}
        {isLoadingPitchers ? (
          <div className="mt-12">
            <div className="loading-spinner mx-auto" />
          </div>
        ) : pitchers.length > 0 && (
          <div className="mt-12 w-full max-w-xl animate-in">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
              Your Profiles
            </h3>
            <div className="glass-card divide-y divide-gray-100">
              {pitchers.map((pitcher) => (
                <div
                  key={pitcher.id}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-50/50 transition-colors"
                >
                  <button
                    onClick={() => router.push(`/dashboard/${pitcher.id}`)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {pitcher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{pitcher.name}</p>
                      <p className="text-sm text-gray-500">
                        {pitcher.throws === 'R' ? 'RHP' : 'LHP'} • {pitcher.level}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeletePitcher(e, pitcher.id, pitcher.name)}
                      disabled={deletingId === pitcher.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete profile"
                    >
                      {deletingId === pitcher.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                    <ArrowRight className="text-gray-400" size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-sm text-gray-400">
        Built for Maven Labs • Powered by MLB Statcast Data
      </footer>
    </div>
  );
}
