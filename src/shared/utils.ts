/**
 * Security and helper utilities.
 * Adheres to .agent/clean-code.md naming conventions.
 */

/**
 * Encrypts a string using AES-GCM with HKDF key derivation.
 */
export async function encryptToken(token: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();

    // Derive a 256-bit AES-GCM key from the secretKey using HKDF
    const baseKey = await crypto.subtle.importKey(
        'raw', encoder.encode(secretKey),
        { name: 'HKDF' }, false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(token)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a string using AES-GCM with HKDF key derivation.
 */
export async function decryptToken(encryptedBase64: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Derive the same 256-bit AES-GCM key using HKDF
    const baseKey = await crypto.subtle.importKey(
        'raw', encoder.encode(secretKey),
        { name: 'HKDF' }, false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, ['decrypt']
    );

    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return decoder.decode(decrypted);
}

/**
 * Generates a signed session cookie value with expiration.
 */
export async function signSession(userId: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 days
    const payload = `${userId}:${expiresAt}`;

    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${payload}.${signatureBase64}`;
}

/**
 * Verifies a signed session cookie value and checks expiration.
 */
export async function verifySession(sessionValue: string, secretKey: string): Promise<string | null> {
    const parts = sessionValue.split('.');
    if (parts.length !== 2) return null;

    const [payload, signatureBase64] = parts;
    const payloadParts = payload.split(':');
    if (payloadParts.length !== 2) return null;

    const [userId, expiresAtStr] = payloadParts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
        return null; // Expired
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

    const signature = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(payload));

    return isValid ? userId : null;
}
