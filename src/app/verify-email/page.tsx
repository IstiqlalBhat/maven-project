'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, reload } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Mail, RefreshCw, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        // Get the current user's email
        const user = auth.currentUser;
        if (user) {
            setUserEmail(user.email || '');
        }
    }, []);

    const handleResendVerification = async () => {
        setResending(true);
        setResendSuccess(false);
        setError(null);

        try {
            const user = auth.currentUser;
            if (user) {
                await sendEmailVerification(user);
                setResendSuccess(true);
            } else {
                setError('No user found. Please sign in again.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait a few minutes before trying again.');
            } else {
                setError('Failed to resend verification email. Please try again.');
            }
        } finally {
            setResending(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);
        setError(null);

        try {
            const user = auth.currentUser;
            if (user) {
                await reload(user);
                if (user.emailVerified) {
                    router.push('/');
                } else {
                    setError('Email not verified yet. Please check your inbox and click the verification link.');
                }
            } else {
                setError('No user found. Please sign in again.');
            }
        } catch (err: any) {
            console.error(err);
            setError('Failed to check verification status. Please try again.');
        } finally {
            setChecking(false);
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
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                            <Mail className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            Verify Your Email
                        </h2>
                        <p className="mt-2 text-center text-gray-600">
                            We&apos;ve sent a verification link to
                        </p>
                        {userEmail && (
                            <p className="mt-1 font-medium text-amber-600">
                                {userEmail}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                {error}
                            </div>
                        )}

                        {resendSuccess && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verification email sent! Check your inbox and spam folder.
                            </div>
                        )}

                        <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl">
                            <p className="text-sm text-gray-700">
                                Please check your email and click the verification link to continue.
                                If you don&apos;t see the email, check your spam folder.
                            </p>
                        </div>

                        <button
                            onClick={handleCheckVerification}
                            disabled={checking}
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                        >
                            {checking ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    I&apos;ve Verified My Email
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleResendVerification}
                            disabled={resending}
                            className="w-full flex items-center justify-center py-2.5 px-4 bg-white/50 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-white/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="text-sm text-gray-600 hover:text-amber-600 transition-colors"
                        >
                            ← Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
