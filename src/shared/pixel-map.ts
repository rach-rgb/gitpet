/**
 * New JSON-based pixel map format to support frames and groups.
 * Adheres to .agent/clean-code.md conventions.
 */

export interface ColorPalette {
    [key: string]: string | undefined;
    outline: string;
    primary?: string; // Legacy
    secondary?: string; // Legacy
    base?: string;
    shadow?: string;
    highlight?: string;
    accent1?: string;
    accent2?: string;
    eye?: string;
    eyeHighlight?: string;
}


export interface SpriteAnimation {
    group: string;
    keyframes: string; // CSS @keyframes content
    duration: string;
}

export interface PixelMap {
    width: number;
    height: number;
    scale: number;
    palette: Record<string, string | null>; // "1": "#hex"
    groups: Record<string, [number, number][]>;
    animations: Record<string, SpriteAnimation>;
    frames: {
        default: number[][]; // Grid of palette indices
    };
}
