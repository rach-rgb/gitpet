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

                // Priority: 
                // 1. Dynamic palette (e.g. 'primary' -> '#hex')
                // 2. Literal hex code in colorKey (e.g. '#ff0000')
                // 3. Fallback color
                const color = palette[colorKey] || (colorKey.startsWith('#') ? colorKey : '#ff00ff');
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
    getPaletteForState(trait: string | null, state: 'healthy' | 'hungry' | 'sad' | 'dormant' | 'neutral', petId?: string, stage?: number): ColorPalette {
        let base = BASE_PALETTES[trait || 'lone_coder'] || BASE_PALETTES.lone_coder;

        // Stage 0 and 1 use random egg color variations
        if ((stage === 0 || stage === 1) && petId) {
            const eggVariations = [
                { base: '#f8d7da', shadow: '#f5c6cb', highlight: '#ffffff' }, // Pink
                { base: '#d1ecf1', shadow: '#bee5eb', highlight: '#ffffff' }, // Blue
                { base: '#d4edda', shadow: '#c3e6cb', highlight: '#ffffff' }, // Green
                { base: '#fff3cd', shadow: '#ffeeba', highlight: '#ffffff' }, // Yellow
                { base: '#e2e3e5', shadow: '#d6d8db', highlight: '#ffffff' }, // Grey
                { base: '#e8daef', shadow: '#d1b3e2', highlight: '#ffffff' }, // Purple
                { base: '#fdebd0', shadow: '#fad7a0', highlight: '#ffffff' }, // Orange
            ];
            // Simple hash for deterministic random
            let hash = 0;
            for (let i = 0; i < petId.length; i++) {
                hash = petId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const variant = eggVariations[Math.abs(hash) % eggVariations.length];
            base = { 
                ...BASE_PALETTES.egg, 
                ...variant,
                primary: variant.base,
                secondary: variant.shadow
            };
        }

        switch (state) {
            case 'sick':
                return { ...base, primary: '#8b9a47', secondary: '#6e7a35', base: '#8b9a47', shadow: '#6e7a35', highlight: '#a2b158' };
            case 'sad':
                return { ...base, primary: '#708090', secondary: '#4682b4', base: '#708090', shadow: '#4682b4', highlight: '#8da1b3' };
            case 'hungry':
                return { ...base, primary: '#d2691e', secondary: '#8b4513', base: '#d2691e', shadow: '#8b4513', highlight: '#df7c38' };
            case 'dormant':
                return { ...base, outline: '#1a1a1a', primary: '#555555', secondary: '#333333', base: '#555555', shadow: '#333333', highlight: '#777777', accent1: '#444444', accent2: '#666666' };
            default:
                return base;
        }
    }
}
