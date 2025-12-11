// Input validation + sanitization helpers

import { NextResponse } from 'next/server';
import type { PitchValidationResult } from '@/shared/types';

// Parses a string to int, returns null if it's garbage
export function safeParseInt(value: string | undefined | null): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
        return null;
    }

    return parsed;
}

// For route params like /api/pitchers/[id] - validates and returns the ID
export function parseIdParam(id: string): number | NextResponse {
    const parsed = safeParseInt(id);

    if (parsed === null || parsed < 1) {
        return NextResponse.json(
            { error: 'Invalid ID. Must be a positive integer.' },
            { status: 400 }
        );
    }

    return parsed;
}

// Cleans up user input before sending to the AI
// Strips out stuff that might be prompt injection attempts
export function sanitizePromptInput(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Nuke code blocks - people try to hide stuff in these
    let sanitized = text.replace(/```[\s\S]*?```/g, '[code block removed]');

    // Replace things that look like they're trying to mess with the system prompt
    sanitized = sanitized.replace(/\b(SYSTEM|USER|ASSISTANT|HUMAN|AI):/gi, '[$1]');

    // Strip markdown headers (less common but still used for exploits)
    sanitized = sanitized.replace(/^#+\s/gm, '');

    // Don't let them burn through our token budget
    const MAX_LENGTH = 2000;
    if (sanitized.length > MAX_LENGTH) {
        sanitized = sanitized.substring(0, MAX_LENGTH) + '... [truncated]';
    }

    return sanitized.trim();
}

// Basic email check - not perfect but catches most typos
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Trims + truncates strings before DB insert
export function sanitizeString(
    value: string | undefined | null,
    maxLength: number = 255
): string | null {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return null;
    }

    if (trimmed.length > maxLength) {
        return trimmed.substring(0, maxLength);
    }

    return trimmed;
}

// Validates pitch data from CSV upload or manual entry
// Returns either { valid: true, data: {...} } or { valid: false, error: "..." }
export function validatePitchData(body: Record<string, unknown>): PitchValidationResult {
    const { pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes } = body;

    if (!pitch_type || typeof pitch_type !== 'string') {
        return { valid: false, error: 'pitch_type is required' };
    }

    if (pitch_type.length > 50) {
        return { valid: false, error: 'pitch_type must be 50 characters or less' };
    }

    // Velocity sanity check (nobody throws 120+ mph)
    if (velocity_mph !== undefined && velocity_mph !== null) {
        const velo = Number(velocity_mph);
        if (isNaN(velo) || velo < 0 || velo > 120) {
            return { valid: false, error: 'velocity_mph must be between 0 and 120' };
        }
    }

    // Spin rate sanity check (5000+ would be insane)
    if (spin_rate !== undefined && spin_rate !== null) {
        const spin = Number(spin_rate);
        if (isNaN(spin) || spin < 0 || spin > 5000) {
            return { valid: false, error: 'spin_rate must be between 0 and 5000' };
        }
    }

    if (notes && typeof notes === 'string' && notes.length > 2000) {
        return { valid: false, error: 'notes must be 2000 characters or less' };
    }

    return {
        valid: true,
        data: {
            pitch_type: sanitizeString(pitch_type as string, 50) || '',
            velocity_mph: velocity_mph !== undefined && velocity_mph !== null ? Number(velocity_mph) : null,
            spin_rate: spin_rate !== undefined && spin_rate !== null ? Number(spin_rate) : null,
            horizontal_break: horizontal_break !== undefined && horizontal_break !== null ? Number(horizontal_break) : null,
            vertical_break: vertical_break !== undefined && vertical_break !== null ? Number(vertical_break) : null,
            date: date ? String(date) : null,
            notes: sanitizeString(notes as string, 2000)
        }
    };
}
