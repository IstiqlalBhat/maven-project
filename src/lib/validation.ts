import { NextResponse } from 'next/server';

/**
 * Safely parse an integer from a string
 * Returns null if the value is not a valid integer
 */
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

/**
 * Parse and validate an ID parameter
 * Returns the parsed ID or an error response
 */
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

/**
 * Sanitize a string for safe use in AI prompts
 * Removes potential injection patterns
 */
export function sanitizePromptInput(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove code blocks that might contain injection attempts
    let sanitized = text.replace(/```[\s\S]*?```/g, '[code block removed]');

    // Remove potential role-playing or instruction override attempts
    sanitized = sanitized.replace(/\b(SYSTEM|USER|ASSISTANT|HUMAN|AI):/gi, '[$1]');

    // Remove markdown that could be used for formatting exploits
    sanitized = sanitized.replace(/^#+\s/gm, '');

    // Limit length to prevent token abuse
    const MAX_LENGTH = 2000;
    if (sanitized.length > MAX_LENGTH) {
        sanitized = sanitized.substring(0, MAX_LENGTH) + '... [truncated]';
    }

    return sanitized.trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize a string for database storage
 * Trims whitespace and limits length
 */
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

/**
 * Validate and sanitize pitch data
 */
export interface PitchValidationResult {
    valid: boolean;
    error?: string;
    data?: {
        pitch_type: string;
        velocity_mph: number | null;
        spin_rate: number | null;
        horizontal_break: number | null;
        vertical_break: number | null;
        date: string | null;
        notes: string | null;
    };
}

export function validatePitchData(body: Record<string, unknown>): PitchValidationResult {
    const { pitch_type, velocity_mph, spin_rate, horizontal_break, vertical_break, date, notes } = body;

    // Required field validation
    if (!pitch_type || typeof pitch_type !== 'string') {
        return { valid: false, error: 'pitch_type is required' };
    }

    // Pitch type length validation
    if (pitch_type.length > 50) {
        return { valid: false, error: 'pitch_type must be 50 characters or less' };
    }

    // Velocity validation
    if (velocity_mph !== undefined && velocity_mph !== null) {
        const velo = Number(velocity_mph);
        if (isNaN(velo) || velo < 0 || velo > 120) {
            return { valid: false, error: 'velocity_mph must be between 0 and 120' };
        }
    }

    // Spin rate validation
    if (spin_rate !== undefined && spin_rate !== null) {
        const spin = Number(spin_rate);
        if (isNaN(spin) || spin < 0 || spin > 5000) {
            return { valid: false, error: 'spin_rate must be between 0 and 5000' };
        }
    }

    // Notes length validation
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
