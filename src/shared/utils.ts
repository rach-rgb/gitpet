/**
 * Security and helper utilities.
 * Adheres to .agent/clean-code.md naming conventions.
 */

/**
 * Encrypts a string using AES-GCM.
 */
export async function encryptToken(token: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);

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
 * Decrypts a string using AES-GCM.
 */
export async function decryptToken(encryptedBase64: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);

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
 * Generates a signed session cookie value.
 */
export async function signSession(userId: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(userId));
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${userId}.${signatureBase64}`;
}

/**
 * Verifies a signed session cookie value.
 */
export async function verifySession(sessionValue: string, secretKey: string): Promise<string | null> {
    const [userId, signatureBase64] = sessionValue.split('.');
    if (!userId || !signatureBase64) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

    const signature = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(userId));

    return isValid ? userId : null;
}
