/**
 * Interface for pet sprites defined as pixel maps.
 * Adheres to .agent/clean-code.md conventions.
 */

export interface ColorPalette {
    primary: string;
    secondary: string;
    outline: string;
    highlight: string;
    accent?: string;
}

export interface SpritePixel {
    x: number;
    y: number;
    colorKey: keyof ColorPalette; // Reference to palette key
}

export interface SpriteData {
    version: string;
    size: { width: number; height: number };
    pixels: SpritePixel[];
}

export const BASE_PALETTES: Record<string, ColorPalette> = {
    lone_coder: {
        primary: '#4ecca3',
        secondary: '#45b291',
        outline: '#232931',
        highlight: '#ffffff',
    },
    egg: {
        primary: '#f3f3f3',
        secondary: '#e0e0e0',
        outline: '#333333',
        highlight: '#ffffff',
    }
};
