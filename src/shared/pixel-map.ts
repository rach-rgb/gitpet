/**
 * New JSON-based pixel map format to support frames and groups.
 * Adheres to .agent/clean-code.md conventions.
 */

export interface ColorPalette {
    primary: string;
    secondary: string;
    outline: string;
    highlight: string;
    accent?: string;
}

export interface SpriteGroup {
    pixels: [number, number][]; // [row, col]
}

export interface SpriteAnimationFrame {
    duration: string;
    translateY?: number;
    translateX?: number;
    rotate?: number;
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
