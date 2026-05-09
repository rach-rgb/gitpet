/**
 * Interface for pet sprites defined as pixel maps.
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


export const BASE_PALETTES: Record<string, ColorPalette> = {
    lone_coder: {
        outline: '#110f1d',
        primary: '#1d2f5d',
        secondary: '#325388',
        base: '#1d2f5d',
        shadow: '#070d23',
        highlight: '#f8be41',
        eye: '#ffffff',
        eyeHighlight: '#ffffff'
    },
    collaborator: {
        outline: '#2c1e16',
        primary: '#e67e22',
        secondary: '#d35400',
        base: '#e67e22',
        shadow: '#d35400',
        highlight: '#f39c12',
        accent1: '#3498db', // Sky blue accent
        accent2: '#5dade2',
        eye: '#ffffff',
        eyeHighlight: '#ffffff'
    },
    craftsman: {
        outline: '#2c1e16',
        primary: '#e67e22',
        secondary: '#d35400',
        base: '#e67e22',
        shadow: '#d35400',
        highlight: '#f39c12',
        accent1: '#34495e',
        accent2: '#bdc3c7',
        eye: '#ffffff',
        eyeHighlight: '#ffffff'
    },
    architect: {
        outline: '#212f3d',
        primary: '#9b59b6',
        secondary: '#8e44ad',
        base: '#9b59b6',
        shadow: '#8e44ad',
        highlight: '#af7ac5',
        accent1: '#f1c40f',
        accent2: '#ecf0f1',
        eye: '#ffffff',
        eyeHighlight: '#ffffff'
    },
    sprinter: {
        outline: '#4a2311',
        primary: '#f1c40f',
        secondary: '#f39c12',
        base: '#f1c40f',
        shadow: '#f39c12',
        highlight: '#f4d03f',
        accent1: '#e74c3c',
        accent2: '#ffffff',
        eye: '#ffffff',
        eyeHighlight: '#ffffff'
    },
    egg: {
        outline: '#333333',
        primary: '#f3f3f3',
        secondary: '#e0e0e0',
        base: '#f3f3f3',
        shadow: '#e0e0e0',
        highlight: '#ffffff',
    },
};
