import { SpriteData, ColorPalette, BASE_PALETTES } from '../shared/sprites';

/**
 * Renders a pixel map sprite into SVG <rect> elements.
 * Supports palette transformation.
 */
export class SpriteRenderer {
    /**
     * Generates a group of SVG rectangles for the given sprite and palette.
     */
    render(sprite: SpriteData, palette: ColorPalette, scale: number = 4): string {
        const rects = sprite.pixels.map(pixel => {
            const color = palette[pixel.colorKey] || '#ff00ff';
            return `<rect x="${pixel.x * scale}" y="${pixel.y * scale}" width="${scale}" height="${scale}" fill="${color}" shape-rendering="crispEdges" />`;
        }).join('');

        return `<g class="pet-sprite">${rects}</g>`;
    }

    /**
     * Translates pet state to a palette transform.
     */
    getPaletteForState(trait: string | null, isSick: boolean, isSad: boolean): ColorPalette {
        const base = BASE_PALETTES[trait || 'lone_coder'] || BASE_PALETTES.lone_coder;

        if (isSick) {
            return { ...base, primary: '#8b9a47', secondary: '#6e7a35' }; // Sickly green
        }

        if (isSad) {
            return { ...base, primary: '#707070', secondary: '#505050' }; // Greyscale
        }

        return base;
    }
}
