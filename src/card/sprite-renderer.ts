import { ColorPalette, BASE_PALETTES } from '../shared/sprites';
import { PixelMap, SpriteAnimation } from '../shared/pixel-map';

/**
 * Renders a pixel map sprite into SVG <rect> elements.
 * Supports palette transformation and CSS animations.
 */
export class SpriteRenderer {
    /**
     * Renders the PixelMap into an SVG group string.
     */
    render(sprite: PixelMap, palette: Record<string, string>): string {
        const { width, height, scale, frames, animations, groups } = sprite;
        const frame = frames.default;

        let svg = '';

        // Add Animations
        if (animations) {
            svg += '<style>';
            for (const [name, anim] of Object.entries(animations)) {
                svg += `
                    @keyframes ${name} { ${anim.keyframes} }
                    .anim-${name} { animation: ${name} ${anim.duration} infinite ease-in-out; }
                `;
            }
            svg += '</style>';
        }

        // Render pixels
        // We wrap pixels in groups if defined, otherwise just render them.
        const groupPixels = new Map<string, string>(); // groupName -> rects
        const ungroupedRects: string[] = [];

        for (let r = 0; r < frame.length; r++) {
            for (let c = 0; c < frame[r].length; c++) {
                const colorIdx = frame[r][c];
                if (colorIdx === 0) continue;

                const colorKey = sprite.palette[colorIdx.toString()];
                if (!colorKey) continue;

                const color = palette[colorKey] || '#ff00ff';
                const rect = `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}" fill="${color}" shape-rendering="crispEdges" />`;

                // Check if this pixel belongs to a group
                let foundGroup = false;
                if (groups) {
                    for (const [groupName, pixels] of Object.entries(groups)) {
                        if (pixels.some(p => p[0] === r && p[1] === c)) {
                            groupPixels.set(groupName, (groupPixels.get(groupName) || '') + rect);
                            foundGroup = true;
                            break;
                        }
                    }
                }

                if (!foundGroup) {
                    ungroupedRects.push(rect);
                }
            }
        }

        // Assemble groups
        for (const [groupName, rects] of groupPixels.entries()) {
            const animClass = animations?.[groupName] ? ` anim-${groupName}` : '';
            svg += `<g class="group-${groupName}${animClass}">${rects}</g>`;
        }

        // Add ungrouped pixels (usually the body)
        // If there's an 'idle' animation and no 'body' group, we apply 'idle' to all ungrouped pixels
        const bodyAnimClass = animations?.['idle'] ? ' anim-idle' : '';
        svg += `<g class="pet-body${bodyAnimClass}">${ungroupedRects.join('')}</g>`;

        return `<g class="pet-sprite">${svg}</g>`;
    }

    /**
     * Translates pet state to a palette transform.
     */
    getPaletteForState(trait: string | null, state: 'healthy' | 'hungry' | 'sad' | 'sick' | 'dormant' | 'neutral'): ColorPalette {
        const base = BASE_PALETTES[trait || 'lone_coder'] || BASE_PALETTES.lone_coder;

        switch (state) {
            case 'sick':
                return { ...base, primary: '#8b9a47', secondary: '#6e7a35' }; // Sickly green
            case 'sad':
                return { ...base, primary: '#708090', secondary: '#4682b4' }; // Muted blue-grey
            case 'hungry':
                return { ...base, primary: '#d2691e', secondary: '#8b4513' }; // Brownish/Desaturated orange
            case 'dormant':
                return { ...base, primary: '#555555', secondary: '#333333', highlight: '#777777' }; // Greyscale
            default:
                return base;
        }
    }
}
