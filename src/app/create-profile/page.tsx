'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { authPost } from '@/lib/auth-fetch';
import { useAuth } from '@/context/AuthContext';

export default function CreateProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        throws: 'R',
        level: 'High School',
        primary_pitch: 'Fastball',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await authPost('/api/pitchers', {
                ...formData,
                age: formData.age ? parseInt(formData.age) : null,
            });

            if (response.ok) {
                const pitcher = await response.json();
                router.push(`/dashboard/${pitcher.id}`);
            } else if (response.status === 401) {
                setError('Please sign in to create a profile.');
                router.push('/login');
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to create profile');
            }
        } catch (error) {
            console.error('Error creating profile:', error);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Show loading while checking auth
    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 mb-8 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                {/* Form Card */}
                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-3xl">⚾</span>
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-800">Create Your Profile</h1>
                        <p className="text-neutral-500 mt-2">Tell us about yourself to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Display */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="input-field"
                                placeholder="e.g., John Smith"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Age
                            </label>
                            <input
                                type="number"
                                min="8"
                                max="50"
                                value={formData.age}
                                onChange={(e) => handleChange('age', e.target.value)}
                                className="input-field"
                                placeholder="e.g., 17"
                            />
                        </div>

                        {/* Throws */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Throws
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {['R', 'L'].map((hand) => (
                                    <button
                                        key={hand}
                                        type="button"
                                        onClick={() => handleChange('throws', hand)}
                                        className={`py-3 px-4 rounded-xl font-medium transition-all ${formData.throws === hand
                                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md'
                                            : 'bg-white/80 border border-neutral-200 text-neutral-700 hover:border-amber-300'
                                            }`}
                                    >
                                        {hand === 'R' ? 'Right-Handed' : 'Left-Handed'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Level */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Level
                            </label>
                            <select
                                value={formData.level}
                                onChange={(e) => handleChange('level', e.target.value)}
                                className="input-field"
                            >
                                <option value="High School">High School</option>
                                <option value="College">College</option>
                                <option value="Amateur">Amateur</option>
                                <option value="Independent">Independent League</option>
                                <option value="Minor League">Minor League</option>
                            </select>
                        </div>

                        {/* Primary Pitch */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Primary Pitch
                            </label>
                            <select
                                value={formData.primary_pitch}
                                onChange={(e) => handleChange('primary_pitch', e.target.value)}
                                className="input-field"
                            >
                                <option value="Fastball">4-Seam Fastball</option>
                                <option value="Sinker">Sinker</option>
                                <option value="Slider">Slider</option>
                                <option value="Curveball">Curveball</option>
                                <option value="Changeup">Changeup</option>
                            </select>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.name}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="loading-spinner" />
                            ) : (
                                <>
                                    <span>Create Profile</span>
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
