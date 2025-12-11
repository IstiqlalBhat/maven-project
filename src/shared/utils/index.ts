/**
 * Shared utility functions used across the application
 */

import { PITCH_TYPE_COLORS, PITCH_TYPE_ICONS, AVATAR_COLORS } from '../constants';

/**
 * Get the color gradient class for a given pitch type
 * @param pitchType - The pitch type (e.g., "Fastball", "FF", "slider")
 * @returns Tailwind gradient class string
 */
export function getPitchColor(pitchType: string): string {
    const type = pitchType.toLowerCase();
    return PITCH_TYPE_COLORS[type] || PITCH_TYPE_COLORS.default;
}

/**
 * Get the icon emoji for a given pitch type
 * @param pitchType - The pitch type (e.g., "Fastball", "FF", "slider")
 * @returns Emoji string
 */
export function getPitchIcon(pitchType: string): string {
    const type = pitchType.toLowerCase();
    return PITCH_TYPE_ICONS[type] || PITCH_TYPE_ICONS.default;
}

/**
 * Get a consistent avatar color based on a name
 * Uses the first character of the name to deterministically select a color
 * @param name - The name to generate a color for
 * @returns Tailwind gradient class string
 */
export function getAvatarColor(name: string): string {
    if (!name || name.length === 0) {
        return AVATAR_COLORS[0];
    }
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Date string in ISO format (YYYY-MM-DD)
 */
export function getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a date string for display
 * @param dateString - Date string in any format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
    dateString: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', options);
    } catch {
        return dateString;
    }
}

/**
 * Round a number to a specified number of decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded number or null if input is null/undefined
 */
export function roundTo(value: number | null | undefined, decimals: number = 1): number | null {
    if (value === null || value === undefined) return null;
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Format a number with commas for thousands
 * @param value - Number to format
 * @returns Formatted string or '-' if null/undefined
 */
export function formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
}
