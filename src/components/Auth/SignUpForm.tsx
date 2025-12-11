"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, UserPlus } from "lucide-react";

export default function SignUpForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Send email verification
            await sendEmailVerification(userCredential.user);
            // Redirect to verification pending page
            router.push("/verify-email");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already in use.");
            } else if (err.code === "auth/weak-password") {
                setError("Password should be at least 6 characters.");
            } else {
                setError("Failed to create an account. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-md px-4 sm:px-0">
            {/* Decorative elements - Adjusted for light background */}
            <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-24 sm:w-40 h-24 sm:h-40 bg-white/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-24 sm:w-40 h-24 sm:h-40 bg-amber-100/40 rounded-full blur-3xl animate-pulse delay-1000" />

            <div className="relative p-5 sm:p-8 space-y-6 sm:space-y-8 bg-white/30 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-2xl shadow-amber-900/5">
                {/* Logo */}
                <div className="flex flex-col items-center">
                    <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-amber-500/30 transform hover:scale-105 transition-transform">
                        <span className="text-2xl sm:text-3xl">⚾</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Create Account
                    </h2>
                    <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Join the platform today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {error && (
                        <div className="p-3 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                            {error}
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
                                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80 text-base"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                            <label className="text-xs sm:text-sm font-medium text-gray-700">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-600 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80 text-base"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                            <label className="text-xs sm:text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-600 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 hover:border-white/80 text-base"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spam warning */}
                    <div className="p-2.5 sm:p-3 text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="font-medium">📧 Heads up:</span> Verification emails usually land in your <strong>spam folder</strong> since Firebase isn&apos;t recognized by most mail providers.
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
                                <UserPlus className="mr-2 w-5 h-5" />
                                Create Account
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs sm:text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
