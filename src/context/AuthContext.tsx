"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authResolved, setAuthResolved] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);

    // Firebase auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setAuthResolved(true);
        });

        return () => unsubscribe();
    }, []);

    // Minimum loading time to ensure auth is fully initialized
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Only set loading false when both auth resolves AND minimum time passes
    useEffect(() => {
        if (authResolved && minLoadingComplete) {
            setLoading(false);
        }
    }, [authResolved, minLoadingComplete]);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
