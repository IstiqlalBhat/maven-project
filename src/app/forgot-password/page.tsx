'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email address.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait a few minutes before trying again.');
            } else {
                setError('Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
            <div className="relative w-full max-w-md">
                {/* Decorative elements */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/40 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-100/40 rounded-full blur-3xl animate-pulse delay-1000" />

                <div className="relative p-8 space-y-8 bg-white/30 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl shadow-amber-900/5">
                    {/* Icon */}
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 transform hover:scale-105 transition-transform">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            Reset Password
                        </h2>
                        <p className="mt-2 text-center text-gray-600">
                            {success
                                ? "Check your email for reset instructions"
                                : "Enter your email to receive a reset link"
                            }
                        </p>
                    </div>

                    {success ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="text-sm text-green-700">
                                    <p className="font-medium">Password reset email sent!</p>
                                    <p className="mt-1">
                                        We&apos;ve sent a password reset link to <span className="font-medium">{email}</span>.
                                        Please check your inbox and spam folder.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl">
                                <p className="text-sm text-gray-700">
                                    <strong>Tip:</strong> If you don&apos;t see the email, check your spam/junk folder.
                                    You can also add <span className="font-mono text-xs">noreply@{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com</span> to your contacts.
                                </p>
                            </div>

                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] group"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-600 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-gray-600 hover:text-amber-600 transition-colors inline-flex items-center"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
