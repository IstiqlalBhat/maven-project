'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface IngestionState {
    isIngesting: boolean;
    status: 'idle' | 'ingesting' | 'success' | 'error' | 'cancelled';
    message: string;
    startTime: number | null;
    elapsedTime: number;
    result: {
        inserted: number;
        skipped: number;
    } | null;
}

interface IngestionContextType {
    state: IngestionState;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    startIngestion: (message?: string) => AbortController;
    updateIngestion: (message: string) => void;
    completeIngestion: (result: { inserted: number; skipped: number }) => void;
    failIngestion: (error: string) => void;
    cancelIngestion: () => void;
    resetIngestion: () => void;
}

const initialState: IngestionState = {
    isIngesting: false,
    status: 'idle',
    message: '',
    startTime: null,
    elapsedTime: 0,
    result: null,
};

const IngestionContext = createContext<IngestionContextType | undefined>(undefined);

export function IngestionProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<IngestionState>(initialState);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Update elapsed time while ingesting
    useEffect(() => {
        if (state.isIngesting && state.startTime) {
            timerRef.current = setInterval(() => {
                setState(prev => ({
                    ...prev,
                    elapsedTime: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000),
                }));
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [state.isIngesting, state.startTime]);

    const startIngestion = useCallback((message = 'Starting data ingestion...') => {
        // Cancel any existing ingestion
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState({
            isIngesting: true,
            status: 'ingesting',
            message,
            startTime: Date.now(),
            elapsedTime: 0,
            result: null,
        });

        return controller;
    }, []);

    const updateIngestion = useCallback((message: string) => {
        setState(prev => ({
            ...prev,
            message,
        }));
    }, []);

    const completeIngestion = useCallback((result: { inserted: number; skipped: number }) => {
        abortControllerRef.current = null;
        setState(prev => ({
            ...prev,
            isIngesting: false,
            status: 'success',
            message: 'Ingestion complete!',
            result,
        }));
    }, []);

    const failIngestion = useCallback((error: string) => {
        abortControllerRef.current = null;
        setState(prev => ({
            ...prev,
            isIngesting: false,
            status: 'error',
            message: error,
        }));
    }, []);

    const cancelIngestion = useCallback(() => {
        // Abort the ongoing fetch request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Update state to cancelled
        setState(prev => ({
            ...prev,
            isIngesting: false,
            status: 'cancelled',
            message: 'Ingestion cancelled',
        }));
    }, []);

    const resetIngestion = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState(initialState);
    }, []);

    return (
        <IngestionContext.Provider
            value={{
                state,
                abortControllerRef,
                startIngestion,
                updateIngestion,
                completeIngestion,
                failIngestion,
                cancelIngestion,
                resetIngestion,
            }}
        >
            {children}
        </IngestionContext.Provider>
    );
}

export function useIngestion() {
    const context = useContext(IngestionContext);
    if (context === undefined) {
        throw new Error('useIngestion must be used within an IngestionProvider');
    }
    return context;
}

// Helper to format elapsed time
export function formatElapsedTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}
