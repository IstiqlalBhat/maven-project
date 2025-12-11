"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, RefreshCw } from "lucide-react";

export default function SignInForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setShowResend(false);
        setResendSuccess(false);
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                setError("Please verify your email before signing in. Check your inbox for the verification link.");
                setShowResend(true);
                // Sign out the user since they haven't verified
                await auth.signOut();
                return;
            }

            router.push("/");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/invalid-credential") {
                setError("Invalid email or password.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResending(true);
        setResendSuccess(false);
        try {
            // Need to sign in temporarily to get user object
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            await auth.signOut();
            setResendSuccess(true);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError("Failed to resend verification email. Please try again.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="relative w-full max-w-md px-4 sm:px-0">
            {/* Decorative elements - Adjusted for light background visibility */}
            <div className="absolute -top-10 sm:-top-20 -left-10 sm:-left-20 w-24 sm:w-40 h-24 sm:h-40 bg-white/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 sm:-bottom-20 -right-10 sm:-right-20 w-24 sm:w-40 h-24 sm:h-40 bg-amber-100/40 rounded-full blur-3xl animate-pulse delay-1000" />

            <div className="relative p-5 sm:p-8 space-y-6 sm:space-y-8 bg-white/30 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-2xl shadow-amber-900/5">
                {/* Logo */}
                <div className="flex flex-col items-center">
                    <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-amber-500/30 transform hover:scale-105 transition-transform">
                        <span className="text-2xl sm:text-3xl">⚾</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Welcome Back
                    </h2>
                    <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {error && (
                        <div className="p-3 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                            {error}
                        </div>
                    )}

                    {showResend && (
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resending}
                            className="w-full flex items-center justify-center py-2.5 sm:py-2 px-4 bg-amber-50 border border-amber-200 text-amber-700 font-medium rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                    )}

                    {resendSuccess && (
                        <div className="p-3 text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl">
                            Verification email sent! Please check your inbox and spam folder.
                        </div>
                    )}

                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <label className="text-xs sm:text-sm font-medium text-gray-700">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-600 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 sm:py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80 text-base"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs sm:text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-600 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-3 sm:py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80 text-base"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group min-h-[48px]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs sm:text-sm text-gray-600">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        >
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
