import { SpriteData } from '../shared/sprites';

/**
 * Pixel map data for the Pet Egg (Stage 0).
 * Grid: 16x16
 */
export const eggSprite: SpriteData = {
    version: '1.0',
    size: { width: 16, height: 16 },
    pixels: [
        // Outline - top
        { x: 6, y: 3, colorKey: 'outline' }, { x: 7, y: 3, colorKey: 'outline' },
        { x: 8, y: 3, colorKey: 'outline' }, { x: 9, y: 3, colorKey: 'outline' },

        // Outline - sides and body
        { x: 5, y: 4, colorKey: 'outline' }, { x: 6, y: 4, colorKey: 'primary' },
        { x: 7, y: 4, colorKey: 'highlight' }, { x: 8, y: 4, colorKey: 'primary' },
        { x: 9, y: 4, colorKey: 'primary' }, { x: 10, y: 4, colorKey: 'outline' },

        { x: 4, y: 5, colorKey: 'outline' }, { x: 5, y: 5, colorKey: 'primary' },
        { x: 6, y: 5, colorKey: 'primary' }, { x: 7, y: 5, colorKey: 'primary' },
        { x: 8, y: 5, colorKey: 'primary' }, { x: 9, y: 5, colorKey: 'primary' },
        { x: 10, y: 5, colorKey: 'primary' }, { x: 11, y: 5, colorKey: 'outline' },

        { x: 4, y: 11, colorKey: 'outline' }, { x: 5, y: 11, colorKey: 'primary' },
        { x: 6, y: 11, colorKey: 'primary' }, { x: 7, y: 11, colorKey: 'primary' },
        { x: 8, y: 11, colorKey: 'primary' }, { x: 9, y: 11, colorKey: 'primary' },
        { x: 10, y: 11, colorKey: 'secondary' }, { x: 11, y: 11, colorKey: 'outline' },

        { x: 6, y: 12, colorKey: 'outline' }, { x: 7, y: 12, colorKey: 'outline' },
        { x: 8, y: 12, colorKey: 'outline' }, { x: 9, y: 12, colorKey: 'outline' },
    ]
};
