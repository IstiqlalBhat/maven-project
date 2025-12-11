/**
 * Client-side authentication utilities for making authenticated API requests
 * This module provides helpers for attaching Firebase ID tokens to requests
 */

import { auth } from './firebase';

/**
 * Fetch wrapper that includes Firebase authentication token
 * Use this for all authenticated API calls from the client
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const user = auth.currentUser;

    // Get the ID token if user is logged in
    let token: string | null = null;
    if (user) {
        try {
            token = await user.getIdToken();
        } catch (error) {
            console.error('Error getting auth token:', error);
        }
    }

    // Merge headers with auth token
    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure content-type is set for JSON requests
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * Helper for GET requests with auth
 */
export async function authGet(url: string): Promise<Response> {
    return authFetch(url, { method: 'GET' });
}

/**
 * Helper for POST requests with auth
 */
export async function authPost(url: string, data: unknown): Promise<Response> {
    return authFetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Helper for PUT requests with auth
 */
export async function authPut(url: string, data: unknown): Promise<Response> {
    return authFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Helper for DELETE requests with auth
 */
export async function authDelete(url: string): Promise<Response> {
    return authFetch(url, { method: 'DELETE' });
}
